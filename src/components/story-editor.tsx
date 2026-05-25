
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Type, 
  ImageIcon, 
  Maximize,
  ChevronUp,
  ChevronDown,
  Settings,
  Move,
  Grid3X3,
  Layers,
  MousePointer2,
  Heading1,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview StoryEditor (DTP Designer Edition).
 * Een WYSIWYG editor met absolute positionering en grid-snapping.
 */

export type StoryNode = {
  id: string;
  type: 'text' | 'image' | 'heading' | 'box';
  x: number; // Percentage 0-100
  y: number; // Pixels
  w: number; // Percentage 0-100
  h: number; // Pixels of auto
  content?: string;
  imageUrl?: string;
  styles: {
    fontSize?: string;
    fontFamily?: 'serif' | 'sans';
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    color?: string;
    borderRadius?: string;
    padding?: string;
    opacity?: number;
    zIndex?: number;
    italic?: boolean;
    fontWeight?: string;
  };
};

interface StoryEditorProps {
  blocks?: any[]; // Legacy support
  nodes?: StoryNode[];
  onChange: (data: { nodes: StoryNode[] }) => void;
}

export function StoryEditor({ nodes = [], onChange }: StoryEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string, startX: number, startY: number, nodeX: number, nodeY: number } | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedId);

  const addNode = (type: StoryNode['type']) => {
    const newNode: StoryNode = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 0,
      y: nodes.length > 0 ? Math.max(...nodes.map(n => n.y + n.h)) + 20 : 0,
      w: type === 'heading' || type === 'text' ? 100 : 50,
      h: type === 'heading' ? 80 : 150,
      content: type === 'heading' ? 'Nieuwe Titel' : type === 'text' ? 'Schrijf hier uw verhaal...' : '',
      styles: {
        fontFamily: 'serif',
        fontSize: type === 'heading' ? '3rem' : '1.2rem',
        zIndex: 10,
        padding: '0px'
      }
    };
    onChange({ nodes: [...nodes, newNode] });
    setSelectedId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<StoryNode>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    onChange({ nodes: newNodes });
  };

  const removeNode = (id: string) => {
    onChange({ nodes: nodes.filter(n => n.id !== id) });
    setSelectedId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, node: StoryNode) => {
    if (e.button !== 0) return; // Alleen linkermuisknop
    e.stopPropagation();
    setSelectedId(node.id);
    setIsDragging(true);

    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current || !canvasRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const canvasWidth = canvasRef.current.offsetWidth;
    const dxPercent = (dx / canvasWidth) * 100;

    let newX = dragRef.current.nodeX + dxPercent;
    let newY = dragRef.current.nodeY + dy;

    // Grid Snapping (12 columns = ~8.33% per step)
    const gridSizeX = 100 / 12;
    newX = Math.round(newX / gridSizeX) * gridSizeX;
    newY = Math.round(newY / 20) * 20; // 20px vertical snapping

    // Bounds
    newX = Math.max(0, Math.min(100 - (nodes.find(n => n.id === dragRef.current?.id)?.w || 0), newX));
    newY = Math.max(0, newY);

    updateNode(dragRef.current.id, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <div className="flex gap-8 h-[800px]">
      {/* 1. Palette */}
      <div className="w-20 shrink-0 flex flex-col gap-4 p-4 bg-white rounded-3xl shadow-xl border border-black/5">
        <button onClick={() => addNode('heading')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all" title="Koptekst"><Heading1 className="w-6 h-6" /></button>
        <button onClick={() => addNode('text')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all" title="Tekstblok"><Type className="w-6 h-6" /></button>
        <button onClick={() => addNode('image')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all" title="Afbeelding"><ImageIcon className="w-6 h-6" /></button>
        <button onClick={() => addNode('box')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all" title="Kader/Vlak"><Square className="w-6 h-6" /></button>
      </div>

      {/* 2. Canvas Area */}
      <div className="flex-1 bg-black/[0.02] rounded-[3rem] border-4 border-dashed border-black/5 relative overflow-hidden group">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div 
          ref={canvasRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden p-20 scrollbar-hide"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setSelectedId(null)}
        >
          <div className="relative w-full min-h-[2000px]">
             {nodes.map(node => (
               <div
                key={node.id}
                onPointerDown={(e) => handlePointerDown(e, node)}
                className={cn(
                  "absolute cursor-move select-none transition-shadow group/node",
                  selectedId === node.id ? "ring-2 ring-accent shadow-2xl z-50" : "hover:ring-1 ring-black/10 shadow-sm"
                )}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}px`,
                  width: `${node.w}%`,
                  height: node.h === 0 ? 'auto' : `${node.h}px`,
                  zIndex: node.styles?.zIndex || 10,
                  backgroundColor: node.type === 'box' ? (node.styles.backgroundColor || '#ddd') : 'transparent',
                  borderRadius: node.styles.borderRadius || '0px',
                  padding: node.styles.padding || '0px',
                  opacity: (node.styles.opacity ?? 100) / 100
                }}
               >
                 {node.type === 'heading' && (
                   <h2 className="font-headline italic leading-tight pointer-events-none" style={{ fontSize: node.styles.fontSize, textAlign: node.styles.textAlign as any, color: node.styles.color }}>{node.content}</h2>
                 )}
                 {node.type === 'text' && (
                   <p className={cn("leading-relaxed font-light pointer-events-none", node.styles.fontFamily === 'serif' ? "font-headline italic" : "font-sans")} style={{ fontSize: node.styles.fontSize, textAlign: node.styles.textAlign as any, color: node.styles.color }}>{node.content}</p>
                 )}
                 {node.type === 'image' && (
                   node.imageUrl ? <img src={node.imageUrl} className="w-full h-full object-cover rounded-[inherit] pointer-events-none" /> : <div className="w-full h-full bg-black/5 flex items-center justify-center text-[10px] uppercase font-black opacity-20">Foto URL nodig</div>
                 )}
                 
                 {selectedId === node.id && !isDragging && (
                   <div className="absolute -top-10 right-0 flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                     <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="bg-destructive text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Trash2 className="w-3 h-3" /></button>
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* 3. Properties Panel */}
      <Card className="w-80 shrink-0 p-8 rounded-[2.5rem] shadow-2xl border-none space-y-8 overflow-y-auto">
        {!selectedNode ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <MousePointer2 className="w-10 h-10" />
            <p className="text-xs font-black uppercase tracking-widest leading-relaxed">Selecteer een element<br/>om te stylen</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-accent">Element: {selectedNode.type}</h3>
               <div className="h-px bg-black/5" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[9px] font-black opacity-40 uppercase">Breedte (%)</label>
                 <Input type="number" value={selectedNode.w} onChange={e => updateNode(selectedNode.id, { w: Number(e.target.value) })} className="h-10 rounded-xl" />
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black opacity-40 uppercase">Hoogte (px)</label>
                 <Input type="number" value={selectedNode.h} onChange={e => updateNode(selectedNode.id, { h: Number(e.target.value) })} className="h-10 rounded-xl" />
               </div>
            </div>

            {(selectedNode.type === 'heading' || selectedNode.type === 'text') && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black opacity-40 uppercase">Inhoud</label>
                  <Textarea value={selectedNode.content} onChange={e => updateNode(selectedNode.id, { content: e.target.value })} className="min-h-[100px] rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black opacity-40 uppercase">Font Grootte</label>
                  <Input value={selectedNode.styles.fontSize} onChange={e => updateNode(selectedNode.id, { styles: { ...selectedNode.styles, fontSize: e.target.value } })} className="h-10 rounded-xl" />
                </div>
              </div>
            )}

            {selectedNode.type === 'image' && (
              <div className="space-y-4">
                <label className="text-[9px] font-black opacity-40 uppercase">Afbeelding URL</label>
                <Input value={selectedNode.imageUrl || ''} onChange={e => updateNode(selectedNode.id, { imageUrl: e.target.value })} className="h-10 rounded-xl" />
              </div>
            )}

            <div className="space-y-4">
               <label className="text-[9px] font-black opacity-40 uppercase">Stijl & Kleur</label>
               <div className="grid gap-4">
                  <Input placeholder="Kleur (bijv #000)" value={selectedNode.styles.color || ''} onChange={e => updateNode(selectedNode.id, { styles: { ...selectedNode.styles, color: e.target.value } })} className="h-10 rounded-xl" />
                  <Input placeholder="BG Kleur" value={selectedNode.styles.backgroundColor || ''} onChange={e => updateNode(selectedNode.id, { styles: { ...selectedNode.styles, backgroundColor: e.target.value } })} className="h-10 rounded-xl" />
                  <Input placeholder="Radius (bijv 2rem)" value={selectedNode.styles.borderRadius || ''} onChange={e => updateNode(selectedNode.id, { styles: { ...selectedNode.styles, borderRadius: e.target.value } })} className="h-10 rounded-xl" />
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[9px] font-black opacity-40 uppercase">Lagen (Z-Index)</label>
               <Input type="number" value={selectedNode.styles.zIndex || 10} onChange={e => updateNode(selectedNode.id, { styles: { ...selectedNode.styles, zIndex: Number(e.target.value) } })} className="h-10 rounded-xl" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

