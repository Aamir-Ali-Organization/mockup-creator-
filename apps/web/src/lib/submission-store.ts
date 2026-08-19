import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { list, put } from '@vercel/blob';
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
  /** Public URL when stored in Vercel Blob. */
  imageUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  skipMockup: z.boolean().optional().default(false),
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

export function hasBlobStorage() {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

export function getSubmissionsStorageInfo() {
  if (hasBlobStorage()) {
    return {
      mode: 'blob' as const,
      persistent: true,
      message: 'Submissions are stored in Vercel Blob (persistent).',
    };
  }
  if (isServerless) {
    return {
      mode: 'ephemeral' as const,
      persistent: false,
      message:
        'Vercel serverless storage is ephemeral. Add BLOB_READ_WRITE_TOKEN so submissions persist across requests.',
    };
  }
  return {
    mode: 'local' as const,
    persistent: true,
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

async function putBlobMeta(record: SubmissionRecord) {
  await put(blobMetaPath(record.id), JSON.stringify(record, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: env.BLOB_READ_WRITE_TOKEN,
  });
}

async function putBlobImage(id: string, buffer: Buffer, ext: string, contentType: string) {
  const result = await put(blobImagePath(id, ext), buffer, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return result.url;
}

async function fetchBlobMeta(url: string): Promise<SubmissionRecord | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const parsed = submissionRecordSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function listFromBlob(): Promise<SubmissionRecord[]> {
  const { blobs } = await list({
    prefix: 'submissions/',
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  const metaBlobs = blobs.filter((b) => b.pathname.endsWith('/meta.json'));
  const records = await Promise.all(metaBlobs.map((b) => fetchBlobMeta(b.url)));
  return records.filter((r): r is SubmissionRecord => Boolean(r));
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
      await putBlobMeta(record);
      return;
    } catch (error) {
      console.error('[submissions] blob meta write failed:', error);
      // fall through to local/memory so the request still succeeds
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
      const { blobs } = await list({
        prefix: `submissions/${id}/`,
        token: env.BLOB_READ_WRITE_TOKEN,
      });
      const meta = blobs.find((b) => b.pathname.endsWith('meta.json'));
      if (meta) {
        const record = await fetchBlobMeta(meta.url);
        if (record) {
          memory.set(id, record);
          return record;
        }
      }
    } catch (error) {
      console.warn('[submissions] blob read failed:', error);
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
    imageUrl: null,
    errorMessage: null,
    skipMockup: Boolean(input.skipMockup),
  };
  await persistRecord(record);
  return record;
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
    >
  > & { imageDataUrl?: string | null },
): Promise<SubmissionRecord> {
  const current = await readRecord(id);
  if (!current) throw new AppError('Submission not found', 404);

  let hasImage = current.hasImage;
  let imageFile = current.imageFile;
  let imageUrl = current.imageUrl ?? null;

  if (patch.imageDataUrl) {
    const { buffer, ext, contentType } = dataUrlToBuffer(patch.imageDataUrl);
    const filename = `${id}${ext}`;

    if (hasBlobStorage()) {
      try {
        imageUrl = await putBlobImage(id, buffer, ext, contentType);
        hasImage = true;
        imageFile = filename;
      } catch (error) {
        console.error('[submissions] blob image write failed:', error);
      }
    }

    if (!hasImage || !hasBlobStorage()) {
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
    } catch (error) {
      console.error('[submissions] blob list failed:', error);
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

  if (record.imageUrl) {
    return { buffer: Buffer.alloc(0), contentType: 'image/png', redirectUrl: record.imageUrl };
  }

  if (!record.imageFile) return null;

  for (const root of candidateRoots()) {
    try {
      const buffer = await readFile(imagePathFor(root, record.imageFile));
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
