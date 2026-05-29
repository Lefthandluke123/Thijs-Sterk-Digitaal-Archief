"use client";

import React from 'react';
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
  CheckCircle2,
  Zap,
  MessageSquare,
  Waves,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEAM_MEMBERS = [
  {
    id: 'simon',
    name: 'Simon',
    role: 'Strategisch Adviseur',
    focus: 'Branding & Identiteit',
    icon: ShieldCheck,
    color: 'bg-blue-600',
    avatar: 'https://picsum.photos/seed/simon/200',
    status: "Identiteitssprong naar 'Retrospectief' voltooid",
    tasks: ['Bewaken internationale allure', 'Strategische partner-deals']
  },
  {
    id: 'bob',
    name: 'Bob',
    role: 'Bouwer & Architect',
    focus: 'Core Engine & Deep Zoom',
    icon: Hammer,
    color: 'bg-orange-500',
    avatar: 'https://picsum.photos/seed/bob/200',
    status: 'Optimaliseert immersieve interactie',
    tasks: ['Deep Zoom stabiliteit', 'Firebase data-integriteit']
  },
  {
    id: 'clara',
    name: 'Clara',
    role: 'Conservator',
    focus: 'Atmosfeer & Poëzie',
    icon: Heart,
    color: 'bg-rose-500',
    avatar: 'https://picsum.photos/seed/clara/200',
    status: 'Bewaakt Licht, Ruimte en Water essentie',
    tasks: ['Sfeer-matching collecties', 'Narratief over horizon']
  },
  {
    id: 'leo',
    name: 'Leo',
    role: 'De Leraar',
    focus: 'Kunsthistorische Context',
    icon: BookOpen,
    color: 'bg-emerald-600',
    avatar: 'https://picsum.photos/seed/leo/200',
    status: 'Valideert educatieve ontsluiting',
    tasks: ['Historische feitencontrole', 'Archief-validatie']
  },
  {
    id: 'mark',
    name: 'Mark',
    role: 'Marketeer',
    focus: 'Bereik & Conversie',
    icon: TrendingUp,
    color: 'bg-purple-600',
    avatar: 'https://picsum.photos/seed/mark/200',
    status: 'Optimaliseert social impact & shop',
    tasks: ['SEO voor het archief', 'Shop-optimalisatie prints']
  },
  {
    id: 'soof',
    name: 'Soof',
    role: 'PR & Community Manager',
    focus: 'Forum & Vernissages',
    icon: Users,
    color: 'bg-yellow-500',
    avatar: 'https://picsum.photos/seed/soof/200',
    status: "Beheert de 'Vrienden' community",
    tasks: ['Moderatie van verhalen', 'VIP relatiebeheer']
  }
];

/**
 * @fileOverview Team Dashboard.
 * De authenticatie wordt nu volledig afgehandeld door de Middleware.
 */
export default function TeamDashboardPage() {
  return (
    <div className="min-h-screen bg-transparent pt-32 pb-48">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-md border-b border-black/5 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Team <span className="text-accent">Hub</span></h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/60 mt-1">Project: Het Digitale Retrospectief</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-accent/5 px-4 py-1.5 rounded-full border-accent/20 text-accent font-black uppercase text-[9px] tracking-widest">
            <Zap className="w-3 h-3 mr-2 fill-accent" />
            AI Sextet Active
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-7xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TEAM_MEMBERS.map((member) => (
            <Card key={member.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500 bg-white/90 backdrop-blur-xl">
              <div className={cn("h-32 relative", member.color)}>
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
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
                    <CardTitle className="font-headline text-2xl italic">{member.name}</CardTitle>
                    <CardDescription className="text-xs font-black uppercase tracking-widest text-accent/60 mt-1">
                      {member.role}
                    </CardDescription>
                  </div>
                  <div className={cn("p-2.5 rounded-xl text-white shadow-lg", member.color)}>
                    <member.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-10 space-y-6">
                <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
                  <p className="text-[11px] font-bold leading-relaxed uppercase tracking-wider opacity-60">Focus: {member.focus}</p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-black/5 pb-2">Status</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm italic opacity-70 leading-tight">{member.status}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Actieve Taken</h4>
                  <ul className="space-y-2.5">
                    {member.tasks.map((task, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs opacity-60 group-hover:opacity-100 transition-opacity">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="ghost" className="w-full mt-4 rounded-2xl border border-black/5 hover:bg-accent hover:text-white transition-all text-[10px] font-black uppercase tracking-widest h-12">
                  <MessageSquare className="w-4 h-4 mr-2" /> Briefing voor {member.name}
                </Button>
              </CardContent>
            </Card>
          ))}

          <Card className="md:col-span-1 lg:col-span-1 border-2 border-dashed border-accent/20 bg-accent/5 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center space-y-6 rounded-[2.5rem]">
             <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                <Waves className="w-10 h-10 text-accent animate-pulse" />
             </div>
             <div className="space-y-2">
                <h3 className="font-headline text-2xl italic">Retrospective Status</h3>
                <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">Licht, Ruimte & Water geborgd</p>
             </div>
             <div className="w-full bg-white/80 p-6 rounded-3xl space-y-5 text-left shadow-inner">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Horizon-check</span>
                       <span className="text-[9px] font-bold text-green-600">Optimaal</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                       <div className="h-full w-full bg-green-500" />
                    </div>
                  </div>
                </div>
             </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
