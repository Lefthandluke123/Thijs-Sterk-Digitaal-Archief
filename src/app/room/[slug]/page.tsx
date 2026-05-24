
import React from 'react';

/**
 * @fileOverview Nuclear Layout Test.
 * Dit is een tijdelijke component om de fundamentele centrering van de browser te testen.
 */
export default async function RoomPage() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'blue',
      fontSize: '40px',
      color: 'white',
      fontWeight: 'bold',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      fontFamily: 'sans-serif'
    }}>
      HELLO MUSEUM TEST
    </div>
  );
}
