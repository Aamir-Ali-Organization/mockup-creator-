import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Accessories' };

const ITEMS = [
  'Custom gloves',
  'Flags',
  'Backpacks',
  'Helmets',
  'Compression layers',
  'Team lifestyle pieces',
];

export default function AccessoriesPage() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Accessories</p>
      <h1 className="section-title mt-3">The extras that finish the kit</h1>
      <p className="mt-4 text-void/65">
        Bundle accessories into packages or call Matt to build a custom add-on list for your roster.
      </p>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item} className="border border-void/10 bg-white px-5 py-4 font-display text-2xl font-bold uppercase tracking-[0.04em]">
            {item}
          </li>
        ))}
      </ul>
      <Link href="/generate" className="btn-mockup mt-10 inline-flex">
        Generate Mockup
      </Link>
    </div>
  );
}
