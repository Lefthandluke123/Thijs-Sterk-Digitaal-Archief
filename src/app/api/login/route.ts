import { NextResponse } from 'next/server';

/**
 * @fileOverview API Route voor het verwerken van de admin login.
 * Zet een HttpOnly cookie voor veilige authenticatie.
 */
export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === 'gabbes') {
      const response = NextResponse.json({ success: true });
      
      // Stel de cookie server-side in
      response.cookies.set('admin-auth', 'gabbes', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 uur geldig
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Wachtwoord onjuist' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Ongeldig verzoek' },
      { status: 400 }
    );
  }
}
