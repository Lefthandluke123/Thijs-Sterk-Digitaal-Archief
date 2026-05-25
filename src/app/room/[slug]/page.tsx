
import React from 'react';
import { notFound } from 'next/navigation';
import { RoomClient } from './room-client';
import { getRoomBySlugServer, getArtworksByRoomIdServer } from '@/lib/firestore-server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  
  if (!room) return { title: 'Zaal niet gevonden' };

  return {
    title: `${room.title} | Het Retrospectief`,
    description: room.description || `Ontdek de collectie in de zaal ${room.title}.`,
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomIdServer(room.id);

  return <RoomClient artworks={artworks} roomTitle={room.title} />;
}
