
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RoomClientProps {
  artworks: any[];
}

/**
 * @fileOverview DEBUG COMPONENT - Forced Centering Reset.
 * Dit component is tijdelijk gestript tot de absolute basis om de top-left bug te elimineren.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  // We pakken alleen het eerste werk voor de debug
  const item = artworks[0];

  if (!item) return null;

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-red-500 z-[9999]">
      {/* Outer Wrapper: Geforceerde viewport centrering */}
      <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-20">
        
        {/* Image Container: Gele border voor visuele bevestiging van de box */}
        <div className="relative flex items-center justify-center border-[10px] border-yellow-400 bg-black shadow-2xl max-w-full max-h-full overflow-hidden">
          
          {/* De Afbeelding: GEEN absolute positionering, GEEN inset-0 */}
          <img 
            src={item.image || item.imageUrl} 
            alt={item.title} 
            className="block max-w-[90vw] max-h-[70vh] object-contain"
            style={{ 
              display: 'block',
              position: 'relative',
              margin: '0 auto'
            }}
          />

          {/* Debug Label */}
          <div className="absolute top-4 left-4 bg-black text-white p-2 text-[10px] font-mono z-50">
            DEBUG MODE: CENTERING ACTIVE
          </div>
        </div>

        {/* Metadata: Ook gecentreerd eronder */}
        <div className="mt-8 text-center text-white space-y-2">
          <h2 className="text-4xl font-headline italic">{item.title}</h2>
          <p className="text-sm font-black uppercase tracking-widest opacity-60">
            {item.year} &bull; {item.medium}
          </p>
        </div>

      </div>
    </div>
  );
}
