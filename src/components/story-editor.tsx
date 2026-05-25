
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Type, 
  ImageIcon, 
  AlignLeft, 
  AlignRight, 
  Maximize,
  ChevronUp,
  ChevronDown,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StoryBlock = {
  id: string;
  type: 'text' | 'image' | 'heading';
  content?: string;
  imageUrl?: string;
  layout: 'full' | 'left' | 'right';
  style?: {
    fontSize?: string;
    fontFamily?: 'serif' | 'sans';
    textAlign?: 'left' | 'center' | 'right';
    paddingTop?: string;
  };
};

interface StoryEditorProps {
  blocks: StoryBlock[];
  onChange: (blocks: StoryBlock[]) => void;
}

export function StoryEditor({ blocks, onChange }: StoryEditorProps) {
  const addBlock = (type: StoryBlock['type']) => {
    const newBlock: StoryBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      layout: 'full',
      content: type === 'text' ? 'Nieuwe tekst...' : '',
      style: { fontFamily: 'serif', fontSize: '1.25rem', textAlign: 'left' }
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<StoryBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < blocks.length) {
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      onChange(newBlocks);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 p-4 bg-accent/5 rounded-2xl border border-accent/10 sticky top-4 z-20 backdrop-blur-md">
        <Button size="sm" onClick={() => addBlock('heading')} variant="outline" className="rounded-full">
          <Type className="w-4 h-4 mr-2" /> Kop toevoegen
        </Button>
        <Button size="sm" onClick={() => addBlock('text')} variant="outline" className="rounded-full">
          <AlignLeft className="w-4 h-4 mr-2" /> Tekstblok
        </Button>
        <Button size="sm" onClick={() => addBlock('image')} variant="outline" className="rounded-full">
          <ImageIcon className="w-4 h-4 mr-2" /> Foto toevoegen
        </Button>
      </div>

      <div className="space-y-6">
        {blocks.map((block, idx) => (
          <Card key={block.id} className="p-6 rounded-[2rem] border-black/5 shadow-sm group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase text-accent bg-accent/10 px-3 py-1 rounded-full">
                  {block.type}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} className="h-8 w-8"><ChevronUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveBlock(idx, 'down')} disabled={idx === blocks.length - 1} className="h-8 w-8"><ChevronDown className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => removeBlock(block.id)} className="text-destructive h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
              <div className="md:col-span-8 space-y-4">
                {block.type === 'heading' && (
                  <Input 
                    value={block.content} 
                    onChange={e => updateBlock(block.id, { content: e.target.value })}
                    className="text-2xl font-headline italic h-14 bg-black/5 border-none rounded-xl" 
                    placeholder="Titel..."
                  />
                )}
                {block.type === 'text' && (
                  <Textarea 
                    value={block.content} 
                    onChange={e => updateBlock(block.id, { content: e.target.value })}
                    className="min-h-[150px] text-lg bg-black/5 border-none rounded-2xl resize-none"
                    style={{ fontFamily: block.style?.fontFamily === 'serif' ? 'Playfair Display' : 'Inter' }}
                    placeholder="Schrijf uw verhaal..."
                  />
                )}
                {block.type === 'image' && (
                  <div className="space-y-4">
                    <Input 
                      value={block.imageUrl} 
                      onChange={e => updateBlock(block.id, { imageUrl: e.target.value })}
                      className="bg-black/5 border-none rounded-xl"
                      placeholder="URL van de afbeelding..."
                    />
                    {block.imageUrl && (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black/5">
                        <img src={block.imageUrl} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-4 space-y-6 p-6 bg-black/[0.02] rounded-2xl border border-black/5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase opacity-40">Layout & Wrap</label>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant={block.layout === 'left' ? 'default' : 'ghost'} 
                      onClick={() => updateBlock(block.id, { layout: 'left' })}
                      className="h-10 w-10 rounded-xl"
                    ><AlignLeft className="w-4 h-4" /></Button>
                    <Button 
                      size="icon" 
                      variant={block.layout === 'full' ? 'default' : 'ghost'} 
                      onClick={() => updateBlock(block.id, { layout: 'full' })}
                      className="h-10 w-10 rounded-xl"
                    ><Maximize className="w-4 h-4" /></Button>
                    <Button 
                      size="icon" 
                      variant={block.layout === 'right' ? 'default' : 'ghost'} 
                      onClick={() => updateBlock(block.id, { layout: 'right' })}
                      className="h-10 w-10 rounded-xl"
                    ><AlignRight className="w-4 h-4" /></Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase opacity-40">Typografie</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant={block.style?.fontFamily === 'serif' ? 'secondary' : 'ghost'}
                      onClick={() => updateBlock(block.id, { style: { ...block.style, fontFamily: 'serif' } })}
                      className="font-headline text-xs"
                    >Serif</Button>
                    <Button 
                      size="sm" 
                      variant={block.style?.fontFamily === 'sans' ? 'secondary' : 'ghost'}
                      onClick={() => updateBlock(block.id, { style: { ...block.style, fontFamily: 'sans' } })}
                      className="font-sans text-xs"
                    >Sans</Button>
                  </div>
                  <Input 
                    type="text" 
                    value={block.style?.fontSize} 
                    onChange={e => updateBlock(block.id, { style: { ...block.style, fontSize: e.target.value } })}
                    className="h-10 text-xs bg-white rounded-xl"
                    placeholder="Grootte (bijv 1.5rem)"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
