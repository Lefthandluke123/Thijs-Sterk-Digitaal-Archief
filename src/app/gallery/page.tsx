
import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { GalleryClient } from './gallery-client';
import { Loader2 } from 'lucide-react';

interface Props {
  searchParams: Promise<{ room?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { room } = await searchParams;
  return {
    title: room ? `Zaal: ${room} | Thijs Sterk` : 'De Zalen | Thijs Sterk Digital Retrospective',
    description: 'Verken de thematische zalen van het Thijs Sterk Retrospectief.'
  };
}

export default async function GalleryPage({ searchParams }: Props) {
  const { room } = await searchParams;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-accent" /></div>}>
      <GalleryClient initialRoomSlug={room || null} />
    </Suspense>
  );
}
