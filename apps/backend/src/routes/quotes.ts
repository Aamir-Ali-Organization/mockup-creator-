import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../lib/errors.js';
import { createQuoteFromMultipart, getQuoteById, listQuotes } from '../services/quote.service.js';
import { saveUpload } from '../services/upload.service.js';

async function parseQuoteMultipart(request: {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<
    | {
        type: 'file';
        fieldname: string;
        filename: string;
        mimetype: string;
        file: NodeJS.ReadableStream & { truncated?: boolean; on: Function };
      }
    | { type: 'field'; fieldname: string; value: unknown }
  >;
}) {
  if (!request.isMultipart()) {
    throw new AppError('Content-Type must be multipart/form-data', 415);
  }

  const fields: Record<string, unknown> = {};

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (!part.filename) {
        continue;
      }
      const saved = await saveUpload(part as Parameters<typeof saveUpload>[0]);
      if (part.fieldname === 'rosterFile') {
        fields.rosterFile = saved.filename;
      } else if (part.fieldname === 'logoFile') {
        fields.logoFile = saved.filename;
      }
    } else {
      const value = part.value;
      if (part.fieldname === 'accessories') {
        const current = fields.accessories;
        if (Array.isArray(current)) {
          current.push(String(value));
        } else if (typeof current === 'string') {
          fields.accessories = [current, String(value)];
        } else {
          fields.accessories = String(value);
        }
      } else {
        fields[part.fieldname] = value;
      }
    }
  }

  return fields;
}

export const quoteRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/quotes', async (request, reply) => {
    const fields = await parseQuoteMultipart(request as never);
    const quote = await createQuoteFromMultipart(fields);
    return reply.code(201).send({ success: true, quote });
  });

  app.get('/api/quotes', async () => {
    const quotes = await listQuotes();
    return { success: true, quotes };
  });

  app.get<{ Params: { id: string } }>('/api/quotes/:id', async (request) => {
    const quote = await getQuoteById(request.params.id);
    return { success: true, quote };
  });
};
