import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { hashIp } from '@/lib/client-ip';
import { env } from '@/lib/env';
import { getBlobText, hasBlobStorage, putBlob } from '@/lib/blob-store';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const freeUsageSchema = z.object({
  ipHash: z.string(),
  usedAt: z.string(),
  submissionId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
});

const paidEntitlementSchema = z
  .object({
    sessionId: z.string(),
    status: z.enum(['available', 'consumed']),
    createdAt: z.string(),
    consumedAt: z.string().nullable().optional(),
    amountCents: z.number().optional(),
    quantityTotal: z.number().int().positive().optional(),
    quantityRemaining: z.number().int().nonnegative().optional(),
    email: z.string().nullable().optional(),
    submissionId: z.string().nullable().optional(),
    contactId: z.string().nullable().optional(),
  })
  .transform((row) => {
    const quantityTotal = Math.max(1, row.quantityTotal ?? 1);
    const quantityRemaining =
      typeof row.quantityRemaining === 'number'
        ? row.quantityRemaining
        : row.status === 'consumed'
          ? 0
          : quantityTotal;
    return {
      ...row,
      quantityTotal,
      quantityRemaining,
      status: quantityRemaining > 0 ? ('available' as const) : ('consumed' as const),
    };
  });

export type FreeUsageRecord = z.infer<typeof freeUsageSchema>;
type PaidEntitlementParsed = z.output<typeof paidEntitlementSchema>;
export type PaidEntitlement = Omit<
  PaidEntitlementParsed,
  'quantityTotal' | 'quantityRemaining' | 'status'
> & {
  quantityTotal: number;
  quantityRemaining: number;
  status: 'available' | 'consumed';
};

export type MockupQuotaMode = 'free' | 'paid';

export type CanGenerateResult =
  | { ok: true; mode: MockupQuotaMode }
  | { ok: false; reason: string };

const freeMemory = new Map<string, FreeUsageRecord>();
const paidMemory = new Map<string, PaidEntitlement>();

function candidateRoots(): string[] {
  if (isServerless) {
    return [path.join('/tmp', 'mockup-quota')];
  }
  const cwd = process.cwd();
  return [
    ...new Set(
      [
        path.join(cwd, 'data', 'quota'),
        path.join(cwd, 'apps', 'web', 'data', 'quota'),
      ].map((r) => path.resolve(r)),
    ),
  ];
}

let writeRoot: string | null = null;

async function resolveWriteRoot(): Promise<string> {
  if (writeRoot) return writeRoot;
  if (isServerless) {
    writeRoot = path.join('/tmp', 'mockup-quota');
    await mkdir(path.join(writeRoot, 'free'), { recursive: true }).catch(() => undefined);
    await mkdir(path.join(writeRoot, 'paid'), { recursive: true }).catch(() => undefined);
    return writeRoot;
  }

  for (const root of candidateRoots()) {
    try {
      await mkdir(path.join(root, 'free'), { recursive: true });
      await mkdir(path.join(root, 'paid'), { recursive: true });
      const probe = path.join(root, 'free', '.write-test');
      await writeFile(probe, 'ok', 'utf8');
      await access(probe);
      writeRoot = root;
      return root;
    } catch {
      // try next
    }
  }

  writeRoot = candidateRoots()[0];
  await mkdir(path.join(writeRoot, 'free'), { recursive: true }).catch(() => undefined);
  await mkdir(path.join(writeRoot, 'paid'), { recursive: true }).catch(() => undefined);
  return writeRoot;
}

function freeDiskPath(root: string, ipHash: string) {
  return path.join(root, 'free', `${ipHash}.json`);
}

function paidDiskPath(root: string, sessionId: string) {
  const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(root, 'paid', `${safe}.json`);
}

function freeBlobPath(ipHash: string) {
  return `quota/free/${ipHash}.json`;
}

function paidBlobPath(sessionId: string) {
  const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `quota/paid/${safe}.json`;
}

async function readJsonFile<S extends z.ZodTypeAny>(
  filePath: string,
  schema: S,
): Promise<z.output<S> | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return schema.parse(JSON.parse(raw)) as z.output<S>;
  } catch {
    return null;
  }
}

