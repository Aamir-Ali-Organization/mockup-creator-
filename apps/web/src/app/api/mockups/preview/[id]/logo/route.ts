import { getSubmission, readSubmissionLogo } from '@/lib/submission-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** Public logo preview for a submission (id is unguessable). */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const submissionId = decodeURIComponent(id);
    const submission = await getSubmission(submissionId).catch(() => null);
    if (!submission?.hasLogo) throw new AppError('Logo not found', 404);

    const logo = await readSubmissionLogo(submissionId);
    if (!logo) throw new AppError('Logo not found', 404);

    return new Response(new Uint8Array(logo.buffer), {
      headers: {
        'Content-Type': logo.mimeType || 'image/png',
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
