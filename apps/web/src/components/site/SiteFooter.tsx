import Link from 'next/link';
import { BRAND, NAV, SPORTS } from '@/lib/site-content';

export function SiteFooter() {
  return (
    <footer className="border-t border-void/10 bg-void text-paper">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl tracking-[0.04em] text-volt">BIG MAD DRIP</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/65">
            {BRAND.tagline}. {BRAND.blurb}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/generate" className="btn-mockup">
              Generate Mockup
            </Link>
            <a href={BRAND.phoneHref} className="btn-ghost-light">
              Call {BRAND.phone}
            </a>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-volt">Explore</p>
          <ul className="mt-4 space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-paper/70 transition hover:text-volt">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/partners" className="text-sm text-paper/70 transition hover:text-volt">
                Partners
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-volt">Sports</p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {SPORTS.slice(0, 8).map((sport) => (
              <li key={sport}>
                <Link
                  href="/products"
                  className="text-sm text-paper/70 transition hover:text-volt"
                >
                  {sport}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs text-paper/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Big Mad Drip. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/faq" className="hover:text-paper">
              FAQ
            </Link>
            <a href={BRAND.phoneHref} className="hover:text-paper">
              {BRAND.phone}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
