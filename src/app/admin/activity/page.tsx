"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useAuth } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Activity, 
  Eye, 
  Zap,
  RefreshCw,
  Users,
  Compass,
  AlertTriangle,
  Gem,
  GitGraph,
  MousePointer2,
  Clock,
  Search,
  Ghost,
  Lock,
  ArrowRight
} from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CuratorIntelligencePage() {
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

  const logsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc'), limit(1000));
  }, [firestore]);

  const { data: logs, loading } = useCollection(logsQuery);

  const intelligence = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    return {
      totalSessions: 1,
      avgSessionDuration: 120,
      friendRatio: 50,
      attentionRanking: [],
      frustrations: [],
      hiddenGems: [],
      segments: { explorers: 0, skimmers: 0, deepViewers: 0 }
    };
  }, [logs]);

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl italic">Ghost <span className="text-blue-600">Monitor</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" className="h-16 rounded-2xl text-center text-xl bg-black/5 border-none" />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest">Start Analyse <ArrowRight className="ml-2 w-4 h-4" /></Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      <aside className="w-80 bg-white border-r flex flex-col sticky top-0 h-screen z-50">
        <div className="p-10 border-b">
           <div className="flex items-center gap-3 mb-2">
              <Ghost className="w-6 h-6 text-accent" />
              <h1 className="font-headline text-xl italic leading-none">Curator <span className="text-accent">Intel</span></h1>
           </div>
        </div>
        <div className="p-8 border-t bg-black/[0.02] mt-auto">
           <Link href="/admin" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Terug naar beheer
           </Link>
        </div>
      </aside>
      <main className="flex-1 p-12">
        <h2 className="font-headline text-4xl italic mb-12">Analyse Insights</h2>
        <div className="py-48 text-center space-y-6 opacity-20">
             <RefreshCw className="w-12 h-12 mx-auto animate-spin" />
             <p className="font-headline text-2xl italic">Analyse wordt opgebouwd...</p>
        </div>
      </main>
    </div>
  );
}
