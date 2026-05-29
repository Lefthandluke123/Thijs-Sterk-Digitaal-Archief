
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useStorage } from '@/firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Plus,
  ArrowLeft,
  Edit3,
  Upload,
  Save,
  CheckCircle2,
  Lock,
  Eye,
  Camera
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { normalizePrivatePhoto, PRIVATE_ALBUMS } from '@/lib/museum-utils';

export default function AdminPrivatePage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const firestore = useFirestore();
  const storage = useStorage();

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1527') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Wachtwoord onjuist" });
    }
  };

  const photosQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'privatePhotos'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbPhotos, loading } = useCollection(photosQuery);
  const photos = useMemo(() => dbPhotos?.map(p => normalizePrivatePhoto(p.id, p)) || [], [dbPhotos]);

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-600">
            <Camera className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl italic">Privé <span className="text-orange-600">Archief</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" className="h-16 rounded-2xl text-center text-xl bg-black/5 border-none" />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest">Toegang</Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-48 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Privé <span className="text-accent">Archiefbeheer</span></h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {photos.map(p => (
             <Card key={p.id} className="p-4 rounded-3xl">
                <img src={p.imageUrl} className="aspect-square object-cover rounded-2xl" alt="" />
             </Card>
           ))}
        </div>
      </main>
    </div>
  );
}
