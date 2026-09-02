import {
  formatUsdFromCents,
  getExtraMockupPriceCents,
  getMaxCheckoutQuantity,
} from '@/lib/billing-settings';
import { isStripeReady } from '@/lib/stripe';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

/** Public pricing for the success-page paywall (no auth). */
export async function GET() {
  try {
    const unitAmountCents = await getExtraMockupPriceCents();
    return Response.json({
      success: true,
      unitAmountCents,
      unitAmountUsd: unitAmountCents / 100,
      unitAmountLabel: formatUsdFromCents(unitAmountCents),
      maxQuantity: getMaxCheckoutQuantity(),
      stripeReady: isStripeReady(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
