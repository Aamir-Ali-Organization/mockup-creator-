import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { get, list, put, type PutBlobResult } from '@vercel/blob';
import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const submissionJobSchema = z.object({
  customerName: z.string(),
  email: z.string(),
  phone: z.string(),
  teamName: z.string(),
  sport: z.string(),
  gender: z.string(),
  ageGroup: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  alternateColor: z.string().optional().nullable(),
  quantity: z.number(),
  accessories: z.array(z.string()).default([]),
  rosterInfo: z.string().optional().nullable(),
  logoCreation: z.string().optional().nullable(),
  referralSource: z.string().optional().nullable(),
});

export const submissionRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['submitted', 'generating', 'ready', 'skipped', 'error']),
  contactId: z.string().nullable().optional(),
  fleadid: z.string().nullable().optional(),
  knowledgeProfileId: z.string().nullable().optional(),
  prompt: z.string().default(''),
  payload: z.unknown().optional(),
  job: submissionJobSchema,
  model: z.string().nullable().optional(),
  usedSamples: z.number().optional().default(0),
  hasImage: z.boolean().default(false),
  imageFile: z.string().nullable().optional(),
  /** Blob pathname (preferred) or legacy local filename. */
  imagePathname: z.string().nullable().optional(),
  /** Public URL when store is public; otherwise null and image is served via API. */
  imageUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  skipMockup: z.boolean().optional().default(false),
  hasLogo: z.boolean().optional().default(false),
  logoFilename: z.string().nullable().optional(),
  logoMimeType: z.string().nullable().optional(),
  logoPathname: z.string().nullable().optional(),
});

export type SubmissionJob = z.infer<typeof submissionJobSchema>;
export type SubmissionRecord = z.infer<typeof submissionRecordSchema>;

export type SubmissionSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SubmissionRecord['status'];
  customerName: string;
  email: string;
  teamName: string;
  sport: string;
  contactId: string | null;
  fleadid: string | null;
  hasImage: boolean;
  hasPrompt: boolean;
};

const memory = new Map<string, SubmissionRecord>();
let blobAccess: 'private' | 'public' | null = null;
let lastBlobError: string | null = null;

