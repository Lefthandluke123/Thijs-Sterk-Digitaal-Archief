
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

  const { data: artworks, loading, error } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('quickconnect.to') || 
           lowerUrl.includes('gofile.me') || 
           lowerUrl.includes('192-168') || 
           lowerUrl.includes('192.168');
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
          
          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto">
              Ontdek de volledige collectie van Thijs Sterk.
            </p>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setShowHelp(!showHelp)}
              className="mt-4 border-accent text-accent hover:bg-accent hover:text-white rounded-full px-8 bg-yellow-400/20 font-bold"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              AFBEELDINGEN LADEN NIET? KLIK HIER
            </Button>
          </div>
        </header>

        {(hasImageErrors || showHelp) && (
          <Alert className="mb-12 bg-amber-50 border-amber-400 max-w-4xl mx-auto rounded-3xl shadow-xl border-4 p-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
              <div className="space-y-4 w-full">
                <AlertTitle className="text-amber-900 text-2xl font-bold">Hulp bij het laden van afbeeldingen</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm space-y-4">
                  <p className="font-medium">Browsers blokkeren vaak de verbinding met een NAS. Volg deze stappen:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/50 p-4 rounded-xl border border-amber-200">
                      <h4 className="font-bold mb-2">Stap 1: Verbinding Forceren</h4>
                      <p className="mb-4 text-xs">Klik op de knop hieronder. Er opent een nieuw tabblad. Als je een waarschuwing krijgt, typ dan <b>thisisunsafe</b> op je toetsenbord (zonder ergens te klikken).</p>
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => window.open('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/', '_blank')}
                      >
                        Open NAS & Forceer SSL
                      </Button>
                    </div>
                    
                    <div className="bg-white/50 p-4 rounded-xl border border-amber-200">
                      <h4 className="font-bold mb-2">Stap 2: Galerie Verversen</h4>
                      <p className="mb-4 text-xs">Zodra je de NAS in het andere tabblad ziet (ook al staat er "403 Forbidden"), kom je terug en klik je op verversen.</p>
                      <Button 
                        variant="secondary"
                        className="w-full border-amber-300"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" /> Ververs deze Pagina
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
            <p className="text-muted-foreground animate-pulse text-[10px] uppercase tracking-[0.2em]">Collectie laden...</p>
          </div>
        ) : artworks && artworks.length > 0 ? (
          <>
            <div className="sticky top-20 z-30 bg-background/60 backdrop-blur-md py-3 mb-10 border-y border-border/30">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar px-2">
                <div className="flex gap-1.5">
                  {seriesNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSeries(name)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-widest uppercase transition-all whitespace-nowrap",
                        activeSeries === name 
                          ? "bg-accent text-accent-foreground shadow-sm" 
                          : "bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h2 className="text-xl font-light font-headline">
                  {activeSeries === "Alle" ? "Volledige Collectie" : activeSeries} 
                  <span className="text-muted-foreground text-xs ml-3 font-body opacity-60">({filteredArtworks.length} werken)</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {filteredArtworks.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedArtwork(item)}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-md bg-muted/30 transition-all duration-500 hover:shadow-lg">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        unoptimized={isExternalStorage(item.imageUrl)}
                        onError={() => setHasImageErrors(true)}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col items-center justify-center p-4">
                        <Maximize2 className="text-white w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
        ) : (
          <div className="text-center py-24 border rounded-2xl border-dashed">
            <h3 className="text-lg font-light mb-2">Geen schilderijen gevonden</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Er staan nog geen werken in de database.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl flex flex-col md:flex-row shadow-2xl">
          <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-4 md:p-12"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
                onError={() => setHasImageErrors(true)}
              />
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-1.5 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors">
              <X className="w-5 h-5" />
            </DialogClose>
          </div>
          <div className="w-full md:w-[320px] p-8 flex flex-col justify-center bg-background border-l border-border/50 overflow-y-auto">
            <DialogHeader className="mb-6">
              <div className="text-accent font-semibold tracking-widest uppercase text-[9px] mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-3xl font-light mb-2 leading-tight">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs border-l border-accent pl-3 italic">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-foreground/80 leading-relaxed text-sm">{selectedArtwork?.description}</p>
              <div className="pt-6 border-t border-border/50">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-10 w-full text-xs font-semibold shadow-md">
                  Informeer nu
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
