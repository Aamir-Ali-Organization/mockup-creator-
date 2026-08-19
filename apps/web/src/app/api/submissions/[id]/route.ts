import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { getSubmission } from '@/lib/submission-store';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { id } = await params;
    const submission = await getSubmission(decodeURIComponent(id));
    const imageUrl =
      submission.imageUrl ||
      (submission.hasImage ? `/api/submissions/${submission.id}/image` : null);
    return Response.json({
      success: true,
      submission,
      imageUrl,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
