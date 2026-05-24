
import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArtworkClientPage } from './artwork-client';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * @fileOverview Server Component voor individuele kunstwerk-pagina's.
 * Verantwoordelijk voor SEO en Open Graph meta-tags.
 */

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const { firestore } = initializeFirebase();
  
  const docRef = doc(firestore, 'artworks', id);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return { title: 'Artwork Not Found | Thijs Sterk' };
  }

  const artwork = snapshot.data();
  const title = artwork.displayTitle || artwork.title || 'Schilderij';
  const description = `${artwork.medium || 'Schilderij'} uit ${artwork.year || 'onbekend jaar'}. Deel van de collectie ${artwork.series || 'Thijs Sterk'}.`;
  
  // Gebruik de baseUrl van de site voor de volledige URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';

  return {
    title: `${title} | The Digital Retrospective`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${baseUrl}/artwork/${id}`,
      siteName: 'Thijs Sterk Digital Retrospective',
      images: [
        {
          url: artwork.imageUrl,
          width: 1200,
          height: 900,
          alt: title,
        },
      ],
      locale: 'nl_NL',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [artwork.imageUrl],
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { id } = await params;
  const { firestore } = initializeFirebase();
  
  const docRef = doc(firestore, 'artworks', id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    notFound();
  }

  const artwork = { ...snapshot.data(), id: snapshot.id };

  return <ArtworkClientPage artwork={artwork} />;
}
