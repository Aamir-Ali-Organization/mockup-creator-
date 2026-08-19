import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
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

/** All places we may have written / may need to read (cwd can differ by process). */
function candidateRoots(): string[] {
  if (isServerless) {
    return [path.join('/tmp', 'mockup-submissions')];
  }

  const cwd = process.cwd();
  const roots = [
    path.join(cwd, 'data', 'submissions'),
    path.join(cwd, 'apps', 'web', 'data', 'submissions'),
  ];

  return [...new Set(roots.map((r) => path.resolve(r)))];
}

let writeRoot: string | null = null;

async function resolveWriteRoot(): Promise<string> {
  if (writeRoot) return writeRoot;
  if (isServerless) {
    writeRoot = path.join('/tmp', 'mockup-submissions');
    await mkdir(path.join(writeRoot, 'meta'), { recursive: true });
    await mkdir(path.join(writeRoot, 'images'), { recursive: true });
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

async function ensureDirs() {
  await resolveWriteRoot();
}

function metaPathFor(root: string, id: string) {
  return path.join(root, 'meta', `${id}.json`);
}

function imagePathFor(root: string, filename: string) {
  return path.join(root, 'images', filename);
}

async function persistRecord(record: SubmissionRecord) {
  memory.set(record.id, record);
  const root = await resolveWriteRoot();
  try {
    await writeFile(metaPathFor(root, record.id), JSON.stringify(record, null, 2), 'utf8');
  } catch (error) {
    console.warn('[submissions] meta write failed, memory only:', error);
  }
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

  for (const root of candidateRoots()) {
    const record = await readJsonRecord(metaPathFor(root, id));
    if (record) {
      memory.set(id, record);
      return record;
    }
  }
  return null;
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
  const root = await resolveWriteRoot();

  if (patch.imageDataUrl) {
    const { buffer, ext } = dataUrlToBuffer(patch.imageDataUrl);
    const filename = `${id}${ext}`;
    try {
      await writeFile(imagePathFor(root, filename), buffer);
      hasImage = true;
      imageFile = filename;
    } catch (error) {
      console.warn('[submissions] image write failed:', error);
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
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const record = await readRecord(id);
  if (!record?.imageFile) return null;

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
      // try next root
    }
  }
  return null;
}
