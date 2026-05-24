import React from 'react';
import { notFound } from 'next/navigation';
import { getRoomBySlugServer, getArtworksByRoomSlugServer } from '@/lib/firestore-server';
import { ArtworkViewerWrapper } from './room-client';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  if (!room) return { title: 'Zaal niet gevonden' };
  return {
    title: `${room.title} | The Digital Retrospective`,
    description: room.description
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomSlugServer(slug);

  return (
    <main className="min-h-screen bg-background pt-32 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-20 text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="font-headline text-5xl md:text-7xl font-light italic text-accent">{room.title}</h1>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">{room.description}</p>
        </header>

        <ArtworkViewerWrapper artworks={artworks} />
      </div>
    </main>
  );
}
