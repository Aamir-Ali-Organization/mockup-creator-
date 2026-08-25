import { access } from 'node:fs/promises';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createDefaultKnowledgeProfile,
  createDefaultKnowledgeProfiles,
  getStyleComboById,
  knowledgeProfileSchema,
  resolveStyleComboId,
  sportToSlug,
  sportUsesStyleCombos,
  type KnowledgeProfile,
  type KnowledgeSample,
  SPORTS,
} from '@mockup/shared';
import { AppError } from '@/lib/errors';
import {
  deleteBlob,
  getBlobBytes,
  getBlobText,
  hasBlobStorage,
  listBlobPathnames,
  putBlob,
} from '@/lib/blob-store';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** Bundled with the app (readable on Vercel). */
const BUNDLE_DIR = path.join(process.cwd(), 'data', 'knowledge', 'profiles');
/** Writable overlay — local project dir, or /tmp on serverless. */
const WRITE_DIR = isServerless
  ? path.join('/tmp', 'mockup-knowledge', 'profiles')
  : BUNDLE_DIR;
const SAMPLES_WRITE_DIR = isServerless
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

function profileBlobPath(slug: string) {
  return `knowledge/profiles/${slug}.json`;
}

function sampleBlobPath(sportId: string, filename: string) {
  return `knowledge/samples/${sportId}/${filename}`;
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

async function readProfileFromBlob(slug: string): Promise<KnowledgeProfile | null> {
  if (!hasBlobStorage()) return null;
  try {
    const text = await getBlobText(profileBlobPath(slug));
    if (!text) return null;
    return knowledgeProfileSchema.parse(JSON.parse(text));
  } catch (error) {
    console.warn('[knowledge] blob profile read failed:', slug, error);
    return null;
  }
}

async function readProfileFile(slug: string): Promise<KnowledgeProfile | null> {
  const mem = memoryProfiles.get(slug);
  if (mem) return mem;

  const fromBlob = await readProfileFromBlob(slug);
  if (fromBlob) {
    memoryProfiles.set(slug, fromBlob);
    return fromBlob;
  }

  const fromWrite = await readJsonProfile(profileWritePath(slug));
  if (fromWrite) return fromWrite;

  const fromBundle = await readJsonProfile(profileBundlePath(slug));
  if (fromBundle) return fromBundle;

  return null;
}

async function writeProfileFile(profile: KnowledgeProfile) {
  memoryProfiles.set(profile.id, profile);
  await ensureWriteDirs();

  if (hasBlobStorage()) {
    try {
      await putBlob(
        profileBlobPath(profile.id),
        JSON.stringify(profile, null, 2),
        'application/json',
      );
    } catch (error) {
      console.error('[knowledge] blob profile write failed:', error);
    }
  }

  try {
    await writeFile(profileWritePath(profile.id), JSON.stringify(profile, null, 2), 'utf8');
  } catch (error) {
    console.warn('[knowledge] disk write failed, using memory/blob only:', error);
  }
}

export async function ensureKnowledgeDefaults() {
  await ensureWriteDirs();

  try {
    if (hasBlobStorage()) {
      const existing = await listBlobPathnames('knowledge/profiles/');
      if (existing.some((p) => p.endsWith('.json'))) return;
    }

    const existingWrite = await readdir(WRITE_DIR).catch(() => [] as string[]);
    if (existingWrite.some((name) => name.endsWith('.json'))) return;

    const bundled = await readdir(BUNDLE_DIR).catch(() => [] as string[]);
    if (bundled.some((name) => name.endsWith('.json'))) return;

    const defaults = createDefaultKnowledgeProfiles();
    await Promise.all(defaults.map((profile) => writeProfileFile(profile)));
  } catch (error) {
    console.warn('[knowledge] could not seed defaults:', error);
  }
}

export async function listKnowledgeProfiles(): Promise<KnowledgeProfile[]> {
  await ensureKnowledgeDefaults();

  const byId = new Map<string, KnowledgeProfile>();

  for (const profile of createDefaultKnowledgeProfiles()) {
    byId.set(profile.id, profile);
  }

  try {
    const files = await readdir(BUNDLE_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const profile = await readJsonProfile(path.join(BUNDLE_DIR, file));
      if (profile) byId.set(profile.id, profile);
    }
  } catch {
    // ignore
  }

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

  if (hasBlobStorage()) {
    try {
      const pathnames = await listBlobPathnames('knowledge/profiles/');
      for (const pathname of pathnames) {
        if (!pathname.endsWith('.json')) continue;
        const slug = path.basename(pathname, '.json');
        const profile = await readProfileFromBlob(slug);
        if (profile) byId.set(profile.id, profile);
      }
    } catch (error) {
      console.warn('[knowledge] blob list failed:', error);
    }
  }

  for (const [id, profile] of memoryProfiles) {
    byId.set(id, profile);
  }

  for (const sport of SPORTS) {
    const slug = sportToSlug(sport);
    if (!byId.has(slug)) {
      byId.set(slug, createDefaultKnowledgeProfile(sport));
    }
  }

  const sportOrder = new Map(SPORTS.map((sport, index) => [sportToSlug(sport), index]));

  return [...byId.values()].sort((a, b) => {
    const aIndex = sportOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = sportOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.label.localeCompare(b.label);
  });
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
    // Do not overwrite a remote profile we failed to read — only create if truly missing.
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

/**
 * Always re-read the latest profile before mutating samples so we never
 * overwrite Blob data with an empty default from another serverless instance.
 */
async function getFreshProfileForMutation(sportOrSlug: string): Promise<KnowledgeProfile> {
  const slug = sportToSlug(sportOrSlug);
  memoryProfiles.delete(slug);

  if (hasBlobStorage()) {
    const fromBlob = await readProfileFromBlob(slug);
    if (fromBlob) {
      memoryProfiles.set(slug, fromBlob);
      return fromBlob;
    }
  }

  return getKnowledgeProfile(sportOrSlug);
}

export async function saveKnowledgeProfile(
  sportOrSlug: string,
  patch: Partial<
    Pick<
      KnowledgeProfile,
      | 'instructions'
      | 'knowledgeBase'
      | 'promptTemplate'
      | 'enabled'
      | 'label'
      | 'sampleImages'
      | 'comboSampleSets'
    >
  >,
): Promise<KnowledgeProfile> {
  const current =
    patch.sampleImages !== undefined || patch.comboSampleSets !== undefined
      ? await getFreshProfileForMutation(sportOrSlug)
      : await getKnowledgeProfile(sportOrSlug);

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
  /** When set, sample is stored under this style combo instead of general samples. */
  comboId?: string | null;
}): Promise<KnowledgeProfile> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];
  if (!allowed.includes(input.mimeType)) {
    throw new AppError('Sample must be PNG, JPEG, or WebP', 400);
  }

  const comboId = input.comboId?.trim() || '';
  if (comboId && !getStyleComboById(comboId)) {
    throw new AppError('Unknown style combination', 400);
  }

  const profile = await getFreshProfileForMutation(input.sportOrSlug);
  const ext =
    input.mimeType === 'image/webp'
      ? '.webp'
      : input.mimeType === 'image/png'
        ? '.png'
        : '.jpg';

  const id = randomUUID();
  const filename = `${id}${ext}`;
  const pathname = sampleBlobPath(profile.id, filename);

  let url = `/api/knowledge/${profile.id}/samples/file/${filename}`;

  if (hasBlobStorage()) {
    try {
      const uploaded = await putBlob(pathname, input.buffer, input.mimeType);
      url = `/api/knowledge/${profile.id}/samples/file/${filename}`;
      void uploaded;
    } catch (error) {
      console.error('[knowledge] blob sample upload failed:', error);
      throw new AppError(
        'Could not store sample in Blob. Check BLOB_READ_WRITE_TOKEN / store access.',
        503,
      );
    }
  } else {
    const dir = sampleDir(profile.id);
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(path.join(dir, filename), input.buffer);
      if (!isServerless) {
        url = `/knowledge/samples/${profile.id}/${filename}`;
      }
    } catch {
      throw new AppError(
        'Could not store sample image on this host. Configure BLOB_READ_WRITE_TOKEN.',
        503,
      );
    }
  }

  const sample: KnowledgeSample = {
    id,
    filename,
    pathname: hasBlobStorage() ? pathname : undefined,
    url,
    caption: input.caption?.trim() || '',
    uploadedAt: new Date().toISOString(),
  };

  let next: KnowledgeProfile;
  if (comboId) {
    const sets = [...(profile.comboSampleSets ?? [])];
    const index = sets.findIndex((s) => s.comboId === comboId);
    if (index >= 0) {
      sets[index] = {
        ...sets[index],
        samples: [...sets[index].samples, sample],
      };
    } else {
      sets.push({
        comboId,
        samples: [sample],
        instructions: '',
        knowledgeBase: '',
        promptTemplate: '',
      });
    }
    next = knowledgeProfileSchema.parse({
      ...profile,
      comboSampleSets: sets,
      updatedAt: new Date().toISOString(),
    });
  } else {
    next = knowledgeProfileSchema.parse({
      ...profile,
      sampleImages: [...profile.sampleImages, sample],
      updatedAt: new Date().toISOString(),
    });
  }

  await writeProfileFile(next);
  return next;
}

