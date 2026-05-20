
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeepZoomViewer } from './deep-zoom-viewer';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const { language, t } = useLanguage();
  const firestore = useFirestore();

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  useEffect(() => {
    if (!artwork) {
      setShowMetadata(false);
    }
  }, [artwork]);

  const translateSeries = (name: string) => {
    if (language === 'nl' || !siteSettings || !name) return name;
    return siteSettings.seriesTranslations?.[language]?.[name] || name;
  };

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-black border-none rounded-none overflow-hidden outline-none shadow-none fixed inset-0 translate-x-0 translate-y-0 left-0 top-0 z-[100]">
        <DialogTitle className="sr-only">Deep Zoom Artwork Viewer</DialogTitle>
        
        <div className="relative flex-1 bg-black overflow-hidden">
          {artwork && (
            <DeepZoomViewer 
              imageUrl={artwork.imageUrl} 
              title={artwork.displayTitle || artwork.title} 
              brightness={artwork.brightness}
            />
          )}

          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-20">
            {onPrev && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPrev(); }} 
                className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn"
                title={t('viewer_prev')}
              >
                <ChevronLeft className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            )}
            {onNext && (
              <button 
                onClick={(e) => { e.stopPropagation(); onNext(); }} 
                className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn"
                title={t('viewer_next')}
              >
                <ChevronRight className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <div className="absolute top-8 right-8 z-[110] flex items-center gap-4">
             <button 
               onClick={() => setShowMetadata(!showMetadata)}
               className={cn(
                 "p-3 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl",
                 showMetadata ? "bg-accent text-accent-foreground" : "bg-black/40 text-white hover:bg-black/60"
               )}
               title={showMetadata ? t('viewer_hide_info') : t('viewer_show_info')}
             >
               <Info className="w-6 h-6" />
             </button>
             <DialogClose 
               className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-destructive hover:text-white transition-all shadow-2xl border border-white/10" 
             >
               <X className="w-6 h-6 opacity-60" />
             </DialogClose>
          </div>

          <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-700 ease-in-out z-[105]",
            showMetadata ? "h-[18vh] opacity-100 py-6 px-12 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12"
          )}>
            <div className="max-w-4xl mx-auto space-y-3">
              <h2 className="text-xl md:text-3xl font-headline font-light italic text-foreground tracking-tight">
                {artwork?.displayTitle || artwork?.title}
              </h2>
              <div className="text-[12px] md:text-[13px] font-bold tracking-[0.15em] text-accent flex flex-wrap gap-x-6 gap-y-2 justify-center items-center">
                <span className="uppercase opacity-70">{t('viewer_room')}: {translateSeries(artwork?.series)}</span>
                <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
                <span className="italic">{artwork?.year || t('viewer_unknown_year')}</span>
                {artwork?.dimensions && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
                    <span>{artwork?.dimensions}</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-accent/30 self-center hidden md:inline" />
                <span className="uppercase tracking-widest">{artwork?.medium}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
