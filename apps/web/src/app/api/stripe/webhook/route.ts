import type Stripe from 'stripe';
import { clampCheckoutQuantity } from '@/lib/billing-settings';
import { AppError, toErrorResponse } from '@/lib/errors';
import { env } from '@/lib/env';
import { savePaidEntitlement } from '@/lib/mockup-quota';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function quantityFromSession(session: Stripe.Checkout.Session): number {
  const fromMeta = clampCheckoutQuantity(session.metadata?.quantity || '1');
  return fromMeta;
}

async function grantFromSession(session: Stripe.Checkout.Session) {
  // Only grant when payment actually succeeded (async methods use async_payment_succeeded).
  if (session.payment_status !== 'paid') {
    return;
  }

  await savePaidEntitlement({
    sessionId: session.id,
    amountCents: session.amount_total ?? undefined,
    quantityTotal: quantityFromSession(session),
    email: session.customer_details?.email || session.customer_email || null,
    submissionId: session.metadata?.submissionId || null,
    contactId: session.metadata?.contactId || null,
    status: 'available',
  });
}

export async function POST(request: Request) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET.trim()) {
      throw new AppError('Stripe webhook secret is not configured', 503);
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      throw new AppError('Missing stripe-signature header', 400);
    }

    const rawBody = await request.text();
    const stripe = getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature';
      throw new AppError(`Webhook signature verification failed: ${message}`, 400);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      await grantFromSession(event.data.object as Stripe.Checkout.Session);
    }

    return Response.json({ received: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