export async function removeKnowledgeSample(
  sportOrSlug: string,
  sampleId: string,
): Promise<KnowledgeProfile> {
  const profile = await getFreshProfileForMutation(sportOrSlug);

  const general = profile.sampleImages.find((s) => s.id === sampleId);
  let sample = general;
  let fromComboId: string | null = null;

  if (!sample) {
    for (const set of profile.comboSampleSets ?? []) {
      const found = set.samples.find((s) => s.id === sampleId);
      if (found) {
        sample = found;
        fromComboId = set.comboId;
        break;
      }
    }
  }

  if (!sample) throw new AppError('Sample not found', 404);

  if (sample.pathname) {
    await deleteBlob(sample.pathname);
  }
  await unlink(path.join(sampleDir(profile.id), sample.filename)).catch(() => undefined);
  await unlink(path.join(SAMPLES_PUBLIC_DIR, profile.id, sample.filename)).catch(() => undefined);

  let next: KnowledgeProfile;
  if (fromComboId) {
    const sets = (profile.comboSampleSets ?? [])
      .map((set) =>
        set.comboId === fromComboId
          ? { ...set, samples: set.samples.filter((s) => s.id !== sampleId) }
          : set,
      )
      .filter((set) => set.samples.length > 0);
    next = knowledgeProfileSchema.parse({
      ...profile,
      comboSampleSets: sets,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const remaining = profile.sampleImages.filter((s) => s.id !== sampleId);
    if (remaining.length === 0 && profile.sampleImages.length > 1) {
      throw new AppError('Refusing to remove all samples from a partial delete', 500);
    }
    next = knowledgeProfileSchema.parse({
      ...profile,
      sampleImages: remaining,
      updatedAt: new Date().toISOString(),
    });
  }

  await writeProfileFile(next);
  return next;
}

export type ResolvedSample = {
  filename: string;
  mimeType: string;
  path?: string;
  buffer?: Buffer;
};

async function resolveSamplesList(
  profile: KnowledgeProfile,
  samples: KnowledgeSample[],
): Promise<ResolvedSample[]> {
  const results: ResolvedSample[] = [];

  for (const sample of samples) {
    const ext = path.extname(sample.filename).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    if (sample.pathname && hasBlobStorage()) {
      const bytes = await getBlobBytes(sample.pathname);
      if (bytes) {
        results.push({ filename: sample.filename, mimeType, buffer: bytes.buffer });
        continue;
      }
    }

    if (hasBlobStorage()) {
      const guessed = sampleBlobPath(profile.id, sample.filename);
      const bytes = await getBlobBytes(guessed);
      if (bytes) {
        results.push({ filename: sample.filename, mimeType, buffer: bytes.buffer });
        continue;
      }
    }

    const candidates = [
      path.join(SAMPLES_WRITE_DIR, profile.id, sample.filename),
      path.join(SAMPLES_PUBLIC_DIR, profile.id, sample.filename),
    ];

    for (const candidate of candidates) {
      try {
        await access(candidate);
        results.push({ path: candidate, filename: sample.filename, mimeType });
        break;
      } catch {
        // try next
      }
    }
  }

  return results;
}

export async function resolveSampleFiles(profile: KnowledgeProfile): Promise<ResolvedSample[]> {
  return resolveSamplesList(profile, profile.sampleImages);
}

export function getComboSamples(
  profile: KnowledgeProfile,
  comboId: string,
): KnowledgeSample[] {
  return profile.comboSampleSets?.find((s) => s.comboId === comboId)?.samples ?? [];
}

/**
 * Prefer exact style-combo samples for Flag Football / 7v7 quotes.
 * Fall back to sport general samples, then other sports.
 */
export async function collectStyleReferenceSamples(
  primary: KnowledgeProfile,
  max = 5,
  quote?: {
    gender?: string | null;
    shirtStyle?: string | null;
    shirtType?: string | null;
  },
): Promise<{
  samples: ResolvedSample[];
  sampleCountForPrompt: number;
  source: string;
  comboId: string | null;
}> {
  const comboId =
    sportUsesStyleCombos(primary.sport) && quote
      ? resolveStyleComboId(quote)
      : null;

  if (comboId) {
    const comboSamples = getComboSamples(primary, comboId);
    if (comboSamples.length > 0) {
      const files = await resolveSamplesList(primary, comboSamples);
      if (files.length > 0) {
        return {
          samples: files.slice(0, max),
          sampleCountForPrompt: files.length,
          source: `${primary.id}:${comboId}`,
          comboId,
        };
      }
    }
  }

  const primaryFiles = await resolveSampleFiles(primary);
  if (primaryFiles.length > 0) {
    return {
      samples: primaryFiles.slice(0, max),
      sampleCountForPrompt: primaryFiles.length,
      source: primary.id,
      comboId,
    };
  }

  // Borrow any combo samples from this sport if general is empty.
  const allComboSamples = (primary.comboSampleSets ?? []).flatMap((s) => s.samples);
  if (allComboSamples.length > 0) {
    const files = await resolveSamplesList(primary, allComboSamples);
    if (files.length > 0) {
      return {
        samples: files.slice(0, max),
        sampleCountForPrompt: files.length,
        source: `${primary.id}:any-combo`,
        comboId,
      };
    }
  }

  const all = await listKnowledgeProfiles();
  const merged: ResolvedSample[] = [];
  const seen = new Set<string>();
  const sources: string[] = [];

  for (const profile of all) {
    if (profile.id === primary.id) continue;
    const pool = [
      ...profile.sampleImages,
      ...(profile.comboSampleSets ?? []).flatMap((s) => s.samples),
    ];
    if (!pool.length) continue;
    const files = await resolveSamplesList(profile, pool);
    if (!files.length) continue;
    sources.push(profile.id);
    for (const file of files) {
      const key = `${profile.id}:${file.filename}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(file);
      if (merged.length >= max) break;
    }
    if (merged.length >= max) break;
  }

  return {
    samples: merged.slice(0, max),
    sampleCountForPrompt: merged.length,
    source: sources.length ? `brand-fallback:${sources.join(',')}` : 'none',
    comboId,
  };
}

/** @deprecated Prefer resolveSampleFiles */
export async function resolveSampleAbsolutePaths(profile: KnowledgeProfile) {
  const files = await resolveSampleFiles(profile);
  return files
    .filter((f): f is ResolvedSample & { path: string } => Boolean(f.path))
    .map((f) => ({ path: f.path, filename: f.filename, mimeType: f.mimeType }));
}

export function getSampleFilePath(sportSlug: string, filename: string) {
  const safeName = path.basename(filename);
  return {
    writePath: path.join(SAMPLES_WRITE_DIR, sportSlug, safeName),
    publicPath: path.join(SAMPLES_PUBLIC_DIR, sportSlug, safeName),
    blobPath: sampleBlobPath(sportSlug, safeName),
  };
}

export async function readSampleBytes(
  sportSlug: string,
  filename: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeName = path.basename(filename);
  const ext = path.extname(safeName).toLowerCase();
  const contentType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  if (hasBlobStorage()) {
    const fromBlob = await getBlobBytes(sampleBlobPath(sportSlug, safeName));
    if (fromBlob) return fromBlob;
  }

  const { writePath, publicPath } = getSampleFilePath(sportSlug, safeName);
  for (const candidate of [writePath, publicPath]) {
    try {
      const buffer = await readFile(candidate);
      return { buffer, contentType };
    } catch {
      // try next
    }
  }
  return null;
}
