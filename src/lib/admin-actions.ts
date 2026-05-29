'use server';

/**
 * @fileOverview Server-side acties voor admin beveiliging.
 * Hiermee voorkomen we dat het wachtwoord in de client-side code staat.
 */

export async function verifyAdminPassword(password: string): Promise<boolean> {
  // Gebruik een omgevingsvariabele voor het echte wachtwoord in productie.
  // Voor nu gebruiken we de afgesproken waarde "1527".
  const correctPassword = process.env.ADMIN_PASSWORD || "1527";
  
  // Voeg een kleine vertraging toe om brute-force aanvallen te bemoeilijken
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return password === correctPassword;
}