function blobToken() {
  return (env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

export function hasBlobStorage() {
  return Boolean(blobToken());
}

export function getSubmissionsStorageInfo() {
  if (hasBlobStorage()) {
    return {
      mode: 'blob' as const,
      persistent: !lastBlobError,
      access: blobAccess,
      lastError: lastBlobError,
      message: lastBlobError
        ? `Blob token is set, but storage failed: ${lastBlobError}`
        : `Submissions use Vercel Blob (${blobAccess || 'auto'}).`,
    };
  }
  if (isServerless) {
    return {
      mode: 'ephemeral' as const,
      persistent: false,
      access: null,
      lastError: null,
      message:
        'Vercel serverless disk is ephemeral. Add BLOB_READ_WRITE_TOKEN and redeploy.',
    };
  }
  return {
    mode: 'local' as const,
    persistent: true,
    access: null,
    lastError: null,
    message: 'Submissions are stored in local JSON files.',
  };
}

function candidateRoots(): string[] {
  if (isServerless) {
    return [path.join('/tmp', 'mockup-submissions')];
  }
  const cwd = process.cwd();
  return [
    ...new Set(
      [
        path.join(cwd, 'data', 'submissions'),
        path.join(cwd, 'apps', 'web', 'data', 'submissions'),
      ].map((r) => path.resolve(r)),
    ),
  ];
}

let writeRoot: string | null = null;

async function resolveWriteRoot(): Promise<string> {
  if (writeRoot) return writeRoot;
  if (isServerless) {
    writeRoot = path.join('/tmp', 'mockup-submissions');
    await mkdir(path.join(writeRoot, 'meta'), { recursive: true }).catch(() => undefined);
    await mkdir(path.join(writeRoot, 'images'), { recursive: true }).catch(() => undefined);
    return writeRoot;
  }

  for (const root of candidateRoots()) {
    try {
      await mkdir(path.join(root, 'meta'), { recursive: true });
      await mkdir(path.join(root, 'images'), { recursive: true });
      const probe = path.join(root, 'meta', '.write-test');
      await writeFile(probe, 'ok', 'utf8');
      await access(probe);
      writeRoot = root;
      return root;
    } catch {
      // try next
    }
  }

  writeRoot = candidateRoots()[0];
  await mkdir(path.join(writeRoot, 'meta'), { recursive: true }).catch(() => undefined);
  await mkdir(path.join(writeRoot, 'images'), { recursive: true }).catch(() => undefined);
  return writeRoot;
}

function metaPathFor(root: string, id: string) {
  return path.join(root, 'meta', `${id}.json`);
}

function imagePathFor(root: string, filename: string) {
  return path.join(root, 'images', filename);
}

function blobMetaPath(id: string) {
  return `submissions/${id}/meta.json`;
}

function blobImagePath(id: string, ext: string) {
  return `submissions/${id}/mockup${ext}`;
}

function blobLogoPath(id: string, filename: string) {
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'logo.png';
  return `submissions/${id}/logo-${safe}`;
}

function logoLocalPath(root: string, id: string, filename: string) {
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'logo.png';
  return path.join(root, 'images', `${id}-logo-${safe}`);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function putBlob(
  pathname: string,
  body: string | Buffer | Uint8Array,
  contentType: string,
): Promise<PutBlobResult> {
  const token = blobToken();
  const payload = typeof body === 'string' ? body : Buffer.from(body);
  // New Blob stores are often private — try private first, then public.
  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  let lastError: unknown;
  for (const access of order) {
    try {
      const result = await put(pathname, payload, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        token,
      });
      blobAccess = access;
      lastBlobError = null;
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  lastBlobError = errorMessage(lastError);
  throw lastError instanceof Error ? lastError : new Error(lastBlobError);
}

async function getBlobJson(pathname: string): Promise<SubmissionRecord | null> {
  const token = blobToken();
  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result?.stream) continue;
      const text = await new Response(result.stream).text();
      const parsed = submissionRecordSchema.safeParse(JSON.parse(text));
      if (parsed.success) {
        blobAccess = access;
        lastBlobError = null;
        return parsed.data;
      }
    } catch {
      // try next access mode
    }
  }
  return null;
}

async function getBlobBytes(
  pathname: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const token = blobToken();
  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result?.stream) continue;
      const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
      blobAccess = access;
      return {
        buffer,
        contentType: result.blob.contentType || 'application/octet-stream',
      };
    } catch {
      // try next
    }
  }
  return null;
}

async function listFromBlob(): Promise<SubmissionRecord[]> {
  const token = blobToken();
  const records: SubmissionRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: 'submissions/',
      token,
      cursor,
      limit: 1000,
    });

    const metaBlobs = page.blobs.filter((b) => b.pathname.endsWith('/meta.json'));
    const batch = await Promise.all(metaBlobs.map((b) => getBlobJson(b.pathname)));
    for (const record of batch) {
      if (record) records.push(record);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return records;
}

async function persistLocal(record: SubmissionRecord) {
  const root = await resolveWriteRoot();
  try {
    await writeFile(metaPathFor(root, record.id), JSON.stringify(record, null, 2), 'utf8');
  } catch (error) {
    console.warn('[submissions] local meta write failed:', error);
  }
}

async function persistRecord(record: SubmissionRecord) {
  memory.set(record.id, record);

  if (hasBlobStorage()) {
    try {
      await putBlob(blobMetaPath(record.id), JSON.stringify(record, null, 2), 'application/json');
      return;
    } catch (error) {
      console.error('[submissions] blob meta write failed:', error);
      lastBlobError = errorMessage(error);
      // On Vercel, local /tmp will not be visible to other functions — still try for this instance.
    }
  }

  await persistLocal(record);
}

async function readJsonRecord(filePath: string): Promise<SubmissionRecord | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = submissionRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn('[submissions] invalid record', filePath, parsed.error.message);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

