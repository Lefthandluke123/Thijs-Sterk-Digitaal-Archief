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
    focus: 'Branding & Identiteit',
    icon: ShieldCheck,
    color: 'bg-blue-500',
    avatar: 'https://picsum.photos/seed/simon/200',
    status: "Transitie naar 'Digitale Retrospectief' voltooid",
    tasks: ['Positionering t.o.v. internationale archieven', 'Monitoring merkconsistentie', 'Partner deals evalueren']
  },
  {
    id: 'bob',
    name: 'Bob',
    role: 'Bouwer & Architect',
    focus: 'Core Engine & Deep Zoom',
    icon: Hammer,
    color: 'bg-orange-500',
    avatar: 'https://picsum.photos/seed/bob/200',
    status: 'Optimaliseert interactie voor Retrospectief',
    tasks: ['Deep Zoom stabiliteit bewaken', 'Metadata injectie voor Facebook verfijnen', 'UI Identity Shift borgen']
  },
  {
    id: 'clara',
    name: 'Clara',
    role: 'Conservator',
    focus: 'Atmosfeer & Verstilling',
    icon: Heart,
    color: 'bg-rose-500',
    avatar: 'https://picsum.photos/seed/clara/200',
    status: 'Bewaakt Licht, Ruimte en Water essentie',
    tasks: ['Check op sfeer-matching collecties', 'Narratief over horizon en strijklicht', 'Curatie van retrospectief archief']
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'De Leraar',
    focus: 'Historische Context',
    icon: BookOpen,
    color: 'bg-emerald-500',
    avatar: 'https://picsum.photos/seed/leo/200',
    status: 'Valideert feiten voor het Retrospectief',
    tasks: ['Contextuele duiding monumentaal werk', 'Historische feitencontrole archief', 'Educatieve ontsluiting']
  },
  {
    id: 'mark',
    name: 'Marketeer',
    role: 'Marketeer',
    focus: 'Bereik & Conversie',
    icon: TrendingUp,
    color: 'bg-purple-500',
    avatar: 'https://picsum.photos/seed/mark/200',
    status: 'Optimaliseert social ads voor Digitale Retrospectief',
    tasks: ['Facebook Ads voor de Retrospectief', 'SEO strategie voor merknaam', 'Shop conversie prints']
  },
  {
    id: 'soof',
    name: 'Soof',
    role: 'PR & Relatiebeheer',
    focus: 'Glans & Vernissages',
    icon: Sparkles,
    color: 'bg-yellow-500',
    avatar: 'https://picsum.photos/seed/soof/200',
    status: "Bereidt de 'Global Vernissage' voor",
    tasks: ['Persbericht "Mondiaal Retrospectief"', 'Influencer outreach kunstsector', 'VIP previews organiseren']
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Safe Harbor: Het Digitale Retrospectief</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-white px-4 py-1.5 rounded-full border-black/10">
            <Zap className="w-3 h-3 mr-2 text-yellow-500 fill-yellow-500" />
            Branding Shift Active
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

          <Card className="md:col-span-1 lg:col-span-1 border-2 border-dashed border-black/10 bg-transparent flex flex-col items-center justify-center p-12 text-center space-y-6 rounded-[2rem]">
             <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                <Heart className="w-10 h-10 text-rose-500" />
             </div>
             <div className="space-y-2">
                <h3 className="font-headline text-xl">Retrospective Status</h3>
                <p className="text-xs opacity-40 uppercase font-black tracking-widest">Licht & Ruimte geborgd</p>
             </div>
             <div className="w-full bg-white/50 p-6 rounded-2xl space-y-4 text-left">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Horizon-check</span>
                   <span className="text-[10px] font-bold text-green-600">Optimaal</span>
                </div>
                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                   <div className="h-full w-full bg-green-500" />
                </div>
             </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
