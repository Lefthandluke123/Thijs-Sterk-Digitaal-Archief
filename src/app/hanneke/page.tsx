
"use client";

import React from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function HannekeSterkPage() {
  const firestore = useFirestore();
  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const bioText = siteSettings?.hannekeBio || `Als dochter van Thijs Sterk groeide Hanneke op te midden van de geur van olieverf en het strijklicht van het atelier. Haar perspectief op het werk van haar vader is diepgeworteld in persoonlijke herinneringen aan zijn scheppingsproces.\n\nSamen met haar zus Beatrijs draagt zij zorg voor de artistieke nalatenschap, waarbij het ontsluiten van zijn oeuvre voor een nieuwe generatie centraal staat. "Mijn vader schilderde niet wat hij zag, maar wat hij voelde bij het landschap," aldus Hanneke.`;
  
  const images = siteSettings?.hannekeBioImages || [];
  const hasMultipleImages = images.length > 1;

  return (
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className={cn("lg:col-span-5 space-y-8", !hasMultipleImages && "lg:sticky lg:top-24")}>
            {images.length > 0 ? (
              <div className={cn("grid gap-6", images.length === 2 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-1")}>
                {images.map((url: string, idx: number) => (
                  <div key={idx} className={cn(
                    "relative overflow-hidden rounded-2xl shadow-2xl bg-secondary/20 transition-all duration-700 hover:scale-[1.02]",
                    idx === 0 ? "aspect-[3/4]" : "aspect-square"
                  )}>
                    <Image 
                      src={url} 
                      alt={`Hanneke Sterk - Foto ${idx + 1}`} 
                      fill 
                      className="object-cover" 
                      data-ai-hint="portrait artist woman"
                    />
                    <div className="absolute bottom-4 right-4 z-10 opacity-20 text-[8px] uppercase tracking-widest text-white font-bold bg-black/40 px-2 py-1 rounded-sm">
                      &copy; Erven Thijs Sterk
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20">
                <Image 
                  src="https://picsum.photos/seed/hanneke/800/1000" 
                  alt="Hanneke Sterk Default" 
                  fill 
                  className="object-cover" 
                  data-ai-hint="portrait woman"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <span className="text-accent font-black tracking-[0.3em] uppercase text-[10px] block">Dochter & Nalatenschap</span>
              <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">Hanneke <span className="italic">Sterk</span></h1>
            </div>
            
            <div className="space-y-8 text-xl text-muted-foreground leading-relaxed font-light whitespace-pre-line border-l-2 border-accent/10 pl-8">
              {bioText}
            </div>

            <div className="pt-12 border-t border-black/5 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Betrokkenheid</h4>
                <p className="text-sm font-light leading-relaxed">Verantwoordelijk voor het archiefbeheer en de documentatie van de monumentale werken.</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Visie</h4>
                <p className="text-sm font-light leading-relaxed">Het behouden van de atmosferische essentie in de digitale ontsluiting van de collectie.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
