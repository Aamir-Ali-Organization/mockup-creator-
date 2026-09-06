import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Partners' };

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-[840px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="section-kicker">Organization</p>
      <h1 className="section-title mt-3">Partners</h1>
      <p className="mt-4 text-void/65">
        We work with teams, leagues, and organizations that want custom identity on the field. Reach out to
        build a partner kit or co-branded drop.
      </p>
      <Link href="/contact" className="btn-mockup mt-10 inline-flex">
        Become a partner
      </Link>
    </div>
  );
}
