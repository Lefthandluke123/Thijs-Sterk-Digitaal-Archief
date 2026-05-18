
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ArtistBio() {
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const firestore = useFirestore();

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

  const bioText = siteSettings?.homeBio || `Thijs Sterk (1913-1982) wijdde zijn leven aan het doorgronden van de atmosferische kwaliteiten van de Lage Landen.\n\n"Licht is niet iets dat op een object valt," schreef hij in 1954 in zijn dagboek, "het is de ruimte die tussen mij en de wereld ademt."`;
  const bioImageUrl = siteSettings?.homeBioImageUrl || 'https://firebasestorage.googleapis.com/v0/b/studio-7311695883-2090f.firebasestorage.app/o/artworks%2F1778851761925_vh0ad_2_I.jpg?alt=media';

  const renderTextWithLinks = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[\[(.*?)\|(.*?)\]\]/);
      if (match) {
        const [_, id, label] = match;
        return (
          <button
            key={i}
            onClick={() => { setSelectedArtworkId(id); setIsFullScreen(false); }}
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
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-accent" />
              <div 
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-muted/20 cursor-pointer group"
                onClick={() => setIsPreviewOpen(true)}
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
            </div>
          </div>
          
          <div className="lg:col-span-7 order-1 lg:order-2">
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">De Biografie</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8 leading-tight">Een leven gewijd aan de <span className="italic">Essentie</span></h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-light whitespace-pre-line">
              {renderTextWithLinks(bioText)}
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

      {/* Viewer voor Biografie Portret */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Portret Viewer</DialogTitle>
          <div className="relative h-[100vh] w-full flex items-center justify-center overflow-hidden bg-black/5">
            <img 
              src={bioImageUrl} 
              className="max-w-[90%] max-h-[90%] object-contain shadow-2xl" 
              alt="Thijs Sterk Portret"
            />
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewer voor gelinkte kunstwerken in tekst */}
      <Dialog open={!!selectedArtworkId} onOpenChange={(open) => { if (!open) setSelectedArtworkId(null); }}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Artwork Viewer</DialogTitle>
          <div 
            className={cn(
              "relative w-full flex items-center justify-center overflow-hidden bg-black/5 group transition-all duration-500 cursor-pointer",
              isFullScreen ? "h-[100vh]" : "h-[75vh]"
            )}
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
            {selectedArtwork && (
              <img 
                src={selectedArtwork.imageUrl} 
                className="max-w-full max-h-[90%] object-contain p-4 md:p-16 shadow-2xl transition-all duration-700" 
                style={{ 
                  clipPath: `inset(${selectedArtwork.cropTop || 0}% ${selectedArtwork.cropRight || 0}% ${selectedArtwork.cropBottom || 0}% ${selectedArtwork.cropLeft || 0}%)`, 
                  filter: `brightness(${selectedArtwork.brightness || 1})` 
                }} 
                alt={selectedArtwork.title}
              />
            )}
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl" onClick={(e) => e.stopPropagation()}>
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>
          <div className={cn(
            "w-full bg-background/95 backdrop-blur-md py-8 px-12 border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-500",
            isFullScreen ? "h-0 opacity-0 pointer-events-none py-0 px-0" : "h-[25vh] opacity-100"
          )}>
            <h2 className="text-[10px] md:text-[11px] font-black tracking-[0.4em] uppercase text-foreground/40 mb-4">{selectedArtwork?.title}</h2>
            <div className="text-[12px] md:text-[14px] uppercase font-black tracking-[0.5em] text-accent flex flex-wrap gap-x-12 gap-y-4 justify-center items-center">
              <span className="bg-accent/10 px-6 py-1.5 rounded-sm">Zaal: {selectedArtwork?.series}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.year}</span>
              <span className="w-2 h-2 rounded-full bg-accent/30 self-center hidden md:inline" />
              <span>{selectedArtwork?.medium}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
