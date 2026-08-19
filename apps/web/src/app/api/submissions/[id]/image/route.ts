import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { readSubmissionImage } from '@/lib/submission-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { id } = await params;
    const image = await readSubmissionImage(decodeURIComponent(id));
    if (!image) throw new AppError('Image not found', 404);

    if (image.redirectUrl) {
      return Response.redirect(image.redirectUrl, 302);
    }

    return new Response(new Uint8Array(image.buffer), {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
