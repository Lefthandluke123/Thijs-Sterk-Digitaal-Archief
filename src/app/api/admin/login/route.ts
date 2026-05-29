import { NextResponse } from 'next/server';

/**
 * @fileOverview Server-side login handler voor de beheeromgeving.
 * Valideert het wachtwoord en zet een beveiligde HttpOnly cookie.
 */
export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Het afgesproken wachtwoord: 1527
    if (password === '1527') {
      const response = NextResponse.json({ success: true });
      
      // Zet een HttpOnly cookie die de middleware kan lezen
      // We gebruiken 'Lax' en '/' pad voor maximale stabiliteit
      response.cookies.set('admin_session', 'authorized_1527', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 uur geldig
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Wachtwoord onjuist' }, 
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Interne serverfout' }, 
      { status: 500 }
    );
  }
}
