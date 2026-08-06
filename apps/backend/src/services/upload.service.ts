import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES } from '@mockup/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isAllowedFile(filename: string, mimetype: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const mimeOk = (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mimetype);
  const extOk = (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext);
  return mimeOk || extOk;
}

export async function ensureUploadDir(): Promise<string> {
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  return env.UPLOAD_DIR;
}

export async function saveUpload(file: MultipartFile): Promise<{
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}> {
  if (!file.filename) {
    throw new AppError('Missing filename', 400);
  }

  if (!isAllowedFile(file.filename, file.mimetype)) {
    throw new AppError(
      `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
      400,
    );
  }

  await ensureUploadDir();

  const ext = path.extname(file.filename).toLowerCase() || '.bin';
  const storedName = `${Date.now()}-${randomUUID()}${ext}`;
  const destination = path.join(env.UPLOAD_DIR, storedName);

  let size = 0;
  file.file.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_FILE_SIZE) {
      file.file.destroy();
    }
  });

  try {
    await pipeline(file.file, createWriteStream(destination));
  } catch {
    throw new AppError('File upload failed or exceeded 10MB limit', 400);
  }

  if (file.file.truncated) {
    throw new AppError('File upload was truncated. Max size is 10MB.', 400);
  }

  return {
    filename: storedName,
    originalName: file.filename,
    mimetype: file.mimetype,
    size,
  };
}
