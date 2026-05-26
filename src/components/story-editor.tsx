
"use client";

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Type, ImageIcon, Heading1, Square, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      y: nodes.length > 0 ? Math.max(...nodes.map(n => n.y + (n.h || 0))) + 40 : 0,
      w: type === 'heading' || type === 'text' ? 100 : 50,
      h: type === 'heading' ? 80 : 250,
      content: type === 'heading' ? 'Nieuwe Titel' : type === 'text' ? 'Tekst hier...' : '',
      styles: {
        fontFamily: 'serif',
        fontSize: type === 'heading' ? '3rem' : '1.25rem',
        zIndex: 10,
        padding: '0px'
      }
    };
    onChange({ nodes: [...nodes, newNode] });
    setSelectedId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<StoryNode>) => {
    onChange({ nodes: nodes.map(n => n.id === id ? { ...n, ...updates } : n) });
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
    
    // Snapping
    newX = Math.round(newX / 2) * 2;
    newY = Math.round(newY / 10) * 10;

    const node = nodes.find(n => n.id === dragRef.current?.id);
    if(node) {
      newX = Math.max(0, Math.min(100 - node.w, newX));
      newY = Math.max(0, newY);
      updateNode(dragRef.current.id, { x: newX, y: newY });
    }
  };

  return (
    <div className="flex flex-col gap-6 h-[75vh]">
      <header className="flex items-center justify-between p-4 bg-white rounded-full shadow-lg border">
         <div className="flex gap-2">
           <Button onClick={() => addNode('heading')} variant="outline" size="sm" className="rounded-full"><Heading1 className="w-4 h-4 mr-2" /> Kop</Button>
           <Button onClick={() => addNode('text')} variant="outline" size="sm" className="rounded-full"><Type className="w-4 h-4 mr-2" /> Tekst</Button>
           <Button onClick={() => addNode('image')} variant="outline" size="sm" className="rounded-full"><ImageIcon className="w-4 h-4 mr-2" /> Beeld</Button>
           <Button onClick={() => addNode('box')} variant="outline" size="sm" className="rounded-full"><Square className="w-4 h-4 mr-2" /> Kader</Button>
         </div>
      </header>

      <div className="flex-1 flex gap-6 min-h-0">
        <div 
          className="flex-1 bg-black/[0.02] rounded-[2.5rem] border-2 border-dashed relative overflow-y-auto p-10 md:p-20 scrollbar-hide"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setIsDragging(false)}
          ref={canvasRef}
        >
          {nodes.map(node => (
            <div
              key={node.id}
              onPointerDown={(e) => handlePointerDown(e, node)}
              className={cn(
                "absolute cursor-move select-none transition-shadow",
                selectedId === node.id ? "ring-2 ring-accent shadow-xl z-50" : "hover:ring-1 ring-accent/20"
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
              {node.type === 'heading' && <h2 className="font-headline italic leading-tight" style={{ fontSize: node.styles.fontSize }}>{node.content}</h2>}
              {node.type === 'text' && <p className="font-light leading-relaxed whitespace-pre-line">{node.content}</p>}
              {node.type === 'image' && (node.imageUrl ? <img src={node.imageUrl} className="w-full h-full object-cover rounded-[inherit]" alt="DTP" /> : <div className="w-full h-full bg-black/5 flex items-center justify-center opacity-20">Foto nodig</div>)}
              
              {selectedId === node.id && (
                <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="absolute -top-4 -right-4 bg-destructive text-white p-2 rounded-full shadow-lg"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto">
          {!selectedNode ? (
            <Card className="p-8 h-full flex flex-col items-center justify-center text-center opacity-30 italic">
               <MousePointer2 className="w-8 h-8 mb-4" />
               <p className="text-xs">Klik op een element om het te bewerken</p>
            </Card>
          ) : (
            <Card className="p-6 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-accent">Instellingen: {selectedNode.type}</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[8px] uppercase opacity-40">Breedte %</label><Input type="number" value={selectedNode.w} onChange={e => updateNode(selectedNode.id, { w: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><label className="text-[8px] uppercase opacity-40">Hoogte px</label><Input type="number" value={selectedNode.h} onChange={e => updateNode(selectedNode.id, { h: Number(e.target.value) })} /></div>
                </div>

                {selectedNode.type === 'image' ? (
                  <div className="space-y-1"><label className="text-[8px] uppercase opacity-40">Beeld URL</label><Input value={selectedNode.imageUrl || ''} onChange={e => updateNode(selectedNode.id, { imageUrl: e.target.value })} /></div>
                ) : (
                  <div className="space-y-1"><label className="text-[8px] uppercase opacity-40">Inhoud</label><Textarea value={selectedNode.content} onChange={e => updateNode(selectedNode.id, { content: e.target.value })} className="min-h-[120px]" /></div>
                )}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
