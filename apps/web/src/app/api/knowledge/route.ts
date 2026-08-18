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
        sampleCount: p.sampleImages.length,
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
