import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { listSubmissions } from '@/lib/submission-store';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    assertKnowledgeAdmin(request);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 100) || 100, 300);
    const submissions = await listSubmissions(limit);
    return Response.json({ success: true, submissions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
