import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtworkClientPage } from './artwork-client';
import { getArtworkServer } from '@/lib/firestore-server';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * @fileOverview Server Component voor individuele kunstwerk-pagina's.
 * Haalt data op via de REST API om client-SDK errors op de server te voorkomen.
 */

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  
  // Gebruik de REST helper in plaats van de Client SDK
  const artwork = await getArtworkServer(id);
  
  if (!artwork) {
    return { title: 'Schilderij niet gevonden | Thijs Sterk' };
  }

  const title = artwork.displayTitle || artwork.title || 'Schilderij';
  const description = `${artwork.medium || 'Schilderij'} uit ${artwork.year || 'onbekend jaar'}. Deel van de collectie ${artwork.series || 'Thijs Sterk'}.`;
  
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
  
  // Haal data op de server op voor een razendsnelle eerste render
  const artwork = await getArtworkServer(id);

  if (!artwork) {
    notFound();
  }

  return <ArtworkClientPage artwork={artwork} />;
}
