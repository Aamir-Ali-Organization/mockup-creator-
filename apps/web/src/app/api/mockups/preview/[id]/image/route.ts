import { readSubmissionImage } from '@/lib/submission-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** Public mockup image preview (id is unguessable). Avoids huge base64 in JSON. */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const submissionId = decodeURIComponent(id);
    const image = await readSubmissionImage(submissionId);
    if (!image) throw new AppError('Image not found', 404);

    if (image.redirectUrl) {
      return Response.redirect(image.redirectUrl, 302);
    }

    return new Response(new Uint8Array(image.buffer), {
      headers: {
        'Content-Type': image.contentType || 'image/png',
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
