
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/sections/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CookieConsent } from '@/components/cookie-consent';

export const metadata: Metadata = {
  title: 'Thijs Sterk (1913-1982) | Schilder van Licht, Ruimte en Water',
  description: 'Het officiële retrospectief van Thijs Sterk. Ontdek zijn meesterlijke landschappen en monumentale werken. Beheerd door de Erven Thijs Sterk.',
  keywords: ['Thijs Sterk', 'Nederlandse kunst', 'Schilderkunst 20e eeuw', 'Licht en Ruimte', 'Landschappen', 'Groet Schoorl', 'Kunstcollectie'],
  authors: [{ name: 'Erven Thijs Sterk' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-accent/20 selection:text-accent">
        <FirebaseClientProvider>
          <Navbar />
          {children}
          <CookieConsent />
          <Footer />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
