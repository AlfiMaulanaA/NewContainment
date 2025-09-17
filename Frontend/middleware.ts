// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to decode JWT and check expiration
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = parts[1];
    const paddedPayload = payload + "===".slice((payload.length + 3) % 4);
    const decodedPayload = atob(
      paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
    );
    const tokenData = JSON.parse(decodedPayload);

    const currentTime = Math.floor(Date.now() / 1000);
    return tokenData.exp > currentTime;
  } catch {
    return false;
  }
}

// Get user role from token
function getUserRoleFromToken(
  token: string
): { role: string; level: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const paddedPayload = payload + "===".slice((payload.length + 3) % 4);
    const decodedPayload = atob(
      paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
    );
    const tokenData = JSON.parse(decodedPayload);

    // Map role enum to level
    const roleLevel = tokenData.role ? parseInt(tokenData.role) : 1;
    const roleName =
      ["public", "user", "developer", "admin"][roleLevel] || "user";

    return { role: roleName, level: roleLevel };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/palm-recognition",
  ];

  // Developer mode protected routes - these require both developer role AND active developer mode
  const developerModeRoutes = [
    "/access-control",
    "/developer",
    "/management/menu",
  ];

  // Admin-only routes
  const adminRoutes = [
    "/management/users",
    "/management/whatsapp",
    "/settings/setting",
  ];

  // console.log(`[Middleware] Processing: ${pathname}`);

  // Static files and API routes (let them pass through)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/files") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Get token from cookies or headers
  const tokenFromCookie = request.cookies.get("authToken")?.value;
  const tokenFromHeader = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const token = tokenFromCookie || tokenFromHeader;

  // console.log(`[Middleware] Token found: ${!!token}, Public route: ${isPublicRoute}`);

  // Special handling for root path without token - redirect to login
  if (!token && pathname === "/") {
    // console.log(`[Middleware] No token on root path, redirecting to login`);
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    // console.log(`[Middleware] No token for protected route, redirecting to login`);
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If token exists, validate it
  if (token) {
    const isValid = isTokenValid(token);
    // console.log(`[Middleware] Token valid: ${isValid}`);

    // If token is invalid/expired and trying to access protected route
    if (!isValid && !isPublicRoute) {
      // console.log(`[Middleware] Invalid token for protected route, redirecting to login`);
      const loginUrl = new URL("/auth/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      // Clear invalid token
      response.cookies.delete("authToken");
      return response;
    }

    // If token is valid and trying to access auth pages, redirect to dashboard
    // Prevent redirect loops by checking exact paths
    if (
      isValid &&
      isPublicRoute &&
      pathname !== "/dashboard-overview" &&
      pathname !== "/"
    ) {
      // console.log(`[Middleware] Valid token on public route, redirecting to dashboard`);
      // const dashboardUrl = new URL("/dashboard-overview", request.url);
      // return NextResponse.redirect(dashboardUrl);
    }

    // Special handling for root path with valid token
    if (isValid && pathname === "/" && request.nextUrl.search === "") {
      // console.log(`[Middleware] Valid token on root path, redirecting to dashboard`);
      // const dashboardUrl = new URL("/dashboard-overview", request.url);
      // return NextResponse.redirect(dashboardUrl);
    }

    // Check route-specific permissions for protected routes
    if (isValid && !isPublicRoute) {
      const userRole = getUserRoleFromToken(token);
      if (!userRole) {
        // Invalid token data
        const loginUrl = new URL("/auth/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("authToken");
        return response;
      }

      // Check admin routes
      const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
      );
      if (isAdminRoute && userRole.level < 3) {
        // Admin level = 3, redirect unauthorized users
        // const dashboardUrl = new URL("/dashboard-overview", request.url);
        // return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
