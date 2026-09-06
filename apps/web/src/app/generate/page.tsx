import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { QuoteForm } from '@/components/QuoteForm';
import { BRAND } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Generate Mockup',
  description: 'Request a custom Big Mad Drip uniform quote and free AI mockup preview.',
};

export default function GeneratePage() {
  return (
    <div className="tool-shell min-h-screen">
      <div className="border-b border-white/10 bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-2xl font-extrabold uppercase tracking-[0.06em] text-volt">
            Big Mad Drip
          </Link>
          <div className="flex items-center gap-3">
            <a href={BRAND.phoneHref} className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-white/55 sm:inline">
              {BRAND.phone}
            </a>
            <Link href="/" className="btn-ghost !px-4 !py-2 text-xs">
              Back to site
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px] px-3 py-8 sm:px-4 sm:py-12">
        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-volt">Free AI mockup</p>
          <h1 className="mt-2 font-display text-[clamp(2.8rem,10vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-[0.02em] text-white">
            Generate your team mockup
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60">
            Tell us the team details. First mockup is free — then lock pricing with Matt.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50">
              Loading form…
            </div>
          }
        >
          <QuoteForm />
        </Suspense>
      </div>
    </div>
  );
}
