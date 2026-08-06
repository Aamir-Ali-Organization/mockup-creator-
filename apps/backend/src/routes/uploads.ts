import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../lib/errors.js';
import { saveUpload } from '../services/upload.service.js';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/uploads', async (request) => {
    const file = await request.file();
    if (!file) {
      throw new AppError('No file uploaded. Use multipart field "file".', 400);
    }

    const saved = await saveUpload(file);

    return {
      success: true,
      file: saved,
    };
  });
};
