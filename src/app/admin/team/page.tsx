
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Hammer, 
  Heart, 
  BookOpen, 
  TrendingUp, 
  Lock,
  Loader2,
  CheckCircle2,
  Zap,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { verifyAdminPassword } from '@/lib/admin-actions';
import { cn } from '@/lib/utils';

const TEAM_MEMBERS = [
  {
    id: 'simon',
    name: 'Simon',
    role: 'Strategisch Adviseur',
    focus: 'Visie, Business Model & Lange Termijn',
    icon: ShieldCheck,
    color: 'bg-blue-500',
    avatar: 'https://picsum.photos/seed/simon/200',
    status: 'Evalueert merknaam-impact',
    tasks: ['Positionering t.o.v. concurrentie', 'Exit-scenario planning', 'Partner deals evalueren']
  },
  {
    id: 'bob',
    name: 'Bob',
    role: 'Bouwer & Architect',
    focus: 'Code, Firebase & Deep Zoom Tech',
    icon: Hammer,
    color: 'bg-orange-500',
    avatar: 'https://picsum.photos/seed/bob/200',
    status: 'Optimaliseert Deep Zoom',
    tasks: ['Infrastructuur schalen', 'Beveiligingsregels scherpen', 'Nieuwe UI features']
  },
  {
    id: 'clara',
    name: 'Clara',
    role: 'Conservator',
    focus: 'Esthetiek, Poëzie & Museale Kwaliteit',
    icon: Heart,
    color: 'bg-rose-500',
    avatar: 'https://picsum.photos/seed/clara/200',
    status: 'Bewaakt de ziel',
    tasks: ['Tone-of-voice controle', 'Sfeer-matching collecties', 'Curatie van hoofdcollectie']
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'De Leraar',
    focus: 'Kunsthistorie & Diepgaande Analyse',
    icon: BookOpen,
    color: 'bg-emerald-500',
    avatar: 'https://picsum.photos/seed/leo/200',
    status: 'Schrijft analyses',
    tasks: ['Contextuele duiding', 'Historische feitencontrole', 'Educatieve content']
  },
  {
    id: 'mark',
    name: 'Marketeer',
    role: 'Marketeer',
    focus: 'Social Reach & Conversie',
    icon: TrendingUp,
    color: 'bg-purple-500',
    avatar: 'https://picsum.photos/seed/mark/200',
    status: 'Vindt de naam te "veilig"',
    tasks: ['SEO check "Thijs Sterk"', 'Subtitel-test voor FB ads', 'Shop optimalisatie']
  },
  {
    id: 'soof',
    name: 'Soof',
    role: 'PR & Relatiebeheer',
    focus: 'Persbereik, Vernissages & De Gunfactor',
    icon: Sparkles,
    color: 'bg-yellow-500',
    avatar: 'https://picsum.photos/seed/soof/200',
    status: 'Wil meer "Élan" in de titel',
    tasks: ['Persbericht schrijven', 'Influencer outreach kunstsector', 'Digitale vernissage plannen']
  }
];

export default function TeamDashboardPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Fout", description: "Wachtwoord onjuist." });
    }
    setIsVerifying(false);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] shadow-2xl border-none space-y-8">
           <div className="text-center space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h1 className="font-headline text-3xl font-light italic">Team Hub Toegang</h1>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="Wachtwoord" disabled={isVerifying} />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground">
                 {isVerifying ? <Loader2 className="animate-spin" /> : "Ontgrendel Hub"}
              </Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-32 pb-48">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b border-black/5 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl">Team <span className="italic">Dashboard</span></h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Safe Harbor Curator Edition</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-white px-4 py-1.5 rounded-full border-black/10">
            <Zap className="w-3 h-3 mr-2 text-yellow-500 fill-yellow-500" />
            6 Systemen Actief
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-7xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEAM_MEMBERS.map((member) => (
            <Card key={member.id} className="border-none shadow-xl rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500 bg-white">
              <div className={cn("h-32 relative", member.color)}>
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                 <div className="absolute -bottom-12 left-8">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-2xl">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xl font-bold">{member.name[0]}</AvatarFallback>
                    </Avatar>
                 </div>
              </div>
              <CardHeader className="pt-16 pb-4 px-8">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline text-2xl">{member.name}</CardTitle>
                    <CardDescription className="text-xs font-black uppercase tracking-widest text-accent/60 mt-1">
                      {member.role}
                    </CardDescription>
                  </div>
                  <div className={cn("p-2 rounded-xl text-white shadow-lg", member.color)}>
                    <member.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-10 space-y-6">
                <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
                  <p className="text-xs font-bold leading-relaxed">{member.focus}</p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-black/5 pb-2">Huidige Focus</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm italic opacity-70">{member.status}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Takenlijst</h4>
                  <ul className="space-y-2">
                    {member.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs opacity-60">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="ghost" className="w-full mt-4 rounded-xl border border-black/5 group-hover:bg-black/5 transition-all text-[11px] font-black uppercase tracking-widest">
                  <MessageSquare className="w-4 h-4 mr-2" /> Overleg met {member.name}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Add Project Summary Card */}
          <Card className="md:col-span-1 lg:col-span-1 border-2 border-dashed border-black/10 bg-transparent flex flex-col items-center justify-center p-12 text-center space-y-6 rounded-[2rem]">
             <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-accent" />
             </div>
             <div className="space-y-2">
                <h3 className="font-headline text-xl">Museum Status</h3>
                <p className="text-xs opacity-40 uppercase font-black tracking-widest">Alle systemen nominaal</p>
             </div>
             <div className="w-full bg-white/50 p-6 rounded-2xl space-y-4 text-left">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Gezondheid</span>
                   <span className="text-[10px] font-bold text-green-600">100%</span>
                </div>
                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                   <div className="h-full w-full bg-accent" />
                </div>
             </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
