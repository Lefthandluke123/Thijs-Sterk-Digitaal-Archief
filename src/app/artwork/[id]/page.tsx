
import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtworkClientPage } from './artwork-client';
import { getArtworkServer } from '@/lib/firestore-server';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * @fileOverview Server Component voor individuele kunstwerk-pagina's op basis van ID.
 * Zorgt voor correcte scrapability voor social sharing.
 */

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const artwork = await getArtworkServer(id);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';
  const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  if (!artwork) {
    return { 
      title: 'Schilderij niet gevonden | Thijs Sterk',
      robots: 'noindex'
    };
  }

  const title = artwork.displayTitle || artwork.title || 'Schilderij';
  const description = `${artwork.medium || 'Schilderij'} uit ${artwork.year || 'onbekend jaar'}. Deel van de collectie Thijs Sterk.`;
  const imageUrl = artwork.imageUrl || artwork.image || defaultImage;

  return {
    title: `${title} | The Digital Retrospective`,
    description: description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/artwork/${id}`,
    },
    openGraph: {
      title: `${title} - Thijs Sterk`,
      description: description,
      url: `${baseUrl}/artwork/${id}`,
      siteName: 'Thijs Sterk Digital Retrospective',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 900,
          alt: title,
        },
      ],
      locale: 'nl_NL',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { id } = await params;
  const artwork = await getArtworkServer(id);

  if (!artwork) {
    notFound();
  }

  return <ArtworkClientPage artwork={artwork} />;
}
