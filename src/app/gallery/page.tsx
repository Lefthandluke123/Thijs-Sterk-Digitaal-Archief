
"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, RefreshCcw, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>("Alle");
  const [hasImageErrors, setHasImageErrors] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const firestore = useFirestore();
  
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('gofile.me') || url.includes('192-168');
  };

  const seriesNames = useMemo(() => {
    if (!artworks) return ["Alle"];
    const names = Array.from(new Set(artworks.map(art => art.series || "Andere")));
    return ["Alle", ...names.sort()];
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    if (!artworks) return [];
    if (activeSeries === "Alle") return artworks;
    return artworks.filter(art => (art.series || "Andere") === activeSeries);
  }, [artworks, activeSeries]);

  return (
    <main className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="container mx-auto">
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <span className="text-accent font-medium tracking-widest uppercase text-xs mb-3 block">Portfolio</span>
          <h1 className="font-headline text-5xl md:text-6xl font-light mb-6">Kunst <span className="italic">Galerie</span></h1>
          
          <Button 
            variant="outline" 
            onClick={() => setShowHelp(!showHelp)}
            className="rounded-full px-8 bg-yellow-400/20 font-bold border-yellow-500/50"
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            PROBLEMEN MET LADEN? KLIK HIER
          </Button>
        </header>

        {(hasImageErrors || showHelp) && (
          <Alert className="mb-12 bg-amber-50 border-amber-400 max-w-4xl mx-auto rounded-3xl shadow-xl p-8 border-4">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
              <div className="space-y-4 w-full">
                <AlertTitle className="text-amber-900 text-2xl font-bold">Herstel je NAS Verbinding</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm space-y-4">
                  <p>Als je lege vakjes ziet, blokkeert je browser de verbinding met je NAS. Volg deze twee stappen:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/50 p-4 rounded-xl border border-amber-200">
                      <h4 className="font-bold mb-2">Stap 1: Open de Link</h4>
                      <p className="mb-4 text-xs">Klik op de knop. Zie je een rood scherm? Typ <b>thisisunsafe</b> op je toetsenbord. Zie je daarna &quot;403 Forbidden&quot;? Dat is goed! Ga dan naar Stap 2.</p>
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => window.open('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/', '_blank')}
                      >
                        Open NAS Verbinding
                      </Button>
                    </div>
                    
                    <div className="bg-white/50 p-4 rounded-xl border border-amber-200">
                      <h4 className="font-bold mb-2">Stap 2: Pagina Verversen</h4>
                      <p className="mb-4 text-xs">Kom terug naar dit tabblad en klik op verversen. De browser &quot;vertrouwt&quot; de link nu en de foto&apos;s verschijnen.</p>
                      <Button 
                        variant="secondary"
                        className="w-full border-amber-300"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" /> Ververs Pagina
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-muted-foreground animate-pulse text-[10px] uppercase tracking-widest">Collectie laden...</p>
          </div>
        ) : artworks && artworks.length > 0 ? (
          <>
            <div className="sticky top-20 z-30 bg-background/60 backdrop-blur-md py-4 mb-10 border-y border-border/30">
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
                {seriesNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setActiveSeries(name)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                      activeSeries === name ? "bg-accent text-white" : "bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {filteredArtworks.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedArtwork(item)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-md bg-muted/30">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      unoptimized={isExternalStorage(item.imageUrl)}
                      onError={() => setHasImageErrors(true)}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 className="text-white w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl">
            <h3 className="text-lg font-headline">Nog geen schilderijen</h3>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col md:flex-row bg-background/95 backdrop-blur-xl border-none">
          <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-4 md:p-12"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
              />
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-2 bg-black/50 rounded-full text-white">
              <X className="w-5 h-5" />
            </DialogClose>
          </div>
          <div className="w-full md:w-[350px] p-8 flex flex-col justify-center bg-background border-l border-border/50">
            <DialogHeader className="mb-6">
              <div className="text-accent font-bold uppercase text-[10px] mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-3xl font-light mb-2">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="italic text-xs">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-foreground/80 leading-relaxed text-sm">{selectedArtwork?.description}</p>
              <div className="pt-6 border-t border-border/50 flex flex-col gap-2">
                <Button className="rounded-full w-full">Informeer nu</Button>
                <div className="text-[9px] text-muted-foreground break-all bg-muted/50 p-2 rounded italic">
                  Link: {selectedArtwork?.imageUrl}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
