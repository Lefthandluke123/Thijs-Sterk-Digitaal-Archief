"use client";

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, addDoc, query, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Plus,
  Search,
  CloudUpload,
  Languages,
  Palette,
  CreditCard,
  Settings as SettingsIcon,
  Star,
  Globe2,
  TrendingUp,
  History,
  ShieldCheck,
  LifeBuoy,
  FileText,
  ImageIcon,
  Camera,
  CircleHelp,
  CircleCheck,
  CircleAlert,
  Zap,
  Gem,
  Coins,
  Users,
  Briefcase,
  GraduationCap,
  HardDrive
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

const ROMAN_VALUES: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
};

export default function AdminPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('archive');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'artworks'));
  }, [firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'));
  }, [firestore]);

  const { data: rawArtworks } = useCollection(artworksQuery);
  const { data: orders } = useCollection(ordersQuery);

  const artworks = useMemo(() => {
    if (!rawArtworks) return [];
    const seen = new Set();
    const unique = rawArtworks.filter(art => {
      const url = (art as any).imageUrl;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
    return [...unique].sort((a: any, b: any) => {
      const pA = parseTitleForSort(a.title || '');
      const pB = parseTitleForSort(b.title || '');
      if (pA.romanVal !== pB.romanVal) return pA.romanVal - pB.romanVal;
      if (pA.num !== pB.num) return pA.num - pB.num;
      return pA.suffix.localeCompare(pB.suffix);
    });
  }, [rawArtworks]);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const parseTitleForSort = (title: string) => {
    if (!title) return { romanVal: 999, num: 999, suffix: '' };
    const romanMatch = title.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/i);
    const numMatch = title.match(/(\d+)([a-z]*)?/i);
    return {
      romanVal: romanMatch ? (ROMAN_VALUES[romanMatch[1].toUpperCase()] || 999) : 999,
      num: numMatch ? parseInt(numMatch[1], 10) : 999,
      suffix: numMatch ? (numMatch[2] || '').toLowerCase() : ''
    };
  };

  const updateArtworkField = (id: string, field: string, value: any) => {
    if (!firestore || !id) return;
    const artRef = doc(firestore, 'artworks', id);
    updateDoc(artRef, { [field]: value }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: artRef.path, operation: 'update' }));
    });
  };

  const updateSettingsField = (field: string, value: any) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'site');
    setDoc(settingsRef, { [field]: value }, { merge: true }).catch(async () => 
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: settingsRef.path, operation: 'update' }))
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !firestore) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `branding/logo_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateSettingsField('logoUrl', url);
      toast({ title: "Site identiteit bijgewerkt" });
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  const handleBatchProcess = async (files: FileList | null) => {
    if (!files || !firestore || !storage) return;
    setIsUploading(true);
    setUploadProgress(0);
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalFiles = filesArray.length;
    let processedCount = 0;

    for (const file of filesArray) {
      try {
        setUploadStatus(`Digitaliseren: ${file.name} (${processedCount + 1}/${totalFiles})`);
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-z0-9.]/gi, '_');
        const fileNameNoExt = file.name.split('.')[0] || "Naamloos";
        const storageRef = ref(storage, `artworks/${timestamp}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        await addDoc(collection(firestore, 'artworks'), {
          title: fileNameNoExt,
          displayTitle: fileNameNoExt,
          series: "Nieuwe Uploads",
          imageUrl: downloadUrl,
          fileSize: file.size,
          fileType: file.type,
          createdAt: serverTimestamp(),
          cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, brightness: 1,
          year: "", dimensions: "",
          featured: false, inShop: false,
          pricePostcard: 2.50, pricePoster: 24.00, pricePrint: 85.00, priceDigital: 15.00
        });
        processedCount++;
        setUploadProgress((processedCount / totalFiles) * 100);
      } catch (e) { console.error(e); }
    }
    setIsUploading(false);
    setUploadStatus('');
    toast({ title: "Master Files succesvol verwerkt" });
  };

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art: any) => {
      const displayTitle = art.displayTitle || art.title || "";
      return displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (art.series?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    });
  }, [artworks, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14">
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={siteSettings?.logoUrl || "/logo.png"} className="h-10 w-auto" alt="Logo" />
          <div className="flex flex-col leading-none border-l border-border/40 pl-4">
            <h1 className="font-headline text-lg font-light text-foreground">{siteSettings?.siteTitle || "Digitaal Museum"}</h1>
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-accent">Safe Harbor Framework &bull; Curator Edition</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/admin/translate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent flex items-center gap-2">
             <Languages className="w-3.5 h-3.5" /> Vertaal Station
           </Link>
           <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground border-l border-border pl-4 flex items-center gap-2">
             <ArrowLeft className="w-3.5 h-3.5" /> Naar Website
           </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="archive" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit mx-auto flex flex-wrap justify-center h-auto border border-black/5">
            <TabsTrigger value="archive" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Archief [{artworks.length}]</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Bestellingen [{orders?.length || 0}]</TabsTrigger>
            <TabsTrigger value="upload" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Digitaliseren</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Identiteit</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest">Commercieel</TabsTrigger>
            <TabsTrigger value="help" className="rounded-full px-6 text-[11px] uppercase font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"><LifeBuoy className="w-3 h-3 mr-2" /> Gids & Cijfers</TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-6">
            <div className="relative mb-8">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
               <Input 
                 placeholder="Doorzoek de collectie..." 
                 className="pl-12 h-12 bg-white/50 border-none rounded-full shadow-sm"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredArtworks.map((art: any) => (
                <Card key={art.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all relative border-none shadow-md group" onClick={() => setEditingId(art.id)}>
                  {art.featured && <Star className="absolute top-2 left-2 w-3 h-3 text-accent fill-accent" />}
                  <div className="aspect-square bg-muted/20">
                    <img src={art.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={art.title} />
                  </div>
                  <CardContent className="p-2 text-center bg-white">
                    <h4 className="text-[9px] font-black uppercase truncate">{art.displayTitle || art.title}</h4>
                    <p className="text-[7px] opacity-40 uppercase font-bold mt-1">{art.series}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
             <Card className="p-6 rounded-3xl border-none shadow-xl bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-8 border-l-4 border-accent pl-4">
                   <TrendingUp className="w-5 h-5 text-accent" />
                   <h2 className="text-[12px] font-black uppercase tracking-widest text-accent">Omzet & Historie</h2>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px] uppercase font-black tracking-widest opacity-40">
                      <TableHead>Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Werk</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders && orders.length > 0 ? orders.sort((a:any, b:any) => b.timestamp?.seconds - a.timestamp?.seconds).map((order: any) => (
                      <TableRow key={order.id} className="text-xs group hover:bg-black/5 transition-colors">
                        <TableCell className="font-mono opacity-50">{order.timestamp?.toDate().toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="font-bold">{order.customerName}</div>
                          <div className="text-[10px] opacity-40">{order.customerEmail}</div>
                        </TableCell>
                        <TableCell className="italic">{order.artworkTitle}</TableCell>
                        <TableCell className="uppercase text-[9px] font-black">{order.productType}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                            order.status === 'paid' ? "bg-green-100 text-green-700" : "bg-accent/10 text-accent"
                          )}>
                            {order.status || 'nieuw'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 opacity-30 uppercase font-black tracking-widest italic">Nog geen transacties geregistreerd</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
             </Card>
          </TabsContent>

          <TabsContent value="branding">
             <Card className="p-8 md:p-12 rounded-3xl max-w-4xl mx-auto space-y-12 shadow-2xl border-none bg-white">
                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                      <Palette className="w-5 h-5 text-accent" />
                      <h2 className="text-[12px] font-black uppercase tracking-widest text-accent">White Label Configuratie</h2>
                   </div>

                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4 bg-black/5 p-6 rounded-2xl">
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Museum Naam</Label>
                            <Input defaultValue={siteSettings?.siteTitle || ''} onBlur={(e) => updateSettingsField('siteTitle', e.target.value)} placeholder="Bijv: Studio Sophie" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Slogan / Artist Quote</Label>
                            <Input defaultValue={siteSettings?.siteSubtitle || ''} onBlur={(e) => updateSettingsField('siteSubtitle', e.target.value)} placeholder="Bijv: Meester in Atmosfeer" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] uppercase opacity-60">Notificatie Email (Orders)</Label>
                            <Input defaultValue={siteSettings?.adminEmail || ''} onBlur={(e) => updateSettingsField('adminEmail', e.target.value)} placeholder="artist@email.com" />
                         </div>
                      </div>

                      <div className="space-y-4 bg-accent/5 p-6 rounded-2xl border border-accent/10 flex flex-col items-center justify-center">
                         <Label className="text-[10px] uppercase opacity-60 mb-4 block w-full text-center">Artist Logo</Label>
                         <div className="w-32 h-32 rounded-2xl bg-white flex items-center justify-center border-2 border-dashed border-accent/20 mb-4 overflow-hidden shadow-inner">
                            {siteSettings?.logoUrl ? <img src={siteSettings.logoUrl} className="max-w-full max-h-full object-contain p-2" /> : <ImageIcon className="w-8 h-8 opacity-20" />}
                         </div>
                         <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpload} accept="image/*" />
                         <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="rounded-full border-accent/40 text-accent font-black uppercase text-[9px] px-6">Upload Merklogo</Button>
                      </div>
                   </div>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="payments">
             <Card className="p-8 md:p-12 rounded-3xl max-w-4xl mx-auto space-y-8 shadow-2xl border-none bg-white">
                <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                   <CreditCard className="w-5 h-5 text-primary" />
                   <h2 className="text-[12px] font-black uppercase tracking-widest text-primary">Betaalmodule (Stripe)</h2>
                </div>

                <div className="bg-primary/5 p-8 rounded-2xl space-y-6 border border-primary/10">
                   <div className="flex items-center justify-between border-b border-primary/10 pb-6">
                      <div className="space-y-1">
                         <h4 className="font-bold text-sm">Directe verkoop inschakelen</h4>
                         <p className="text-xs text-muted-foreground italic">Zodra ingeschakeld, kunnen bezoekers direct afrekenen via iDEAL of Creditcard.</p>
                      </div>
                      <Switch 
                        checked={siteSettings?.stripeEnabled} 
                        onCheckedChange={(val) => updateSettingsField('stripeEnabled', val)} 
                      />
                   </div>

                   <div className="grid gap-6">
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black opacity-40">Stripe Public Key</Label>
                         <Input 
                           defaultValue={siteSettings?.stripePublicKey || ''} 
                           onBlur={(e) => updateSettingsField('stripePublicKey', e.target.value)} 
                           placeholder="pk_test_..." 
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black opacity-40">Stripe Secret Key</Label>
                         <Input 
                           type="password"
                           defaultValue={siteSettings?.stripeSecretKey || ''} 
                           onBlur={(e) => updateSettingsField('stripeSecretKey', e.target.value)} 
                           placeholder="sk_test_..." 
                         />
                         <p className="text-[9px] text-muted-foreground italic">Alleen zichtbaar voor jou als beheerder. Veilig opgeslagen in de Cloud.</p>
                      </div>
                   </div>
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="help">
             <div className="max-w-5xl mx-auto space-y-12 pb-24">
               {/* Vlijmscherpe Business Guide */}
               <Card className="p-8 md:p-12 rounded-3xl shadow-2xl border-none bg-primary text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><Coins className="w-64 h-64" /></div>
                  <div className="relative z-10 space-y-12">
                     <div className="space-y-2">
                        <h2 className="text-3xl font-headline font-light italic">De Digital Conservator Bottomline</h2>
                        <p className="text-primary-foreground/70 text-sm">Jouw vlijmscherpe commerciële strategie voor 20+ kunstenaars.</p>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-12">
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                           <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-accent" />
                              <h4 className="font-black uppercase text-[11px] tracking-widest text-accent">De Vriendenprijs (Wel oké)</h4>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Opstart (Setup)</span>
                                 <span className="font-headline text-2xl">€250,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Maand (Service)</span>
                                 <span className="font-headline text-2xl">€25,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Verkoop (Commissie)</span>
                                 <span className="font-headline text-2xl">10%</span>
                              </div>
                           </div>
                           <p className="text-[10px] italic opacity-40">Uurtarief extra werk: €50,- ex BTW</p>
                        </div>

                        <div className="p-8 rounded-3xl bg-black/20 border border-white/5 space-y-6">
                           <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-red-400" />
                              <h4 className="font-black uppercase text-[11px] tracking-widest text-red-400">Het "Niet zo leuk" Tarief</h4>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Opstart (Setup)</span>
                                 <span className="font-headline text-2xl">€500,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Maand (Service)</span>
                                 <span className="font-headline text-2xl">€50,-</span>
                              </div>
                              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <span className="text-[10px] uppercase opacity-60">Per Verkoop (Commissie)</span>
                                 <span className="font-headline text-2xl">20%</span>
                              </div>
                           </div>
                           <p className="text-[10px] italic opacity-40">Uurtarief extra werk: €75,- ex BTW</p>
                        </div>
                     </div>
                  </div>
               </Card>

               {/* Master Franchise Section - GEBASEERD OP 100+ UUR DEV */}
               <Card className="p-8 md:p-12 rounded-3xl shadow-2xl border-none bg-accent text-accent-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12"><Briefcase className="w-64 h-64" /></div>
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20"><GraduationCap className="w-6 h-6" /></div>
                       <h2 className="text-3xl font-headline font-light italic">Master Franchise & Exit Strategie</h2>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-black/10 rounded-2xl border border-black/5 max-w-2xl">
                       <HardDrive className="w-5 h-5 shrink-0 mt-1" />
                       <p className="text-xs leading-relaxed">
                         <strong>Asset Waarde:</strong> Dit platform vertegenwoordigt ruim <strong>100 uur intensieve ontwikkeltijd</strong> (IP). 
                         De overnameprijs dekt de volledige codebase, de commerciële blauwdruk en 40 uur training.
                       </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="p-6 rounded-2xl bg-white/10 border border-white/20 space-y-4">
                          <h4 className="font-black uppercase text-[10px] tracking-widest opacity-70">Partner Overname (Vrienden)</h4>
                          <div className="flex justify-between items-end border-b border-white/10 pb-2">
                             <span className="text-[10px] uppercase opacity-60">Volledig Concept</span>
                             <span className="font-headline text-2xl">€7.500,-</span>
                          </div>
                          <ul className="text-[10px] space-y-2 opacity-80">
                             <li className="flex gap-2">✔ 40 uur intensieve training & support</li>
                             <li className="flex gap-2">✔ Overdracht 100+ uur aan ontwikkelde IP</li>
                          </ul>
                       </div>

                       <div className="p-6 rounded-2xl bg-black/10 border border-white/10 space-y-4">
                          <h4 className="font-black uppercase text-[10px] tracking-widest opacity-70">Enterprise Overname (Zakelijk)</h4>
                          <div className="flex justify-between items-end border-b border-white/10 pb-2">
                             <span className="text-[10px] uppercase opacity-60">IP & Licentie</span>
                             <span className="font-headline text-2xl">€15.000,-</span>
                          </div>
                          <ul className="text-[10px] space-y-2 opacity-80">
                             <li className="flex gap-2">✔ 40 uur professionele implementatie</li>
                             <li className="flex gap-2">✔ Commerciële exploitatie licentie</li>
                          </ul>
                       </div>
                    </div>
                  </div>
               </Card>

               {/* Asset Delivery Guide (Meertalig via t()) */}
               <Card className="p-8 md:p-12 rounded-3xl shadow-xl border-none bg-white space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent"><ImageIcon className="w-6 h-6" /></div>
                       <div>
                         <h2 className="text-2xl font-headline font-light">{t('asset_guide_title')}</h2>
                         <p className="text-sm text-muted-foreground">{t('asset_guide_subtitle')}</p>
                       </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                          <CircleCheck className="w-3 h-3" /> {t('asset_specs_title')}
                        </h4>
                        <ul className="space-y-3 text-sm">
                           <li className="flex gap-3 items-start font-bold"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {t('asset_specs_pixels')}</li>
                           <li className="flex gap-3 items-start"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {t('asset_specs_format')}</li>
                           <li className="flex gap-3 items-start"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {t('asset_specs_color')}</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                          <Camera className="w-3 h-3" /> {t('asset_manual_title')}
                        </h4>
                        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                           <p>{t('asset_manual_step1')}</p>
                           <p>{t('asset_manual_step2')}</p>
                           <p>{t('asset_manual_step3')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-secondary/10 p-8 rounded-3xl space-y-6">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                         <CircleHelp className="w-3 h-3" /> {t('asset_faq_title')}
                       </h4>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <p className="text-[11px] font-black uppercase tracking-tight text-foreground">{t('asset_faq_q1')}</p>
                           <p className="text-xs text-muted-foreground leading-relaxed italic">{t('asset_faq_a1')}</p>
                         </div>
                         <div className="space-y-2">
                           <p className="text-[11px] font-black uppercase tracking-tight text-foreground">{t('asset_faq_q2')}</p>
                           <p className="text-xs text-muted-foreground leading-relaxed italic">{t('asset_faq_a2')}</p>
                         </div>
                         <div className="space-y-2">
                           <p className="text-[11px] font-black uppercase tracking-tight text-foreground">{t('asset_faq_q3')}</p>
                           <p className="text-xs text-muted-foreground leading-relaxed italic">{t('asset_faq_a3')}</p>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-black/5 flex items-center justify-between">
                     <p className="text-[9px] uppercase tracking-widest font-black opacity-30">Safe Harbor Framework &bull; Curator Edition</p>
                     <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-bold opacity-40 uppercase">System Ready</span>
                     </div>
                  </div>
               </Card>
             </div>
          </TabsContent>

          <TabsContent value="upload">
             <Card className="p-16 border-dashed border-4 border-muted flex flex-col items-center justify-center text-center space-y-6 bg-white shadow-inner">
                <CloudUpload className="w-16 h-16 opacity-20" />
                <div className="space-y-2">
                   <h2 className="text-xl font-headline font-light italic">Onthul nieuw werk</h2>
                   <p className="text-sm text-muted-foreground">Sleep hier de Master Files (min. 4000px) naar binnen.</p>
                   <div className="flex items-center justify-center gap-2 mt-4 text-accent">
                      <CircleAlert className="w-4 h-4" />
                      <p className="text-[10px] uppercase font-black tracking-widest italic">{t('asset_specs_pixels')}</p>
                   </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleBatchProcess(e.target.files)} accept="image/*" multiple />
                <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="rounded-full px-12 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all">
                   {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />} Selecteer Bestanden
                </Button>
                {isUploading && (
                   <div className="w-full max-w-xs space-y-2">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[10px] uppercase font-bold opacity-40">{uploadStatus}</p>
                   </div>
                )}
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 flex flex-col bg-background border-none">
          <DialogTitle className="sr-only">Editor</DialogTitle>
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4">
             {artworks.find(a => a.id === editingId) && (
                <img src={artworks.find(a => a.id === editingId)?.imageUrl} className="max-h-[60vh] object-contain shadow-2xl" alt="Preview" />
             )}
          </div>
          <div className="h-[40vh] border-t p-8 overflow-y-auto bg-white">
             <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Publieke Titel</Label>
                   <Input defaultValue={artworks.find(a => a.id === editingId)?.displayTitle || ''} onBlur={(e) => updateArtworkField(editingId!, 'displayTitle', e.target.value)} />
                   <Label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Expositieruimte / Collectie</Label>
                   <Input defaultValue={artworks.find(a => a.id === editingId)?.series || ''} onBlur={(e) => updateArtworkField(editingId!, 'series', e.target.value)} />
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-accent/5 rounded-xl border border-accent/10">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-accent">In Museumwinkel Tonen</Label>
                      <Switch checked={artworks.find(a => a.id === editingId)?.inShop} onCheckedChange={(val) => updateArtworkField(editingId!, 'inShop', val)} />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-black/5 rounded-xl border border-black/5">
                      <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">Featured (Homepage)</Label>
                      <Switch checked={artworks.find(a => a.id === editingId)?.featured} onCheckedChange={(val) => updateArtworkField(editingId!, 'featured', val)} />
                   </div>
                   <Button variant="destructive" className="w-full mt-4 h-12 rounded-xl uppercase font-black tracking-widest text-[10px]" onClick={() => { if(confirm('Dit werk permanent uit het archief verwijderen?')) { deleteDoc(doc(firestore!, 'artworks', editingId!)); setEditingId(null); }}}>Verwijder uit Collectie</Button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
