
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, Maximize2 } from 'lucide-react';

export default function PeterBesPage() {
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
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

  const bioText = siteSettings?.peterBesBio || `Peter Bes was een leerling van Thijs Sterk. Onder de vleugels van zijn meester ontwikkelde hij een eigen vormentaal.`;
  
  const images = siteSettings?.peterBesBioImages || [];
  const hasMultipleImages = images.length > 1;

  const renderTextWithLinks = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[\[(.*?)\|(.*?)\]\]/);
      if (match) {
        const [_, id, label] = match;
        return (
          <button
            key={i}
            onClick={() => setSelectedArtworkId(id)}
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
                    onClick={() => setPreviewImageUrl(url)}
                  >
                    <Image 
                      src={url} 
                      alt={`Peter Bes - Foto ${idx + 1}`} 
                      fill 
                      className="object-cover" 
                      data-ai-hint="portrait artist man"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                    </div>
                    <div className="absolute bottom-4 right-4 z-10 opacity-20 text-[8px] uppercase tracking-widest text-white font-bold bg-black/40 px-2 py-1 rounded-sm">
                      &copy; Peter Bes
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-secondary/20 cursor-pointer group"
                onClick={() => setPreviewImageUrl("https://picsum.photos/seed/peterbes/800/1000")}
              >
                <Image 
                  src="https://picsum.photos/seed/peterbes/800/1000" 
                  alt="Peter Bes Default" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                  data-ai-hint="portrait artist man"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white w-8 h-8 drop-shadow-2xl" />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <span className="text-accent font-black tracking-[0.3em] uppercase text-[10px] block">Leerling & Kunstenaar</span>
              <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">Peter <span className="italic">Bes</span></h1>
            </div>
            
            <div className="space-y-8 text-xl text-muted-foreground leading-relaxed font-light whitespace-pre-line border-l-2 border-accent/10 pl-8">
              {renderTextWithLinks(bioText)}
            </div>

            <div className="pt-12 border-t border-black/5 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Mentorschap</h4>
                <p className="text-sm font-light leading-relaxed">De invluence van Thijs Sterk op de ontwikkeling van de Noord-Hollandse schilderkunst.</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Herinnering</h4>
                <p className="text-sm font-light leading-relaxed">Verhalen uit het atelier die de mens achter de schilder Thijs Sterk belichten.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer voor Portretten */}
      <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Portrait Viewer</DialogTitle>
          <div className="relative h-[100vh] w-full flex items-center justify-center overflow-hidden bg-black/5">
            {previewImageUrl && (
              <img src={previewImageUrl} className="max-w-[90%] max-h-[90%] object-contain shadow-2xl" alt="Peter Bes Portrait" />
            )}
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewer voor Gelinkte Kunstwerken */}
      <Dialog open={!!selectedArtworkId} onOpenChange={() => setSelectedArtworkId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none rounded-none overflow-hidden outline-none">
          <DialogTitle className="sr-only">Artwork Viewer</DialogTitle>
          <div className="relative h-[75vh] w-full flex items-center justify-center overflow-hidden bg-black/5 group">
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
            <DialogClose className="absolute top-8 right-8 z-50 p-3 bg-background/10 backdrop-blur-sm rounded-full hover:bg-background/20 transition-all shadow-xl">
              <X className="w-6 h-6 opacity-40" />
            </DialogClose>
          </div>
          <div className="h-[25vh] w-full bg-background/95 backdrop-blur-md py-8 px-12 border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center">
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
    </main>
  );
}
