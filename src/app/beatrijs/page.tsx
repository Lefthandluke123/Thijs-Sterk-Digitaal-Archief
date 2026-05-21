"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';

export default function BeatrijsSterkPage() {
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

  const bioText = (language !== 'nl' && siteSettings?.[`beatrijsBio_${language}`])
    ? siteSettings[`beatrijsBio_${language}`]
    : siteSettings?.beatrijsBio || `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. 

Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat.`;
  
  const images = siteSettings?.beatrijsBioImages || [];
  const hasMultipleImages = images.length > 1;

  const defaultArchiveImageUrl = "https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761925_vh0ad_2_I.jpg?alt=media";

  const handlePortraitClick = (url: string, index: number) => {
    setActiveArtwork({
      imageUrl: url,
      title: `Portret Beatrijs Sterk`,
      series: "Archieffoto",
      year: index === 0 ? "Hoofdfoto" : `Foto ${index + 1}`,
      medium: "Fotografie",
      id: `portrait-${index}`
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
    <main className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className={cn("lg:col-span-5 space-y-8", !hasMultipleImages && "lg:sticky lg:top-24")}>
            {images.length > 0 ? (
              <div className={cn("grid gap-6", images.length === 2 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-1")}>
                {images.map((url: string, idx: number) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "relative overflow-hidden rounded-2xl shadow-2xl bg-secondary/20 transition-all duration-700 hover:scale-[1.02] cursor-pointer group",
                      idx === 0 ? "aspect-[3/4]" : "aspect-square"
                    )}
                    onClick={() => handlePortraitClick(url, idx)}
                  >
                    <Image 
                      src={url} 
                      alt={`Beatrijs Sterk - Foto ${idx + 1}`} 
                      fill 
                      className="object-cover" 
                      data-ai-hint="portrait artist woman"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20 cursor-pointer group"
                onClick={() => handlePortraitClick(defaultArchiveImageUrl, 0)}
              >
                <Image 
                  src={defaultArchiveImageUrl} 
                  alt="Beatrijs Sterk Archief" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02] grayscale" 
                  data-ai-hint="portrait woman"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <span className="text-accent font-black tracking-[0.3em] uppercase text-[10px] block">Dochter & Nalatenschap</span>
              <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">Beatrijs <span className="italic">Sterk</span></h1>
            </div>
            
            <div className="space-y-8 text-xl text-muted-foreground leading-relaxed font-light whitespace-pre-line border-l-2 border-accent/10 pl-8">
              {renderTextWithLinks(bioText)}
            </div>

            <div className="pt-12 border-t border-black/5 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Missie</h4>
                <p className="text-sm font-light leading-relaxed">Het verbinden van de persoonlijke geschiedenis met de publieke presentatie van het oeuvre.</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Focus</h4>
                <p className="text-sm font-light leading-relaxed">De context van het landschap van Groet en Schoorl in relatie tot de kunst.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ArtworkViewer 
        artwork={activeArtwork} 
        onClose={() => { setActiveArtwork(null); setSelectedArtworkId(null); }} 
      />
    </main>
  );
}
