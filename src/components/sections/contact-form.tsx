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
      description: "Bedankt voor uw bericht en het delen van uw verhaal. De erven van Thijs Sterk nemen zo snel mogelijk contact met u op.",
    });
    form.reset();
  }

  return (
    <section className="py-24 bg-background px-4" id="contact">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <span className="text-accent font-medium tracking-widest uppercase text-sm mb-4 block">Archief & Collectie</span>
            <h2 className="font-headline text-4xl md:text-5xl font-light mb-8">Informatie & <span className="italic">Uw Verhalen</span></h2>
            <div className="space-y-6 text-muted-foreground text-lg mb-12 leading-relaxed">
              <p>
                Heeft u vragen over specifieke werken in de collectie of verzoeken voor exposities? Wij staan u graag te woord.
              </p>
              <p className="italic font-light text-primary/80">
                "Wij zijn ook altijd benieuwd naar uw verhalen over hem en zijn werk. Wat heeft u thuis hangen? Hoe komt u er aan, en wat betekent het voor u?"
              </p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">E-mail</h4>
                  <p className="text-muted-foreground">info@thijssterk.nl</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">Telefoon</h4>
                  <p className="text-muted-foreground">06-53716249</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-sm uppercase tracking-widest">Locatie</h4>
                  <p className="text-muted-foreground">Nederland &bull; Bezichtiging op afspraak</p>
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
                        <FormLabel className="text-[10px] uppercase tracking-widest font-bold">Naam</FormLabel>
                        <FormControl>
                          <Input placeholder="Uw naam" className="bg-background border-none shadow-none rounded-xl h-12" {...field} />
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
                        <FormLabel className="text-[10px] uppercase tracking-widest font-bold">E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="uw@email.nl" className="bg-background border-none shadow-none rounded-xl h-12" {...field} />
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
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold">Onderwerp</FormLabel>
                      <FormControl>
                        <Input placeholder="Vraag over collectie / Uw verhaal" className="bg-background border-none shadow-none rounded-xl h-12" {...field} />
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
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold">Bericht / Herinnering</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Deel hier uw vraag of herinnering..." 
                          className="min-h-[150px] bg-background border-none shadow-none resize-none rounded-2xl p-4" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-14 font-bold uppercase tracking-widest text-xs">
                  Verstuur Bericht
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
