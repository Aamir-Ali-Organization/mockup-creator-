import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQS } from '@/lib/site-content';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[840px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Customer care</p>
      <h1 className="section-title mt-3">FAQ</h1>
      <div className="mt-10 space-y-4">
        {FAQS.map((item) => (
          <details key={item.q} className="border border-void/10 bg-white p-5 open:border-void open:shadow-[6px_6px_0_0_#05070c]">
            <summary className="cursor-pointer list-none font-display text-2xl font-bold uppercase tracking-[0.03em]">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-void/65">{item.a}</p>
          </details>
        ))}
      </div>
      <Link href="/generate" className="btn-mockup mt-10 inline-flex">
        Generate Mockup
      </Link>
    </div>
  );
}
