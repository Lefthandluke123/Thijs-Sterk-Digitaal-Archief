
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Maximize2,
  RotateCcw,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Settings2,
  Copy,
  ArrowUp,
  ArrowDown,
  Grid3X3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    backgroundColor?: string;
    color?: string;
    borderRadius?: string;
    padding?: string;
    opacity?: number;
    zIndex?: number;
    italic?: boolean;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    borderWidth?: string;
    borderColor?: string;
    boxShadow?: string;
  };
  responsive?: {
    mobile?: Partial<StoryNode['styles']>;
    tablet?: Partial<StoryNode['styles']>;
  };
};

interface StoryEditorProps {
  nodes?: StoryNode[];
  onChange: (data: { nodes: StoryNode[] }) => void;
}

type EditorViewMode = 'desktop' | 'tablet' | 'mobile';

export function StoryEditor({ nodes = [], onChange }: StoryEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<EditorViewMode>('desktop');
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<StoryNode[][]>([nodes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string, startX: number, startY: number, nodeX: number, nodeY: number } | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedId);

  // Undo / Redo logic
  const pushToHistory = useCallback((newNodes: StoryNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newNodes);
    if (newHistory.length > 50) newHistory.shift(); // Limit history
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChange({ nodes: prev });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChange({ nodes: next });
    }
  };

  const addNode = (type: StoryNode['type']) => {
    const newNode: StoryNode = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 0,
      y: nodes.length > 0 ? Math.max(...nodes.map(n => n.y + (n.h || 0))) + 40 : 0,
      w: type === 'heading' || type === 'text' ? 100 : 50,
      h: type === 'heading' ? 80 : 250,
      content: type === 'heading' ? 'Nieuwe Titel' : type === 'text' ? 'Schrijf hier uw verhaal...' : '',
      styles: {
        fontFamily: 'serif',
        fontSize: type === 'heading' ? '4rem' : '1.25rem',
        zIndex: 10,
        padding: '0px',
        textAlign: 'left',
        color: 'inherit',
        lineHeight: '1.2',
      }
    };
    const newNodes = [...nodes, newNode];
    onChange({ nodes: newNodes });
    pushToHistory(newNodes);
    setSelectedId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<StoryNode>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    onChange({ nodes: newNodes });
    // Note: Don't push to history on every mouse move, handled onPointerUp
  };

  const updateNodeStyles = (id: string, styles: Partial<StoryNode['styles']>) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newNodes = nodes.map(n => n.id === id ? { 
      ...n, 
      styles: { ...n.styles, ...styles } 
    } : n);
    onChange({ nodes: newNodes });
    pushToHistory(newNodes);
  };

  const removeNode = (id: string) => {
    const newNodes = nodes.filter(n => n.id !== id);
    onChange({ nodes: newNodes });
    pushToHistory(newNodes);
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

    // Snapping Logic
    const colWidth = 100 / 12;
    newX = Math.round(newX / colWidth) * colWidth;
    newY = Math.round(newY / 10) * 10; // Vertical snap

    const node = nodes.find(n => n.id === dragRef.current?.id);
    if (node) {
      newX = Math.max(0, Math.min(100 - node.w, newX));
      newY = Math.max(0, newY);
      updateNode(dragRef.current.id, { x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      pushToHistory(nodes);
    }
    setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col gap-6 h-[85vh] min-h-[700px] animate-in fade-in duration-1000">
      {/* 1. Editor Header / Toolbar */}
      <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-2xl rounded-full shadow-lg border border-accent/10">
        <div className="flex items-center gap-2">
          <div className="flex bg-black/5 p-1 rounded-full mr-4">
            <button onClick={() => setViewMode('desktop')} className={cn("p-2.5 rounded-full transition-all", viewMode === 'desktop' ? "bg-white shadow-sm text-accent" : "text-black/40 hover:text-accent")}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('tablet')} className={cn("p-2.5 rounded-full transition-all", viewMode === 'tablet' ? "bg-white shadow-sm text-accent" : "text-black/40 hover:text-accent")}><Tablet className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('mobile')} className={cn("p-2.5 rounded-full transition-all", viewMode === 'mobile' ? "bg-white shadow-sm text-accent" : "text-black/40 hover:text-accent")}><Smartphone className="w-4 h-4" /></button>
          </div>
          <div className="h-6 w-px bg-black/10 mx-2" />
          <button onClick={undo} disabled={historyIndex === 0} className="p-2.5 rounded-full text-black/40 hover:text-accent disabled:opacity-20"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2.5 rounded-full text-black/40 hover:text-accent disabled:opacity-20"><RotateCw className="w-4 h-4" /></button>
          <div className="h-6 w-px bg-black/10 mx-2" />
          <button onClick={() => setShowGrid(!showGrid)} className={cn("p-2.5 rounded-full transition-all", showGrid ? "text-accent bg-accent/5" : "text-black/40")}><Grid3X3 className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => addNode('heading')} variant="outline" className="rounded-full h-11 px-6 text-[10px] font-black uppercase tracking-widest"><Heading1 className="w-4 h-4 mr-2" /> Kop</Button>
          <Button onClick={() => addNode('text')} variant="outline" className="rounded-full h-11 px-6 text-[10px] font-black uppercase tracking-widest"><Type className="w-4 h-4 mr-2" /> Tekst</Button>
          <Button onClick={() => addNode('image')} variant="outline" className="rounded-full h-11 px-6 text-[10px] font-black uppercase tracking-widest"><ImageIcon className="w-4 h-4 mr-2" /> Beeld</Button>
          <Button onClick={() => addNode('box')} variant="outline" className="rounded-full h-11 px-6 text-[10px] font-black uppercase tracking-widest"><Square className="w-4 h-4 mr-2" /> Kader</Button>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* 2. DTP Canvas */}
        <div className="flex-1 relative bg-black/[0.02] rounded-[3rem] border-2 border-black/5 overflow-hidden shadow-inner flex justify-center">
          <div 
            className={cn(
              "relative bg-white shadow-2xl transition-all duration-700 overflow-y-auto scrollbar-hide",
              viewMode === 'desktop' ? "w-full" : viewMode === 'tablet' ? "w-[768px]" : "w-[375px]"
            )}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => setSelectedId(null)}
            ref={canvasRef}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-12 gap-4 px-10 md:px-20 z-0">
                {Array.from({length: 12}).map((_, i) => (
                  <div key={i} className="h-full bg-accent/[0.02] border-x border-accent/[0.03]" />
                ))}
              </div>
            )}

            <div className="relative w-full min-h-[1500px] p-10 md:p-20 z-10">
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
                    backgroundColor: node.type === 'box' ? (node.styles.backgroundColor || '#f4f4f2') : 'transparent',
                    borderRadius: node.styles.borderRadius || '0px',
                    padding: node.styles.padding || '0px',
                    opacity: (node.styles.opacity ?? 100) / 100,
                    borderWidth: node.styles.borderWidth || '0px',
                    borderColor: node.styles.borderColor || 'transparent',
                    borderStyle: 'solid',
                    boxShadow: node.styles.boxShadow || 'none'
                  }}
                 >
                   {node.type === 'heading' && (
                     <h2 
                      className="font-headline italic leading-tight pointer-events-none" 
                      style={{ 
                        fontSize: node.styles.fontSize, 
                        textAlign: node.styles.textAlign as any, 
                        color: node.styles.color,
                        fontWeight: node.styles.fontWeight,
                        letterSpacing: node.styles.letterSpacing,
                        textTransform: node.styles.textTransform as any
                      }}
                     >
                       {node.content}
                     </h2>
                   )}
                   {node.type === 'text' && (
                     <p 
                      className={cn("leading-relaxed font-light pointer-events-none", node.styles.fontFamily === 'serif' ? "font-headline italic" : "font-sans")} 
                      style={{ 
                        fontSize: node.styles.fontSize, 
                        textAlign: node.styles.textAlign as any, 
                        color: node.styles.color,
                        lineHeight: node.styles.lineHeight,
                        fontWeight: node.styles.fontWeight
                      }}
                     >
                       {node.content}
                     </p>
                   )}
                   {node.type === 'image' && (
                     node.imageUrl ? (
                       <img src={node.imageUrl} className="w-full h-full object-cover rounded-[inherit] pointer-events-none shadow-lg" alt="DTP" />
                     ) : (
                       <div className="w-full h-full bg-black/5 flex items-center justify-center text-[9px] uppercase font-black opacity-20 border border-dashed rounded-xl">Foto nodig</div>
                     )
                   )}
                   
                   {selectedId === node.id && !isDragging && (
                     <div className="absolute -top-14 right-0 flex gap-1 animate-in fade-in slide-in-from-bottom-2 p-1 bg-white rounded-full shadow-2xl border border-accent/10">
                       <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="bg-destructive text-white p-2.5 rounded-full hover:scale-110 transition-transform"><Trash2 className="w-3.5 h-3.5" /></button>
                       <button onClick={(e) => { e.stopPropagation(); updateNodeStyles(node.id, { zIndex: (node.styles.zIndex || 10) + 1 }); }} className="p-2.5 rounded-full hover:bg-black/5 transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>
                       <button onClick={(e) => { e.stopPropagation(); updateNodeStyles(node.id, { zIndex: Math.max(1, (node.styles.zIndex || 10) - 1) }); }} className="p-2.5 rounded-full hover:bg-black/5 transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* 3. DTP Properties Panel */}
        <aside className="w-85 shrink-0 overflow-y-auto scrollbar-hide flex flex-col gap-6">
          {!selectedNode ? (
            <Card className="h-full p-10 rounded-[3rem] shadow-xl border-none flex flex-col items-center justify-center text-center opacity-30">
              <MousePointer2 className="w-12 h-12 mb-6" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Selecteer een frame<br/>om te bewerken</p>
            </Card>
          ) : (
            <Card className="p-8 rounded-[3rem] shadow-xl border-none space-y-10 bg-white/95 backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-black/5 pb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Frame: {selectedNode.type}
                </h3>
                <span className="text-[9px] font-mono opacity-30">#{selectedNode.id}</span>
              </div>

              <div className="space-y-8">
                <section className="space-y-4">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-3 h-3" /> Dimensies</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] opacity-40 uppercase ml-2">Breedte (%)</span>
                      <Input type="number" value={selectedNode.w} onChange={e => updateNode(selectedNode.id, { w: Number(e.target.value) })} className="h-10 rounded-xl bg-black/5 border-none font-bold text-xs" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] opacity-40 uppercase ml-2">Hoogte (px)</span>
                      <Input type="number" value={selectedNode.h} onChange={e => updateNode(selectedNode.id, { h: Number(e.target.value) })} className="h-10 rounded-xl bg-black/5 border-none font-bold text-xs" />
                    </div>
                  </div>
                </section>

                {(selectedNode.type === 'heading' || selectedNode.type === 'text') && (
                  <section className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Inhoud</label>
                      <Textarea value={selectedNode.content} onChange={e => updateNode(selectedNode.id, { content: e.target.value })} className="min-h-[140px] rounded-2xl text-sm leading-relaxed p-5 bg-black/5 border-none resize-none" />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-black/5">
                      <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><Type className="w-3 h-3" /> Typografie</label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Grootte (bv 4rem)" value={selectedNode.styles.fontSize} onChange={e => updateNodeStyles(selectedNode.id, { fontSize: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                        <Select value={selectedNode.styles.fontFamily} onValueChange={v => updateNodeStyles(selectedNode.id, { fontFamily: v as any })}>
                          <SelectTrigger className="h-10 rounded-xl bg-black/5 border-none text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="serif">Klassiek (Serif)</SelectItem><SelectItem value="sans">Modern (Sans)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex bg-black/5 p-1 rounded-xl">
                        <button onClick={() => updateNodeStyles(selectedNode.id, { textAlign: 'left' })} className={cn("flex-1 p-2 rounded-lg transition-all", selectedNode.styles.textAlign === 'left' ? "bg-white shadow-sm" : "opacity-30")}><AlignLeft className="w-3.5 h-3.5 mx-auto" /></button>
                        <button onClick={() => updateNodeStyles(selectedNode.id, { textAlign: 'center' })} className={cn("flex-1 p-2 rounded-lg transition-all", selectedNode.styles.textAlign === 'center' ? "bg-white shadow-sm" : "opacity-30")}><AlignCenter className="w-3.5 h-3.5 mx-auto" /></button>
                        <button onClick={() => updateNodeStyles(selectedNode.id, { textAlign: 'right' })} className={cn("flex-1 p-2 rounded-lg transition-all", selectedNode.styles.textAlign === 'right' ? "bg-white shadow-sm" : "opacity-30")}><AlignRight className="w-3.5 h-3.5 mx-auto" /></button>
                        <button onClick={() => updateNodeStyles(selectedNode.id, { textAlign: 'justify' })} className={cn("flex-1 p-2 rounded-lg transition-all", selectedNode.styles.textAlign === 'justify' ? "bg-white shadow-sm" : "opacity-30")}><AlignJustify className="w-3.5 h-3.5 mx-auto" /></button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Line Height" value={selectedNode.styles.lineHeight} onChange={e => updateNodeStyles(selectedNode.id, { lineHeight: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                        <Input placeholder="Letter Spacing" value={selectedNode.styles.letterSpacing} onChange={e => updateNodeStyles(selectedNode.id, { letterSpacing: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                      </div>
                    </div>
                  </section>
                )}

                {selectedNode.type === 'image' && (
                  <section className="space-y-4">
                    <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Afbeelding</label>
                    <Input value={selectedNode.imageUrl || ''} onChange={e => updateNode(selectedNode.id, { imageUrl: e.target.value })} className="h-12 rounded-xl bg-black/5 border-none text-xs" placeholder="URL naar afbeelding..." />
                  </section>
                )}

                <section className="space-y-4 pt-6 border-t border-black/5">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3" /> Vormgeving & Kleur</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Tekstkleur" value={selectedNode.styles.color || ''} onChange={e => updateNodeStyles(selectedNode.id, { color: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                    <Input placeholder="Achtergrond" value={selectedNode.styles.backgroundColor || ''} onChange={e => updateNodeStyles(selectedNode.id, { backgroundColor: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Radius (bv 2rem)" value={selectedNode.styles.borderRadius || ''} onChange={e => updateNodeStyles(selectedNode.id, { borderRadius: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                    <Input placeholder="Padding (bv 20px)" value={selectedNode.styles.padding || ''} onChange={e => updateNodeStyles(selectedNode.id, { padding: e.target.value })} className="h-10 rounded-xl bg-black/5 border-none text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] opacity-40 uppercase ml-2">Opaciteit ({selectedNode.styles.opacity ?? 100}%)</label>
                    <input type="range" min="0" max="100" value={selectedNode.styles.opacity ?? 100} onChange={e => updateNodeStyles(selectedNode.id, { opacity: Number(e.target.value) })} className="w-full h-1 bg-black/5 rounded-full accent-accent appearance-none cursor-pointer" />
                  </div>
                </section>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
