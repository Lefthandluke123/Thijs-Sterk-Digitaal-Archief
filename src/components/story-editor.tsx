
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  Type, 
  ImageIcon, 
  Heading1,
  Square,
  MousePointer2,
  Layers,
  Palette,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StoryNode = {
  id: string;
  type: 'text' | 'image' | 'heading' | 'box';
  x: number;
  y: number;
  w: number;
  h: number;
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
      y: nodes.length > 0 ? Math.max(...nodes.map(n => n.y + (n.h || 0))) + 20 : 0,
      w: type === 'heading' || type === 'text' ? 100 : 50,
      h: type === 'heading' ? 80 : 200,
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

  const updateNodeStyles = (id: string, styles: Partial<StoryNode['styles']>) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, { styles: { ...node.styles, ...styles } });
  };

  const removeNode = (id: string) => {
    onChange({ nodes: nodes.filter(n => n.id !== id) });
    setSelectedId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, node: StoryNode) => {
    if (e.button !== 0) return;
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

    // Grid Snapping (12 columns)
    const gridSizeX = 100 / 12;
    newX = Math.round(newX / gridSizeX) * gridSizeX;
    newY = Math.round(newY / 20) * 20;

    newX = Math.max(0, Math.min(100 - (nodes.find(n => n.id === dragRef.current?.id)?.w || 0), newX));
    newY = Math.max(0, newY);

    updateNode(dragRef.current.id, { x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <div className="flex gap-8 h-[75vh] min-h-[600px] animate-in fade-in duration-1000">
      {/* 1. Palette */}
      <div className="w-20 shrink-0 flex flex-col gap-4 p-4 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border-2 border-accent/10">
        <button onClick={() => addNode('heading')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all text-accent" title="Koptekst"><Heading1 className="w-6 h-6" /></button>
        <button onClick={() => addNode('text')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all text-accent" title="Tekstblok"><Type className="w-6 h-6" /></button>
        <button onClick={() => addNode('image')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all text-accent" title="Afbeelding"><ImageIcon className="w-6 h-6" /></button>
        <button onClick={() => addNode('box')} className="p-3 rounded-2xl hover:bg-accent hover:text-white transition-all text-accent" title="Kader/Vlak"><Square className="w-6 h-6" /></button>
      </div>

      {/* 2. Canvas Area */}
      <div className="flex-1 bg-black/[0.01] rounded-[3rem] border-4 border-dashed border-accent/5 relative overflow-hidden group shadow-inner">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(var(--accent)_1px,transparent_1px)] [background-size:40px_40px]" />
        
        <div 
          ref={canvasRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden p-10 md:p-20 scrollbar-hide"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setSelectedId(null)}
        >
          <div className="relative w-full min-h-[1500px]">
             {nodes.map(node => (
               <div
                key={node.id}
                onPointerDown={(e) => handlePointerDown(e, node)}
                className={cn(
                  "absolute cursor-move select-none transition-shadow group/node",
                  selectedId === node.id ? "ring-2 ring-accent shadow-2xl z-[100]" : "hover:ring-1 ring-accent/20 shadow-sm"
                )}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}px`,
                  width: `${node.w}%`,
                  height: node.h === 0 ? 'auto' : `${node.h}px`,
                  zIndex: node.styles?.zIndex || 10,
                  backgroundColor: node.type === 'box' ? (node.styles.backgroundColor || '#eee') : 'transparent',
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
                   node.imageUrl ? <img src={node.imageUrl} className="w-full h-full object-cover rounded-[inherit] pointer-events-none shadow-lg" alt="DTP Node" /> : <div className="w-full h-full bg-black/5 flex items-center justify-center text-[10px] uppercase font-black opacity-20 border border-dashed rounded-xl">Foto URL nodig</div>
                 )}
                 
                 {selectedId === node.id && !isDragging && (
                   <div className="absolute -top-12 right-0 flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                     <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="bg-destructive text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* 3. Properties Panel */}
      <Card className="w-80 shrink-0 p-8 rounded-[3rem] shadow-2xl border-none space-y-10 overflow-y-auto bg-white/95 backdrop-blur-2xl">
        {!selectedNode ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent/20 flex items-center justify-center"><MousePointer2 className="w-8 h-8" /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Selecteer een element<br/>om te stylen</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                 <Layers className="w-3.5 h-3.5" /> Element: {selectedNode.type}
               </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Breedte (%)</label>
                 <Input type="number" value={selectedNode.w} onChange={e => updateNode(selectedNode.id, { w: Number(e.target.value) })} className="h-10 rounded-xl bg-black/5 border-none font-bold" />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Hoogte (px)</label>
                 <Input type="number" value={selectedNode.h} onChange={e => updateNode(selectedNode.id, { h: Number(e.target.value) })} className="h-10 rounded-xl bg-black/5 border-none font-bold" />
               </div>
            </div>

            {(selectedNode.type === 'heading' || selectedNode.type === 'text') && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Inhoud</label>
                  <Textarea value={selectedNode.content} onChange={e => updateNode(selectedNode.id, { content: e.target.value })} className="min-h-[120px] rounded-xl text-sm leading-relaxed p-4 bg-black/5 border-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Grootte</label>
                    <Input value={selectedNode.styles.fontSize} onChange={e => updateNodeStyles(selectedNode.id, { fontSize: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Font</label>
                    <select 
                      value={selectedNode.styles.fontFamily} 
                      onChange={e => updateNodeStyles(selectedNode.id, { fontFamily: e.target.value as any })}
                      className="w-full h-10 rounded-xl bg-black/5 border-none text-[10px] font-bold uppercase px-3 outline-none"
                    >
                      <option value="serif">Klassiek</option>
                      <option value="sans">Modern</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.type === 'image' && (
              <div className="space-y-4">
                <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Foto Bron (URL)</label>
                <Input value={selectedNode.imageUrl || ''} onChange={e => updateNode(selectedNode.id, { imageUrl: e.target.value })} className="h-12 rounded-xl bg-black/5 border-none text-xs" placeholder="https://..." />
              </div>
            )}

            <div className="space-y-6 pt-6 border-t border-black/5">
               <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3" /> Stijl & Kleur</label>
               <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Tekstkleur" value={selectedNode.styles.color || ''} onChange={e => updateNodeStyles(selectedNode.id, { color: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                    <Input placeholder="Achtergrond" value={selectedNode.styles.backgroundColor || ''} onChange={e => updateNodeStyles(selectedNode.id, { backgroundColor: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Radius (bijv 2rem)" value={selectedNode.styles.borderRadius || ''} onChange={e => updateNodeStyles(selectedNode.id, { borderRadius: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                    <Input type="number" placeholder="Z-Index" value={selectedNode.styles.zIndex || 10} onChange={e => updateNodeStyles(selectedNode.id, { zIndex: Number(e.target.value) })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                  </div>
               </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
