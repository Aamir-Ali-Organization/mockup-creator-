import { z } from 'zod';
import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import {
  formatUsdFromCents,
  getBillingSettings,
  saveBillingSettings,
} from '@/lib/billing-settings';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

const putSchema = z.object({
  /** Dollars (e.g. 15 or 15.00). Converted to cents server-side. */
  extraMockupPriceUsd: z.union([z.number(), z.string()]).optional(),
  /** Or pass cents directly. */
  extraMockupPriceCents: z.union([z.number(), z.string()]).optional(),
});

export async function GET(request: Request) {
  try {
    assertKnowledgeAdmin(request);
    const settings = await getBillingSettings();
    return Response.json({
      success: true,
      settings: {
        ...settings,
        extraMockupPriceUsd: settings.extraMockupPriceCents / 100,
        extraMockupPriceLabel: formatUsdFromCents(settings.extraMockupPriceCents),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertKnowledgeAdmin(request);
    const json = await request.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Invalid billing settings', 400, parsed.error.flatten());
    }

    let cents: number | null = null;
    if (parsed.data.extraMockupPriceCents != null && parsed.data.extraMockupPriceCents !== '') {
      cents = Math.round(Number(parsed.data.extraMockupPriceCents));
    } else if (parsed.data.extraMockupPriceUsd != null && parsed.data.extraMockupPriceUsd !== '') {
      cents = Math.round(Number(parsed.data.extraMockupPriceUsd) * 100);
    }

    if (cents == null || !Number.isFinite(cents)) {
      throw new AppError('Provide extraMockupPriceUsd or extraMockupPriceCents', 400);
    }

    const settings = await saveBillingSettings({ extraMockupPriceCents: cents });
    return Response.json({
      success: true,
      settings: {
        ...settings,
        extraMockupPriceUsd: settings.extraMockupPriceCents / 100,
        extraMockupPriceLabel: formatUsdFromCents(settings.extraMockupPriceCents),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
