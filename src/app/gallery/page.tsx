import React, { Suspense } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { GalleryClient } from './gallery-client';
import { Loader2 } from 'lucide-react';

interface Props {
  searchParams: Promise<{ series?: string }>;
}

/**
 * @fileOverview Server-side entry point voor de Galerij.
 * Zorgt voor correcte Open Graph previews voor zalen.
 */

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { series } = await searchParams;
  
  const title = series ? `Zaal: ${series}` : 'De Zalen';
  const description = series 
    ? `Verken de werken in de collectie "${series}" van Thijs Sterk.`
    : 'Ontdek de verschillende thematische zalen van het Thijs Sterk Retrospectief.';
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';

  return {
    title: `${title} | The Digital Retrospective`,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${baseUrl}/gallery${series ? `?series=${encodeURIComponent(series)}` : ''}`,
      siteName: 'Thijs Sterk Digital Retrospective',
      images: [
        {
          url: 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media',
          width: 1200,
          height: 630,
          alt: 'Thijs Sterk Retrospectief',
        },
      ],
      locale: 'nl_NL',
      type: 'website',
    },
  };
}

export default async function GalleryPage({ searchParams }: Props) {
  const { series } = await searchParams;

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-accent" /></div>}>
      <GalleryClient initialSeries={series || null} />
    </Suspense>
  );
}