async function readRecord(id: string): Promise<SubmissionRecord | null> {
  const mem = memory.get(id);
  if (mem) return mem;

  if (hasBlobStorage()) {
    try {
      const record = await getBlobJson(blobMetaPath(id));
      if (record) {
        memory.set(id, record);
        return record;
      }
    } catch (error) {
      console.warn('[submissions] blob read failed:', error);
      lastBlobError = errorMessage(error);
    }
  }

  for (const root of candidateRoots()) {
    const record = await readJsonRecord(metaPathFor(root, id));
    if (record) {
      memory.set(id, record);
      return record;
    }
  }
  return null;
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string; contentType: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new AppError('Invalid image data URL', 400);
  }
  const contentType = match[1];
  const ext = contentType.includes('jpeg') || contentType.includes('jpg')
    ? '.jpg'
    : contentType.includes('webp')
      ? '.webp'
      : '.png';
  return { buffer: Buffer.from(match[2], 'base64'), ext, contentType };
}

export async function createSubmission(input: {
  job: SubmissionJob;
  prompt: string;
  payload?: unknown;
  contactId?: string | null;
  fleadid?: string | null;
  knowledgeProfileId?: string | null;
  skipMockup?: boolean;
}): Promise<SubmissionRecord> {
  const now = new Date().toISOString();
  const record: SubmissionRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: input.skipMockup ? 'skipped' : 'submitted',
    contactId: input.contactId ?? null,
    fleadid: input.fleadid ?? null,
    knowledgeProfileId: input.knowledgeProfileId ?? null,
    prompt: input.prompt,
    payload: input.payload,
    job: submissionJobSchema.parse(input.job),
    model: null,
    usedSamples: 0,
    hasImage: false,
    imageFile: null,
    imagePathname: null,
    imageUrl: null,
    errorMessage: null,
    skipMockup: Boolean(input.skipMockup),
    hasLogo: false,
    logoFilename: null,
    logoMimeType: null,
    logoPathname: null,
  };
  await persistRecord(record);
  return record;
}

const LOGO_MIME_ALLOW = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function saveSubmissionLogo(
  id: string,
  file: { buffer: Buffer; filename: string; mimeType: string },
): Promise<SubmissionRecord> {
  const current = await readRecord(id);
  if (!current) throw new AppError('Submission not found', 404);

  const mime = (file.mimeType || 'image/png').toLowerCase();
  if (!LOGO_MIME_ALLOW.has(mime) && !mime.startsWith('image/')) {
    throw new AppError('Logo must be a PNG, JPEG, or WebP image', 400);
  }

  const filename = path.basename(file.filename) || 'logo.png';
  const pathname = blobLogoPath(id, filename);
  let logoPathname: string | null = null;

  if (hasBlobStorage()) {
    try {
      await putBlob(pathname, file.buffer, mime);
      logoPathname = pathname;
    } catch (error) {
      console.error('[submissions] blob logo write failed:', error);
      lastBlobError = errorMessage(error);
    }
  }

  if (!logoPathname) {
    const root = await resolveWriteRoot();
    const localPath = logoLocalPath(root, id, filename);
    await writeFile(localPath, file.buffer);
    logoPathname = localPath;
  }

  const next: SubmissionRecord = submissionRecordSchema.parse({
    ...current,
    hasLogo: true,
    logoFilename: filename,
    logoMimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
    logoPathname,
    updatedAt: new Date().toISOString(),
  });
  await persistRecord(next);
  return next;
}

export async function readSubmissionLogo(
  id: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  const record = await readRecord(id);
  if (!record?.hasLogo || !record.logoPathname) return null;

  const filename = record.logoFilename || 'logo.png';
  const mimeType = record.logoMimeType || 'image/png';

  if (record.logoPathname.startsWith('submissions/') && hasBlobStorage()) {
    const fromBlob = await getBlobBytes(record.logoPathname);
    if (fromBlob) {
      return { buffer: fromBlob.buffer, filename, mimeType: fromBlob.contentType || mimeType };
    }
  }

  try {
    const buffer = await readFile(record.logoPathname);
    return { buffer, filename, mimeType };
  } catch {
    // try local convention
  }

  for (const root of candidateRoots()) {
    try {
      const buffer = await readFile(logoLocalPath(root, id, filename));
      return { buffer, filename, mimeType };
    } catch {
      // try next
    }
  }

  return null;
}

