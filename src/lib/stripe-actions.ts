'use server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { logError, logErrorAndReturn } from './error-logger';

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
    const error = new Error('Stripe Secret Key is niet geconfigureerd in de beheeromgeving.');
    logError('createCheckoutSession', error);
    throw error;
  }

  try {
    const stripe = new Stripe(params.stripeSecretKey);
    const host = (await headers()).get('host');
    
    if (!host) {
      logError('createCheckoutSession', 'No host header found');
      throw new Error('Host header niet beschikbaar');
    }

    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

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
            unit_amount: Math.round(params.price * 100),
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

    if (!session.id || !session.url) {
      logError('createCheckoutSession', 'Session created but missing id or url', { session });
      throw new Error('Stripe sessie ongeldig');
    }

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    logError('createCheckoutSession', error, { 
      artworkId: params.artworkId,
      productType: params.productType 
    });
    throw error;
  }
}