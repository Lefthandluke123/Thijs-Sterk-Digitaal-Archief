import React from 'react';
import { notFound } from 'next/navigation';
import { RoomClient } from './room-client';
import { getRoomBySlugServer, getArtworksByRoomSlugServer } from '@/lib/firestore-server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  const artworks = await getArtworksByRoomSlugServer(slug);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thijssterk.nl';
  const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761923_x2p82k_maannacht%20copy.jpg?alt=media';

  if (!room) {
    return { title: 'Zaal niet gevonden | Thijs Sterk' };
  }

  const displayImage = artworks?.find(a => a.featured)?.imageUrl || artworks?.[0]?.imageUrl || defaultImage;
  const title = `${room.title} | Het Retrospectief`;
  const description = room.description || `Ontdek de collectie in de zaal ${room.title} van Thijs Sterk.`;

  return {
    title: title,
    description: description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/room/${slug}`,
    },
    openGraph: {
      title: `${room.title} - Thijs Sterk`,
      description: description,
      url: `${baseUrl}/room/${slug}`,
      siteName: 'Thijs Sterk Retrospectief',
      images: [
        {
          url: displayImage,
          width: 1200,
          height: 630,
          alt: room.title,
        },
      ],
      locale: 'nl_NL',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [displayImage],
    },
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomSlugServer(slug);

  return <RoomClient artworks={artworks} roomTitle={room.title} />;
}
