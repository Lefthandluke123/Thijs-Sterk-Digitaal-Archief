import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/sections/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Thijs Sterk (1913-1982) | Schilder van Licht, Ruimte en Water',
  description: 'Ontdek het officiële retrospectieve portfolio van Thijs Sterk. Meesterlijke landschappen, stillevens en monumentale werken. Beheerd door de Erven Thijs Sterk.',
  keywords: ['Thijs Sterk', 'Nederlandse kunst', 'Schilderkunst 20e eeuw', 'Licht en Ruimte', 'Landschappen', 'Groet Schoorl', 'Kunstcollectie', 'Hanneke Sterk', 'Beatrijs Sterk', 'Peter Bes'],
  authors: [{ name: 'Erven Thijs Sterk' }],
  openGraph: {
    title: 'Thijs Sterk | Retrospectief Portfolio',
    description: 'Artistieke nalatenschap van Thijs Sterk (1913-1982). Een leven gewijd aan de essentie van het licht.',
    url: 'https://thijssterk.nl',
    siteName: 'Thijs Sterk Portfolio',
    locale: 'nl_NL',
    type: 'website',
  },
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-accent/20 selection:text-accent">
        <FirebaseClientProvider>
          <Navbar />
          {children}
          <Footer />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
