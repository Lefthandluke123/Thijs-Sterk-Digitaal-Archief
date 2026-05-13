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
import { Send, Mail, MapPin, Instagram, Linkedin } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: "Naam moet minimaal 2 tekens bevatten." }),
  email: z.string().email({ message: "Voer een geldig e-mailadres in." }),
  subject: z.string().min(5, { message: "Onderwerp moet minimaal 5 tekens bevatten." }),
  message: z.string().min(10, { message: "Bericht moet minimaal 10 tekens bevatten." }),
});

export function ContactForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Bericht Verzonden",
      description: "Bedankt voor je bericht. Thijs neemt zo snel mogelijk contact met je op.",
    });
    form.reset();
  }

  return (
    <section className="py-24 bg-background px-4" id="contact">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">Contact</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8">Laten we een <span className="italic">Gesprek</span> starten</h2>
            <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
              Beschikbaar voor opdrachten, exposities en creatieve samenwerkingen. Of je nu een specifiek werk in gedachten hebt of gewoon over kunst wilt praten, ik hoor graag van je.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium">E-mail</h4>
                  <p className="text-muted-foreground">studio@thijssterk.art</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium">Locatie</h4>
                  <p className="text-muted-foreground">Nederland &bull; Bezoek op afspraak</p>
                </div>
              </div>

              <div className="pt-8">
                <h4 className="font-medium mb-4">Volg het proces</h4>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary/20 p-8 md:p-12 rounded-3xl border border-border shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input placeholder="Je naam" className="bg-background border-none shadow-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="je@email.nl" className="bg-background border-none shadow-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onderwerp</FormLabel>
                      <FormControl>
                        <Input placeholder="Vraag over een kunstwerk" className="bg-background border-none shadow-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bericht</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Je bericht hier..." 
                          className="min-h-[150px] bg-background border-none shadow-none resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-12">
                  Verzend Bericht
                  <Send className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
