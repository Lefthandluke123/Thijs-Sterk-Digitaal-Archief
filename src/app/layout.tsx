import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/sections/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CookieConsent } from '@/components/cookie-consent';
import { LanguageProvider } from '@/components/language-provider';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Thijs Sterk (1913-1982) | Schilder van Licht, Ruimte en Water',
  description: 'Het officiële digitale retrospectief van Thijs Sterk. Ontdek zijn meesterlijke landschappen, monumentale wandkunst en verstilde dorpsgezichten uit Groet en Schoorl.',
  keywords: ['Thijs Sterk', 'Nederlandse kunst', 'Schilderkunst 20e eeuw', 'Licht en Ruimte', 'Landschappen', 'Groet Schoorl', 'Kunstcollectie', 'Atmosferisch schilderen'],
  authors: [{ name: 'Erven Thijs Sterk' }],
  openGraph: {
    title: 'Thijs Sterk Museum - Digitaal Retrospectief',
    description: 'Ontdek de wereld van Thijs Sterk. Een leven gewijd aan het vastleggen van de essentie van licht en ruimte.',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Thijs Sterk Digitaal Museum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thijs Sterk (1913-1982) | Schilder van Licht en Ruimte',
    description: 'De officiële collectie en biografie van Thijs Sterk.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Thijs Sterk",
    "birthDate": "1913-05-12",
    "deathDate": "1982-07-28",
    "jobTitle": "Kunstschilder",
    "nationality": "NL",
    "description": "Nederlands kunstschilder bekend om zijn atmosferische landschappen en monumentale werken.",
    "knowsAbout": ["Schilderkunst", "Licht", "Landschap", "Noord-Holland"],
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Kunstschilder"
    }
  };

  return (
    <html lang="nl" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body antialiased selection:bg-accent/20 selection:text-accent">
        <FirebaseClientProvider>
          <LanguageProvider>
            <Navbar />
            {children}
            <CookieConsent />
            <Footer />
          </LanguageProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
