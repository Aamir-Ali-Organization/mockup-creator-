import type { Metadata } from 'next';
import Link from 'next/link';
import { PACKAGES } from '@/lib/site-content';

export const metadata: Metadata = { title: 'Packages' };

export default function PackagesPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Flag football</p>
      <h1 className="section-title mt-3">Uniform packages</h1>
      <p className="mt-4 max-w-2xl text-void/65">
        Pick a package, then generate a free mockup so your team can see the look before you order.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <article key={pkg.id} className="flex flex-col border-2 border-void bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-4xl font-extrabold uppercase">{pkg.name}</h2>
              <p className="font-display text-3xl font-bold text-ember">${pkg.price.toFixed(2)}</p>
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-void/70">
              {pkg.perks.map((perk) => (
                <li key={perk}>— {perk}</li>
              ))}
            </ul>
            <Link href="/generate" className="btn-mockup mt-8 w-full">
              Generate Mockup
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
