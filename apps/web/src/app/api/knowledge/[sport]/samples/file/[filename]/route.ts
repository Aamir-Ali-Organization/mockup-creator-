import path from 'node:path';
import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { readSampleBytes } from '@/lib/knowledge-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ sport: string; filename: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport, filename } = await params;
    const safeName = path.basename(decodeURIComponent(filename));
    const image = await readSampleBytes(decodeURIComponent(sport), safeName);
    if (!image) throw new AppError('Sample file not found', 404);

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
