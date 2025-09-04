// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to decode JWT and check expiration
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = parts[1];
    const paddedPayload = payload + '==='.slice((payload.length + 3) % 4);
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const tokenData = JSON.parse(decodedPayload);
    
    const currentTime = Math.floor(Date.now() / 1000);
    return tokenData.exp > currentTime;
  } catch {
    return false;
  }
}

// Helper function to check developer mode
function isDeveloperModeActive(request: NextRequest): boolean {
  try {
    // Check from headers first (for API calls)
    const headerDevMode = request.headers.get('X-Developer-Mode');
    if (headerDevMode === 'true') return true;
    
    // For client-side routes, we'll rely on the dynamic menu API
    // This is handled by the backend when fetching user menu
    return false;
  } catch {
    return false;
  }
}

// Get user role from token
function getUserRoleFromToken(token: string): { role: string; level: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const paddedPayload = payload + '==='.slice((payload.length + 3) % 4);
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const tokenData = JSON.parse(decodedPayload);
    
    // Map role enum to level
    const roleLevel = tokenData.role ? parseInt(tokenData.role) : 1;
    const roleName = ['public', 'user', 'developer', 'admin'][roleLevel] || 'user';
    
    return { role: roleName, level: roleLevel };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/register'];
  
  // Developer mode protected routes - these require both developer role AND active developer mode
  const developerModeRoutes = [
    '/access-control',
    '/developer',
    '/management/menu',
  ];
  
  // Admin-only routes
  const adminRoutes = [
    '/management/users',
    '/management/whatsapp',
    '/settings/setting'
  ];
  
  // Static files and API routes (let them pass through)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/files') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Get token from cookies or headers
  const tokenFromCookie = request.cookies.get('authToken')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenFromCookie || tokenFromHeader;

  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If token exists, validate it
  if (token) {
    const isValid = isTokenValid(token);
    
    // If token is invalid/expired and trying to access protected route
    if (!isValid && !isPublicRoute) {
      const loginUrl = new URL('/auth/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      // Clear invalid token
      response.cookies.delete('authToken');
      return response;
    }

    // If token is valid and trying to access auth pages, redirect to dashboard
    if (isValid && isPublicRoute) {
      const dashboardUrl = new URL('/dashboard-overview', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    
    // Check route-specific permissions for protected routes
    if (isValid && !isPublicRoute) {
      const userRole = getUserRoleFromToken(token);
      if (!userRole) {
        // Invalid token data
        const loginUrl = new URL('/auth/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('authToken');
        return response;
      }
      
      // Check admin routes
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      if (isAdminRoute && userRole.level < 3) { // Admin level = 3
        const dashboardUrl = new URL('/dashboard-overview', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
      
      // Check developer mode routes
      const isDeveloperRoute = developerModeRoutes.some(route => pathname.startsWith(route));
      if (isDeveloperRoute) {
        // These routes require developer level (2) or admin (3)
        if (userRole.level < 2) {
          const dashboardUrl = new URL('/dashboard-overview', request.url);
          return NextResponse.redirect(dashboardUrl);
        }
        // Note: Developer mode active check is handled by the frontend components
        // and backend API, as middleware can't access localStorage
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};