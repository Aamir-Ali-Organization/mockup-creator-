import Link from 'next/link';
import { BRAND, NAV, SPORTS } from '@/lib/site-content';

export function SiteFooter() {
  return (
    <footer className="bg-void text-white">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-display text-5xl font-black uppercase tracking-[-0.02em]">Big Mad Drip</p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
            {BRAND.tagline}. Custom kits with a free AI mockup — so teams buy with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/generate" className="btn-mockup">
              Generate Mockup
            </Link>
            <a href={BRAND.phoneHref} className="btn-ghost-light">
              {BRAND.phone}
            </a>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">Explore</p>
          <ul className="mt-5 space-y-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-white/65 transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/partners" className="text-sm text-white/65 transition hover:text-white">
                Partners
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">Sports</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            {SPORTS.slice(0, 8).map((sport) => (
              <li key={sport}>
                <Link href="/products" className="text-sm text-white/65 transition hover:text-white">
                  {sport}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Big Mad Drip. All rights reserved.</p>
          <a href={BRAND.phoneHref} className="hover:text-white">
            Call Matt · {BRAND.phone}
          </a>
        </div>
      </div>
    </footer>
  );
}
