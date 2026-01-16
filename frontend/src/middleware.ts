import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/contracts', '/settings'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has token (client-side token stored in localStorage won't be available here)
  // We'll handle actual auth check on the client side
  // This middleware mainly handles redirects for the root path

  // Redirect root to dashboard (auth will be checked client-side)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/contracts/:path*', '/settings/:path*', '/login', '/register'],
};
