"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Type, 
  Settings2, 
  Lock, 
  Unlock, 
  Save, 
  X, 
  Plus, 
  Minus,
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * @fileOverview InlineStyleEditor: Eenvoudige visuele typografie editor.
 * Maakt elementen selecteerbaar en past lettergroottes aan via CSS variabelen.
 */

export function InlineStyleEditor() {
  const [active, setActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    id: string;
    type: 'h1' | 'h2' | 'h3' | 'button' | 'nav';
    currentSize: number;
    isLocked: boolean;
    rect: DOMRect;
  } | null>(null);

  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: settings } = useDoc(settingsRef);

  // Toggle Edit Mode via Global Key or Button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Selection Logic
  useEffect(() => {
    if (!active) {
      setSelectedElement(null);
      document.body.classList.remove('edit-mode-active');
      return;
    }

    document.body.classList.add('edit-mode-active');

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const selectable = target.closest('h1, h2, h3, button, .nav-item-style') as HTMLElement;
      
      if (!selectable || target.closest('.dtp-toolbar')) return;

      e.preventDefault();
      e.stopPropagation();

      const type = selectable.tagName.toLowerCase() === 'button' 
        ? 'button' 
        : selectable.classList.contains('nav-item-style') 
          ? 'nav' 
          : selectable.tagName.toLowerCase() as any;

      // Get unique ID or create one based on content/index if not exists
      let dtpId = selectable.getAttribute('data-dtp-id');
      if (!dtpId) {
        dtpId = `dtp-${Math.random().toString(36).substr(2, 9)}`;
        selectable.setAttribute('data-dtp-id', dtpId);
      }

      const style = window.getComputedStyle(selectable);
      const fontSize = parseFloat(style.fontSize);

      const isLocked = !!settings?.typographyOverrides?.[dtpId];

      setSelectedElement({
        id: dtpId,
        type,
        currentSize: fontSize,
        isLocked,
        rect: selectable.getBoundingClientRect()
      });
    };

    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [active, settings]);

  const updateSize = async (newSize: number) => {
    if (!selectedElement || !settingsRef) return;

    setSelectedElement(prev => prev ? { ...prev, currentSize: newSize } : null);

    const typography = { ...(settings?.typography || {}) };
    const overrides = { ...(settings?.typographyOverrides || {}) };

    if (selectedElement.isLocked) {
      overrides[selectedElement.id] = { fontSize: newSize };
    } else {
      typography[selectedElement.type] = { fontSize: newSize };
    }

    try {
      await updateDoc(settingsRef, { typography, typographyOverrides: overrides });
    } catch (e) {
      toast({ variant: "destructive", title: "Opslaan mislukt" });
    }
  };

  const toggleLock = async () => {
    if (!selectedElement || !settingsRef) return;
    const newLocked = !selectedElement.isLocked;
    setSelectedElement(prev => prev ? { ...prev, isLocked: newLocked } : null);
    
    if (!newLocked) {
      const overrides = { ...(settings?.typographyOverrides || {}) };
      delete overrides[selectedElement.id];
      await updateDoc(settingsRef, { typographyOverrides: overrides });
    }
  };

  if (!active) return (
    <Button 
      onClick={() => setActive(true)} 
      className="fixed bottom-6 right-6 z-[100] rounded-full bg-accent text-white h-14 px-8 shadow-2xl uppercase font-black text-[10px] tracking-widest hover:scale-105 transition-all"
    >
      <Settings2 className="w-4 h-4 mr-2" /> Stijlen Bewerken
    </Button>
  );

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1 bg-accent z-[10000] animate-pulse" />
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-4 bg-white/90 backdrop-blur-3xl p-4 rounded-3xl shadow-2xl border border-accent/20 dtp-toolbar animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-3 pr-4 border-r border-black/10">
          <Type className="w-5 h-5 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest">Typografie Mode</span>
        </div>
        
        {selectedElement ? (
          <div className="flex items-center gap-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold uppercase opacity-40">{selectedElement.type}</span>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" onClick={() => updateSize(selectedElement.currentSize - 1)}><Minus className="w-3 h-3" /></Button>
                <span className="min-w-[40px] text-center font-mono font-bold text-sm">{Math.round(selectedElement.currentSize)}px</span>
                <Button size="icon" variant="outline" className="w-8 h-8 rounded-lg" onClick={() => updateSize(selectedElement.currentSize + 1)}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>

            <Button 
              onClick={toggleLock} 
              variant={selectedElement.isLocked ? "default" : "ghost"}
              className={cn("h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest", selectedElement.isLocked ? "bg-accent" : "opacity-40")}
            >
              {selectedElement.isLocked ? <Lock className="w-3.5 h-3.5 mr-2" /> : <Unlock className="w-3.5 h-3.5 mr-2" />}
              {selectedElement.isLocked ? "Uniek Element" : "Global Mode"}
            </Button>
          </div>
        ) : (
          <p className="text-[10px] italic opacity-40 px-10">Klik op een tekst om de grootte aan te passen</p>
        )}

        <Button onClick={() => setActive(false)} variant="ghost" className="h-10 w-10 rounded-full hover:bg-destructive hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {selectedElement && (
        <div 
          className="fixed pointer-events-none z-[9999] border-2 border-accent transition-all duration-200"
          style={{
            top: selectedElement.rect.top - 4,
            left: selectedElement.rect.left - 4,
            width: selectedElement.rect.width + 8,
            height: selectedElement.rect.height + 8,
            borderRadius: '4px'
          }}
        />
      )}
    </>
  );
}
