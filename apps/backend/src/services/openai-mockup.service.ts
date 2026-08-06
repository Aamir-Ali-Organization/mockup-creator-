import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { buildPromptFromQuote } from './ai-prompt-builder.js';

function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(
      'OPENAI_API_KEY is not configured. Add it to your environment to generate mockups.',
      503,
    );
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

async function persistImageFromUrl(imageUrl: string): Promise<string> {
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  const filename = `mockup-${Date.now()}-${randomUUID()}.png`;
  const destination = path.join(env.UPLOAD_DIR, filename);

  const response = await fetch(imageUrl);
  if (!response.ok || !response.body) {
    throw new AppError('Failed to download generated mockup image', 502);
  }

  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(destination));
  return filename;
}

async function persistImageFromBase64(base64: string): Promise<string> {
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  const filename = `mockup-${Date.now()}-${randomUUID()}.png`;
  const destination = path.join(env.UPLOAD_DIR, filename);
  const buffer = Buffer.from(base64, 'base64');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(destination, buffer);
  return filename;
}

export async function generateImageWithOpenAI(prompt: string): Promise<string> {
  const openai = getOpenAIClient();

  try {
    // Keep params minimal — newer Images API models reject response_format/quality.
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
      return persistImageFromBase64(image.b64_json);
    }

    if (image.url) {
      return persistImageFromUrl(image.url);
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

/**
 * Generates a mockup for a quote, updates DB status/images.
 * Safe to call in the background after quote creation.
 */
export async function generateMockupForQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) {
    throw new AppError('Quote not found', 404);
  }

  const { payload, prompt } = buildPromptFromQuote(quote);

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      aiPrompt: prompt,
      status: 'PROCESSING',
    },
  });

  try {
    const filename = await generateImageWithOpenAI(prompt);

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        mockupImages: [filename],
        status: 'MOCKUP_READY',
      },
    });

    return {
      quote: updated,
      payload,
      prompt,
    };
  } catch (error) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'PENDING' },
    });
    throw error;
  }
}

export function canGenerateMockups(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}
