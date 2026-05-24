
"use client";

import React from 'react';

interface RoomClientProps {
  artworks: any[];
}

/**
 * @fileOverview ULTIMATE CENTERING RESET - Forced Inline Flex.
 * Dit component negeert alle externe Tailwind-grids en dwingt centrering af via inline-styles.
 */
export function RoomClient({ artworks }: RoomClientProps) {
  // Pak het eerste kunstwerk voor de test
  const item = artworks[0];

  if (!item) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0f0f0', // Lichte achtergrond om de viewport te zien
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // Boven alles uitsteken
        pointerEvents: 'auto'
      }}
    >
      {/* Container voor het werk met geforceerde borders voor debug */}
      <div 
        style={{
          border: '10px solid #d4af37', // Goud/Accent border
          backgroundColor: 'white',
          padding: '2rem',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '90vw',
          maxHeight: '85vh'
        }}
      >
        <img 
          src={item.image || item.imageUrl} 
          alt={item.title} 
          style={{
            maxWidth: '100%',
            maxHeight: '60vh',
            display: 'block',
            objectFit: 'contain'
          }}
        />
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontFamily: 'serif', fontStyle: 'italic', marginBottom: '0.5rem', color: '#1a1a1a' }}>
            {item.title}
          </h2>
          <p style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#d4af37' }}>
            {item.year} &bull; {item.medium}
          </p>
        </div>
      </div>

      {/* Debug Indicator */}
      <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'red', color: 'white', padding: '0.5rem', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px' }}>
        NUCLEAR CENTERING ACTIVE
      </div>
    </div>
  );
}
