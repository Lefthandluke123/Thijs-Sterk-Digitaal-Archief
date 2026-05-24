import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtworkClientPage } from '@/app/artwork/[id]/artwork-client';
import { getArtworkBySlugServer } from '@/lib/firestore-server';

interface Props {
  params: Promise<{ slug: string }>;
}

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
    description: artwork.description,
    openGraph: {
      title: `${title} - Thijs Sterk`,
      images: [{ url: imageUrl }],
    },
  };
}

export default async function ArtPage({ params }: Props) {
  const { slug } = await params;
  const artwork = await getArtworkBySlugServer(slug);

  if (!artwork) {
    notFound();
  }

  // Reuse existing client component
  return <ArtworkClientPage artwork={{ ...artwork, imageUrl: artwork.image || artwork.imageUrl }} />;
}
