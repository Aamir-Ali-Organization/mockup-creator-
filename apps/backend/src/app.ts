import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { env } from './config/env.js';
import { AppError } from './lib/errors.js';
import { ensureUploadDir } from './services/upload.service.js';
import { healthRoutes } from './routes/health.js';
import { quoteRoutes } from './routes/quotes.js';
import { uploadRoutes } from './routes/uploads.js';
import { mockupRoutes } from './routes/mockups.js';
import { leadRoutes } from './routes/leads.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 12 * 1024 * 1024,
  });

  await ensureUploadDir();

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5,
      fields: 40,
    },
  });

  await app.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(healthRoutes);
  await app.register(leadRoutes);
  await app.register(quoteRoutes);
  await app.register(uploadRoutes);
  await app.register(mockupRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        details: error.details,
      });
    }

    const err = error as Error & { statusCode?: number };
    const statusCode = err.statusCode ?? 500;
    app.log.error(error);
    return reply.status(statusCode).send({
      success: false,
      message: statusCode >= 500 ? 'Internal server error' : err.message,
    });
  });

  return app;
}
