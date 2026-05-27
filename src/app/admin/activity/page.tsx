
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Activity, 
  Eye, 
  MousePointer2, 
  User, 
  Clock, 
  Zap,
  Layout,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function ActivityMonitorPage() {
  const firestore = useFirestore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  const logsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100));
  }, [firestore]);

  const { data: logs, loading } = useCollection(logsQuery);

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
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Live Gebruikers Activiteit</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {logs?.length || 0} recente acties
           </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
           <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
              <div className="flex items-center gap-3 opacity-40">
                 <Eye className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Populaire Werken</span>
              </div>
              <p className="text-3xl font-headline italic">Top 5 Inzicht</p>
           </Card>
           <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
              <div className="flex items-center gap-3 opacity-40">
                 <Zap className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Sessie Trends</span>
              </div>
              <p className="text-3xl font-headline italic">Actieve Flows</p>
           </Card>
           <Card className="p-8 rounded-[2rem] bg-white shadow-lg space-y-4">
              <div className="flex items-center gap-3 opacity-40">
                 <Activity className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Systeem Status</span>
              </div>
              <p className="text-3xl font-headline italic text-green-600">Online</p>
           </Card>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border shadow-2xl space-y-6">
           <h2 className="font-headline text-2xl italic border-b border-black/5 pb-6">Live Activiteit Feed</h2>
           
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
                   
                   <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col items-end">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary/60">
                            <User className="w-3 h-3" />
                            {log.userName || `Anoniem (${log.sessionId.substring(0,4)})`}
                         </div>
                         <span className="text-[8px] font-bold opacity-20 uppercase tracking-tighter">ID: {log.sessionId}</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
}
