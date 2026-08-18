import { z } from 'zod';
import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { getKnowledgeProfile, saveKnowledgeProfile } from '@/lib/knowledge-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

const patchSchema = z.object({
  instructions: z.string().optional(),
  knowledgeBase: z.string().optional(),
  promptTemplate: z.string().optional(),
  enabled: z.boolean().optional(),
  label: z.string().optional(),
});

type Params = { params: Promise<{ sport: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport } = await params;
    const profile = await getKnowledgeProfile(decodeURIComponent(sport));
    return Response.json({ success: true, profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport } = await params;
    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('Invalid knowledge profile payload', 400, parsed.error.flatten());
    }

    const profile = await saveKnowledgeProfile(decodeURIComponent(sport), parsed.data);
    return Response.json({ success: true, profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
