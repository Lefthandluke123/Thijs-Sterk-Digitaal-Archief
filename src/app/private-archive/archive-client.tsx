
"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { normalizePrivatePhoto, PRIVATE_ALBUMS } from '@/lib/museum-utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Users, 
  Map, 
  Hammer, 
  Music, 
  Heart,
  Loader2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Het besloten privéfoto-archief.
 * Focus op masonry layout, albums en een warme "depot" sfeer.
 */
export function ArchiveClient() {
  const firestore = useFirestore();
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Alle');
  const [viewerPhoto, setViewerPhoto] = useState<any | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const photosQuery = useMemo(() => {
    if (!firestore) return null;
    let base = query(collection(firestore, 'privatePhotos'), orderBy('createdAt', 'desc'));
    if (selectedAlbum !== 'Alle') {
      base = query(collection(firestore, 'privatePhotos'), where('album', '==', selectedAlbum), orderBy('createdAt', 'desc'));
    }
    return base;
  }, [firestore, selectedAlbum]);

  const { data: dbPhotos, loading } = useCollection(photosQuery);

  const photos = useMemo(() => {
    if (!dbPhotos) return [];
    return dbPhotos.map(p => normalizePrivatePhoto(p.id, p));
  }, [dbPhotos]);

  const ALBUM_ICONS: Record<string, any> = {
    'Familie': Heart,
    'Reizen': Map,
    'Atelier': Hammer,
    'Achter de schermen': Camera,
    'Muzikanten': Music,
    'Persoonlijke momenten': Users,
    'Alle': Layers
  };

  const handleNext = () => {
    const idx = photos.findIndex(p => p.id === viewerPhoto.id);
    if (idx < photos.length - 1) setViewerPhoto(photos[idx + 1]);
    else setViewerPhoto(photos[0]);
  };

  const handlePrev = () => {
    const idx = photos.findIndex(p => p.id === viewerPhoto.id);
    if (idx > 0) setViewerPhoto(photos[idx - 1]);
    else setViewerPhoto(photos[photos.length - 1]);
  };

  return (
    <main className="min-h-screen bg-[#fcfcf9] pt-32 pb-48 px-6 relative">
      {/* Atmosferische achtergrond texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <header className="mb-20 space-y-8">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-12">
              <div className="space-y-4">
                 <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
                    <Camera className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Besloten Archiefkamer</span>
                 </div>
                 <h1 className="font-headline text-5xl md:text-7xl font-light leading-tight">
                   Het <span className="italic text-accent">Privé</span> Depot
                 </h1>
                 <p className="text-sm text-muted-foreground font-light max-w-md italic border-l-2 border-accent/20 pl-6">
                    "Achter elk schilderij schuilt een leven. In deze kamer bewaren we de fragmenten van die werkelijkheid."
                 </p>
              </div>
           </div>

           <div className="flex flex-wrap gap-3">
              {['Alle', ...PRIVATE_ALBUMS].map(album => {
                const Icon = ALBUM_ICONS[album] || Camera;
                return (
                  <button 
                    key={album}
                    onClick={() => setSelectedAlbum(album)}
                    className={cn(
                      "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                      selectedAlbum === album 
                        ? "bg-accent text-white shadow-xl scale-105" 
                        : "bg-white border hover:border-accent/30 text-black/40"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {album}
                  </button>
                );
              })}
           </div>
        </header>

        {loading ? (
          <div className="py-48 flex flex-col items-center gap-4 opacity-20">
             <Loader2 className="w-10 h-10 animate-spin" />
             <span className="text-[10px] font-black uppercase tracking-widest">Archief wordt geopend...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="py-48 text-center space-y-6 opacity-20 italic">
             <Camera className="w-16 h-16 mx-auto mb-4" />
             <p className="font-headline text-2xl">Geen foto's gevonden in dit album.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8 animate-in fade-in duration-1000">
             {photos.map((photo) => (
               <div 
                 key={photo.id}
                 onClick={() => setViewerPhoto(photo)}
                 className="break-inside-avoid group cursor-pointer"
               >
                  <Card className="p-4 rounded-[2rem] bg-white border-none shadow-md hover:shadow-2xl transition-all duration-700 hover:-translate-y-2 overflow-hidden group">
                     <div className="relative aspect-auto rounded-2xl overflow-hidden bg-black/5">
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.title}
                          className="w-full h-auto object-cover transition-transform duration-2000 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <div className="p-4 rounded-full bg-white/20 backdrop-blur-xl scale-90 group-hover:scale-100 transition-transform">
                              <Maximize2 className="text-white w-6 h-6" />
                           </div>
                        </div>
                     </div>
                     <div className="pt-6 px-2 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                           <h3 className="font-headline text-lg italic leading-tight group-hover:text-accent transition-colors">{photo.title}</h3>
                           <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-black/5 bg-black/[0.02] shrink-0">{photo.album}</Badge>
                        </div>
                        {photo.year && <p className="text-[9px] font-black uppercase tracking-widest text-accent/40">{photo.year}</p>}
                     </div>
                  </Card>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Fullscreen Photo Viewer */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-[2000] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-700">
           <button 
             onClick={() => setViewerPhoto(null)}
             className="absolute top-10 right-10 p-4 rounded-full bg-black/5 hover:bg-destructive hover:text-white transition-all z-10"
           >
             <X className="w-6 h-6" />
           </button>

           <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
              <button onClick={handlePrev} className="pointer-events-auto p-6 rounded-full bg-black/5 hover:bg-accent hover:text-white transition-all active:scale-90"><ChevronLeft className="w-10 h-10" /></button>
              <button onClick={handleNext} className="pointer-events-auto p-6 rounded-full bg-black/5 hover:bg-accent hover:text-white transition-all active:scale-90"><ChevronRight className="w-10 h-10" /></button>
           </div>

           <div className="relative max-w-5xl max-h-[75vh] w-full h-full flex items-center justify-center">
              <img 
                key={viewerPhoto.id}
                src={viewerPhoto.imageUrl} 
                alt={viewerPhoto.title}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl animate-in zoom-in-95 duration-1000"
              />
              
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={cn(
                  "absolute bottom-4 right-4 p-3 rounded-full transition-all shadow-xl",
                  showInfo ? "bg-accent text-white" : "bg-white/80 text-black hover:bg-white"
                )}
              >
                <Info className="w-5 h-5" />
              </button>
           </div>

           <div className={cn(
             "mt-12 text-center max-w-2xl space-y-4 transition-all duration-1000",
             showInfo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
           )}>
              <h2 className="font-headline text-3xl italic">{viewerPhoto.title}</h2>
              <div className="flex items-center justify-center gap-6 py-2 border-y border-black/5">
                 <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">{viewerPhoto.year || 'Onbekend jaar'}</span>
                 </div>
                 <div className="w-1 h-1 rounded-full bg-black/10" />
                 <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">{viewerPhoto.album}</span>
                 </div>
              </div>
              <p className="text-muted-foreground font-light leading-relaxed whitespace-pre-line italic">
                {viewerPhoto.description || 'Geen beschrijving beschikbaar.'}
              </p>
           </div>

           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-30">
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Archief NR: {viewerPhoto.id.substring(0,6)}</span>
           </div>
        </div>
      )}
    </main>
  );
}
