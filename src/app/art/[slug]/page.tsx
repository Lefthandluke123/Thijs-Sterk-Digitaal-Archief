
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtworkClientPage } from '@/app/artwork/[id]/artwork-client';
import { getArtworkBySlugServer } from '@/lib/firestore-server';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * @fileOverview Server Component voor individuele schilderij-pagina's op basis van slug.
 * Genereert 100% crawler-vriendelijke Open Graph tags voor Facebook/Twitter.
 */
export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlugServer(slug);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';
  const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  if (!artwork) {
    return { 
      title: 'Schilderij niet gevonden',
      robots: 'noindex'
    };
  }

  const title = artwork.displayTitle || artwork.title || 'Schilderij';
  const imageUrl = artwork.imageUrl || artwork.image || defaultImage;
  const description = artwork.description || `${artwork.medium || 'Schilderij'} van Thijs Sterk uit ${artwork.year || 'onbekend jaar'}.`;

  return {
    title: `${title} | The Digital Retrospective`,
    description: description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/art/${slug}`,
    },
    openGraph: {
      title: `${title} - Thijs Sterk`,
      description: description,
      images: [{ 
        url: imageUrl,
        width: 1200,
        height: 900,
        alt: title 
      }],
      url: `${baseUrl}/art/${slug}`,
      siteName: 'Thijs Sterk Digital Retrospective',
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

export default async function ArtPage({ params }: Props) {
  const { slug } = await params;
  
  const artwork = await getArtworkBySlugServer(slug);

  if (!artwork) {
    notFound();
  }

  return <ArtworkClientPage artwork={artwork} />;
}
