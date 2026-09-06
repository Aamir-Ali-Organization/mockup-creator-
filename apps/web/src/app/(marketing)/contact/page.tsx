import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/site-content';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[840px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Talk to Matt</p>
      <h1 className="section-title mt-3">Contact</h1>
      <p className="mt-4 text-void/65">
        Ready to drip out the roster? Call for pricing, book a meeting energy, or generate a free mockup online.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href={BRAND.phoneHref}
          className="border-2 border-void bg-volt p-6 shadow-[8px_8px_0_0_#05070c] transition hover:-translate-y-1"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Phone</p>
          <p className="mt-3 font-display text-4xl font-extrabold uppercase">{BRAND.phone}</p>
        </a>
        <Link
          href="/generate"
          className="border-2 border-void bg-white p-6 shadow-[8px_8px_0_0_#05070c] transition hover:-translate-y-1"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Online</p>
          <p className="mt-3 font-display text-4xl font-extrabold uppercase">Generate Mockup</p>
        </Link>
      </div>
    </div>
  );
}
