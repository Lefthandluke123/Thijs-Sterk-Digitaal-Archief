
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Maximize2, Users, ArrowRight } from 'lucide-react';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';

export function ArtistBio() {
  const [activeArtwork, setActiveArtwork] = useState<any | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const firestore = useFirestore();
  const { language } = useLanguage();

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const linkedArtworkRef = useMemoFirebase(() => {
    if (!firestore || !selectedArtworkId) return null;
    return doc(firestore, 'artworks', selectedArtworkId);
  }, [firestore, selectedArtworkId]);
  
  const { data: selectedArtwork } = useDoc(linkedArtworkRef);

  React.useEffect(() => {
    if (selectedArtwork) {
      setActiveArtwork(selectedArtwork);
    }
  }, [selectedArtwork]);

  // Vertalingen voor bio
  const bioTitle = (language !== 'nl' && siteSettings?.[`homeBioTitle_${language}`])
    ? siteSettings[`homeBioTitle_${language}`]
    : siteSettings?.homeBioTitle || 'Een leven gewijd aan de Essentie';

  const bioText = (language !== 'nl' && siteSettings?.[`homeBio_${language}`])
    ? siteSettings[`homeBio_${language}`]
    : siteSettings?.homeBio || `Thijs Sterk (1913-1982) wijdde zijn leven aan het doorgronden van de atmosferische kwaliteiten van de wereld om hem heen.`;
  
  const bioImageUrl = siteSettings?.homeBioImageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761925_vh0ad_2_I.jpg?alt=media';

  const handleMainPortraitClick = () => {
    setActiveArtwork({
      imageUrl: bioImageUrl,
      title: "Thijs Sterk",
      series: "De Kunstenaar",
      year: "1913-1982",
      medium: "Portretfoto",
      id: "main-portrait"
    });
  };

  const renderTextWithLinks = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[\[(.*?)\|(.*?)\]\]/);
      if (match) {
        const [_, id, label] = match;
        return (
          <button
            key={i}
            onClick={() => { setSelectedArtworkId(id); }}
            className="text-accent hover:underline font-bold inline-block decoration-accent/30 underline-offset-4"
          >
            {label}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <section className="py-24 bg-secondary/30 px-4" id="about">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 order-2 lg:order-1 sticky top-24">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-accent hidden md:block" />
              <div 
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-muted/20 cursor-pointer group"
                onClick={handleMainPortraitClick}
              >
                <Image
                  src={bioImageUrl}
                  alt="Portret van Thijs Sterk"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]"
                  data-ai-hint="vintage artist portrait"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                </div>
              </div>

              {/* Extra sectie voor betrokkenen */}
              <div className="mt-12 p-8 bg-background/50 backdrop-blur-md rounded-[2rem] border border-border shadow-sm space-y-6">
                 <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Users className="w-5 h-5 text-accent" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">Nalatenschap & Betrokkenen</h3>
                 </div>
                 <div className="grid gap-4">
                    {[
                      { name: "Hanneke Sterk", href: "/hanneke", role: "Archiefbeheer" },
                      { name: "Beatrijs Sterk", href: "/beatrijs", role: "Documentatie" },
                      { name: "Peter Bes", href: "/peter-bes", role: "Leerling" },
                      { name: "Leo Duppen", href: "/leo-duppen", role: "Kunsthistoricus" }
                    ].map((person) => (
                      <Link 
                        key={person.href} 
                        href={person.href}
                        className="flex items-center justify-between group/link p-2 hover:bg-black/5 rounded-xl transition-all"
                      >
                         <div className="flex flex-col">
                            <span className="text-sm font-bold">{person.name}</span>
                            <span className="text-[9px] uppercase tracking-widest opacity-40">{person.role}</span>
                         </div>
                         <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover/link:opacity-100 transition-all -translate-x-2 group-hover/link:translate-x-0" />
                      </Link>
                    ))}
                 </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2">
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">De Biografie</span>
            <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-light mb-8 leading-tight">
              {bioTitle.split(' ').map((word, i, arr) => 
                i === arr.length - 1 ? <span key={i} className="italic">{word}</span> : word + ' '
              )}
            </h2>
            
            <div className="space-y-6 text-xl text-muted-foreground leading-relaxed font-light whitespace-pre-line border-l-4 border-accent/10 pl-8">
              {renderTextWithLinks(bioText)}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-16 pt-12 border-t border-border">
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">1913</h4>
                <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">Geboortejaar</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">Monumentaal</h4>
                <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">Wandkunst</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">Glas</h4>
                <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">In lood</p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-light text-foreground mb-1">Internationaal</h4>
                <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">Frankrijk / Griekenland</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ArtworkViewer 
        artwork={activeArtwork} 
        onClose={() => { setActiveArtwork(null); setSelectedArtworkId(null); }} 
      />
    </section>
  );
}
