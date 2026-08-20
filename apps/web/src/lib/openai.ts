import { readFile } from 'node:fs/promises';
import OpenAI, { toFile } from 'openai';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export function canGenerateMockups() {
  return Boolean(env.OPENAI_API_KEY);
}

type SampleFile = {
  path?: string;
  buffer?: Buffer;
  filename: string;
  mimeType: string;
};

function extractImageDataUrl(image: {
  b64_json?: string;
  url?: string;
}): Promise<{ dataUrl: string; model: string }> {
  return (async () => {
    if (image.b64_json) {
      return {
        dataUrl: `data:image/png;base64,${image.b64_json}`,
        model: env.OPENAI_IMAGE_MODEL,
      };
    }

    if (image.url) {
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new AppError('Failed to download generated mockup image', 502);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
        model: env.OPENAI_IMAGE_MODEL,
      };
    }

    throw new AppError('OpenAI image response missing url and b64_json', 502);
  })();
}

export async function generateMockupImage(
  prompt: string,
  sampleFiles: SampleFile[] = [],
): Promise<{
  dataUrl: string;
  model: string;
  usedSamples: number;
}> {
  if (!env.OPENAI_API_KEY) {
    throw new AppError('OPENAI_API_KEY is not configured', 503);
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
    if (sampleFiles.length > 0) {
      const images = await Promise.all(
        sampleFiles.slice(0, 8).map(async (sample) => {
          const buffer =
            sample.buffer || (sample.path ? await readFile(sample.path) : null);
          if (!buffer) {
            throw new AppError(`Sample file missing: ${sample.filename}`, 500);
          }
          return toFile(buffer, sample.filename, { type: sample.mimeType });
        }),
      );

      const result = await openai.images.edit({
        model: env.OPENAI_IMAGE_MODEL,
        image: images,
        prompt,
        n: 1,
        size: env.OPENAI_IMAGE_SIZE as '1024x1024',
        input_fidelity: 'high',
      });

      const image = result.data?.[0];
      if (!image) {
        throw new AppError('OpenAI returned no image data', 502);
      }

      const parsed = await extractImageDataUrl(image);
      return { ...parsed, usedSamples: images.length };
    }

    const result = await openai.images.generate({
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: env.OPENAI_IMAGE_SIZE as '1024x1024',
    });

    const image = result.data?.[0];
    if (!image) {
      throw new AppError('OpenAI returned no image data', 502);
    }

    const parsed = await extractImageDataUrl(image);
    return { ...parsed, usedSamples: 0 };
  } catch (error) {
    if (error instanceof AppError) throw error;

    const apiError = error as {
      message?: unknown;
      status?: unknown;
      error?: { message?: unknown };
    };
    const detail =
      (typeof apiError.error?.message === 'string' && apiError.error.message) ||
      (typeof apiError.message === 'string' && apiError.message) ||
      'OpenAI image generation failed';
    const status = typeof apiError.status === 'number' ? apiError.status : 502;

    throw new AppError(
      detail === 'Unprocessable Entity'
        ? 'OpenAI could not process this mockup request. Try again or simplify team details.'
        : detail,
      status >= 400 && status < 600 ? status : 502,
    );
  }
}
