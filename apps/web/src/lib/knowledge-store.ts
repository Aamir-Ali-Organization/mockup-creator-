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

const DATA_DIR = path.join(process.cwd(), 'data', 'knowledge', 'profiles');
const SAMPLES_DIR = path.join(process.cwd(), 'public', 'knowledge', 'samples');

async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(SAMPLES_DIR, { recursive: true });
}

function profilePath(slug: string) {
  return path.join(DATA_DIR, `${slug}.json`);
}

function sampleDir(slug: string) {
  return path.join(SAMPLES_DIR, slug);
}

export async function ensureKnowledgeDefaults() {
  await ensureDirs();
  const existing = await readdir(DATA_DIR).catch(() => [] as string[]);
  if (existing.some((name) => name.endsWith('.json'))) return;

  const defaults = createDefaultKnowledgeProfiles();
  await Promise.all(
    defaults.map((profile) =>
      writeFile(profilePath(profile.id), JSON.stringify(profile, null, 2), 'utf8'),
    ),
  );
}

async function readProfileFile(slug: string): Promise<KnowledgeProfile | null> {
  try {
    const raw = await readFile(profilePath(slug), 'utf8');
    return knowledgeProfileSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listKnowledgeProfiles(): Promise<KnowledgeProfile[]> {
  await ensureKnowledgeDefaults();

  const files = await readdir(DATA_DIR);
  const profiles: KnowledgeProfile[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const profile = await readProfileFile(file.replace(/\.json$/, ''));
    if (profile) profiles.push(profile);
  }

  // Ensure every known sport exists (new sports added later get seeded).
  for (const sport of SPORTS) {
    const slug = sportToSlug(sport);
    if (!profiles.some((p) => p.id === slug)) {
      const created = createDefaultKnowledgeProfile(sport);
      await writeFile(profilePath(slug), JSON.stringify(created, null, 2), 'utf8');
      profiles.push(created);
    }
  }

  return profiles.sort((a, b) => a.label.localeCompare(b.label));
}

export async function getKnowledgeProfile(sportOrSlug: string): Promise<KnowledgeProfile> {
  await ensureKnowledgeDefaults();
  const slug = sportToSlug(sportOrSlug);
  const existing = await readProfileFile(slug);
  if (existing) return existing;

  // Fallback: try exact sport label match from defaults, else Other, else master default.
  const byLabel =
    SPORTS.find((s) => sportToSlug(s) === slug) ??
    SPORTS.find((s) => s.toLowerCase() === sportOrSlug.toLowerCase());

  if (byLabel) {
    const created = createDefaultKnowledgeProfile(byLabel);
    await writeFile(profilePath(created.id), JSON.stringify(created, null, 2), 'utf8');
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

  await writeFile(profilePath(next.id), JSON.stringify(next, null, 2), 'utf8');
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
  await writeFile(path.join(dir, filename), input.buffer);

  const sample: KnowledgeSample = {
    id,
    filename,
    url: `/knowledge/samples/${profile.id}/${filename}`,
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

  const filePath = path.join(sampleDir(profile.id), sample.filename);
  await unlink(filePath).catch(() => undefined);

  return saveKnowledgeProfile(profile.id, {
    sampleImages: profile.sampleImages.filter((s) => s.id !== sampleId),
  });
}

export async function resolveSampleAbsolutePaths(profile: KnowledgeProfile): Promise<
  Array<{ path: string; filename: string; mimeType: string }>
> {
  const results: Array<{ path: string; filename: string; mimeType: string }> = [];

  for (const sample of profile.sampleImages) {
    const absolute = path.join(SAMPLES_DIR, profile.id, sample.filename);
    try {
      await access(absolute);
    } catch {
      continue;
    }
    const ext = path.extname(sample.filename).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    results.push({ path: absolute, filename: sample.filename, mimeType });
  }

  return results;
}
