
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection, useStorage } from '@/firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  query, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Loader2, 
  Plus,
  ArrowLeft,
  Camera,
  Edit3,
  Upload,
  Image as ImageIcon,
  Save,
  X,
  CheckCircle2,
  Lock,
  Eye,
  Type,
  Tag as TagIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { normalizePrivatePhoto, PRIVATE_ALBUMS } from '@/lib/museum-utils';
import { verifyAdminPassword } from '@/lib/admin-actions';

/**
 * @fileOverview Beheerpagina voor het Privé-Archief.
 * Focus op uploaden en categoriseren van persoonlijke documentatie.
 */
export default function AdminPrivatePage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', description: '', album: 'Familie', year: '', visibility: 'friends'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_auth');
      if (auth === 'true') setIsAuthorized(true);
    }
  }, []);

  const photosQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'privatePhotos'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbPhotos, loading } = useCollection(photosQuery);
  const photos = useMemo(() => dbPhotos?.map(p => normalizePrivatePhoto(p.id, p)) || [], [dbPhotos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    if (await verifyAdminPassword(password)) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      toast({ variant: "destructive", title: "Onjuist wachtwoord" });
    }
    setIsVerifying(false);
  };

  const openNew = () => {
    setEditingPhoto(null);
    setSelectedFile(null);
    setForm({ title: '', description: '', album: 'Familie', year: '', visibility: 'friends' });
    setIsDialogOpen(true);
  };

  const handleEdit = (photo: any) => {
    setEditingPhoto(photo);
    setSelectedFile(null);
    setForm({ ...photo });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!firestore) return;
    setIsUploading(true);

    try {
      let finalImageUrl = editingPhoto?.imageUrl || '';

      if (selectedFile && storage) {
        const storageRef = ref(storage, `private-archive/originals/${Date.now()}_${selectedFile.name}`);
        const result = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(result.ref);
      }

      if (!finalImageUrl) {
        toast({ variant: "destructive", title: "Geen afbeelding" });
        setIsUploading(false);
        return;
      }

      const data = {
        ...form,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp()
      };

      if (editingPhoto) {
        await updateDoc(doc(firestore, 'privatePhotos', editingPhoto.id), data);
        toast({ title: "Foto bijgewerkt" });
      } else {
        await addDoc(collection(firestore, 'privatePhotos'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast({ title: "Toegevoegd aan Privé-Archief" });
      }

      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Opslaan mislukt", description: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm("Deze foto definitief verwijderen uit het Privé-Archief?")) return;
    await deleteDoc(doc(firestore, 'privatePhotos', id));
    toast({ title: "Verwijderd" });
  };

  if (!isAuthorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f4f4f2]">
        <Card className="p-12 rounded-[3rem] shadow-2xl max-w-md w-full space-y-8">
           <h1 className="font-headline text-3xl text-center italic">Beheer <span className="text-accent">Privé Depot</span></h1>
           <form onSubmit={handleLogin} className="space-y-6">
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-14 rounded-2xl text-center" placeholder="••••••" />
              <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl bg-primary">Toegang</Button>
           </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-48 px-8 bg-transparent">
      <header className="fixed top-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-md border-b z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="p-3 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-headline text-2xl italic leading-none">Privé <span className="text-accent">Archiefbeheer</span></h1>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Status: Geen publieke indexering</span>
          </div>
        </div>
        <Button onClick={openNew} className="h-12 rounded-full bg-accent text-white px-8 font-black uppercase tracking-widest text-[10px] shadow-lg">
           <Plus className="w-4 h-4 mr-2" /> Nieuwe Archief-foto
        </Button>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {loading ? (
             Array(6).fill(0).map((_, i) => <div key={i} className="aspect-square bg-black/5 animate-pulse rounded-[2rem]" />)
           ) : photos.map(photo => (
             <Card key={photo.id} className="p-6 rounded-[2.5rem] bg-white border-none shadow-xl flex flex-col gap-6 group">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/5">
                   <img src={photo.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="" />
                   <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 text-black text-[8px] font-black uppercase tracking-widest backdrop-blur-md">{photo.album}</Badge>
                   </div>
                   <div className="absolute bottom-4 right-4 flex gap-2">
                      <Button size="icon" onClick={() => handleEdit(photo)} className="w-10 h-10 rounded-full bg-white text-black hover:bg-accent hover:text-white shadow-xl"><Edit3 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(photo.id)} className="w-10 h-10 rounded-full shadow-xl"><Trash2 className="w-4 h-4" /></Button>
                   </div>
                </div>
                <div className="space-y-1">
                   <h3 className="font-headline text-xl italic">{photo.title}</h3>
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{photo.year || 'Geen jaar'}</span>
                      <div className="w-1 h-1 rounded-full bg-black/10" />
                      <div className="flex items-center gap-1.5">
                         {photo.visibility === 'admin' ? <Lock className="w-3 h-3 text-red-500" /> : <Eye className="w-3 h-3 text-green-600" />}
                         <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{photo.visibility === 'admin' ? 'Alleen Admin' : 'Vrienden'}</span>
                      </div>
                   </div>
                </div>
             </Card>
           ))}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="max-w-3xl rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
            <DialogHeader>
               <DialogTitle className="font-headline text-3xl italic">{editingPhoto ? 'Foto Bewerken' : 'Nieuwe Archief-foto'}</DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-10 pt-6">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Titel</Label>
                     <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Jaartal</Label>
                        <Input value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="h-14 rounded-2xl bg-black/5 border-none" />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Album</Label>
                        <Select value={form.album} onValueChange={v => setForm({...form, album: v})}>
                           <SelectTrigger className="h-14 rounded-2xl bg-black/5 border-none">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl shadow-2xl border-none">
                              {PRIVATE_ALBUMS.map(a => <SelectItem key={a} value={a} className="text-xs uppercase font-bold p-3">{a}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Zichtbaarheid</Label>
                     <Select value={form.visibility} onValueChange={v => setForm({...form, visibility: v})}>
                        <SelectTrigger className="h-14 rounded-2xl bg-black/5 border-none">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-none">
                           <SelectItem value="friends" className="text-xs uppercase font-bold p-3">Zichtbaar voor Vrienden</SelectItem>
                           <SelectItem value="admin" className="text-xs uppercase font-bold p-3 text-red-500">Alleen voor Admin</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="space-y-4">
                     <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Afbeelding</Label>
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative aspect-video rounded-2xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent/40 hover:bg-accent/5 overflow-hidden"
                     >
                        {selectedFile || (editingPhoto?.imageUrl) ? (
                          <>
                            <img src={selectedFile ? URL.createObjectURL(selectedFile) : editingPhoto.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                            <CheckCircle2 className="w-6 h-6 text-accent relative z-10" />
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 opacity-20" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Upload bestand</span>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Omschrijving / Context</Label>
                     <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="min-h-[120px] rounded-2xl bg-black/5 border-none p-6" />
                  </div>
               </div>
            </div>
            <DialogFooter className="mt-10">
               <Button 
                onClick={handleSave} 
                disabled={isUploading} 
                className="w-full h-16 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-xl"
               >
                 {isUploading ? <Loader2 className="animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                 {editingPhoto ? 'Wijzigingen Opslaan' : 'Toevoegen aan Archief'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
