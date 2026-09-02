import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getBlobText, hasBlobStorage, putBlob } from '@/lib/blob-store';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const billingSettingsSchema = z.object({
  /** Unit price in cents for each extra paid mockup. */
  extraMockupPriceCents: z.number().int().positive(),
  updatedAt: z.string(),
});

export type BillingSettings = z.infer<typeof billingSettingsSchema>;

const BLOB_PATH = 'settings/billing.json';
const MAX_CHECKOUT_QUANTITY = 20;

let memoryCache: BillingSettings | null = null;
let writeRoot: string | null = null;

function defaultSettings(): BillingSettings {
  return {
    extraMockupPriceCents: env.STRIPE_MOCKUP_AMOUNT_CENTS,
    updatedAt: new Date(0).toISOString(),
  };
}

function candidateRoots(): string[] {
  if (isServerless) {
    return [path.join('/tmp', 'billing-settings')];
  }
  const cwd = process.cwd();
  return [
    ...new Set(
      [
        path.join(cwd, 'data', 'settings'),
        path.join(cwd, 'apps', 'web', 'data', 'settings'),
      ].map((r) => path.resolve(r)),
    ),
  ];
}

async function resolveWriteRoot(): Promise<string> {
  if (writeRoot) return writeRoot;
  if (isServerless) {
    writeRoot = path.join('/tmp', 'billing-settings');
    await mkdir(writeRoot, { recursive: true }).catch(() => undefined);
    return writeRoot;
  }

  for (const root of candidateRoots()) {
    try {
      await mkdir(root, { recursive: true });
      const probe = path.join(root, '.write-test');
      await writeFile(probe, 'ok', 'utf8');
      await access(probe);
      writeRoot = root;
      return root;
    } catch {
      // try next
    }
  }

  writeRoot = candidateRoots()[0];
  await mkdir(writeRoot, { recursive: true }).catch(() => undefined);
  return writeRoot;
}

function diskPath(root: string) {
  return path.join(root, 'billing.json');
}

export function clampCheckoutQuantity(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '1'), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_CHECKOUT_QUANTITY, Math.max(1, Math.floor(n)));
}

export function getMaxCheckoutQuantity() {
  return MAX_CHECKOUT_QUANTITY;
}

export async function getBillingSettings(): Promise<BillingSettings> {
  if (memoryCache) return memoryCache;

  if (hasBlobStorage()) {
    try {
      const text = await getBlobText(BLOB_PATH);
      if (text) {
        const parsed = billingSettingsSchema.parse(JSON.parse(text));
        memoryCache = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn('[billing-settings] blob read failed:', error);
    }
  }

  try {
    const root = await resolveWriteRoot();
    const raw = await readFile(diskPath(root), 'utf8');
    const parsed = billingSettingsSchema.parse(JSON.parse(raw));
    memoryCache = parsed;
    return parsed;
  } catch {
    // fall through to defaults
  }

  const defaults = defaultSettings();
  memoryCache = defaults;
  return defaults;
}

export async function getExtraMockupPriceCents(): Promise<number> {
  const settings = await getBillingSettings();
  return settings.extraMockupPriceCents > 0
    ? settings.extraMockupPriceCents
    : env.STRIPE_MOCKUP_AMOUNT_CENTS;
}

export async function saveBillingSettings(input: {
  extraMockupPriceCents: number;
}): Promise<BillingSettings> {
  const cents = Math.round(input.extraMockupPriceCents);
  if (!Number.isFinite(cents) || cents < 50) {
    throw new Error('Price must be at least $0.50');
  }
  if (cents > 1_000_000) {
    throw new Error('Price is too high');
  }

  const record: BillingSettings = {
    extraMockupPriceCents: cents,
    updatedAt: new Date().toISOString(),
  };

  const body = JSON.stringify(record, null, 2);
  memoryCache = record;

  if (hasBlobStorage()) {
    try {
      await putBlob(BLOB_PATH, body, 'application/json');
    } catch (error) {
      console.warn('[billing-settings] blob write failed:', error);
    }
  }

  const root = await resolveWriteRoot();
  await writeFile(diskPath(root), body, 'utf8');
  return record;
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
