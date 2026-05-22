
"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, ArrowLeft, CircleCheck, Loader2, Info, Mail, CreditCard } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createCheckoutSession } from '@/lib/stripe-actions';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { t } = useLanguage();
  
  const [selectedProduct, setSelectedProduct] = useState('postcard');
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderSuccess] = useState(false);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: settings } = useDoc(siteSettingsRef);

  const artworkRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'artworks', id as string);
  }, [firestore, id]);

  const { data: artwork, loading } = useDoc(artworkRef);

  const PRODUCTS = useMemo(() => [
    { id: 'postcard', label: t('shop_postcard'), price: artwork?.pricePostcard || 2.50, desc: 'A6 formaat.' },
    { id: 'poster', label: t('shop_poster'), price: artwork?.pricePoster || 24.00, desc: '50x70 cm.' },
    { id: 'fine-art', label: t('shop_print'), price: artwork?.pricePrint || 85.00, desc: 'Giclée print.' },
    { id: 'canvas', label: t('shop_canvas'), price: artwork?.priceCanvas || 245.00, desc: '100x100 cm op houten frame.' },
    { id: 'digital', label: t('shop_digital'), price: artwork?.priceDigital || 15.00, desc: 'Digitaal bestand (300dpi).' }
  ], [artwork, t]);

  const currentPrice = useMemo(() => {
    return PRODUCTS.find(p => p.id === selectedProduct)?.price || 0;
  }, [selectedProduct, PRODUCTS]);

  const handleStripeCheckout = async () => {
    if (!settings?.stripeSecretKey || !artwork) return;
    setIsOrdering(true);
    try {
      const { url } = await createCheckoutSession({
        artworkId: id as string,
        artworkTitle: artwork.displayTitle || artwork.title,
        productType: selectedProduct,
        price: currentPrice,
        stripeSecretKey: settings.stripeSecretKey
      });
      if (url) window.location.href = url;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Betaalfout", description: err.message });
    } finally {
      setIsOrdering(false);
    }
  };

  const handleOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !artwork) return;
    
    setIsOrdering(true);
    const formData = new FormData(e.currentTarget);
    
    const orderData = {
      customerName: formData.get('name'),
      customerEmail: formData.get('email'),
      customerAddress: formData.get('address'),
      artworkId: id,
      artworkTitle: artwork.displayTitle || artwork.title,
      productType: selectedProduct,
      status: 'new',
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'orders'), orderData);
      
      await addDoc(collection(firestore, 'mail'), {
        to: settings?.adminEmail || 'lhcsterk@doggyfew.com',
        message: {
          subject: `[NIEUWE BESTELLING] ${orderData.artworkTitle} - ${selectedProduct}`,
          html: `<h2>Nieuwe bestelling uit de Museumwinkel</h2><p><strong>Werk:</strong> ${orderData.artworkTitle}</p><p><strong>Product:</strong> ${selectedProduct}</p>`
        },
        createdAt: serverTimestamp()
      });

      setOrderSuccess(true);
      toast({ title: t('shop_order_success') });
    } catch (err) { console.error(err); }
    finally { setIsOrdering(false); }
  };

  if (loading || !artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center">
          <CircleCheck className="w-12 h-12 text-green-500" />
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="font-headline text-4xl">{t('shop_order_success')}</h1>
          <p className="text-muted-foreground leading-relaxed">{t('shop_order_desc')}</p>
        </div>
        <Button onClick={() => router.push('/shop')} variant="outline" className="rounded-full px-12 h-14 uppercase tracking-widest font-black text-[11px]">
          {t('shop_back_to_shop')}
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-32 pb-32 px-6">
      <div className="container mx-auto max-w-7xl">
        <button onClick={() => router.back()} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('nav_shop')}
        </button>

        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <div className="space-y-8 sticky top-32">
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl bg-secondary/10 border border-black/5">
              <img 
                src={artwork.imageUrl} 
                alt={artwork.displayTitle} 
                className="w-full h-full object-cover"
                style={{ filter: `brightness(${artwork.brightness || 1})` }}
              />
            </div>
            <div className="p-8 bg-secondary/5 rounded-3xl space-y-4">
               <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-accent shrink-0 mt-1" />
                  <p className="text-sm text-muted-foreground leading-relaxed italic">{t('shop_quality_notice')}</p>
               </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="font-headline text-4xl md:text-6xl font-light leading-tight">
                {artwork.displayTitle || artwork.title}
              </h1>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-accent">
                {artwork.year} &bull; {artwork.series}
              </p>
            </div>

            <div className="space-y-8">
              <h3 className="text-xs font-black uppercase tracking-widest border-b border-border pb-4">{t('shop_format')}</h3>
              <RadioGroup value={selectedProduct} onValueChange={setSelectedProduct} className="grid gap-4">
                {PRODUCTS.map((prod) => (
                  <Label
                    key={prod.id}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedProduct === prod.id ? "bg-accent/5 border-accent shadow-md" : "bg-white/50 border-transparent hover:border-accent/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={prod.id} className="sr-only" />
                      <div className="space-y-1">
                        <span className="text-sm font-black uppercase tracking-wider block">{prod.label}</span>
                        <span className="text-[11px] text-muted-foreground opacity-60 block">{prod.desc}</span>
                      </div>
                    </div>
                    <span className="font-headline text-xl">€{prod.price.toFixed(2)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {settings?.stripeEnabled ? (
              <div className="space-y-6">
                <Button 
                  onClick={handleStripeCheckout} 
                  disabled={isOrdering} 
                  className="w-full h-20 rounded-3xl bg-primary text-primary-foreground text-lg font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all group"
                >
                  {isOrdering ? <Loader2 className="animate-spin" /> : (
                    <div className="flex items-center justify-center gap-4">
                      <CreditCard className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                      Direct Afrekenen (€{currentPrice.toFixed(2)})
                    </div>
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest opacity-60">Beveiligde betaling via Stripe</p>
              </div>
            ) : (
              <Card className="p-8 rounded-3xl border-none shadow-xl bg-secondary/10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white"><Mail className="w-5 h-5" /></div>
                  <h3 className="font-black uppercase tracking-widest text-sm">{t('shop_order_form')}</h3>
                </div>
                <form onSubmit={handleOrder} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest opacity-60 pl-2">{t('order_label_name')}</Label>
                      <Input name="name" required className="bg-white border-none h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest opacity-60 pl-2">{t('order_label_email')}</Label>
                      <Input name="email" type="email" required className="bg-white border-none h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest opacity-60 pl-2">{t('order_label_address')}</Label>
                      <Textarea name="address" required className="bg-white border-none rounded-xl" />
                    </div>
                  </div>
                  <Button type="submit" disabled={isOrdering} className="w-full rounded-full h-16 bg-accent text-accent-foreground font-black uppercase tracking-[0.2em]">
                    {isOrdering ? <Loader2 className="animate-spin" /> : t('order_button_confirm')}
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
