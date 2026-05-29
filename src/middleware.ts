import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @fileOverview Middleware voor de beveiliging van het archiefbeheer.
 * Controleert op de aanwezigheid van een geldige admin_session cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Alleen routes die beginnen met /admin beveiligen
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value;

    // Als de sessie-cookie niet de juiste waarde heeft, stuur door naar /login
    if (session !== 'authorized_1527') {
      const loginUrl = new URL('/login', request.url);
      // Onthoud waar de gebruiker heen wilde
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Zorg dat de matcher zowel /admin als alle subpaden pakt
  matcher: ['/admin', '/admin/:path*'],
};
