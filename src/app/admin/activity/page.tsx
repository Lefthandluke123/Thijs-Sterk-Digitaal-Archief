
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Activity, 
  Eye, 
  MousePointer2, 
  User, 
  Clock, 
  Zap,
  Layout,
  RefreshCw,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users
} from 'lucide-react';
import { format, startOfHour, parseISO } from 'date-fns';
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
  Cell,
  Cell as RechartsCell
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const COLORS = ['#142 30% 25%', '#201 45% 10%', '#f43f5e', '#3b82f6', '#8b5cf6'];

export default function ActivityMonitorPage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('live');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  // We halen een grotere set op voor de rapportage (500 logs)
  const logsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc'), limit(500));
  }, [firestore]);

  const { data: logs, loading } = useCollection(logsQuery);

  // Data Aggregatie voor rapportage
  const stats = useMemo(() => {
    if (!logs) return null;

    const typeCounts: Record<string, number> = {};
    const artworkCounts: Record<string, number> = {};
    const hourlyActivity: Record<string, number> = {};
    const sessions = new Set();
    let loggedInCount = 0;

    logs.forEach((log: any) => {
      // Types
      typeCounts[log.type] = (typeCounts[log.type] || 0) + 1;
      
      // Artworks
      if (log.type === 'artwork_view' && log.targetTitle) {
        artworkCounts[log.targetTitle] = (artworkCounts[log.targetTitle] || 0) + 1;
      }

      // Time (Hourly)
      if (log.timestamp) {
        const date = log.timestamp.toDate();
        const hourKey = format(date, 'HH:00');
        hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1;
      }

      // Users
      if (log.sessionId) sessions.add(log.sessionId);
      if (log.userId) loggedInCount++;
    });

    // Format for Recharts
    const trendData = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ 
      name: name.replace('_', ' '), 
      value 
    }));

    const popularArtworks = Object.entries(artworkCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: logs.length,
      uniqueSessions: sessions.size,
      loggedInPercentage: Math.round((loggedInCount / logs.length) * 100),
      trendData,
      typeData,
      popularArtworks
    };
  }, [logs]);

  if (!isAuthorized) return <div className="h-screen flex items-center justify-center">Geen toegang</div>;

  const getIcon = (type: string) => {
    switch(type) {
      case 'page_view': return <Layout className="w-4 h-4 text-blue-500" />;
      case 'artwork_view': return <Eye className="w-4 h-4 text-accent" />;
      case 'interaction': return <MousePointer2 className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-48 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Ghost <span className="text-accent">Monitor</span></h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Gedragsanalyse & Live Feed</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {logs?.length || 0} acties in cache
           </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-xl">
            <TabsTrigger value="live" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest data-[state=active]:bg-accent data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" /> Live Feed
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" /> Rapportage Mode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-8 mt-0 animate-in fade-in duration-500">
            <div className="grid md:grid-cols-3 gap-6">
               <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
                  <div className="flex items-center gap-3 opacity-40">
                     <Users className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Actieve Sessies</span>
                  </div>
                  <p className="text-3xl font-headline italic">{stats?.uniqueSessions || 0}</p>
               </Card>
               <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
                  <div className="flex items-center gap-3 opacity-40">
                     <User className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Vrienden Aandeel</span>
                  </div>
                  <p className="text-3xl font-headline italic">{stats?.loggedInPercentage || 0}%</p>
               </Card>
               <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
                  <div className="flex items-center gap-3 opacity-40">
                     <Activity className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Systeem Status</span>
                  </div>
                  <p className="text-3xl font-headline italic text-green-600">Live</p>
               </Card>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border shadow-2xl space-y-6">
               <h2 className="font-headline text-2xl italic border-b border-black/5 pb-6">Activiteit Stroom</h2>
               <div className="space-y-4">
                  {loading ? (
                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin opacity-20" /></div>
                  ) : logs?.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] hover:bg-black/[0.04] transition-all border border-transparent hover:border-black/5">
                       <div className="flex items-center gap-6">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                             {getIcon(log.type)}
                          </div>
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                                   {log.type.replace('_', ' ')}
                                </span>
                                <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                                   {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss', { locale: nl }) : ''}
                                </span>
                             </div>
                             <p className="text-sm font-medium">
                                {log.type === 'page_view' ? `Bezocht: ${log.path}` : 
                                 log.type === 'artwork_view' ? `Bekeek: ${log.targetTitle || 'Onbekend werk'}` :
                                 log.type === 'interaction' ? `Interactie: ${log.action}` : 'Systeem actie'}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60">
                             <User className="w-3 h-3" />
                             {log.userName || `Anoniem (${log.sessionId.substring(0,4)})`}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Trends Card */}
              <Card className="p-8 rounded-[3rem] bg-white shadow-xl border-none col-span-full">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <CardTitle className="font-headline text-2xl italic">Volume & Trends</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">Totaal aantal acties per uur</CardDescription>
                </CardHeader>
                <div className="h-[300px] w-full pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: 'white', strokeWidth: 2 }} 
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Popular Artworks Card */}
              <Card className="p-8 rounded-[3rem] bg-white shadow-xl border-none">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Eye className="w-5 h-5 text-accent" />
                    <CardTitle className="font-headline text-2xl italic">Top 5 Werken</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">Meest bekeken schilderijen</CardDescription>
                </CardHeader>
                <div className="h-[300px] w-full pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.popularArtworks} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Distribution Card */}
              <Card className="p-8 rounded-[3rem] bg-white shadow-xl border-none">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <PieChartIcon className="w-5 h-5 text-accent" />
                    <CardTitle className="font-headline text-2xl italic">Interactie Patroon</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-40">Verdeling van actietypes</CardDescription>
                </CardHeader>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {stats?.typeData.map((entry, index) => (
                          <RechartsCell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--accent))' : index === 1 ? 'hsl(var(--primary))' : '#fbbf24'} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 pr-4">
                     {stats?.typeData.map((entry, index) => (
                       <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: index === 0 ? 'hsl(var(--accent))' : index === 1 ? 'hsl(var(--primary))' : '#fbbf24' }} />
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{entry.name}</span>
                       </div>
                     ))}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