export async function updateSubmission(
  id: string,
  patch: Partial<
    Pick<
      SubmissionRecord,
      | 'status'
      | 'prompt'
      | 'payload'
      | 'model'
      | 'usedSamples'
      | 'contactId'
      | 'fleadid'
      | 'knowledgeProfileId'
      | 'errorMessage'
      | 'skipMockup'
      | 'imageUrl'
      | 'imagePathname'
    >
  > & { imageDataUrl?: string | null },
): Promise<SubmissionRecord> {
  const current = await readRecord(id);
  if (!current) throw new AppError('Submission not found', 404);

  let hasImage = current.hasImage;
  let imageFile = current.imageFile;
  let imagePathname = current.imagePathname ?? null;
  let imageUrl = current.imageUrl ?? null;

  if (patch.imageDataUrl) {
    const { buffer, ext, contentType } = dataUrlToBuffer(patch.imageDataUrl);
    const filename = `${id}${ext}`;
    const pathname = blobImagePath(id, ext);

    if (hasBlobStorage()) {
      try {
        const uploaded = await putBlob(pathname, buffer, contentType);
        hasImage = true;
        imageFile = filename;
        imagePathname = pathname;
        imageUrl = blobAccess === 'public' ? uploaded.url : null;
      } catch (error) {
        console.error('[submissions] blob image write failed:', error);
        lastBlobError = errorMessage(error);
      }
    }

    if (!imagePathname) {
      try {
        const root = await resolveWriteRoot();
        await writeFile(imagePathFor(root, filename), buffer);
        hasImage = true;
        imageFile = filename;
      } catch (error) {
        console.warn('[submissions] local image write failed:', error);
      }
    }
  }

  const { imageDataUrl: _ignored, ...rest } = patch;
  const next: SubmissionRecord = submissionRecordSchema.parse({
    ...current,
    ...rest,
    hasImage,
    imageFile,
    imagePathname,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : imageUrl,
    updatedAt: new Date().toISOString(),
  });

  await persistRecord(next);
  return next;
}

export async function getSubmission(id: string): Promise<SubmissionRecord> {
  const record = await readRecord(id);
  if (!record) throw new AppError('Submission not found', 404);
  return record;
}

export async function listSubmissions(limit = 100): Promise<SubmissionSummary[]> {
  const byId = new Map<string, SubmissionRecord>();

  for (const [id, record] of memory) {
    byId.set(id, record);
  }

  if (hasBlobStorage()) {
    try {
      const records = await listFromBlob();
      for (const record of records) {
        byId.set(record.id, record);
        memory.set(record.id, record);
      }
      if (!lastBlobError) lastBlobError = null;
    } catch (error) {
      console.error('[submissions] blob list failed:', error);
      lastBlobError = errorMessage(error);
    }
  }

  for (const root of candidateRoots()) {
    try {
      const files = await readdir(path.join(root, 'meta'));
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const id = file.replace(/\.json$/, '');
        if (byId.has(id)) continue;
        const record = await readJsonRecord(metaPathFor(root, id));
        if (record) {
          memory.set(id, record);
          byId.set(id, record);
        }
      }
    } catch {
      // missing dir ok
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      status: r.status,
      customerName: r.job.customerName,
      email: r.job.email,
      teamName: r.job.teamName,
      sport: r.job.sport,
      contactId: r.contactId ?? null,
      fleadid: r.fleadid ?? null,
      hasImage: r.hasImage,
      hasPrompt: Boolean(r.prompt),
    }));
}

export async function readSubmissionImage(
  id: string,
): Promise<{ buffer: Buffer; contentType: string; redirectUrl?: string } | null> {
  const record = await readRecord(id);
  if (!record) return null;

  if (record.imageUrl && blobAccess === 'public') {
    return { buffer: Buffer.alloc(0), contentType: 'image/png', redirectUrl: record.imageUrl };
  }

  const pathname =
    record.imagePathname ||
    (record.imageFile?.includes('/') ? record.imageFile : null) ||
    (record.imageFile ? blobImagePath(id, path.extname(record.imageFile) || '.png') : null);

  if (pathname && hasBlobStorage()) {
    const fromBlob = await getBlobBytes(pathname);
    if (fromBlob) return fromBlob;
  }

  if (!record.imageFile) return null;

  for (const root of candidateRoots()) {
    try {
      const buffer = await readFile(imagePathFor(root, path.basename(record.imageFile)));
      const ext = path.extname(record.imageFile).toLowerCase();
      const contentType =
        ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/png';
      return { buffer, contentType };
    } catch {
      // try next
    }
  }
  return null;
}
