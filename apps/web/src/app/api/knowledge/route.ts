import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { listKnowledgeProfiles } from '@/lib/knowledge-store';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    assertKnowledgeAdmin(request);
    const profiles = await listKnowledgeProfiles();
    return Response.json({
      success: true,
      profiles: profiles.map((p) => ({
        id: p.id,
        sport: p.sport,
        label: p.label,
        enabled: p.enabled,
        sampleCount:
          p.sampleImages.length +
          (p.comboSampleSets ?? []).reduce((sum, set) => sum + set.samples.length, 0) +
          (p.logoSampleSets ?? []).reduce((sum, set) => sum + set.samples.length, 0),
        comboCount: (p.comboSampleSets ?? []).filter((s) => s.samples.length > 0).length,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertKnowledgeAdmin(request);
    const profiles = await listKnowledgeProfiles();
    return Response.json({ success: true, count: profiles.length, profiles });
  } catch (error) {
    return toErrorResponse(error);
  }
}
