'use server';
/**
 * @fileOverview AI Narratief Flow voor het Thijs Sterk Museum.
 * Genereert een poëtische audio-vertelling gebaseerd op het kunstwerk.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const NarrativeInputSchema = z.object({
  title: z.string().describe('Titel van het kunstwerk'),
  description: z.string().optional().describe('Bestaande omschrijving'),
  tags: z.array(z.string()).optional().describe('Kenmerken van het werk'),
  language: z.enum(['nl', 'en']).default('nl'),
});

const NarrativeOutputSchema = z.object({
  text: z.string().describe('De gegenereerde poëtische tekst'),
  audioUri: z.string().describe('Data URI van de gegenereerde audio'),
});

const prompt = ai.definePrompt({
  name: 'narrativePrompt',
  input: { schema: NarrativeInputSchema },
  prompt: `U bent Clara, de digitale conservator van het Thijs Sterk Retrospectief. 
  Op basis van de titel "{{title}}" en de context "{{description}}" schrijft u een korte, poëtische reflectie (max 60 woorden).
  
  Focus op:
  - De sfeer van het Noord-Hollandse landschap.
  - Het strijklicht, de ruimte en de stilte.
  - De techniek en de emotie van het werk.
  
  Taal: {{language}}.
  Geen inleiding, direct de vertelling.`,
});

export async function generateNarrative(input: z.infer<typeof NarrativeInputSchema>) {
  return narrativeFlow(input);
}

const narrativeFlow = ai.defineFlow(
  {
    name: 'narrativeFlow',
    inputSchema: NarrativeInputSchema,
    outputSchema: NarrativeOutputSchema,
  },
  async input => {
    const { text } = await prompt(input);
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: `Stem van een museumgids: ${text}`,
    });

    if (!media) throw new Error('Audio generatie mislukt');

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      text: text!,
      audioUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', d => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}