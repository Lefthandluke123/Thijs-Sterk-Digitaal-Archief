"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useAuth } from '@/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  ArrowLeft, 
  Users,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

export default function ForumModerationPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1527') {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
      if (auth) {
        signInAnonymously(auth).catch(err => {
           console.warn("Anoniem inloggen mislukt:", err);
        });
      }
    } else {
      toast({ variant: "destructive", title: "Wachtwoord onjuist" });
    }
  };

  const forumQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'forum'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allPosts, loading } = useCollection(forumQuery);

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-accent/5 rounded-full flex items-center justify-center mx-auto text-accent">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl italic">Forum <span className="text-accent">Moderatie</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" className="h-16 rounded-2xl text-center text-xl bg-black/5 border-none" />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest">Inloggen</Button>
          </form>
        </Card>
      </main>
    );
  }

  const pendingPosts = allPosts?.filter(p => (p as any).status === 'pending') || [];

  return (
    <div className="min-h-screen pt-32 pb-48 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Forum <span className="text-accent">Moderatie</span></h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto py-12">
        <p className="text-center opacity-40 italic">Geen berichten in de wachtrij.</p>
      </main>
    </div>
  );
}
