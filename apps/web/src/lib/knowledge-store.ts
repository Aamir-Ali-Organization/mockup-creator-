import { access } from 'node:fs/promises';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createDefaultKnowledgeProfile,
  createDefaultKnowledgeProfiles,
  knowledgeProfileSchema,
  sportToSlug,
  type KnowledgeProfile,
  type KnowledgeSample,
  SPORTS,
} from '@mockup/shared';
import { AppError } from '@/lib/errors';

/** Bundled with the app (readable on Vercel). */
const BUNDLE_DIR = path.join(process.cwd(), 'data', 'knowledge', 'profiles');
/** Writable overlay — local project dir, or /tmp on serverless. */
const WRITE_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join('/tmp', 'mockup-knowledge', 'profiles')
    : BUNDLE_DIR;
const SAMPLES_WRITE_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join('/tmp', 'mockup-knowledge', 'samples')
    : path.join(process.cwd(), 'public', 'knowledge', 'samples');
const SAMPLES_PUBLIC_DIR = path.join(process.cwd(), 'public', 'knowledge', 'samples');

/** In-memory overlay so the same serverless instance sees saves. */
const memoryProfiles = new Map<string, KnowledgeProfile>();

function profileWritePath(slug: string) {
  return path.join(WRITE_DIR, `${slug}.json`);
}

function profileBundlePath(slug: string) {
  return path.join(BUNDLE_DIR, `${slug}.json`);
}

function sampleDir(slug: string) {
  return path.join(SAMPLES_WRITE_DIR, slug);
}

async function ensureWriteDirs() {
  await mkdir(WRITE_DIR, { recursive: true }).catch(() => undefined);
  await mkdir(SAMPLES_WRITE_DIR, { recursive: true }).catch(() => undefined);
}

async function readJsonProfile(filePath: string): Promise<KnowledgeProfile | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return knowledgeProfileSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readProfileFile(slug: string): Promise<KnowledgeProfile | null> {
  const mem = memoryProfiles.get(slug);
  if (mem) return mem;

  const fromWrite = await readJsonProfile(profileWritePath(slug));
  if (fromWrite) return fromWrite;

  const fromBundle = await readJsonProfile(profileBundlePath(slug));
  if (fromBundle) return fromBundle;

  return null;
}

async function writeProfileFile(profile: KnowledgeProfile) {
  memoryProfiles.set(profile.id, profile);
  await ensureWriteDirs();
  try {
    await writeFile(profileWritePath(profile.id), JSON.stringify(profile, null, 2), 'utf8');
  } catch (error) {
    // Memory still holds the profile for this instance.
    console.warn('[knowledge] disk write failed, using memory only:', error);
  }
}

export async function ensureKnowledgeDefaults() {
  await ensureWriteDirs();

  // Prefer seeding writable dir; if that fails, bundled/memory defaults still work.
  try {
    const existing = await readdir(WRITE_DIR).catch(() => [] as string[]);
    if (existing.some((name) => name.endsWith('.json'))) return;

    const bundled = await readdir(BUNDLE_DIR).catch(() => [] as string[]);
    if (bundled.some((name) => name.endsWith('.json'))) return;

    const defaults = createDefaultKnowledgeProfiles();
    await Promise.all(defaults.map((profile) => writeProfileFile(profile)));
  } catch (error) {
    console.warn('[knowledge] could not seed defaults on disk:', error);
  }
}

