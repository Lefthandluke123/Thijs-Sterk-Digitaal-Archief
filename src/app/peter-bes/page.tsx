
"use client";

import React from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function PeterBesPage() {
  const firestore = useFirestore();
  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const bioText = siteSettings?.peterBesBio || `Peter Bes was een leerling van Thijs Sterk. Onder de vleugels van zijn meester ontwikkelde hij een eigen vormentaal, terwijl hij de lessen over licht en compositie altijd in zijn hart hield.\n\nDe band tussen leermeester en leerling was meer dan louter technisch; het was een gedeelde zoektocht naar de ziel van het schilderen. Zijn herinneringen werpen een uniek licht op de didactische en menselijke kant van Thijs. Peter herinnert hem als een strenge maar rechtvaardige mentor die altijd zocht naar de essentie.`;
  
  const images = siteSettings?.peterBesBioImages || [];
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
                      alt={`Peter Bes - Foto ${idx + 1}`} 
                      fill 
                      className="object-cover" 
                      data-ai-hint="portrait artist man"
                    />
                    <div className="absolute bottom-4 right-4 z-10 opacity-20 text-[8px] uppercase tracking-widest text-white font-bold bg-black/40 px-2 py-1 rounded-sm">
                      &copy; Peter Bes
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20">
                <Image 
                  src="https://picsum.photos/seed/peterbes/800/1000" 
                  alt="Peter Bes Default" 
                  fill 
                  className="object-cover" 
                  data-ai-hint="portrait artist man"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <span className="text-accent font-black tracking-[0.3em] uppercase text-[10px] block">Leerling & Kunstenaar</span>
              <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">Peter <span className="italic">Bes</span></h1>
            </div>
            
            <div className="space-y-8 text-xl text-muted-foreground leading-relaxed font-light whitespace-pre-line border-l-2 border-accent/10 pl-8">
              {bioText}
            </div>

            <div className="pt-12 border-t border-black/5 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Mentorschap</h4>
                <p className="text-sm font-light leading-relaxed">De invloed van Thijs Sterk op de ontwikkeling van de Noord-Hollandse schilderkunst.</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Herinnering</h4>
                <p className="text-sm font-light leading-relaxed">Verhalen uit het atelier die de mens achter de schilder Thijs Sterk belichten.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
