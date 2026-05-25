
"use client";

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { StoryRenderer } from '@/components/story-renderer';
import { Loader2, Palette } from 'lucide-react';

export default function PeterBesPage() {
  const firestore = useFirestore();
  const storyRef = useMemoFirebase(() => firestore ? doc(firestore, 'stories', 'peter-bes') : null, [firestore]);
  const { data: storyData, loading } = useDoc(storyRef);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <main className="min-h-screen bg-background pt-32 pb-48">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="mb-20 space-y-4">
           <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-accent/5 border border-accent/10">
              <Palette className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">De Leerling</span>
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-light leading-tight">
             Peter <span className="italic">Bes</span>
           </h1>
        </div>
        {storyData?.blocks ? <StoryRenderer blocks={storyData.blocks} /> : <div className="py-20 text-center opacity-20 italic">Content wordt ontworpen...</div>}
      </div>
    </main>
  );
}
