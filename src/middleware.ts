import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @fileOverview Middleware voor het beveiligen van de beheeromgeving.
 * Controleert op de aanwezigheid van de 'admin-auth' cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bescherm alle routes die beginnen met /admin
  if (pathname.startsWith('/admin')) {
    const auth = request.cookies.get('admin-auth')?.value;

    if (auth !== 'gabbes') {
      // Gebruik een absolute URL voor de redirect naar /login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Matcher zorgt dat de middleware alleen draait op de relevante paden
export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
