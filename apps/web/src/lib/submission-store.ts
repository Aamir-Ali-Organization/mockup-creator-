import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '@/lib/errors';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const ROOT_DIR = isServerless
  ? path.join('/tmp', 'mockup-submissions')
  : path.join(process.cwd(), 'data', 'submissions');

const META_DIR = path.join(ROOT_DIR, 'meta');
const IMAGE_DIR = path.join(ROOT_DIR, 'images');

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

async function ensureDirs() {
  await mkdir(META_DIR, { recursive: true }).catch(() => undefined);
  await mkdir(IMAGE_DIR, { recursive: true }).catch(() => undefined);
}

function metaPath(id: string) {
  return path.join(META_DIR, `${id}.json`);
}

function imagePath(filename: string) {
  return path.join(IMAGE_DIR, filename);
}

async function persistRecord(record: SubmissionRecord) {
  memory.set(record.id, record);
  await ensureDirs();
  try {
    await writeFile(metaPath(record.id), JSON.stringify(record, null, 2), 'utf8');
  } catch (error) {
    console.warn('[submissions] meta write failed, memory only:', error);
  }
}

async function readRecord(id: string): Promise<SubmissionRecord | null> {
  const mem = memory.get(id);
  if (mem) return mem;
  try {
    const raw = await readFile(metaPath(id), 'utf8');
    const parsed = submissionRecordSchema.parse(JSON.parse(raw));
    memory.set(id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new AppError('Invalid image data URL', 400);
  }
  const mime = match[1];
  const ext = mime.includes('jpeg') || mime.includes('jpg') ? '.jpg' : mime.includes('webp') ? '.webp' : '.png';
  return { buffer: Buffer.from(match[2], 'base64'), ext };
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
    >
  > & { imageDataUrl?: string | null },
): Promise<SubmissionRecord> {
  const current = await readRecord(id);
  if (!current) throw new AppError('Submission not found', 404);

  let hasImage = current.hasImage;
  let imageFile = current.imageFile;

  if (patch.imageDataUrl) {
    await ensureDirs();
    const { buffer, ext } = dataUrlToBuffer(patch.imageDataUrl);
    const filename = `${id}${ext}`;
    try {
      await writeFile(imagePath(filename), buffer);
      hasImage = true;
      imageFile = filename;
    } catch (error) {
      console.warn('[submissions] image write failed:', error);
      // Keep going — still update meta without image file if needed
    }
  }

  const { imageDataUrl: _ignored, ...rest } = patch;
  const next: SubmissionRecord = submissionRecordSchema.parse({
    ...current,
    ...rest,
    hasImage,
    imageFile,
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
  await ensureDirs();
  const byId = new Map<string, SubmissionRecord>();

  for (const [id, record] of memory) {
    byId.set(id, record);
  }

  try {
    const files = await readdir(META_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const id = file.replace(/\.json$/, '');
      if (byId.has(id)) continue;
      const record = await readRecord(id);
      if (record) byId.set(id, record);
    }
  } catch {
    // empty dir is fine
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
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const record = await readRecord(id);
  if (!record?.imageFile) return null;
  try {
    const buffer = await readFile(imagePath(record.imageFile));
    const ext = path.extname(record.imageFile).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
    return { buffer, contentType };
  } catch {
    return null;
  }
}
