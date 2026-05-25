
'use server';
/**
 * @fileOverview AI Vertaal Flow voor het Thijs Sterk Museum.
 * Vertaalt museumteksten met behoud van de artistieke toon.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  text: z.string().describe('De te vertalen tekst'),
  targetLanguage: z.string().describe('De doeltaal (bijv. Engels, Duits, Spaans)'),
  context: z.string().optional().describe('Context over de tekst (bijv. biografie, titel)'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translatedText: z.string().describe('De vertaalde tekst'),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

export async function translateMuseumText(input: TranslateInput): Promise<TranslateOutput> {
  return translateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateMuseumPrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `U bent een professionele vertaler gespecialiseerd in kunst en museale teksten. 
  Vertaal de volgende Nederlandse tekst naar het {{{targetLanguage}}}.
  
  Houd rekening met:
  - Behoud de sfeer: Thijs Sterk is een schilder van licht, ruimte en water. De toon moet respectvol, poëtisch maar helder zijn.
  - Gebruik de u-vorm waar gepast (formeel maar toegankelijk).
  - Context: {{{context}}}
  
  Tekst om te vertalen:
  {{{text}}}`,
});

const translateFlow = ai.defineFlow(
  {
    name: 'translateMuseumFlow',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async input => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error('Vertaling mislukt: Geen resultaat van AI');
      return output;
    } catch (error: any) {
      console.error('Translation error:', error);
      throw error;
    }
  }
);
