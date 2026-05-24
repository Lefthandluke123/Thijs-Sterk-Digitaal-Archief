
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ShopPage() {
  const firestore = useFirestore();
  const { t, language } = useLanguage();

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'), where('inShop', '==', true));
  }, [firestore]);

  const { data: artworks, loading } = useCollection(artworksQuery);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const shopIntroText = (language !== 'nl' && siteSettings?.[`shopIntro_${language}`])
    ? siteSettings[`shopIntro_${language}`]
    : siteSettings?.shopIntro || t('shop_intro');

  if (loading && !artworks) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-48 pb-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <header className="mb-20 text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{t('nav_shop')}</span>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">
            {t('shop_title').split(' ').map((word, i, arr) => 
              i === arr.length - 1 ? <span key={i} className="italic">{word}</span> : word + ' '
            )}
          </h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            {shopIntroText}
          </p>
        </header>

        {artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
            {artworks.map((art: any) => {
              const displayImage = art.image || art.imageUrl || art.url;
              return (
                <Link key={art.id} href={`/shop/${art.id}`} className="group">
                  <Card className="border-none shadow-none bg-transparent space-y-6">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/10 shadow-lg group-hover:shadow-2xl transition-all duration-700">
                      {displayImage && (
                        <img 
                          src={displayImage} 
                          alt={art.displayTitle || art.title}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          style={{ filter: `brightness(${art.brightness || 1})` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                         <Badge className="bg-accent text-accent-foreground px-4 py-1 rounded-full uppercase text-[9px] font-black tracking-widest shadow-xl">
                            {t('shop_order_now')}
                         </Badge>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <h3 className="font-headline text-lg group-hover:text-accent transition-colors">{art.displayTitle || art.title}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">{art.year} &bull; {art.series}</p>
                      <p className="text-[12px] font-bold text-accent pt-2">{t('shop_price')} v.a. €{art.pricePostcard || '2.50'}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-32 text-center space-y-6 bg-secondary/5 rounded-[3rem] border border-dashed border-border">
            <ShoppingBag className="w-12 h-12 mx-auto opacity-10" />
            <div className="space-y-2">
              <h3 className="font-headline text-2xl font-light">{t('shop_setting_up')}</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">{t('shop_come_back_soon')}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
