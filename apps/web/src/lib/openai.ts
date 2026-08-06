import OpenAI from 'openai';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export function canGenerateMockups() {
  return Boolean(env.OPENAI_API_KEY);
}

export async function generateMockupImage(prompt: string): Promise<{
  dataUrl: string;
  model: string;
}> {
  if (!env.OPENAI_API_KEY) {
    throw new AppError('OPENAI_API_KEY is not configured', 503);
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'OpenAI image generation failed';
    throw new AppError(message, 502);
  }
}
