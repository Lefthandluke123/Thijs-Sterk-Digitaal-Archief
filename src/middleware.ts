import { NextResponse } from 'next/server';

/**
 * @fileOverview Gedeactiveerde middleware om terug te keren naar de originele staat.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
