
"use client";

import React from 'react';
import { StoryNode } from './story-editor';
import { cn } from '@/lib/utils';

interface StoryRendererProps {
  nodes?: StoryNode[];
  blocks?: any[]; // Legacy
}

/**
 * @fileOverview StoryRenderer: Vertaalt de DTP nodes naar een responsieve website layout.
 */
export function StoryRenderer({ nodes = [], blocks }: StoryRendererProps) {
  // Legacy support fallback
  if ((!nodes || nodes.length === 0) && blocks && blocks.length > 0) {
    return (
      <div className="space-y-12">
        {blocks.map((block: any, i: number) => (
          <div key={i} className="prose-text">
            {block.type === 'heading' && <h2 className="font-headline text-4xl italic mb-6">{block.content}</h2>}
            {block.type === 'text' && <p className="leading-relaxed">{block.content}</p>}
            {block.type === 'image' && <img src={block.imageUrl} className="w-full rounded-2xl shadow-xl" />}
          </div>
        ))}
      </div>
    );
  }

  if (!nodes || nodes.length === 0) return null;

  // Bereken de totale hoogte op basis van de verste node
  const totalHeight = Math.max(...nodes.map(n => n.y + (n.h || 200))) + 100;

  return (
    <div 
      className="relative w-full mx-auto" 
      style={{ height: `${totalHeight}px` }}
    >
      {nodes.map((node) => (
        <div 
          key={node.id} 
          className={cn(
            "absolute transition-opacity duration-1000 animate-in fade-in",
            node.type === 'box' ? "" : ""
          )}
          style={{ 
            left: `${node.x}%`,
            top: `${node.y}px`,
            width: `${node.w}%`,
            height: node.h === 0 ? 'auto' : `${node.h}px`,
            zIndex: node.styles?.zIndex || 10,
            backgroundColor: node.type === 'box' ? node.styles.backgroundColor : 'transparent',
            borderRadius: node.styles.borderRadius || '0px',
            padding: node.styles.padding || '0px',
            opacity: (node.styles.opacity ?? 100) / 100,
            overflow: 'hidden'
          }}
        >
          {node.type === 'heading' && (
            <h2 
              className="font-headline italic leading-tight"
              style={{ 
                fontSize: node.styles?.fontSize || '2.5rem',
                textAlign: node.styles?.textAlign as any || 'left',
                color: node.styles?.color
              }}
            >
              {node.content}
            </h2>
          )}

          {node.type === 'image' && node.imageUrl && (
            <img 
              src={node.imageUrl} 
              className="w-full h-full object-cover shadow-2xl" 
              alt="Story design element" 
            />
          )}

          {node.type === 'text' && (
            <div 
              className={cn(
                "leading-relaxed font-light whitespace-pre-line",
                node.styles?.fontFamily === 'serif' ? "font-headline italic" : "font-sans"
              )}
              style={{ 
                fontSize: node.styles?.fontSize || '1.25rem',
                textAlign: node.styles?.textAlign as any || 'left',
                color: node.styles?.color
              }}
            >
              {node.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

