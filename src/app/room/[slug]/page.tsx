import React from 'react';
import { notFound } from 'next/navigation';
import { getRoomBySlugServer, getArtworksByRoomSlugServer } from '@/lib/firestore-server';
import { RoomClient } from './room-client';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * @fileOverview Server Component voor een dynamische museumzaal.
 * Haalt zaal-data en gekoppelde kunstwerken op uit Firestore.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  
  if (!room) return { title: 'Zaal niet gevonden' };
  
  return {
    title: `${room.title} | The Digital Retrospective`,
    description: room.description || `Verken de werken in ${room.title} van Thijs Sterk.`,
    openGraph: {
      title: room.title,
      description: room.description,
      type: 'website',
    },
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  
  // Haal data op via REST API (Server-side safe)
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomSlugServer(slug);

  return (
    <main className="min-h-screen bg-background pt-32 pb-48">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-24 text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Museumzaal</span>
          </div>
          <h1 className="font-headline text-5xl md:text-8xl font-light italic text-accent leading-tight">
            {room.title}
          </h1>
          {room.description && (
            <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              {room.description}
            </p>
          )}
          <div className="h-px w-24 bg-accent/20 mx-auto" />
        </header>

        {artworks.length > 0 ? (
          <RoomClient artworks={artworks} />
        ) : (
          <div className="py-32 text-center opacity-30 italic font-light">
            Deze zaal wordt momenteel ingericht. Kom binnenkort terug.
          </div>
        )}
      </div>
    </main>
  );
}
