import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { removeKnowledgeSample } from '@/lib/knowledge-store';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ sport: string; sampleId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport, sampleId } = await params;
    const profile = await removeKnowledgeSample(
      decodeURIComponent(sport),
      decodeURIComponent(sampleId),
    );
    return Response.json({ success: true, profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
