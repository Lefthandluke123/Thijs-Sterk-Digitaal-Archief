
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, updateDoc, addDoc, serverTimestamp, orderBy, getDocs, where, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Search,
  Palette,
  Lock,
  Plus,
  LayoutDashboard,
  Layers,
  Languages,
  X,
  DatabaseZap,
  CheckSquare,
  Square,
  CheckCircle2,
  FolderInput,
  Star,
  ShoppingBag,
  ExternalLink,
  Edit3,
  Sparkles,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';
import placeholderData from '@/app/lib/placeholder-images.json';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminPage() {
  const firestore = useFirestore();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('artworks');

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setIsAuthorized(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    if (await verifyAdminPassword(password)) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Fout", description: "Wachtwoord onjuist." });
    }
    setIsVerifying(false);
  };

  const artworksQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'artworks'), orderBy('createdAt', 'desc'));
  }, [firestore, isAuthorized]);
  const { data: artworks, loading: artLoading } = useCollection(artworksQuery);

  const roomsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'rooms'), orderBy('order', 'asc'));
  }, [firestore, isAuthorized]);
  const { data: rooms, loading: roomsLoading } = useCollection(roomsQuery);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Museum Beheer</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary">
                 {isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendel"}
              </Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 px-8">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LayoutDashboard className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-headline text-2xl">Het Digitale <span className="italic">Archief</span></h1>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-accent">Real-time CMS Manager</p>
          </div>
        </div>
        <Link href="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           <ArrowLeft className="w-3 h-3" /> Naar Website
        </Link>
      </header>

      <div className="max-w-7xl mx-auto space-y-12 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-full w-fit mx-auto h-14 border">
            <TabsTrigger value="artworks" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Palette className="w-4 h-4 mr-2" /> Collectie
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Layers className="w-4 h-4 mr-2" /> Zalen
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-full px-8 h-12 uppercase font-black text-[11px] tracking-widest">
              <Languages className="w-4 h-4 mr-2" /> CMS & Vertalingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artworks" className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
               {/* Collectie Grid hier... */}
               <Card className="col-span-full p-20 text-center rounded-[3rem] border-dashed border-4 border-black/5 bg-transparent">
                  <h3 className="font-headline text-2xl italic mb-4">Beheer je Kunstwerken</h3>
                  <Button onClick={() => setActiveTab('artworks')} className="rounded-full px-10 h-14 bg-accent">
                     <Plus className="w-4 h-4 mr-2" /> Werk Toevoegen
                  </Button>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="rooms">
             <div className="grid md:grid-cols-3 gap-6">
                {rooms?.map((room: any) => (
                  <Card key={room.id} className="p-8 rounded-[2rem] border-none shadow-md bg-white">
                    <h3 className="font-headline text-2xl italic mb-2">{room.title}</h3>
                    <p className="text-sm opacity-60 mb-6">{room.description}</p>
                    <Button variant="outline" className="w-full rounded-xl uppercase font-black text-[10px] tracking-widest">Bewerk Zaal</Button>
                  </Card>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="content">
            <Card className="p-16 rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Languages className="w-48 h-48" />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
                   <Sparkles className="w-10 h-10 text-accent" />
                </div>
                <div className="space-y-4">
                  <h2 className="font-headline text-4xl italic">Translation Hub & CMS</h2>
                  <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    Beheer alle teksten op de website in 5 talen. Gebruik AI om direct vertalingen te genereren voor de homepage, biografie en winkel.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button size="lg" className="h-16 px-12 rounded-full bg-primary font-black uppercase tracking-widest text-[12px] shadow-xl" asChild>
                    <Link href="/admin/translate">
                      Open Vertaal Station <ArrowLeft className="w-4 h-4 ml-3 rotate-180" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-16 px-12 rounded-full border-2 font-black uppercase tracking-widest text-[12px]">
                    <FileText className="w-4 h-4 mr-3" /> Pagina Beheer
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
