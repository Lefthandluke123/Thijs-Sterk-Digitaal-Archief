
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Send, Mail, Phone, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  name: z.string().min(2, { message: "Naam is te kort" }),
  email: z.string().email({ message: "Ongeldig e-mailadres" }),
  subject: z.string().min(5, { message: "Onderwerp is te kort" }),
  message: z.string().min(10, { message: "Bericht moet minimaal 10 karakters bevatten" }),
});

export function ContactForm() {
  const [mounted, setMounted] = useState(false);
  const { language, t } = useLanguage();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore || !mounted) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore, mounted]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const getTranslatedValue = (field: string, defaultVal: string) => {
    if (!siteSettings || !mounted) return defaultVal;
    if (language === 'nl') return siteSettings[field] || defaultVal;
    return siteSettings[`${field}_${language}`] || siteSettings[field] || defaultVal;
  };

  const contactTitle = getTranslatedValue('contactTitle', 'Informatie & Uw Verhalen');
  const contactIntro = getTranslatedValue('contactIntro', 'Heeft u vragen over specifieke werken in de collectie of verzoeken voor exposities? Wij staan u graag te woord.');
  const contactQuote = getTranslatedValue('contactQuote', '"Wij zijn ook altijd benieuwd naar uw verhalen over hem en zijn werk."');
  
  const labelName = getTranslatedValue('contactLabelName', t('contact_label_name'));
  const labelEmail = getTranslatedValue('contactLabelEmail', t('contact_label_email'));
  const labelSubject = getTranslatedValue('contactLabelSubject', t('contact_label_subject'));
  const labelMessage = getTranslatedValue('contactLabelMessage', t('contact_label_message'));
  const buttonSend = getTranslatedValue('contactButtonSend', t('contact_button_send'));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    setIsSubmitting(true);

    const mailData = {
      to: 'lhcsterk@doggyfew.com',
      message: {
        subject: `[Thijs Sterk Museum] ${values.subject}`,
        text: `Nieuw bericht van de website:\n\nNaam: ${values.name}\nE-mail: ${values.email}\nOnderwerp: ${values.subject}\n\nBericht:\n${values.message}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #458941;">Nieuw bericht van ThijsSterk.nl</h2>
            <p><strong>Naam:</strong> ${values.name}</p>
            <p><strong>E-mail:</strong> ${values.email}</p>
            <p><strong>Onderwerp:</strong> ${values.subject}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Bericht:</strong></p>
            <p style="white-space: pre-wrap;">${values.message}</p>
          </div>
        `,
      },
      createdAt: serverTimestamp(),
      fromName: values.name,
      fromEmail: values.email
    };

    addDoc(collection(firestore, 'mail'), mailData)
      .then(() => {
        toast({
          title: t('contact_success_title'),
          description: t('contact_success_desc'),
        });
        form.reset();
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'mail',
          operation: 'create',
          requestResourceData: mailData,
        }));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <section className="py-24 bg-background px-4" id="contact" aria-labelledby="contact-heading">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 id="contact-heading" className="font-headline text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
                {contactTitle.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? <span key={i} className="italic text-accent">{word}</span> : word + ' '
                )}
              </h2>
            </div>
            
            <div className="space-y-6 text-foreground/80 text-xl leading-relaxed font-light">
              <p>{contactIntro}</p>
              <p className="italic font-normal text-accent/80 border-l-4 border-accent/10 pl-6 text-lg">{contactQuote}</p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-10 pt-8">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary shadow-inner"><Mail className="w-5 h-5" aria-hidden="true" /></div>
                <div>
                  <h3 className="font-black text-[9px] uppercase tracking-widest text-accent">E-mail</h3>
                  <p className="text-base font-medium">info@thijssterk.nl</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary shadow-inner"><Phone className="w-5 h-5" aria-hidden="true" /></div>
                <div>
                  <h3 className="font-black text-[9px] uppercase tracking-widest text-accent">{t('contact_phone')}</h3>
                  <p className="text-base font-medium">06-53716249</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary/20 p-8 md:p-12 rounded-[2rem] border border-border/20 shadow-xl backdrop-blur-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-accent">{labelName}</FormLabel>
                      <FormControl><Input placeholder="..." aria-required="true" aria-invalid={!!fieldState.error} className="bg-background/70 border-none h-12 rounded-xl text-base px-5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-accent">{labelEmail}</FormLabel>
                      <FormControl><Input placeholder="..." type="email" aria-required="true" aria-invalid={!!fieldState.error} className="bg-background/70 border-none h-12 rounded-xl text-base px-5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="subject" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-accent">{labelSubject}</FormLabel>
                    <FormControl><Input placeholder="..." aria-required="true" aria-invalid={!!fieldState.error} className="bg-background/70 border-none h-12 rounded-xl text-base px-5" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-accent">{labelMessage}</FormLabel>
                    <FormControl><Textarea placeholder="..." aria-required="true" aria-invalid={!!fieldState.error} className="min-h-[160px] bg-background/70 border-none resize-none p-6 rounded-2xl text-base" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-16 font-black uppercase tracking-[0.2em] text-[11px] shadow-lg hover:scale-[1.02] transition-all">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Send className="mr-3 w-5 h-5" aria-hidden="true" />}
                  {buttonSend}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
