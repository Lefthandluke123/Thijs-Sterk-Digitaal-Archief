"use client";

import React, { useState, useMemo, useRef } from 'react';
import { useFirestore, useCollection, useAuth, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  History, 
  HelpCircle, 
  ArrowRightLeft,
  Loader2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AuthModal } from '@/components/auth-modal';

export default function ForumPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  
  const [isPostingOpen, setIsPostingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Alle');
  
  const pendingActionRef = useRef<null | (() => void)>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Verhaal'
  });

  const requireFriend = (action: () => void) => {
    if (user) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setAuthModalOpen(true);
  };

  const handleGoogleLogin = async () => {
    if (!auth || isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      
      setAuthModalOpen(false);
      toast({ 
        title: "Welkom Vriend!", 
        description: "U kunt nu bijdragen aan het forum." 
      });

      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
    } catch (e: any) {
      console.error("Login error:", e);
      if (e.code !== 'auth/popup-closed-by-user') {
        toast({ 
          variant: "destructive", 
          title: "Inloggen mislukt", 
          description: "Controleer pop-ups of Firebase instellingen." 
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenPost = () => {
    requireFriend(() => {
      setIsPostingOpen(true);
    });
  };

  // We halen alle berichten op en sorteren op datum.
  // Filtering op status en categorie doen we in het geheugen om Firestore Index errors te voorkomen.
  const forumQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'forum'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: allPosts, loading } = useCollection(forumQuery);

  const posts = useMemo(() => {
    if (!allPosts) return [];
    return allPosts.filter((p: any) => {
      const isApproved = p.status === 'approved';
      const matchesCategory = activeCategory === 'Alle' || p.category === activeCategory;
      return isApproved && matchesCategory;
    });
  }, [allPosts, activeCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    
    setIsSubmitting(true);
    const postData = {
      ...formData,
      authorId: user.uid,
      authorName: user.displayName || "Anonieme Vriend",
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(firestore, 'forum'), postData);
      toast({ 
        title: "Bericht ingediend", 
        description: "Uw bericht wordt gecontroleerd voordat het zichtbaar wordt." 
      });
      setIsPostingOpen(false);
      setFormData({ title: '', content: '', category: 'Verhaal' });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij plaatsen" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CATEGORIES = [
    { label: 'Verhalen', icon: History, value: 'Verhaal' },
    { label: 'Vragen', icon: HelpCircle, value: 'Vraag' },
    { label: 'Ruil / Koop', icon: ArrowRightLeft, value: 'Ruil/Koop' },
  ];

  return (
    <main className="min-h-screen bg-background pt-32 pb-48 px-6">
      <div className="container mx-auto max-w-5xl space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-black/5 pb-12">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-accent/5 border border-accent/10">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Vrienden van het Museum</span>
             </div>
             <h1 className="font-headline text-5xl md:text-7xl font-light leading-tight">
               Forum <span className="italic">Community</span>
             </h1>
          </div>

          <div className="flex items-center gap-4">
             <Button 
               onClick={handleOpenPost}
               className="h-16 px-10 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all"
             >
                <Plus className="w-4 h-4 mr-3" /> Bericht Plaatsen
             </Button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
           <button 
              onClick={() => setActiveCategory('Alle')}
              className={cn(
                "px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                activeCategory === 'Alle' ? "bg-accent text-white shadow-xl" : "bg-white/50 border hover:border-accent/30"
              )}
           >
              Alle
           </button>
           {CATEGORIES.map(cat => (
             <button 
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeCategory === cat.value ? "bg-accent text-white shadow-xl" : "bg-white/50 border hover:border-accent/30"
                )}
             >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.label}
             </button>
           ))}
        </div>

        <div className="grid gap-8">
           {loading ? (
             <div className="py-32 flex flex-col items-center gap-4 opacity-20">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Laden...</span>
             </div>
           ) : posts?.map((post: any) => (
               <Card key={post.id} className="p-10 rounded-[2.5rem] bg-white/60 backdrop-blur-xl border-none shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                     <div className="space-y-3">
                        <div className="flex items-center gap-3">
                           <Badge variant="outline" className="rounded-full px-3 py-1 bg-white text-[9px] font-black uppercase tracking-widest border-black/5">
                              {post.category}
                           </Badge>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-20">
                              {post.createdAt ? format(post.createdAt.toDate(), 'd MMMM yyyy', { locale: nl }) : 'Zojuist'}
                           </span>
                        </div>
                        <h3 className="font-headline text-3xl italic leading-tight">{post.title}</h3>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Door</p>
                        <p className="text-sm font-bold">{post.authorName}</p>
                     </div>
                  </div>
                  <div className="text-lg font-light leading-relaxed text-muted-foreground whitespace-pre-line">
                     {post.content}
                  </div>
               </Card>
             ))
           }
        </div>
      </div>

      <Dialog open={isPostingOpen} onOpenChange={setIsPostingOpen}>
        <DialogContent className="rounded-[2.5rem] p-10 max-w-2xl border-none bg-white/95 backdrop-blur-3xl shadow-2xl">
           <DialogHeader>
              <DialogTitle className="font-headline text-3xl italic">Nieuwe Bijdrage</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black opacity-40 ml-2">Categorie</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                       <SelectTrigger className="h-14 rounded-2xl bg-black/5 border-none text-xs font-bold uppercase tracking-widest">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="rounded-2xl shadow-xl border-none">
                          <SelectItem value="Verhaal">Verhaal</SelectItem>
                          <SelectItem value="Vraag">Vraag</SelectItem>
                          <SelectItem value="Ruil/Koop">Ruil / Koop</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black opacity-40 ml-2">Titel</Label>
                    <Input 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="h-14 rounded-2xl bg-black/5 border-none px-6"
                      required
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black opacity-40 ml-2">Uw Bericht</Label>
                 <Textarea 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    className="min-h-[200px] rounded-[1.5rem] bg-black/5 border-none p-6"
                    required
                 />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest">
                 {isSubmitting ? <Loader2 className="animate-spin" /> : "Indienen voor controle"}
              </Button>
           </form>
        </DialogContent>
      </Dialog>

      <AuthModal 
        isOpen={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onLogin={handleGoogleLogin} 
        isLoggingIn={isLoggingIn}
      />
    </main>
  );
}
