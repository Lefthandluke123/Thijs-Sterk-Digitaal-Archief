
"use client";

import React, { useState, useEffect } from 'react';
import { Hero } from '@/components/sections/hero';
import { PortfolioGrid } from '@/components/sections/portfolio-grid';
import { ArtistBio } from '@/components/sections/artist-bio';
import { ContactForm } from '@/components/sections/contact-form';
import { IntroductionGallery } from '@/components/sections/introduction-gallery';
import { Toaster } from '@/components/ui/toaster';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { ChevronRight, Layers, Edit3, Save, X, Palette, LayoutTemplate } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { StoryRenderer } from '@/components/story-renderer';
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAGE_ID = 'home';

export default function Home() {
  const firestore = useFirestore();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localNodes, setLocalNodes] = useState<StoryNode[]>([]);

  useEffect(() => {
    // Voor het prototype checken we simpelweg of de admin_auth vlag aan staat
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const storyRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'stories', PAGE_ID);
  }, [firestore]);
  
  const { data: storyData } = useDoc(storyRef);

  useEffect(() => {
    if (storyData?.nodes) {
      setLocalNodes(storyData.nodes);
    }
  }, [storyData]);

  const handleSave = async () => {
    if (!storyRef) return;
    setIsSaving(true);
    try {
      await setDoc(storyRef, { nodes: localNodes, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Homepage ontwerp live opgeslagen" });
      setIsEditMode(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSaving(false);
    }
  };

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore]);
  const { data: rooms } = useCollection(roomsQuery);

  return (
    <main className="min-h-screen bg-transparent pt-16 md:pt-32 relative">
      {/* Admin Live Toolbar */}
      {isAdmin && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border-2 border-accent/20">
          {!isEditMode ? (
            <Button onClick={() => setIsEditMode(true)} className="rounded-full bg-accent text-white px-8 h-12 uppercase font-black text-[10px] tracking-widest">
              <Edit3 className="w-4 h-4 mr-2" /> Ontwerp Homepage
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-full bg-primary text-white px-8 h-12 uppercase font-black text-[10px] tracking-widest">
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan
              </Button>
              <Button onClick={() => setIsEditMode(false)} variant="outline" className="rounded-full h-12 px-6 uppercase font-black text-[10px] tracking-widest">
                <X className="w-4 h-4 mr-2" /> Sluiten
              </Button>
            </>
          )}
        </div>
      )}

      {isEditMode ? (
        <div className="container mx-auto px-6 pt-10">
          <div className="mb-8 p-6 bg-accent/5 rounded-[2rem] border border-accent/10 text-center flex items-center justify-center gap-4">
            <LayoutTemplate className="w-5 h-5 text-accent" />
            <p className="text-xs font-bold uppercase tracking-widest text-accent">DTP Mode: Versleep elementen op de homepage</p>
          </div>
          <StoryEditor 
            nodes={localNodes} 
            onChange={(data) => setLocalNodes(data.nodes)} 
          />
        </div>
      ) : (
        <>
          {/* Als er DTP nodes zijn, toon die bovenaan of in plaats van de Hero */}
          {localNodes.length > 0 && <StoryRenderer nodes={localNodes} />}
          
          {/* De standaard secties fungeren nu als 'Master Page' content */}
          <Hero />
          <IntroductionGallery />

          <section className="py-24 px-4 bg-secondary/5" aria-labelledby="rooms-heading">
            <div className="container mx-auto max-w-7xl">
              <div className="text-center mb-20 space-y-6">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/5 border border-accent/10 mx-auto">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{t('homeRoomsBadge')}</span>
                </div>
                <h2 id="rooms-heading" className="font-headline text-4xl md:text-5xl font-light italic text-foreground">
                  {t('homeRoomsTitle')}
                </h2>
                <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
                  {t('homeRoomsSubtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {rooms?.map((room: any) => (
                  <Link 
                    key={room.id} 
                    href={`/room/${room.slug}`}
                    className="group p-10 bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-black/5 hover:bg-white hover:shadow-2xl transition-all hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-accent"
                  >
                    <h3 className="font-headline text-3xl mb-4 italic group-hover:text-accent transition-colors">{room.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-light">{room.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                      Betreed Zaal <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <PortfolioGrid />
          <ArtistBio />
          <ContactForm />
        </>
      )}
      
      <Toaster />
    </main>
  );
}
