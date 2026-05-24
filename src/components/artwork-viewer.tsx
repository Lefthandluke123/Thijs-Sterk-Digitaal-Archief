"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Info, Mic, Play, Pause, Video, Share2, Facebook, Link as LinkIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeepZoomViewer, type DeepZoomHandle } from './deep-zoom-viewer';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/hooks/use-toast';

interface ArtworkViewerProps {
  artwork: any | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkViewer({ artwork, onClose, onPrev, onNext }: ArtworkViewerProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const zoomRef = useRef<DeepZoomHandle>(null);
  
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
      if (audio) audio.pause();
      setIsPlaying(false);
      setIsAnimating(false);
      setIsSharing(false);
    }
  }, [artwork, audio]);

  useEffect(() => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
    const currentAudioUrl = artwork?.audioUrls?.[language] || artwork?.audioUrls?.['nl'];
    if (currentAudioUrl) {
      const newAudio = new Audio(currentAudioUrl);
      newAudio.onended = () => setIsPlaying(false);
      setAudio(newAudio);
    } else {
      setAudio(null);
    }
  }, [artwork, language]);

  const toggleAudio = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const translateSeries = (name: string) => {
    if (language === 'nl' || !siteSettings || !name) return name;
    return siteSettings.seriesTranslations?.[language]?.[name] || name;
  };

  const startDemo = () => {
    zoomRef.current?.startReveal();
  };

  const handleShareFacebook = () => {
    if (!artwork || !firestore) return;
    
    setIsSharing(true);
    
    // Turbo-Share: Directe ID generatie
    const roomsCollection = collection(firestore, 'shared_rooms');
    const newRoomRef = doc(roomsCollection);
    const roomId = newRoomRef.id;
    const shareUrl = `${window.location.origin}/shared/${roomId}`;

    const roomData = {
      title: artwork.displayTitle || artwork.title,
      description: `Bekijk dit werk van Thijs Sterk in Deep Zoom.`,
      artworkIds: [artwork.id],
      createdAt: serverTimestamp(),
      lang: language,
      sharedFrom: 'viewer'
    };

    // Non-blocking write
    setDoc(newRoomRef, roomData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newRoomRef.path,
          operation: 'create',
          requestResourceData: roomData
        }));
      });

    // Directe actie voor de bezoeker
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`Bekijk dit meesterwerk van Thijs Sterk in de interactieve Zen-Modus: ${artwork.displayTitle || artwork.title}`)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
    setIsSharing(false);
    toast({ title: "Facebook-venster geopend" });
  };

  const copyShareLink = () => {
    if (!artwork || !firestore) return;
    
    setIsSharing(true);

    const roomsCollection = collection(firestore, 'shared_rooms');
    const newRoomRef = doc(roomsCollection);
    const roomId = newRoomRef.id;
    const shareUrl = `${window.location.origin}/shared/${roomId}`;

    const roomData = {
      title: artwork.displayTitle || artwork.title,
      description: `Privé Deep Zoom sessie.`,
      artworkIds: [artwork.id],
      createdAt: serverTimestamp(),
      lang: language,
      sharedFrom: 'viewer'
    };

    setDoc(newRoomRef, roomData)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: newRoomRef.path,
          operation: 'create',
          requestResourceData: roomData
        }));
      });

    // Direct op klembord zetten
    navigator.clipboard.writeText(shareUrl);
    toast({ 
      title: "Gekopieerd!", 
      description: "De link naar de interactieve Zen-Modus staat op uw klembord." 
    });
    setIsSharing(false);
  };

  return (
    <Dialog open={!!artwork} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-black border-none rounded-none overflow-hidden outline-none shadow-none fixed inset-0 translate-x-0 translate-y-0 left-0 top-0 z-[100]">
        <DialogTitle className="sr-only">Deep Zoom Artwork Viewer</DialogTitle>
        
        <div className="relative flex-1 bg-black overflow-hidden">
          {artwork && (
            <DeepZoomViewer 
              ref={zoomRef}
              imageUrl={artwork.imageUrl} 
              title={artwork.displayTitle || artwork.title} 
              brightness={artwork.brightness}
              onRevealStart={() => setIsAnimating(true)}
              onRevealEnd={() => setIsAnimating(false)}
            />
          )}

          <div className={cn("absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none z-20 transition-opacity", isAnimating ? "opacity-0" : "opacity-100")}>
            {onPrev && (
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn" title={t('viewer_prev')}><ChevronLeft className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" /></button>
            )}
            {onNext && (
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-5 rounded-full bg-black/20 backdrop-blur-md pointer-events-auto hover:bg-black/40 transition-all shadow-2xl border border-white/10 group/btn" title={t('viewer_next')}><ChevronRight className="w-10 h-10 text-white opacity-40 group-hover/btn:opacity-100 transition-opacity" /></button>
            )}
          </div>

          <div className={cn("absolute top-8 right-8 z-[110] flex items-center gap-4 transition-opacity", isAnimating ? "opacity-0 pointer-events-none" : "opacity-100")}>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button 
                  disabled={isSharing}
                  className="p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all shadow-2xl flex items-center gap-3 text-white group disabled:opacity-50"
                 >
                    {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{t('viewer_share')}</span>
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-2xl border-white/10 text-white p-2 min-w-[200px] rounded-2xl shadow-2xl">
                 <DropdownMenuItem onClick={handleShareFacebook} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer focus:bg-accent focus:text-accent-foreground transition-all">
                    <Facebook className="w-4 h-4 text-[#1877F2]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Facebook</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={copyShareLink} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer focus:bg-accent focus:text-accent-foreground transition-all">
                    <LinkIcon className="w-4 h-4 text-accent" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">{t('viewer_copy_link')}</span>
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>

             <button 
                onClick={startDemo} 
                className="p-4 rounded-full bg-accent text-accent-foreground backdrop-blur-xl border-2 border-white/20 hover:scale-110 active:scale-95 transition-all shadow-2xl flex items-center gap-3 animate-in zoom-in duration-500"
                title={t('viewer_social_reveal')}
             >
                <Video className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{t('viewer_social_reveal')}</span>
             </button>

             {audio && (
               <button onClick={toggleAudio} className={cn("p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all flex items-center gap-3 shadow-2xl", isPlaying ? "bg-accent text-accent-foreground" : "bg-black/40 text-white")}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPlaying ? t('viewer_telling') : t('viewer_listen_story')}</span>
               </button>
             )}
             <button onClick={() => setShowMetadata(!showMetadata)} className={cn("p-4 rounded-full backdrop-blur-xl border border-white/10 transition-all shadow-2xl", showMetadata ? "bg-accent text-accent-foreground" : "bg-black/40 text-white hover:bg-black/60")} title={showMetadata ? t('viewer_hide_info') : t('viewer_show_info')}><Info className="w-5 h-5" /></button>
             <DialogClose className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-destructive transition-all shadow-2xl border border-white/10"><X className="w-5 h-5 opacity-60" /></DialogClose>
          </div>

          <div className={cn("absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border/10 flex flex-col items-center justify-center overflow-y-auto text-center transition-all duration-700 ease-in-out z-[105]", (showMetadata && !isAnimating) ? "h-[18vh] opacity-100 py-6 px-12 translate-y-0" : "h-0 opacity-0 pointer-events-none translate-y-12")}>
            <div className="max-w-4xl mx-auto space-y-3">
              <h2 className="text-xl md:text-3xl font-headline font-light italic text-foreground tracking-tight">{artwork?.displayTitle || artwork?.title}</h2>
              <div className="text-[12px] md:text-[13px] font-bold tracking-[0.15em] text-accent flex flex-wrap gap-x-6 gap-y-2 justify-center items-center">
                <span className="uppercase opacity-70">{t('viewer_room')}: {translateSeries(artwork?.series)}</span>
                <span className="w-1 h-1 rounded-full bg-accent/30 hidden md:inline" />
                <span className="italic">{artwork?.year || t('viewer_unknown_year')}</span>
                <span className="w-1 h-1 rounded-full bg-accent/30 hidden md:inline" />
                <span className="uppercase tracking-widest">{artwork?.medium}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
