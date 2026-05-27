"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { StoryRenderer } from '@/components/story-renderer';
import { StoryEditor, StoryNode } from '@/components/story-editor';
import { Loader2, Palette, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAGE_ID = 'hanneke';

export default function HannekeSterkPage() {
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localNodes, setLocalNodes] = useState<StoryNode[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const storyRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'stories', PAGE_ID);
  }, [firestore]);
  
  const { data: storyData, loading } = useDoc(storyRef);

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
      toast({ title: "Layout live opgeslagen" });
      setIsEditMode(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Fout bij opslaan" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <main className="min-h-screen bg-background pt-32 pb-48 relative">
      {isAdmin && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur-2xl p-3 rounded-full shadow-2xl border-2 border-accent/20">
          {!isEditMode ? (
            <Button onClick={() => setIsEditMode(true)} className="rounded-full bg-accent text-white px-8 h-12 uppercase font-black text-[10px] tracking-widest">
              <Edit3 className="w-4 h-4 mr-2" /> Start Ontwerpmodus
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-full bg-primary text-white px-8 h-12 uppercase font-black text-[10px] tracking-widest">
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Opslaan
              </Button>
              <Button onClick={() => setIsEditMode(false)} variant="outline" className="rounded-full h-12 px-6 uppercase font-black text-[10px] tracking-widest">
                <X className="w-4 h-4 mr-2" /> Stop
              </Button>
            </>
          )}
        </div>
      )}

      <div className="container mx-auto px-6 max-w-5xl">
        <div className={cn("mb-20 space-y-4 transition-all duration-700", isEditMode && "opacity-20 blur-sm pointer-events-none")}>
           <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-accent/5 border border-accent/10">
              <Palette className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Dochter & Archief</span>
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-light leading-tight">
             Hanneke <span className="italic">Sterk</span>
           </h1>
        </div>

        {isEditMode ? (
          <StoryEditor nodes={localNodes} onChange={(data) => setLocalNodes(data.nodes)} />
        ) : (
          localNodes.length > 0 ? <StoryRenderer nodes={localNodes} /> : <div className="py-20 text-center opacity-20 italic">Nog geen content ontworpen...</div>
        )}
      </div>
    </main>
  );
}
