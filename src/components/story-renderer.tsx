
"use client";

import React from 'react';
import { StoryBlock } from './story-editor';
import { cn } from '@/lib/utils';

interface StoryRendererProps {
  blocks: StoryBlock[];
}

export function StoryRenderer({ blocks }: StoryRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="w-full space-y-12">
      {blocks.map((block) => (
        <div 
          key={block.id} 
          className={cn(
            "relative w-full clear-both",
            block.layout === 'full' ? "w-full" : "w-full md:w-auto"
          )}
        >
          {block.type === 'heading' && (
            <h2 
              className="font-headline italic leading-tight mb-8"
              style={{ 
                fontSize: block.style?.fontSize || '2.5rem',
                textAlign: block.style?.textAlign as any || 'left'
              }}
            >
              {block.content}
            </h2>
          )}

          {block.type === 'image' && (
            <div 
              className={cn(
                "mb-8",
                block.layout === 'left' && "md:float-left md:mr-10 md:mb-10 md:max-w-[40%] rounded-2xl overflow-hidden shadow-2xl",
                block.layout === 'right' && "md:float-right md:ml-10 md:mb-10 md:max-w-[40%] rounded-2xl overflow-hidden shadow-2xl",
                block.layout === 'full' && "w-full rounded-3xl overflow-hidden shadow-2xl"
              )}
            >
              <img src={block.imageUrl} className="w-full h-auto" alt="Story image" />
            </div>
          )}

          {block.type === 'text' && (
            <div 
              className={cn(
                "leading-relaxed font-light whitespace-pre-line",
                block.style?.fontFamily === 'serif' ? "font-headline italic" : "font-sans"
              )}
              style={{ 
                fontSize: block.style?.fontSize || '1.25rem',
                textAlign: block.style?.textAlign as any || 'left'
              }}
            >
              {block.content}
            </div>
          )}
        </div>
      ))}
      <div className="clear-both" />
    </div>
  );
}
