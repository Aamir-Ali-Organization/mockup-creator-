import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertKnowledgeAdmin } from '@/lib/knowledge-auth';
import { getSampleFilePath } from '@/lib/knowledge-store';
import { AppError, toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ sport: string; filename: string }> };

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function GET(request: Request, { params }: Params) {
  try {
    assertKnowledgeAdmin(request);
    const { sport, filename } = await params;
    const safeName = path.basename(decodeURIComponent(filename));
    const { writePath, publicPath } = getSampleFilePath(
      decodeURIComponent(sport),
      safeName,
    );

    let filePath = writePath;
    try {
      await access(writePath);
    } catch {
      try {
        await access(publicPath);
        filePath = publicPath;
      } catch {
        throw new AppError('Sample file not found', 404);
      }
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    return new Response(buffer, {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
