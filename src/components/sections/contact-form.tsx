
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Send, Mail, MapPin, Phone } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(5),
  message: z.string().min(10),
});

export function ContactForm() {
  const { language, t } = useLanguage();
  const firestore = useFirestore();

  const siteSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);
  const { data: siteSettings } = useDoc(siteSettingsRef);

  const getTranslatedValue = (field: string, defaultVal: string) => {
    if (!siteSettings) return defaultVal;
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: t('contact_success_title'),
      description: t('contact_success_desc'),
    });
    form.reset();
  }

  return (
    <section className="py-24 bg-background px-4" id="contact">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">{t('nav_collections')} & Archief</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8 leading-tight">
              {contactTitle.split(' ').map((word, i, arr) => 
                i === arr.length - 1 ? <span key={i} className="italic">{word}</span> : word + ' '
              )}
            </h2>
            <div className="space-y-6 text-muted-foreground text-lg mb-12 leading-relaxed">
              <p>{contactIntro}</p>
              <p className="italic font-light text-primary/80">{contactQuote}</p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary"><Mail className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">E-mail</h4>
                  <p className="text-muted-foreground">info@thijssterk.nl</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary"><Phone className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">{t('contact_phone')}</h4>
                  <p className="text-muted-foreground">06-53716249</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary"><MapPin className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">{t('contact_location')}</h4>
                  <p className="text-muted-foreground">{t('contact_loc_value')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary/20 p-8 md:p-12 rounded-3xl border border-border shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold">{labelName}</FormLabel>
                      <FormControl><Input placeholder={t('contact_placeholder_name')} className="bg-background border-none h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold">{labelEmail}</FormLabel>
                      <FormControl><Input placeholder={t('contact_placeholder_email')} className="bg-background border-none h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-bold">{labelSubject}</FormLabel>
                    <FormControl><Input placeholder={t('contact_placeholder_subject')} className="bg-background border-none h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-widest font-bold">{labelMessage}</FormLabel>
                    <FormControl><Textarea placeholder={t('contact_placeholder_message')} className="min-h-[150px] bg-background border-none resize-none p-4" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-14 font-bold uppercase tracking-widest text-xs">
                  {buttonSend} <Send className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
