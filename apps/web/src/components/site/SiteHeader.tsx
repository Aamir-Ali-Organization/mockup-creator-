'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BRAND, NAV } from '@/lib/site-content';

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={140}
            height={90}
            className="h-9 w-auto sm:h-10"
            priority
          />
          <span className="truncate font-display text-[1.65rem] font-black uppercase leading-none tracking-[0.04em] text-void sm:text-[1.85rem]">
            Big Mad Drip
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/generate" className="btn-mockup hidden !py-2.5 !text-base sm:inline-flex">
            Generate Mockup
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center border border-void/10 bg-white xl:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="relative flex h-3.5 w-5 flex-col justify-between">
              <span className={`h-px w-full bg-void transition ${open ? 'translate-y-[6.5px] rotate-45' : ''}`} />
              <span className={`h-px w-full bg-void transition ${open ? 'opacity-0' : ''}`} />
              <span className={`h-px w-full bg-void transition ${open ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-void/5 bg-paper px-4 py-5 xl:hidden">
          <div className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-void/5 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-void/75"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/generate" className="btn-mockup mt-5 w-full" onClick={() => setOpen(false)}>
              Generate Mockup
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
