
import React from 'react';
import { notFound } from 'next/navigation';
import { RoomClient } from './room-client';
import { getRoomBySlugServer, getArtworksByRoomSlugServer } from '@/lib/firestore-server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * @fileOverview Server Component voor een museumzaal.
 * Haalt data op en geeft deze door aan de (nu herstelde) RoomClient.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlugServer(slug);
  return {
    title: room ? `${room.title} | Thijs Sterk` : 'Zaal | The Digital Retrospective',
  };
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  
  // Haal data op via de server-side REST helper
  const room = await getRoomBySlugServer(slug);
  if (!room) notFound();

  const artworks = await getArtworksByRoomSlugServer(slug);

  // Render de client-component die verantwoordelijk is voor de gecentreerde weergave
  return <RoomClient artworks={artworks} roomTitle={room.title} />;
}
