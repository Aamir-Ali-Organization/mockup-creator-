import { clampCheckoutQuantity } from '@/lib/billing-settings';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getPaidEntitlement, savePaidEntitlement } from '@/lib/mockup-quota';
import { getStripe, isStripeReady } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = (searchParams.get('session_id') || '').trim();
    if (!sessionId) {
      throw new AppError('session_id is required', 400);
    }

    const ready = isStripeReady();
    let entitlement = await getPaidEntitlement(sessionId);

    if (!entitlement && ready) {
      try {
        const session = await getStripe().checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          entitlement = await savePaidEntitlement({
            sessionId: session.id,
            amountCents: session.amount_total ?? undefined,
            quantityTotal: clampCheckoutQuantity(session.metadata?.quantity || '1'),
            email: session.customer_details?.email || session.customer_email || null,
            submissionId: session.metadata?.submissionId || null,
            contactId: session.metadata?.contactId || null,
            status: 'available',
          });
        }
      } catch (error) {
        console.warn('[stripe/entitlement] session retrieve failed:', sessionId, error);
      }
    }

    const quantityTotal = entitlement?.quantityTotal ?? 0;
    const quantityRemaining =
      typeof entitlement?.quantityRemaining === 'number'
        ? entitlement.quantityRemaining
        : entitlement?.status === 'available'
          ? Math.max(1, quantityTotal || 1)
          : 0;

    return Response.json({
      available: Boolean(entitlement && quantityRemaining > 0),
      status: entitlement?.status,
      quantityTotal,
      quantityRemaining,
      ready,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
