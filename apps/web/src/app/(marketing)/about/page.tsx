import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, MISSION_POINTS } from '@/lib/site-content';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">About us</p>
      <h1 className="section-title mt-3">Who we are</h1>
      <p className="mt-6 text-lg leading-relaxed text-void/70">
        Big Mad Drip is more than a brand — it’s a movement built on hustle, discipline, and confidence.
        Rooted in competitive sports culture, we represent athletes who grind, lead, and show up with purpose.
      </p>
      <p className="mt-4 text-base text-void/65">{BRAND.blurb}</p>

      <h2 className="mt-14 font-display text-4xl font-extrabold uppercase">Our mission</h2>
      <p className="mt-4 text-void/70">
        Empower athletes and creators through bold, high-quality sports apparel that represents confidence,
        grit, and individuality.
      </p>
      <ul className="mt-6 space-y-3">
        {MISSION_POINTS.map((point) => (
          <li key={point} className="flex gap-3 border-l-4 border-volt pl-4 text-sm text-void/75">
            {point}
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/generate" className="btn-mockup">
          Generate Mockup
        </Link>
        <Link href="/contact" className="inline-flex items-center border border-void px-5 py-3 font-display text-lg font-bold uppercase tracking-[0.08em]">
          Contact
        </Link>
      </div>
    </div>
  );
}
