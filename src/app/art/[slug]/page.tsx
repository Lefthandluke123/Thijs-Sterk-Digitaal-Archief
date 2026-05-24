
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtworkClientPage } from '@/app/artwork/[id]/artwork-client';
import { getArtworkBySlugServer } from '@/lib/firestore-server';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * @fileOverview Server Component voor de individuele schilderij-pagina.
 * Genereert dynamische metadata voor SEO en social sharing.
 */
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlugServer(slug);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';
  const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  if (!artwork) {
    return { title: 'Schilderij niet gevonden' };
  }

  const title = artwork.displayTitle || artwork.title || 'Schilderij';
  const imageUrl = artwork.image || artwork.imageUrl || defaultImage;

  return {
    title: `${title} | The Digital Retrospective`,
    description: artwork.description || `${artwork.medium || 'Schilderij'} van Thijs Sterk uit ${artwork.year || 'onbekend jaar'}.`,
    openGraph: {
      title: `${title} - Thijs Sterk`,
      description: artwork.description,
      images: [{ url: imageUrl }],
      url: `${baseUrl}/art/${slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: artwork.description,
      images: [imageUrl],
    },
  };
}

export default async function ArtPage({ params }: Props) {
  const { slug } = await params;
  
  // Haal artwork op via Firestore REST API op de server
  const artwork = await getArtworkBySlugServer(slug);

  if (!artwork) {
    notFound();
  }

  // Render de client component met de opgehaalde data
  // We zorgen dat imageUrl consistent is
  return <ArtworkClientPage artwork={{ ...artwork, imageUrl: artwork.image || artwork.imageUrl }} />;
}
