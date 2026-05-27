"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  Lock, 
  Unlock, 
  X, 
  Plus, 
  Minus,
  CheckCircle2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * @fileOverview InlineStyleEditor: Visuele typografie editor met Firestore persistentie.
 * Activatie via Cmd+E of Ctrl+E - ALLEEN VOOR BEHEERDERS.
 */

export function InlineStyleEditor() {
  const [active, setActive] = useState(false);
  const [isSaving, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [selectedElement, setSelectedElement] = useState<{
    id: string;
    type: 'h1' | 'h2' | 'h3' | 'button' | 'nav';
    currentSize: number;
    isLocked: boolean;
    rect: DOMRect;
  } | null>(null);

  const firestore = useFirestore();
  const settingsRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: settings } = useDoc(settingsRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true';
        if (!isAdmin) return;

        e.preventDefault();
        const newState = !active;
        setActive(newState);
        
        if (newState) {
          toast({ 
            title: "Style Editor Actief", 
            description: "Klik op een element om de lettergrootte aan te passen." 
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

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

      let dtpId = selectable.getAttribute('data-dtp-id');
      if (!dtpId) {
        const index = Array.from(document.querySelectorAll(selectable.tagName)).indexOf(selectable);
        const textHint = selectable.innerText.substring(0, 10).replace(/\s+/g, '-').toLowerCase();
        dtpId = `dtp-${type}-${index}-${textHint}`;
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
    setIsSubmitting(true);

    const typography = { ...(settings?.typography || {}) };
    const overrides = { ...(settings?.typographyOverrides || {}) };

    if (selectedElement.isLocked) {
      overrides[selectedElement.id] = { fontSize: newSize };
    } else {
      typography[selectedElement.type] = { fontSize: newSize };
    }

    try {
      await updateDoc(settingsRef, { 
        typography, 
        typographyOverrides: overrides,
        lastStyleUpdate: new Date().toISOString()
      });
      setLastSaved(Date.now());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
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

  if (!active) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1 bg-accent z-[10000] animate-pulse" />
      
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-4 bg-white/90 backdrop-blur-3xl p-4 rounded-3xl shadow-2xl border border-accent/20 dtp-toolbar animate-in slide-in-from-bottom-10">
        <div className="flex items-center gap-3 pr-4 border-r border-black/10">
          <Type className="w-5 h-5 text-accent" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Typografie</span>
            {isSaving ? (
              <span className="text-[8px] font-bold text-accent animate-pulse mt-1">Opslaan...</span>
            ) : lastSaved ? (
              <span className="text-[8px] font-bold text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-2 h-2" /> Opgeslagen
              </span>
            ) : null}
          </div>
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
              className={cn(
                "h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                selectedElement.isLocked ? "bg-accent text-white shadow-md" : "opacity-40 hover:opacity-100"
              )}
            >
              {selectedElement.isLocked ? <Lock className="w-3.5 h-3.5 mr-2" /> : <Unlock className="w-3.5 h-3.5 mr-2" />}
              {selectedElement.isLocked ? "Uniek" : "Globaal"}
            </Button>
          </div>
        ) : (
          <p className="text-[10px] italic opacity-40 px-10">Klik op een tekst of knop om de grootte aan te passen</p>
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
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.1)'
          }}
        />
      )}
    </>
  );
}
