
"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Loader2, X, Filter, RefreshCcw, HelpCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GalleryPage() {
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [activeSeries, setActiveSeries] = useState<string>("Alle");
  const [hasImageErrors, setHasImageErrors] = useState(false);
  const firestore = useFirestore();
  
  const artworksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: artworks, loading, error } = useCollection(artworksQuery);

  const isExternalStorage = (url: string) => {
    if (!url) return false;
    return url.includes('quickconnect.to') || url.includes('direct.quickconnect.to') || url.includes('gofile.me') || url.includes('drive.google.com');
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
        <header className="mb-12 text-center max-w-3xl mx-auto animate-fade-in-up">
          <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">Portfolio</span>
          <h1 className="font-headline text-5xl md:text-6xl font-light mb-6">Kunst <span className="italic">Galerie</span></h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ontdek de volledige collectie van Thijs Sterk.
          </p>
        </header>

        {hasImageErrors && (
          <Alert className="mb-12 bg-amber-50 border-amber-200 max-w-4xl mx-auto rounded-2xl">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800">Probleem bij laden foto's</AlertTitle>
            <AlertDescription className="text-amber-700">
              Sommige afbeeldingen kunnen niet worden geladen. Dit kan komen doordat je niet op hetzelfde Wi-Fi netwerk zit als je NAS, of omdat de rechten in Web Station nog niet op "Iedereen" staan.
              <div className="mt-4">
                <Button variant="outline" size="sm" className="border-amber-400 text-amber-800 hover:bg-amber-100" onClick={() => window.open('https://192-168-178-15.doggyfew.direct.quickconnect.to/portfolio/', '_blank')}>
                  Test direct link naar NAS
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="text-muted-foreground animate-pulse text-sm uppercase tracking-widest">Collectie laden...</p>
          </div>
        ) : error ? (
          <div className="text-center py-24 border rounded-3xl border-dashed">
            <p className="text-destructive mb-4">Er ging iets mis bij het laden van de database.</p>
            <Button variant="outline" onClick={() => window.location.reload()}><RefreshCcw className="mr-2 w-4 h-4" /> Probeer opnieuw</Button>
          </div>
        ) : artworks && artworks.length > 0 ? (
          <>
            <div className="sticky top-24 z-30 bg-background/80 backdrop-blur-md py-4 mb-12 border-y border-border/50 animate-fade-in-up delay-100">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-0 px-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden md:block" />
                <div className="flex gap-2">
                  {seriesNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSeries(name)}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                        activeSeries === name 
                          ? "bg-accent border-accent text-accent-foreground shadow-md" 
                          : "bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-2xl font-light font-headline">
                  {activeSeries === "Alle" ? "Volledige Collectie" : activeSeries} 
                  <span className="text-muted-foreground text-sm ml-3 font-body">({filteredArtworks.length} werken)</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-fade-in-up delay-200">
                {filteredArtworks.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedArtwork(item)}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        unoptimized={isExternalStorage(item.imageUrl)}
                        onError={() => setHasImageErrors(true)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col items-center justify-center p-4 text-center">
                        <Maximize2 className="text-white w-5 h-5" />
                        <p className="text-white text-xs mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate w-full px-2">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24 border rounded-3xl border-dashed">
            <h3 className="text-xl font-light mb-2">Geen schilderijen gevonden</h3>
            <p className="text-muted-foreground mb-6">Er staan momenteel 0 werken in de database.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="mr-2 w-4 h-4" /> Ververs Pagina
              </Button>
              <Button asChild className="bg-accent text-white hover:bg-accent/90">
                <a href="/admin">Ga naar Beheer om werken toe te voegen</a>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl flex flex-col md:flex-row shadow-2xl">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {selectedArtwork && (
              <Image
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                fill
                className="object-contain p-4 md:p-8"
                unoptimized={isExternalStorage(selectedArtwork.imageUrl)}
              />
            )}
            <DialogClose className="absolute top-4 left-4 z-10 p-2 bg-background/20 backdrop-blur-md rounded-full text-white hover:bg-background/40 transition-colors">
              <X className="w-6 h-6" />
            </DialogClose>
          </div>
          <div className="w-full md:w-[400px] p-8 md:p-12 flex flex-col justify-center bg-background border-l border-border overflow-y-auto">
            <DialogHeader className="mb-8">
              <div className="text-accent font-medium tracking-widest uppercase text-xs mb-2">{selectedArtwork?.series}</div>
              <DialogTitle className="font-headline text-4xl font-light mb-2 leading-tight">{selectedArtwork?.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-base border-l-2 border-accent pl-4 italic">
                {selectedArtwork?.medium} &bull; {selectedArtwork?.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              <p className="text-foreground/80 leading-relaxed text-lg">{selectedArtwork?.description}</p>
              <div className="pt-8 border-t border-border flex flex-col gap-4">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-14 w-full shadow-lg shadow-primary/20">
                  Informeer over dit stuk
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
