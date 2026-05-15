
"use client";

import React from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function ArtistBio() {
  const firestore = useFirestore();
  const portrait = PlaceHolderImages.find(img => img.id === 'artist-portrait');

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const bioText = siteSettings?.homeBio || `Thijs Sterk (1913-1982) wijdde zijn leven aan het doorgronden van de atmosferische kwaliteiten van de Lage Landen. Geboren in een tijd van grote verandering, vond hij zijn rust in de uitgestrekte waterpartijen en het immer veranderende licht boven het polderlandschap.\n\nZijn vroege werk kenmerkt zich door een meesterlijke beheersing van de figuratieve traditie, maar gedurende zijn carrière bewoog hij zich steeds verder naar de kern. Hij liet de details varen om de ruimte en de emotie van de plek te vangen in brede, textuurrijke streken.\n\n"Licht is niet iets dat op een object valt," schreef hij in 1954 in zijn dagboek, "het is de ruimte die tussen mij en de wereld ademt." Vandaag de dag wordt zijn oeuvre beschouwd als een cruciale schakel in de overgang naar de naoorlogse abstractie in de Nederlandse schilderkunst.`;

  return (
    <section className="py-24 bg-secondary/30 px-4" id="about">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-accent" />
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                {portrait ? (
                  <Image
                    src={portrait.imageUrl}
                    alt="Portret van Thijs Sterk"
                    fill
                    className="object-cover"
                    data-ai-hint="vintage artist portrait"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase opacity-20">Portret</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2">
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">De Biografie</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8 leading-tight">Een leven gewijd aan de <span className="italic">Essentie</span></h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light whitespace-pre-line">
              {bioText}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12 pt-12 border-t border-border">
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">1913</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Geboortejaar</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">45+</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Jaar actief</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">Nationaal</h4>
                <p className="text-sm uppercase tracking-tighter text-muted-foreground">Erfgoed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
