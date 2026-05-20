'use client';

/**
 * @fileOverview Een lichtgewicht EventEmitter die werkt in de browser.
 * Dit vervangt de Node.js 'events' module die niet werkt in client-side Next.js/Turbopack.
 */

type Listener = (...args: any[]) => void;

class TinyEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(...args));
  }
}

export const errorEmitter = new TinyEmitter();
