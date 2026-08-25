import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { addKnowledgeSample } from '@/lib/knowledge-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ sport: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport } = await params;
    const form = await request.formData();
    const file = form.get('file');
    const caption = String(form.get('caption') ?? '');

    if (!(file instanceof File)) {
      throw new AppError('file is required', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new AppError('Empty file', 400);
    }
    if (buffer.byteLength > 12 * 1024 * 1024) {
      throw new AppError('Sample image must be under 12MB', 400);
    }

    const profile = await addKnowledgeSample({
      sportOrSlug: decodeURIComponent(sport),
      buffer,
      filename: file.name || 'sample.png',
      mimeType: file.type || 'image/png',
      caption,
      comboId: String(form.get('comboId') ?? '').trim() || null,
      logoComposition: String(form.get('logoComposition') ?? '').trim() || null,
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
