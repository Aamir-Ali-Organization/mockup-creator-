import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

export const KNOWLEDGE_SESSION_COOKIE = 'bmd_kb_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sessionSecret() {
  return [
    env.KNOWLEDGE_ADMIN_USER,
    env.KNOWLEDGE_ADMIN_PASSWORD,
    env.KNOWLEDGE_ADMIN_SECRET || 'bmd-knowledge-session',
  ].join('|');
}

export function validateKnowledgeCredentials(user: string, password: string) {
  return (
    safeEqual(user.trim(), env.KNOWLEDGE_ADMIN_USER) &&
    safeEqual(password, env.KNOWLEDGE_ADMIN_PASSWORD)
  );
}

export function createKnowledgeSessionToken(user: string) {
  const payload = Buffer.from(
    JSON.stringify({
      u: user,
      exp: Date.now() + SESSION_TTL_MS,
    }),
  ).toString('base64url');
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyKnowledgeSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (!safeEqual(sig, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string;
      exp?: number;
    };
    if (!data.u || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (!safeEqual(data.u, env.KNOWLEDGE_ADMIN_USER)) return null;
    return data.u;
  } catch {
    return null;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        if (idx === -1) return [part, ''];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      }),
  );
}

export function getKnowledgeSessionUser(request: Request): string | null {
  const cookies = parseCookies(request.headers.get('cookie'));
  return verifyKnowledgeSessionToken(cookies[KNOWLEDGE_SESSION_COOKIE]);
}

/** Protect knowledge admin APIs (login required). */
export function assertKnowledgeAdmin(request: Request) {
  if (getKnowledgeSessionUser(request)) return;

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      const user = idx === -1 ? decoded : decoded.slice(0, idx);
      const password = idx === -1 ? '' : decoded.slice(idx + 1);
      if (validateKnowledgeCredentials(user, password)) return;
    } catch {
      // fall through
    }
  }

  if (header?.startsWith('Bearer ') && env.KNOWLEDGE_ADMIN_SECRET) {
    const token = header.slice(7).trim();
    if (safeEqual(token, env.KNOWLEDGE_ADMIN_SECRET)) return;
  }

  const alt = request.headers.get('x-knowledge-admin-secret');
  if (alt && env.KNOWLEDGE_ADMIN_SECRET && safeEqual(alt, env.KNOWLEDGE_ADMIN_SECRET)) {
    return;
  }

  throw new AppError('Unauthorized — sign in to manage knowledge', 401);
}

export function knowledgeSessionCookie(token: string, request?: Request) {
  const secure = shouldUseSecureCookie(request) ? '; Secure' : '';
  return `${KNOWLEDGE_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearKnowledgeSessionCookie(request?: Request) {
  const secure = shouldUseSecureCookie(request) ? '; Secure' : '';
  return `${KNOWLEDGE_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Secure cookies only work on HTTPS — Coolify sslip.io HTTP would drop them. */
function shouldUseSecureCookie(request?: Request) {
  if (request) {
    const proto =
      request.headers.get('x-forwarded-proto') ||
      request.headers.get('x-forwarded-protocol') ||
      '';
    if (proto.split(',')[0]?.trim().toLowerCase() === 'https') return true;
    if (proto.split(',')[0]?.trim().toLowerCase() === 'http') return false;
    try {
      if (new URL(request.url).protocol === 'https:') return true;
    } catch {
      // fall through
    }
  }
  return process.env.NODE_ENV === 'production' && process.env.FORCE_INSECURE_COOKIES !== 'true';
}
