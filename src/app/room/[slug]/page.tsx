
import React from 'react';
import { notFound } from 'next/navigation';
import { getRoomBySlugServer, getArtworksByRoomSlugServer } from '@/lib/firestore-server';
import { RoomClient } from './room-client';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  if (!room) return { title: 'Zaal niet gevonden' };
  return { title: `${room.title} | The Digital Retrospective` };
}

/**
 * @fileOverview Server Component voor de museumzaal.
 * De container is hier tot het minimum beperkt om conflicten met de fixed RoomClient te voorkomen.
 */
export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomSlugServer(slug);

  return (
    <div className="relative min-h-screen">
      {artworks && artworks.length > 0 ? (
        <RoomClient artworks={artworks} />
      ) : (
        <div className="h-screen flex items-center justify-center italic opacity-30">
          Deze zaal wordt momenteel ingericht.
        </div>
      )}
    </div>
  );
}
