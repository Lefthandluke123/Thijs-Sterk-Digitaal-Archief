"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Maximize2 } from 'lucide-react';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';

export function ArtistBio() {
  const [activeArtwork, setActiveArtwork] = useState<any | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const firestore = useFirestore();
  const { language, t } = useLanguage();

  const siteSettingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const linkedArtworkRef = useMemo(() => {
    if (!firestore || !selectedArtworkId) return null;
    return doc(firestore, 'artworks', selectedArtworkId);
  }, [firestore, selectedArtworkId]);
  
  const { data: selectedArtwork } = useDoc(linkedArtworkRef);

  useEffect(() => {
    if (selectedArtwork) {
      setActiveArtwork(selectedArtwork);
    }
  }, [selectedArtwork]);

  const bioTitle = (language !== 'nl' && siteSettings?.[`homeBioTitle_${language}`])
    ? siteSettings[`homeBioTitle_${language}`]
    : siteSettings?.homeBioTitle || 'Een leven gewijd aan de Essentie';

  const bioText = (language !== 'nl' && siteSettings?.[`homeBio_${language}`])
    ? siteSettings[`homeBio_${language}`]
    : siteSettings?.homeBio || `Thijs Sterk (1913-1982) wijdde zijn leven aan het doorgronden van de atmosferische kwaliteiten van de wereld om hem heen.`;
  
  const bioImageUrl = siteSettings?.homeBioImageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761925_vh0ad_2_I.jpg?alt=media';

  const bioBadge = t('homeBioBadge');

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
            className="text-accent hover:underline font-bold inline-block decoration-accent/30 underline-offset-4 focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {label}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <section className="py-24 bg-secondary/20 px-4" id="about" aria-labelledby="bio-heading">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 order-2 lg:order-1 sticky top-32">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-4 border-l-4 border-accent/40 hidden md:block" aria-hidden="true" />
              <button 
                className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] bg-muted/20 cursor-pointer group focus-visible:ring-4 focus-visible:ring-accent"
                onClick={handleMainPortraitClick}
                aria-label="Bekijk portret van Thijs Sterk"
              >
                <Image
                  src={bioImageUrl}
                  alt="Archiefportret van de kunstenaar Thijs Sterk"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" aria-hidden="true" />
                </div>
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-8">
            <div className="space-y-4">
              <span className="text-accent font-black tracking-[0.4em] uppercase text-[11px] block">{bioBadge}</span>
              <h2 id="bio-heading" className="font-headline text-3xl md:text-4xl lg:text-5xl font-medium mb-6 leading-tight text-foreground">
                {bioTitle.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? <span key={i} className="italic text-accent">{word}</span> : word + ' '
                )}
              </h2>
            </div>
            
            <div className="space-y-8 text-xl text-foreground leading-relaxed font-light whitespace-pre-line border-l-4 border-accent/10 pl-8">
              {renderTextWithLinks(bioText)}
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
