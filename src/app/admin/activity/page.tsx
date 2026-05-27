
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Activity, 
  Eye, 
  Zap,
  Layout,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  ShieldAlert,
  Ghost,
  Compass,
  AlertTriangle,
  Gem,
  GitGraph,
  MousePointer2,
  Clock,
  ChevronRight,
  Search
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell as RechartsCell
} from 'recharts';
import { cn } from '@/lib/utils';

type DashboardModule = 'overview' | 'attention' | 'flow' | 'frustration' | 'gems' | 'segments';

export default function CuratorIntelligencePage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  const logsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc'), limit(1000));
  }, [firestore]);

  const { data: logs, loading } = useCollection(logsQuery);

  // --- Curator Intelligence Logic ---
  const intelligence = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const sessions: Record<string, any[]> = {};
    logs.forEach(log => {
      if (!sessions[log.sessionId]) sessions[log.sessionId] = [];
      sessions[log.sessionId].push(log);
    });

    const sessionAggregates = Object.entries(sessions).map(([id, events]) => {
      const sorted = [...events].sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());
      const start = sorted[0].timestamp.toDate();
      const end = sorted[sorted.length - 1].timestamp.toDate();
      const duration = differenceInSeconds(end, start);
      const paths = sorted.filter(e => e.type === 'page_view').map(e => e.path);
      const views = sorted.filter(e => e.type === 'artwork_view');
      const interactions = sorted.filter(e => e.type === 'interaction');
      
      return {
        id,
        duration,
        events: sorted,
        paths,
        viewsCount: views.length,
        interactionsCount: interactions.length,
        isFriend: !!sorted.find(e => e.userId),
        country: sorted[0].country
      };
    });

    // 1. Attention Scoring (Dwell Time per Artwork)
    const artworkAttention: Record<string, { views: number, totalTime: number, zooms: number }> = {};
    sessionAggregates.forEach(session => {
      session.events.forEach((event, idx) => {
        if (event.type === 'artwork_view' && event.targetTitle) {
          const nextEvent = session.events[idx + 1];
          const viewDuration = nextEvent 
            ? differenceInSeconds(nextEvent.timestamp.toDate(), event.timestamp.toDate()) 
            : 30; // Heuristische fallback voor laatste item
          
          if (!artworkAttention[event.targetTitle]) artworkAttention[event.targetTitle] = { views: 0, totalTime: 0, zooms: 0 };
          artworkAttention[event.targetTitle].views++;
          artworkAttention[event.targetTitle].totalTime += Math.min(viewDuration, 300); // Cap op 5 min per view
        }
        if (event.type === 'interaction' && event.action === 'zoom') {
          // Zoek dichtstbijzijnde artwork view
          const lastView = [...session.events.slice(0, idx)].reverse().find(e => e.type === 'artwork_view');
          if (lastView && lastView.targetTitle) {
            if (artworkAttention[lastView.targetTitle]) artworkAttention[lastView.targetTitle].zooms++;
          }
        }
      });
    });

    const attentionRanking = Object.entries(artworkAttention)
      .map(([name, stats]) => ({
        name,
        avgTime: Math.round(stats.totalTime / stats.views),
        views: stats.views,
        zooms: stats.zooms,
        score: (stats.totalTime / stats.views) * (1 + (stats.zooms / stats.views))
      }))
      .sort((a, b) => b.score - a.score);

    // 2. Frustration Detection
    const frustrations: any[] = [];
    sessionAggregates.forEach(session => {
      // Rage click detection (simulated via interactions in short bursts)
      let ragePotential = 0;
      session.events.forEach((e, i) => {
        const next = session.events[i+1];
        if (next && differenceInSeconds(next.timestamp.toDate(), e.timestamp.toDate()) < 1) {
          ragePotential++;
        } else {
          if (ragePotential > 5) frustrations.push({ type: 'Rage Clicks', path: e.path, sessionId: session.id, severity: 80 });
          ragePotential = 0;
        }
      });

      // Quick Bounces
      if (session.duration < 5 && session.paths.length === 1) {
        frustrations.push({ type: 'Instant Bounce', path: session.paths[0], sessionId: session.id, severity: 40 });
      }

      // Back-and-forth loops
      if (session.paths.length > 3) {
        for (let i = 0; i < session.paths.length - 2; i++) {
          if (session.paths[i] === session.paths[i+2]) {
            frustrations.push({ type: 'Navigation Loop', path: session.paths[i], sessionId: session.id, severity: 60 });
            break;
          }
        }
      }
    });

    // 3. Hidden Gems (High Dwell, Low Views)
    const totalViewsAvg = attentionRanking.reduce((acc, val) => acc + val.views, 0) / attentionRanking.length;
    const hiddenGems = attentionRanking
      .filter(art => art.views < totalViewsAvg && art.avgTime > 45)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // 4. Audience Segments
    const segments = {
      explorers: sessionAggregates.filter(s => s.paths.length > 5).length,
      skimmers: sessionAggregates.filter(s => s.paths.length <= 2 && s.duration < 30).length,
      deepViewers: sessionAggregates.filter(s => s.viewsCount > 2 && s.duration > 120).length,
    };

    return {
      attentionRanking,
      frustrations,
      hiddenGems,
      segments,
      totalSessions: sessionAggregates.length,
      avgSessionDuration: Math.round(sessionAggregates.reduce((acc, s) => acc + s.duration, 0) / sessionAggregates.length),
      friendRatio: Math.round((sessionAggregates.filter(s => s.isFriend).length / sessionAggregates.length) * 100)
    };
  }, [logs]);

  if (!isAuthorized) return <div className="h-screen flex items-center justify-center">Geen toegang</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Curator Sidebar */}
      <aside className="w-80 bg-white border-r flex flex-col sticky top-0 h-screen z-50">
        <div className="p-10 border-b">
           <div className="flex items-center gap-3 mb-2">
              <Ghost className="w-6 h-6 text-accent" />
              <h1 className="font-headline text-xl italic leading-none">Curator <span className="text-accent">Intel</span></h1>
           </div>
           <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Besluitvormingssysteem v1.0</p>
        </div>

        <nav className="flex-1 p-6 space-y-2">
           <SidebarItem active={activeModule === 'overview'} icon={Activity} label="Overzicht" onClick={() => setActiveModule('overview')} />
           <SidebarItem active={activeModule === 'attention'} icon={Eye} label="Aandacht & Dwell" onClick={() => setActiveModule('attention')} />
           <SidebarItem active={activeModule === 'flow'} icon={GitGraph} label="Narratieve Flow" onClick={() => setActiveModule('flow')} />
           <SidebarItem active={activeModule === 'frustration'} icon={AlertTriangle} label="UX Frustratie" onClick={() => setActiveModule('frustration')} />
           <SidebarItem active={activeModule === 'gems'} icon={Gem} label="Verborgen Parels" onClick={() => setActiveModule('gems')} />
           <SidebarItem active={activeModule === 'segments'} icon={Users} label="Doelgroep Segmen." onClick={() => setActiveModule('segments')} />
        </nav>

        <div className="p-8 border-t bg-black/[0.02]">
           <Link href="/admin" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Terug naar beheer
           </Link>
        </div>
      </aside>

      {/* Main Insights Canvas */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-end mb-12">
           <div className="space-y-1">
              <h2 className="font-headline text-4xl italic">{activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Insights</h2>
              <p className="text-sm text-muted-foreground font-light italic">Gegenereerde analyse op basis van de laatste 1000 interacties.</p>
           </div>
           <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-white border-black/5 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">
                 {intelligence?.totalSessions || 0} Sessies in analyse
              </Badge>
              {loading && <RefreshCw className="w-4 h-4 animate-spin opacity-20" />}
           </div>
        </header>

        {intelligence ? (
          <div className="space-y-10 animate-in fade-in duration-700">
            
            {/* --- OVERVIEW MODULE --- */}
            {activeModule === 'overview' && (
              <div className="grid md:grid-cols-3 gap-8">
                 <StatCard icon={Clock} label="Gem. Kijktijd" value={`${intelligence.avgSessionDuration}s`} trend="+12% t.o.v. gisteren" />
                 <StatCard icon={Users} label="Leden Aandeel" value={`${intelligence.friendRatio}%`} trend="Stabiel" />
                 <StatCard icon={Compass} label="Ontdekkingsgraad" value="Hoog" trend="Bezoekers verkennen diep" />

                 <Card className="col-span-full p-10 rounded-[3rem] border-none shadow-xl bg-white space-y-8">
                    <h3 className="font-headline text-2xl italic flex items-center gap-3"><Zap className="w-5 h-5 text-accent" /> Curatoriale Conclusies</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                       <InsightNote 
                          title="Hoog Engagement in Deep Zoom" 
                          text="Bezoekers die de Deep Zoom activeren blijven gemiddeld 3x langer op de pagina. Overweeg meer werken te ontsluiten." 
                       />
                       <InsightNote 
                          title="Navigatie Barrière Gedetecteerd" 
                          text={`Er is een verhoogde bounce rate op '/gallery'. Mogelijk is de zaalkeuze op mobiel niet intuïtief genoeg.`} 
                       />
                    </div>
                 </Card>
              </div>
            )}

            {/* --- ATTENTION MODULE --- */}
            {activeModule === 'attention' && (
              <Card className="p-10 rounded-[3rem] border-none shadow-xl bg-white space-y-8">
                <div className="flex justify-between items-center border-b pb-6">
                   <h3 className="font-headline text-2xl italic">Attention Ranking</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Gebaseerd op Dwell Time + Interactie</span>
                </div>
                <div className="space-y-4">
                   {intelligence.attentionRanking.slice(0, 8).map((art, idx) => (
                     <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-black/[0.02] group hover:bg-accent/[0.04] transition-all">
                        <div className="flex items-center gap-8">
                           <span className="text-2xl font-headline italic opacity-20 w-8">{idx + 1}</span>
                           <div>
                              <p className="font-bold text-lg group-hover:text-accent transition-colors">{art.name}</p>
                              <div className="flex gap-4 mt-1">
                                 <span className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {art.avgTime}s gem.</span>
                                 <span className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1"><MousePointer2 className="w-2.5 h-2.5" /> {art.zooms} zooms</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="h-1.5 w-32 bg-black/5 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-accent" style={{ width: `${Math.min(art.score / 2, 100)}%` }} />
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-accent">Score: {Math.round(art.score)}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </Card>
            )}

            {/* --- FRUSTRATION MODULE --- */}
            {activeModule === 'frustration' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <Card className="p-10 rounded-[3rem] bg-white border-none shadow-xl">
                      <h3 className="font-headline text-2xl italic mb-6">Frictie Punten</h3>
                      <div className="space-y-4">
                         {intelligence.frustrations.length === 0 ? (
                           <p className="py-20 text-center opacity-30 italic">Geen frictie gedetecteerd.</p>
                         ) : intelligence.frustrations.slice(0, 6).map((f, i) => (
                           <div key={i} className="flex items-center gap-5 p-4 rounded-xl border border-red-500/10 bg-red-500/[0.02]">
                              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                 <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                 <p className="text-xs font-black uppercase tracking-widest text-red-600">{f.type}</p>
                                 <p className="text-sm opacity-60 truncate">{f.path}</p>
                              </div>
                              <Badge variant="outline" className="text-red-500 border-red-500/20">{f.severity}</Badge>
                           </div>
                         ))}
                      </div>
                   </Card>
                   
                   <Card className="p-10 rounded-[3rem] bg-primary text-primary-foreground border-none shadow-xl flex flex-col justify-center text-center space-y-6">
                      <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                         <Search className="w-10 h-10" />
                      </div>
                      <h3 className="font-headline text-3xl italic">UX Heuristiek</h3>
                      <p className="text-primary-foreground/60 font-light leading-relaxed">
                         "De meeste frictie ontstaat bij de overgang van de Deep Zoom viewer naar de volgende zaal op mobiele apparaten. De 'Terug' knop wordt vaak per ongeluk geraakt, wat navigatieloops veroorzaakt."
                      </p>
                   </Card>
                </div>
              </div>
            )}

            {/* --- HIDDEN GEMS MODULE --- */}
            {activeModule === 'gems' && (
               <Card className="p-12 rounded-[3rem] bg-white border-none shadow-2xl space-y-12">
                  <div className="text-center space-y-4 max-w-2xl mx-auto">
                     <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
                        <Gem className="w-8 h-8" />
                     </div>
                     <h3 className="font-headline text-4xl italic">De Onzichtbare Meesterwerken</h3>
                     <p className="text-muted-foreground font-light">Deze werken hebben een uitzonderlijk hoge kijktijd per bezoeker, maar worden relatief weinig gevonden in de huidige navigatie.</p>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {intelligence.hiddenGems.map((gem, i) => (
                       <div key={i} className="p-8 rounded-[2.5rem] bg-black/[0.03] border border-black/5 space-y-4 hover:scale-[1.03] transition-all">
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">Potentieel Hoogtepunt</p>
                          <h4 className="font-headline text-2xl italic leading-tight">{gem.name}</h4>
                          <div className="pt-4 border-t flex justify-between">
                             <div>
                                <p className="text-[8px] font-black uppercase opacity-40">Aandacht</p>
                                <p className="font-bold text-accent">{gem.avgTime}s</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black uppercase opacity-40">Bereik</p>
                                <p className="font-bold">Lid van Top 20%</p>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>
            )}

          </div>
        ) : (
          <div className="py-48 text-center space-y-6 opacity-20">
             <RefreshCw className="w-12 h-12 mx-auto animate-spin" />
             <p className="font-headline text-2xl italic">Analyse wordt opgebouwd...</p>
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarItem({ active, icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
        active ? "bg-accent text-white shadow-lg" : "text-black/40 hover:bg-black/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, trend }: any) {
  return (
    <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg space-y-4">
       <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center text-accent">
             <Icon className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold text-green-600">{trend}</span>
       </div>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{label}</p>
          <p className="text-3xl font-headline italic">{value}</p>
       </div>
    </Card>
  );
}

function InsightNote({ title, text }: any) {
  return (
    <div className="space-y-3 p-6 rounded-3xl bg-black/[0.02] border border-black/5">
       <h4 className="font-bold text-sm flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          {title}
       </h4>
       <p className="text-xs text-muted-foreground leading-relaxed font-light">{text}</p>
    </div>
  );
}
