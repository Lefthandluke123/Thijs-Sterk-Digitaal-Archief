
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export function Footer() {
  const firestore = useFirestore();
  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'site') : null, [firestore]);
  const { data: settings } = useDoc(settingsRef);

  return (
    <footer className="py-12 border-t border-border bg-background px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-bold text-lg relative overflow-hidden">
            {settings?.logoUrl ? (
              <Image src={settings.logoUrl} alt="Logo" fill className="object-contain p-1" />
            ) : (
              <span className="relative z-10">T</span>
            )}
          </div>
          <span className="font-headline font-medium tracking-tight text-xl">Thijs Sterk</span>
        </div>
        
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
          &copy; {new Date().getFullYear()} Erven Thijs Sterk. Alle rechten voorbehouden.
        </p>
        
        <div className="flex gap-8 text-sm font-medium">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Beheer</Link>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Nieuwsbrief</a>
        </div>
      </div>
    </footer>
  );
}
