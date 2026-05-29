
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Hammer, 
  Heart, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2,
  Zap,
  MessageSquare,
  Waves,
  Users,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamDashboardPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');

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
      toast({ variant: "destructive", title: "Toegang geweigerd" });
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#f4f4f2]">
        <Card className="max-w-md w-full p-12 rounded-[3rem] shadow-2xl border-none space-y-8 text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-600">
            <Zap className="w-8 h-8" />
          </div>
          <h1 className="font-headline text-3xl italic">Team <span className="text-green-600">Hub</span></h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Toegangscode" className="h-16 rounded-2xl text-center text-xl bg-black/5 border-none" />
            <Button type="submit" className="w-full h-16 rounded-2xl bg-green-600 text-white font-black uppercase">Verbinden</Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-48">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b border-black/5 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-headline text-2xl italic leading-none">Team <span className="text-accent">Hub</span></h1>
        </div>
      </header>
      <main className="container mx-auto px-6 py-12">
        <p className="text-center opacity-40 italic">AI Sextet Active - Status Optimaal</p>
      </main>
    </div>
  );
}
