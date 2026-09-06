import type { Metadata } from 'next';
import Link from 'next/link';
import { SPORTS } from '@/lib/site-content';

export const metadata: Metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Products</p>
      <h1 className="section-title mt-3 max-w-[14ch]">Gear for every sport</h1>
      <p className="mt-4 max-w-2xl text-void/65">
        Custom uniforms and apparel across flag, tackle, court, diamond, and more — designed to compete and drip.
      </p>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPORTS.map((sport) => (
          <div key={sport} className="group border border-void/10 bg-white p-6 transition hover:-translate-y-1 hover:border-void hover:shadow-[8px_8px_0_0_#05070c]">
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.04em]">{sport}</h2>
            <p className="mt-2 text-sm text-void/60">Custom kits, logos, and performance fits.</p>
            <Link
              href="/generate"
              className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.14em] text-ember underline decoration-ember decoration-2 underline-offset-4"
            >
              Generate mockup
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
