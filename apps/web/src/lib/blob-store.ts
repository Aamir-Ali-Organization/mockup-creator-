import { get, list, put, del, type PutBlobResult } from '@vercel/blob';
import { env } from '@/lib/env';

let blobAccess: 'private' | 'public' | null = null;
let lastBlobError: string | null = null;

export function blobToken() {
  return (env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '').trim();
}

export function hasBlobStorage() {
  return Boolean(blobToken());
}

export function getBlobAccess() {
  return blobAccess;
}

export function getLastBlobError() {
  return lastBlobError;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function putBlob(
  pathname: string,
  body: string | Buffer | Uint8Array,
  contentType: string,
): Promise<PutBlobResult> {
  const token = blobToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');

  const payload = typeof body === 'string' ? body : Buffer.from(body);
  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  let lastError: unknown;
  for (const access of order) {
    try {
      const result = await put(pathname, payload, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        token,
      });
      blobAccess = access;
      lastBlobError = null;
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  lastBlobError = errorMessage(lastError);
  throw lastError instanceof Error ? lastError : new Error(lastBlobError);
}

export async function getBlobText(pathname: string): Promise<string | null> {
  const token = blobToken();
  if (!token) return null;

  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result?.stream) continue;
      blobAccess = access;
      lastBlobError = null;
      return await new Response(result.stream).text();
    } catch {
      // try next
    }
  }
  return null;
}

export async function getBlobBytes(
  pathname: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const token = blobToken();
  if (!token) return null;

  const order: Array<'private' | 'public'> = blobAccess
    ? [blobAccess]
    : ['private', 'public'];

  for (const access of order) {
    try {
      const result = await get(pathname, { access, token, useCache: false });
      if (!result?.stream) continue;
      blobAccess = access;
      lastBlobError = null;
      return {
        buffer: Buffer.from(await new Response(result.stream).arrayBuffer()),
        contentType: result.blob.contentType || 'application/octet-stream',
      };
    } catch {
      // try next
    }
  }
  return null;
}

export async function listBlobPathnames(prefix: string): Promise<string[]> {
  const token = blobToken();
  if (!token) return [];

  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, token, cursor, limit: 1000 });
    for (const blob of page.blobs) pathnames.push(blob.pathname);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return pathnames;
}

export async function deleteBlob(pathnameOrUrl: string) {
  const token = blobToken();
  if (!token) return;
  try {
    await del(pathnameOrUrl, { token });
  } catch (error) {
    console.warn('[blob] delete failed:', pathnameOrUrl, error);
  }
}
