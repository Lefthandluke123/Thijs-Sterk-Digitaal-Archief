import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/sections/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Thijs Sterk | Beeldend Kunstenaar Portfolio',
  description: 'Portfolio van Thijs Sterk, een hedendaagse kunstenaar die de grens tussen abstracte geometrie en organische landschappen verkent.',
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
        {/* Inter voor leesbaarheid, Playfair Display voor een luxe artistieke uitstraling */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <Navbar />
          {children}
          <Footer />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}