async function readFreeRecord(ipHash: string): Promise<FreeUsageRecord | null> {
  const mem = freeMemory.get(ipHash);
  if (mem) return mem;

  if (hasBlobStorage()) {
    try {
      const text = await getBlobText(freeBlobPath(ipHash));
      if (text) {
        const parsed = freeUsageSchema.parse(JSON.parse(text));
        freeMemory.set(ipHash, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('[quota] blob free read failed:', ipHash, error);
    }
  }

  const root = await resolveWriteRoot();
  const fromDisk = await readJsonFile(freeDiskPath(root, ipHash), freeUsageSchema);
  if (fromDisk) {
    freeMemory.set(ipHash, fromDisk);
    return fromDisk;
  }
  return null;
}

async function writeFreeRecord(record: FreeUsageRecord) {
  freeMemory.set(record.ipHash, record);
  const body = JSON.stringify(record, null, 2);

  if (hasBlobStorage()) {
    try {
      await putBlob(freeBlobPath(record.ipHash), body, 'application/json');
    } catch (error) {
      console.warn('[quota] blob free write failed:', record.ipHash, error);
    }
  }

  const root = await resolveWriteRoot();
  await writeFile(freeDiskPath(root, record.ipHash), body, 'utf8');
}

async function readPaidRecord(sessionId: string): Promise<PaidEntitlement | null> {
  const mem = paidMemory.get(sessionId);
  if (mem) return mem;

  if (hasBlobStorage()) {
    try {
      const text = await getBlobText(paidBlobPath(sessionId));
      if (text) {
        const parsed = paidEntitlementSchema.parse(JSON.parse(text)) as PaidEntitlement;
        paidMemory.set(sessionId, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('[quota] blob paid read failed:', sessionId, error);
    }
  }

  const root = await resolveWriteRoot();
  const fromDisk = await readJsonFile(paidDiskPath(root, sessionId), paidEntitlementSchema);
  if (fromDisk) {
    const normalized = fromDisk as PaidEntitlement;
    paidMemory.set(sessionId, normalized);
    return normalized;
  }
  return null;
}

async function writePaidRecord(record: PaidEntitlement) {
  paidMemory.set(record.sessionId, record);
  const body = JSON.stringify(record, null, 2);

  if (hasBlobStorage()) {
    try {
      await putBlob(paidBlobPath(record.sessionId), body, 'application/json');
    } catch (error) {
      console.warn('[quota] blob paid write failed:', record.sessionId, error);
    }
  }

  const root = await resolveWriteRoot();
  await writeFile(paidDiskPath(root, record.sessionId), body, 'utf8');
}

export async function hasUsedFreeMockup(ip: string): Promise<boolean> {
  if (!env.IP_FREE_MOCKUP_LIMIT) return false;
  const ipHash = hashIp(ip || 'unknown');
  const record = await readFreeRecord(ipHash);
  return Boolean(record);
}

export async function markFreeMockupUsed(input: {
  ip: string;
  submissionId?: string | null;
  contactId?: string | null;
}): Promise<FreeUsageRecord> {
  const ipHash = hashIp(input.ip || 'unknown');
  const existing = await readFreeRecord(ipHash);
  const record: FreeUsageRecord = {
    ipHash,
    usedAt: existing?.usedAt || new Date().toISOString(),
    submissionId: input.submissionId ?? existing?.submissionId ?? null,
    contactId: input.contactId ?? existing?.contactId ?? null,
  };
  await writeFreeRecord(record);
  return record;
}

export async function getPaidEntitlement(sessionId: string): Promise<PaidEntitlement | null> {
  const id = sessionId?.trim();
  if (!id) return null;
  return readPaidRecord(id);
}

function normalizeQuantity(existing: PaidEntitlement | null, quantityTotal?: number) {
  const total = Math.max(
    1,
    Math.floor(quantityTotal ?? existing?.quantityTotal ?? 1),
  );

  if (!existing) {
    return { quantityTotal: total, quantityRemaining: total };
  }

  const priorTotal = Math.max(1, Math.floor(existing.quantityTotal ?? 1));
  const priorRemaining =
    typeof existing.quantityRemaining === 'number'
      ? existing.quantityRemaining
      : existing.status === 'consumed'
        ? 0
        : priorTotal;

  // Never reset remaining on re-grant (webhook + entitlement poll).
  return {
    quantityTotal: Math.max(priorTotal, total),
    quantityRemaining: Math.min(priorRemaining, Math.max(priorTotal, total)),
  };
}

export async function savePaidEntitlement(input: {
  sessionId: string;
  amountCents?: number;
  quantityTotal?: number;
  email?: string | null;
  submissionId?: string | null;
  contactId?: string | null;
  status?: 'available' | 'consumed';
}): Promise<PaidEntitlement> {
  const sessionId = input.sessionId.trim();
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const existing = await readPaidRecord(sessionId);
  const qty = normalizeQuantity(existing, input.quantityTotal);
  const remaining = qty.quantityRemaining;
  const status =
    input.status ||
    existing?.status ||
    (remaining > 0 ? 'available' : 'consumed');

  const record: PaidEntitlement = {
    sessionId,
    status: remaining <= 0 ? 'consumed' : status === 'consumed' && remaining > 0 ? 'available' : status,
    createdAt: existing?.createdAt || new Date().toISOString(),
    consumedAt: remaining <= 0 ? existing?.consumedAt || new Date().toISOString() : null,
    amountCents: input.amountCents ?? existing?.amountCents ?? env.STRIPE_MOCKUP_AMOUNT_CENTS,
    quantityTotal: qty.quantityTotal,
    quantityRemaining: remaining,
    email: input.email ?? existing?.email ?? null,
    submissionId: input.submissionId ?? existing?.submissionId ?? null,
    contactId: input.contactId ?? existing?.contactId ?? null,
  };
  await writePaidRecord(record);
  return record;
}

export async function consumePaidEntitlement(
  sessionId: string,
  meta?: { submissionId?: string | null; contactId?: string | null },
): Promise<PaidEntitlement | null> {
  const existing = await getPaidEntitlement(sessionId);
  if (!existing) return null;

  const priorRemaining =
    typeof existing.quantityRemaining === 'number'
      ? existing.quantityRemaining
      : existing.status === 'consumed'
        ? 0
        : Math.max(1, existing.quantityTotal ?? 1);

  if (priorRemaining <= 0) {
    return {
      ...existing,
      quantityRemaining: 0,
      status: 'consumed',
    };
  }

  const quantityRemaining = priorRemaining - 1;
  const record: PaidEntitlement = {
    ...existing,
    quantityTotal: Math.max(1, existing.quantityTotal ?? priorRemaining),
    quantityRemaining,
    status: quantityRemaining > 0 ? 'available' : 'consumed',
    consumedAt: quantityRemaining > 0 ? null : new Date().toISOString(),
    submissionId: meta?.submissionId ?? existing.submissionId ?? null,
    contactId: meta?.contactId ?? existing.contactId ?? null,
  };
  await writePaidRecord(record);
  return record;
}

export async function canGenerateNewMockup(input: {
  ip: string;
  paymentSessionId?: string | null;
}): Promise<CanGenerateResult> {
  const paymentSessionId = input.paymentSessionId?.trim() || '';

  if (paymentSessionId) {
    const entitlement = await getPaidEntitlement(paymentSessionId);
    if (!entitlement) {
      return { ok: false, reason: 'Payment session not found or not yet confirmed.' };
    }
    const remaining =
      typeof entitlement.quantityRemaining === 'number'
        ? entitlement.quantityRemaining
        : entitlement.status === 'consumed'
          ? 0
          : 1;
    if (entitlement.status === 'consumed' || remaining <= 0) {
      return {
        ok: false,
        reason: 'All mockups from this payment have already been used.',
      };
    }
    return { ok: true, mode: 'paid' };
  }

  if (!env.IP_FREE_MOCKUP_LIMIT) {
    return { ok: true, mode: 'free' };
  }

  if (await hasUsedFreeMockup(input.ip)) {
    return {
      ok: false,
      reason: 'A free mockup was already generated for this network. Pay to create another.',
    };
  }

  return { ok: true, mode: 'free' };
}
