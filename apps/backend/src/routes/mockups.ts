import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import {
  canGenerateMockups,
  generateMockupForQuote,
} from '../services/openai-mockup.service.js';

const generateBodySchema = z.object({
  quoteId: z.string().min(1),
});

export const mockupRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/mockups/generate', async (request) => {
    const parsed = generateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError('quoteId is required', 400, parsed.error.flatten());
    }

    if (!canGenerateMockups()) {
      throw new AppError('OPENAI_API_KEY is not configured', 503);
    }

    const quote = await prisma.quote.findUnique({
      where: { id: parsed.data.quoteId },
    });

    if (!quote) {
      throw new AppError('Quote not found', 404);
    }

    try {
      const result = await generateMockupForQuote(quote.id);

      return {
        success: true,
        message: 'Mockup generated successfully',
        quoteId: result.quote.id,
        status: result.quote.status,
        promptPayload: result.payload,
        aiPrompt: result.prompt,
        mockupImages: result.quote.mockupImages.map((file: string) => `/uploads/${file}`),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : 'Mockup generation failed';
      app.log.error(error);
      throw new AppError(message, 502);
    }
  });
};
