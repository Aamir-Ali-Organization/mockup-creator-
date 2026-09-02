import { createHash } from 'node:crypto';

/** Best-effort client IP behind Vercel / proxies. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const vercel = request.headers.get('x-vercel-forwarded-for')?.trim();
  if (vercel) {
    const first = vercel.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip.trim().toLowerCase()).digest('hex').slice(0, 32);
}
