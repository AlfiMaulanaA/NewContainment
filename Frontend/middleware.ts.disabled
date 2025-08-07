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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/register'];
  
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
      const dashboardUrl = new URL('/', request.url);
      return NextResponse.redirect(dashboardUrl);
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