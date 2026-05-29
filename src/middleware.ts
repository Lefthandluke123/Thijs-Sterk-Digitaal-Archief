
import { NextResponse } from 'next/server';

/**
 * @fileOverview Middleware uitgeschakeld voor rollback naar versie 4a1b1b1.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
