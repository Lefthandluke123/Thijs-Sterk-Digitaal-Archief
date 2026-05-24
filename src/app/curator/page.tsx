"use client";

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Play, Eraser, Share2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArtworkViewer } from '@/components/artwork-viewer';
import { useLanguage } from '@/components/language-provider';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const TAG_CATEGORIES = {
  "Periode": ["Vroeg werk", "45-50", "50-60", "60-70", "70-82"],
  "Techniek": ["Olieverf", "Aquarel", "Gouache"],
  "Monumentaal": ["Monumentaal", "Glas in lood"],
  "Plaats": ["Groet", "Schoorl", "Hargen", "Camperduin", "Holland", "Amsterdam", "Frankrijk", "Bretagne", "Griekenland"],
  "Onderwerp": ["Havens", "Stillevens", "Bloemen", "Dieren", "Water", "Mensen", "Polder"]
};

export default function CuratorPage() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDialog, setShareDialog] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState("");
  
  const firestore = useFirestore();
  const { t, language } = useLanguage();
  
  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArtworks, loading } = useCollection(artworksQuery);

  const artworks = useMemo(() => {
    if (!dbArtworks) return [];
    const seen = new Set();
    return dbArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [dbArtworks]);

  const filteredArtworks = useMemo(() => {
    if (activeTags.length === 0) return [];
    return artworks.filter((art: any) => activeTags.every(tag => art.tags?.includes(tag)));
  }, [artworks, activeTags]);

  const handleShare = () => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Systeemfout", description: "Database niet verbonden." });
      return;
    }
    
    if (filteredArtworks.length === 0) {
      toast({ variant: "destructive", title: "Lege selectie", description: "Kies eerst enkele werken om te delen." });
      return;
    }

    setIsSharing(true);
    toast({ title: "Moment...", description: "Uw privékamer wordt klaargezet." });

    const roomData = {
      title: roomTitle || "Mijn Expositie",
      description: `Een gecureerde selectie door een bezoeker van The Digital Retrospective.`,
      artworkIds: filteredArtworks.map(a => (a as any).id),
      createdAt: serverTimestamp(),
      lang: language
    };

    addDoc(collection(firestore, 'shared_rooms'), roomData)
      .then((docRef) => {
        const url = `${window.location.origin}/shared/${docRef.id}`;
        setShareDialog(url);
        setIsSharing(false);
        toast({ title: "Privékamer gereed!", description: "De link is gegenereerd." });
      })
      .catch(async (err) => {
        setIsSharing(false);
        const permissionError = new FirestorePermissionError({
          path: 'shared_rooms',
          operation: 'create',
          requestResourceData: roomData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Link gekopieerd!", description: "U kunt deze nu delen op social media." });
  };

  return (
    <main className="min-h-screen bg-background pt-32 pb-48 px-6">
      <div className="container mx-auto max-w-5xl text-center space-y-12">
        <div className="space-y-4">
          <h1 className="font-headline text-5xl md:text-7xl font-light italic text-accent">{t('curator_title')}</h1>
          <p className="text-[13px] font-bold uppercase tracking-[0.4em] opacity-40">{t('curator_subtitle')}</p>
        </div>

        <div className="grid gap-10 text-left">
          {Object.entries(TAG_CATEGORIES).map(([cat, tags]) => (
            <div key={cat} className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/60 border-b border-accent/10 pb-2">{cat}</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const active = activeTags.includes(tag);
                  return (
                    <button 
                      key={tag} 
                      onClick={() => { 
                        setActiveTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]); 
                        setShowResults(false); 
                      }} 
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[13px] font-bold uppercase transition-all border-2", 
                        active ? "bg-accent text-accent-foreground border-accent scale-105 shadow-lg" : "bg-white hover:border-accent/40"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-8 pt-12">
          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={() => { setActiveTags([]); setShowResults(false); }} variant="outline" className="rounded-full h-14 px-10 uppercase font-black text-[11px]">
              <Eraser className="w-4 h-4 mr-2" /> {t('curator_clear')}
            </Button>
            <Button 
              onClick={() => setShowResults(true)} 
              disabled={activeTags.length === 0} 
              className="rounded-full h-14 px-16 bg-primary text-primary-foreground uppercase font-black text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 mr-2" /> {t('curator_open')}
            </Button>
            {showResults && filteredArtworks.length > 0 && (
              <Button onClick={() => setShareDialog("")} className="rounded-full h-14 px-10 bg-accent text-accent-foreground uppercase font-black text-[11px] shadow-xl animate-in zoom-in duration-300">
                <Share2 className="w-4 h-4 mr-2" /> Deel Expositie
              </Button>
            )}
          </div>
        </div>

        {showResults && (
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredArtworks.map((item: any) => (
              <div key={item.id} className="group cursor-pointer space-y-4" onClick={() => setSelectedArtwork(item)}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted/20 shadow-lg transition-all duration-700 group-hover:shadow-2xl">
                  <img 
                    src={item.imageUrl} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    style={{ 
                      filter: `brightness(${item.brightness || 1})`, 
                      clipPath: `inset(${item.cropTop || 0}% ${item.cropRight || 0}% ${item.cropBottom || 0}% ${item.cropLeft || 0}%)` 
                    }} 
                    alt={item.title}
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="text-white w-8 h-8" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                    {item.displayTitle || item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={shareDialog !== null} onOpenChange={(open) => !open && setShareDialog(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl italic">Expositie Delen</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-60">
              Creëer een unieke link naar uw selectie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {shareDialog === "" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-40">Titel van uw kamer</Label>
                  <Input 
                    value={roomTitle} 
                    onChange={(e) => setRoomTitle(e.target.value)} 
                    placeholder="Bijv. Licht over de Polder" 
                    className="h-14 rounded-2xl bg-black/5 border-none focus:ring-accent" 
                  />
                </div>
                <Button 
                  onClick={handleShare} 
                  disabled={isSharing} 
                  className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black uppercase tracking-widest text-[11px]"
                >
                  {isSharing ? <Loader2 className="animate-spin" /> : "Link Genereren"}
                </Button>
              </div>
            ) : shareDialog ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="p-6 bg-black/5 rounded-2xl break-all font-mono text-[11px] border border-black/5 leading-relaxed text-accent">
                   {shareDialog}
                 </div>
                 <Button 
                    onClick={() => copyToClipboard(shareDialog)} 
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px]"
                 >
                   <Copy className="w-4 h-4 mr-2" /> Kopieer Link
                 </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ArtworkViewer artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
    </main>
  );
}