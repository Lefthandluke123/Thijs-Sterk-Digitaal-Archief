"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
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
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

/**
 * @fileOverview Forum Moderatie.
 * De authenticatie wordt nu volledig afgehandeld door de Middleware.
 */
export default function ForumModerationPage() {
  const firestore = useFirestore();

  const forumQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'forum'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allPosts, loading } = useCollection(forumQuery);

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'forum', id), {
        status,
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: status === 'approved' ? "Post goedgekeurd" : "Post afgewezen",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij bijwerken" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Weet u zeker dat u dit bericht definitief wilt verwijderen?")) return;
    try {
      await deleteDoc(doc(firestore, 'forum', id));
      toast({ title: "Bericht gewist" });
    } catch (e) {
      toast({ variant: "destructive", title: "Verwijderen mislukt" });
    }
  };

  const pendingPosts = allPosts?.filter(p => (p as any).status === 'pending') || [];
  const approvedPosts = allPosts?.filter(p => (p as any).status === 'approved') || [];
  const rejectedPosts = allPosts?.filter(p => (p as any).status === 'rejected') || [];

  return (
    <div className="min-h-screen pt-32 pb-48 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-40 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Forum <span className="text-accent">Moderatie</span></h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Community Lead: Soof</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {pendingPosts.length} berichten te beoordelen
           </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Tabs defaultValue="pending" className="space-y-12">
          <TabsList className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full w-fit mx-auto h-16 border shadow-xl">
            <TabsTrigger value="pending" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest data-[state=active]:bg-accent data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" /> Wachtrij ({pendingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Gepubliceerd ({approvedPosts.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-full px-10 h-13 uppercase font-black text-[10px] tracking-widest data-[state=active]:bg-destructive data-[state=active]:text-white">
              <XCircle className="w-4 h-4 mr-2" /> Afgewezen ({rejectedPosts.length})
            </TabsTrigger>
          </TabsList>

          <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/60 shadow-2xl">
            <TabsContent value="pending" className="space-y-6 mt-0">
               {loading ? (
                 <div className="py-32 text-center opacity-20 italic">Laden...</div>
               ) : pendingPosts.length === 0 ? (
                 <div className="py-32 text-center opacity-20 italic">Geen berichten in de wachtrij.</div>
               ) : (
                 pendingPosts.map((post: any) => (
                   <PostCard key={post.id} post={post} onApprove={() => handleStatus(post.id, 'approved')} onReject={() => handleStatus(post.id, 'rejected')} />
                 ))
               )}
            </TabsContent>
            
            <TabsContent value="approved" className="space-y-6 mt-0">
               {approvedPosts.map((post: any) => (
                 <PostCard key={post.id} post={post} onReject={() => handleStatus(post.id, 'rejected')} onTrash={() => handleDelete(post.id)} />
               ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-6 mt-0">
               {rejectedPosts.map((post: any) => (
                 <PostCard key={post.id} post={post} onApprove={() => handleStatus(post.id, 'approved')} onTrash={() => handleDelete(post.id)} />
               ))}
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function PostCard({ post, onApprove, onReject, onTrash }: any) {
  return (
    <Card className="p-8 rounded-[2rem] border-none shadow-lg bg-white/90 space-y-6">
       <div className="flex justify-between items-start gap-8">
          <div className="space-y-3 flex-1">
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest bg-black/5">{post.category}</Badge>
                <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                   {post.createdAt ? format(post.createdAt.toDate(), 'd MMM yyyy HH:mm', { locale: nl }) : ''}
                </span>
                <span className="text-[9px] font-black uppercase text-accent border-l border-black/10 pl-3">Door: {post.authorName}</span>
             </div>
             <h3 className="font-headline text-2xl italic">{post.title}</h3>
             <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">{post.content}</p>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
             {onApprove && (
               <Button onClick={onApprove} className="h-12 px-6 rounded-xl bg-green-600 text-white font-black uppercase text-[10px] tracking-widest">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Goedkeuren
               </Button>
             )}
             {onReject && (
               <Button onClick={onReject} variant="outline" className="h-12 px-6 rounded-xl border-destructive/20 text-destructive font-black uppercase text-[10px] tracking-widest hover:bg-destructive hover:text-white">
                  <XCircle className="w-4 h-4 mr-2" /> Afwijzen
               </Button>
             )}
             {onTrash && (
               <Button onClick={onTrash} variant="ghost" className="h-12 w-12 rounded-xl text-black/20 hover:text-destructive p-0">
                  <Trash2 className="w-4 h-4" />
               </Button>
             )}
          </div>
       </div>
    </Card>
  );
}