export async function listKnowledgeProfiles(): Promise<KnowledgeProfile[]> {
  await ensureKnowledgeDefaults();

  const byId = new Map<string, KnowledgeProfile>();

  // Defaults first.
  for (const profile of createDefaultKnowledgeProfiles()) {
    byId.set(profile.id, profile);
  }

  // Bundled committed files.
  try {
    const files = await readdir(BUNDLE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const profile = await readJsonProfile(path.join(BUNDLE_DIR, file));
      if (profile) byId.set(profile.id, profile);
    }
  } catch {
    // ignore missing bundle dir
  }

  // Writable overlay.
  try {
    const files = await readdir(WRITE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const profile = await readJsonProfile(path.join(WRITE_DIR, file));
      if (profile) byId.set(profile.id, profile);
    }
  } catch {
    // ignore
  }

  // Memory wins.
  for (const [id, profile] of memoryProfiles) {
    byId.set(id, profile);
  }

  // Guarantee every sport exists.
  for (const sport of SPORTS) {
    const slug = sportToSlug(sport);
    if (!byId.has(slug)) {
      byId.set(slug, createDefaultKnowledgeProfile(sport));
    }
  }

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export async function getKnowledgeProfile(sportOrSlug: string): Promise<KnowledgeProfile> {
  await ensureKnowledgeDefaults();
  const slug = sportToSlug(sportOrSlug);
  const existing = await readProfileFile(slug);
  if (existing) return existing;

  const byLabel =
    SPORTS.find((s) => sportToSlug(s) === slug) ??
    SPORTS.find((s) => s.toLowerCase() === sportOrSlug.toLowerCase());

  if (byLabel) {
    const created = createDefaultKnowledgeProfile(byLabel);
    await writeProfileFile(created);
    return created;
  }

  const other = await readProfileFile(sportToSlug('Other'));
  if (other) {
    return {
      ...other,
      sport: sportOrSlug,
      label: sportOrSlug,
      id: slug,
    };
  }

  return createDefaultKnowledgeProfile(sportOrSlug || 'Other');
}

export async function saveKnowledgeProfile(
  sportOrSlug: string,
  patch: Partial<
    Pick<
      KnowledgeProfile,
      'instructions' | 'knowledgeBase' | 'promptTemplate' | 'enabled' | 'label' | 'sampleImages'
    >
  >,
): Promise<KnowledgeProfile> {
  await ensureKnowledgeDefaults();
  const current = await getKnowledgeProfile(sportOrSlug);
  const next: KnowledgeProfile = knowledgeProfileSchema.parse({
    ...current,
    ...patch,
    id: current.id,
    sport: current.sport,
    updatedAt: new Date().toISOString(),
  });

  await writeProfileFile(next);
  return next;
}

export async function addKnowledgeSample(input: {
  sportOrSlug: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  caption?: string;
}): Promise<KnowledgeProfile> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];
  if (!allowed.includes(input.mimeType)) {
    throw new AppError('Sample must be PNG, JPEG, or WebP', 400);
  }

  const profile = await getKnowledgeProfile(input.sportOrSlug);
  const ext =
    input.mimeType === 'image/webp'
      ? '.webp'
      : input.mimeType === 'image/png'
        ? '.png'
        : '.jpg';

  const id = randomUUID();
  const filename = `${id}${ext}`;
  const dir = sampleDir(profile.id);
  await mkdir(dir, { recursive: true });

  try {
    await writeFile(path.join(dir, filename), input.buffer);
  } catch {
    throw new AppError(
      'Could not store sample image on this host. Use a VPS or object storage for persistent uploads.',
      503,
    );
  }

  const sample: KnowledgeSample = {
    id,
    filename,
    // Served via API on serverless; public path locally when under public/
    url:
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
        ? `/api/knowledge/${profile.id}/samples/file/${filename}`
        : `/knowledge/samples/${profile.id}/${filename}`,
    caption: input.caption?.trim() || '',
    uploadedAt: new Date().toISOString(),
  };

  return saveKnowledgeProfile(profile.id, {
    sampleImages: [...profile.sampleImages, sample],
  });
}

export async function removeKnowledgeSample(
  sportOrSlug: string,
  sampleId: string,
): Promise<KnowledgeProfile> {
  const profile = await getKnowledgeProfile(sportOrSlug);
  const sample = profile.sampleImages.find((s) => s.id === sampleId);
  if (!sample) throw new AppError('Sample not found', 404);

  await unlink(path.join(sampleDir(profile.id), sample.filename)).catch(() => undefined);
  await unlink(path.join(SAMPLES_PUBLIC_DIR, profile.id, sample.filename)).catch(() => undefined);

  return saveKnowledgeProfile(profile.id, {
    sampleImages: profile.sampleImages.filter((s) => s.id !== sampleId),
  });
}

export async function resolveSampleAbsolutePaths(profile: KnowledgeProfile): Promise<
  Array<{ path: string; filename: string; mimeType: string }>
> {
  const results: Array<{ path: string; filename: string; mimeType: string }> = [];

  for (const sample of profile.sampleImages) {
    const candidates = [
      path.join(SAMPLES_WRITE_DIR, profile.id, sample.filename),
      path.join(SAMPLES_PUBLIC_DIR, profile.id, sample.filename),
    ];

    let absolute: string | null = null;
    for (const candidate of candidates) {
      try {
        await access(candidate);
        absolute = candidate;
        break;
      } catch {
        // try next
      }
    }
    if (!absolute) continue;

    const ext = path.extname(sample.filename).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    results.push({ path: absolute, filename: sample.filename, mimeType });
  }

  return results;
}

export function getSampleFilePath(sportSlug: string, filename: string) {
  const safeName = path.basename(filename);
  return {
    writePath: path.join(SAMPLES_WRITE_DIR, sportSlug, safeName),
    publicPath: path.join(SAMPLES_PUBLIC_DIR, sportSlug, safeName),
  };
}
