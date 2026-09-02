import Stripe from 'stripe';
import { env } from '@/lib/env';

export function isStripeReady() {
  return Boolean(env.STRIPE_SECRET_KEY.trim());
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY.trim()) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      // stripe@17.7.0 types expect LatestApiVersion; cast keeps an explicit Acacia pin.
      apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeClient;
}

export function appBaseUrl() {
  return (env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') || 'http://localhost:3000';
}
