'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BRAND, NAV } from '@/lib/site-content';

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={160}
            height={100}
            className="h-10 w-auto sm:h-12"
            priority
          />
          <span className="font-display text-2xl tracking-[0.04em] text-void sm:text-3xl">
            BIG MAD DRIP
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/generate" className="btn-mockup hidden sm:inline-flex">
            Generate Mockup
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-void/15 bg-white lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-5 bg-void transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`h-0.5 w-5 bg-void transition ${open ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-5 bg-void transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-void/10 bg-paper px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-void/80"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/generate"
              className="btn-mockup mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              Generate Mockup
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
