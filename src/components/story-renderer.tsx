
"use client";

import React from 'react';
import { StoryNode } from './story-editor';
import { cn } from '@/lib/utils';

interface StoryRendererProps {
  nodes?: StoryNode[];
}

/**
 * @fileOverview StoryRenderer: Vertaalt de DTP nodes naar een vloeiende website layout.
 * Ondersteunt alle geavanceerde CSS eigenschappen van het design system.
 */
export function StoryRenderer({ nodes = [] }: StoryRendererProps) {
  if (!nodes || nodes.length === 0) return null;

  // Bereken de totale hoogte op basis van de verste node
  const totalHeight = Math.max(...nodes.map(n => n.y + (n.h || 200))) + 150;

  return (
    <div 
      className="relative w-full mx-auto animate-in fade-in duration-1000" 
      style={{ height: `${totalHeight}px` }}
    >
      {nodes.map((node) => (
        <div 
          key={node.id} 
          className={cn(
            "absolute transition-all duration-700",
            node.type === 'image' && "shadow-2xl hover:scale-[1.01]"
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
            borderWidth: node.styles.borderWidth,
            borderColor: node.styles.borderColor,
            borderStyle: node.styles.borderWidth ? 'solid' : 'none',
            boxShadow: node.styles.boxShadow,
            overflow: node.type === 'image' || node.type === 'box' ? 'hidden' : 'visible'
          }}
        >
          {node.type === 'heading' && (
            <h2 
              className="font-headline italic leading-tight"
              style={{ 
                fontSize: node.styles?.fontSize || '3rem',
                textAlign: node.styles?.textAlign as any || 'left',
                color: node.styles?.color || 'inherit',
                fontWeight: node.styles?.fontWeight,
                letterSpacing: node.styles?.letterSpacing,
                textTransform: node.styles?.textTransform as any,
              }}
            >
              {node.content}
            </h2>
          )}

          {node.type === 'image' && node.imageUrl && (
            <img 
              src={node.imageUrl} 
              className="w-full h-full object-cover transition-transform duration-1000" 
              alt="Story element" 
            />
          )}

          {node.type === 'text' && (
            <div 
              className={cn(
                "leading-relaxed font-light whitespace-pre-line",
                node.styles?.fontFamily === 'serif' ? "font-headline italic" : "font-sans"
              )}
              style={{ 
                fontSize: node.styles?.fontSize || '1.2rem',
                textAlign: node.styles?.textAlign as any || 'left',
                color: node.styles?.color || 'inherit',
                lineHeight: node.styles?.lineHeight || '1.6',
                fontWeight: node.styles?.fontWeight,
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
