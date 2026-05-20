'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

/**
 * Maakt een Stripe Checkout sessie aan voor een museum-reproductie.
 */
export async function createCheckoutSession(params: {
  artworkId: string;
  artworkTitle: string;
  productType: string;
  price: number;
  stripeSecretKey: string;
}) {
  if (!params.stripeSecretKey) {
    throw new Error('Stripe Secret Key is niet geconfigureerd in de beheeromgeving.');
  }

  const stripe = new Stripe(params.stripeSecretKey);
  const host = (await headers()).get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${params.artworkTitle} - ${params.productType}`,
              description: `Gecertificeerde reproductie van het werk ${params.artworkTitle}`,
            },
            unit_amount: Math.round(params.price * 100), // Stripe rekent in centen
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/shop/cancel`,
      metadata: {
        artworkId: params.artworkId,
        productType: params.productType,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    throw new Error(error.message);
  }
}
