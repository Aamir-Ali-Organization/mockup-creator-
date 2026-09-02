import { z } from 'zod';
import {
  clampCheckoutQuantity,
  formatUsdFromCents,
  getExtraMockupPriceCents,
  getMaxCheckoutQuantity,
} from '@/lib/billing-settings';
import { AppError, toErrorResponse } from '@/lib/errors';
import { appBaseUrl, getStripe, isStripeReady } from '@/lib/stripe';

export const runtime = 'nodejs';

const bodySchema = z.object({
  contactId: z.string().optional().nullable(),
  fleadid: z.string().optional().nullable(),
  submissionId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  teamName: z.string().optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().default(1),
});

export async function POST(request: Request) {
  try {
    if (!isStripeReady()) {
      throw new AppError('Stripe is not configured', 503);
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Invalid checkout payload', 400, parsed.error.flatten());
    }

    const { contactId, fleadid, submissionId, email, teamName } = parsed.data;
    const quantity = clampCheckoutQuantity(parsed.data.quantity);
    const unitAmountCents = await getExtraMockupPriceCents();
    const contactKey = (contactId || 'guest').trim() || 'guest';
    const base = appBaseUrl();
    const successPath = `${base}/success/${encodeURIComponent(contactKey)}`;

    // Stripe replaces {CHECKOUT_SESSION_ID} literally — do not URL-encode the braces.
    const fleadidQuery = fleadid ? `&fleadid=${encodeURIComponent(fleadid)}` : '';
    const success_url = `${successPath}?paid_session_id={CHECKOUT_SESSION_ID}${fleadidQuery}`;
    const cancel_url = `${successPath}?canceled=1${fleadidQuery}`;

    const stripe = getStripe();
    const unitLabel = formatUsdFromCents(unitAmountCents);
    const productName =
      quantity === 1 ? 'Extra AI Uniform Mockup' : `${quantity} Extra AI Uniform Mockups`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmountCents,
            product_data: {
              name: productName,
              description: teamName
                ? `${quantity} additional mockup${quantity === 1 ? '' : 's'} for ${teamName} (${unitLabel} each)`
                : `${quantity} additional AI uniform mockup${quantity === 1 ? '' : 's'} (${unitLabel} each)`,
            },
          },
        },
      ],
      success_url,
      cancel_url,
      customer_email: email?.trim() || undefined,
      metadata: {
        contactId: contactId?.trim() || '',
        fleadid: fleadid?.trim() || '',
        submissionId: submissionId?.trim() || '',
        quantity: String(quantity),
        unitAmountCents: String(unitAmountCents),
      },
    });

    if (!session.url) {
      throw new AppError('Stripe did not return a checkout URL', 502);
    }

    return Response.json({
      url: session.url,
      sessionId: session.id,
      quantity,
      unitAmountCents,
      unitAmountLabel: unitLabel,
      maxQuantity: getMaxCheckoutQuantity(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
