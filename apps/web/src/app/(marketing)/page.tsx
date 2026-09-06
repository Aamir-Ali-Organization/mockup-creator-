import Image from 'next/image';
import Link from 'next/link';
import { BRAND, FAQS, MISSION_POINTS, PACKAGES, PILLARS, SPORTS } from '@/lib/site-content';

export default function HomePage() {
  return (
    <>
      {/* Hero — one composition, brand first, full-bleed */}
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-void text-paper">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(214,255,60,0.18),transparent_45%),radial-gradient(ellipse_at_80%_10%,rgba(255,59,31,0.22),transparent_40%),linear-gradient(120deg,#05070c_0%,#0d1420_55%,#05070c_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />
        <div
          aria-hidden
          className="absolute -right-[20%] top-[-10%] h-[70%] w-[70%] rotate-12 bg-[linear-gradient(135deg,transparent_40%,rgba(214,255,60,0.08)_40%,rgba(214,255,60,0.08)_42%,transparent_42%)]"
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-[1240px] flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <p className="animate-fade-up section-kicker !text-volt">Florida · Continental U.S. shipping</p>
          <h1 className="animate-slash-in mt-4 max-w-[18ch] font-display text-[clamp(4.2rem,16vw,9.5rem)] font-extrabold uppercase leading-[0.82] tracking-[0.01em] text-paper">
            Big Mad
            <span className="block text-volt">Drip</span>
          </h1>
          <p className="animate-fade-up mt-5 max-w-xl text-base text-paper/70 sm:text-lg" style={{ animationDelay: '120ms' }}>
            Sports apparel made with attitude. See your team’s kit before you buy — free AI mockup in minutes.
          </p>
          <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '200ms' }}>
            <Link href="/generate" className="btn-mockup animate-pulse-volt w-full sm:w-auto">
              Generate Mockup
            </Link>
            <a href={BRAND.phoneHref} className="btn-ghost-light w-full sm:w-auto">
              Call Matt · {BRAND.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <p className="section-kicker">Change the game</p>
        <h2 className="section-title mt-3 max-w-[16ch]">Made to stand out. Built to compete.</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {PILLARS.map((item, i) => (
            <div
              key={item.title}
              className="border-t-4 border-void pt-5"
              style={{ borderColor: i === 1 ? 'var(--volt)' : i === 2 ? 'var(--ember)' : 'var(--void)' }}
            >
              <h3 className="font-display text-3xl font-extrabold uppercase tracking-[0.04em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-void/65">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-void py-20 text-paper">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-volt">Sports</p>
              <h2 className="mt-3 font-display text-[clamp(2.6rem,8vw,5rem)] font-extrabold uppercase leading-[0.9]">
                Built for every field
              </h2>
            </div>
            <Link href="/products" className="btn-mockup w-fit">
              View products
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <Link
                key={sport}
                href="/products"
                className="border border-paper/15 px-4 py-2 font-display text-lg uppercase tracking-[0.08em] text-paper/80 transition hover:border-volt hover:bg-volt hover:text-void"
              >
                {sport}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <p className="section-kicker">Flag football</p>
        <h2 className="section-title mt-3">Uniform packages</h2>
        <p className="mt-4 max-w-2xl text-void/65">
          From essentials to ultimate — custom design, custom logo, and express options when you need speed.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className="border border-void/10 bg-white p-5 shadow-[8px_8px_0_0_rgba(5,7,12,0.08)]">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-3xl font-extrabold uppercase">{pkg.name}</h3>
                <p className="font-display text-2xl font-bold text-ember">${pkg.price.toFixed(2)}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-void/70">
                {pkg.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-volt" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link href="/generate" className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.14em] text-void underline decoration-volt decoration-4 underline-offset-4">
                Mock it up
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-ember py-16 text-void">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <p className="font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">
              Free AI mockup
            </p>
            <p className="mt-3 text-base text-void/80">
              Lock your colors, logo, and look — then see the drip before you commit.
            </p>
          </div>
          <Link href="/generate" className="btn-mockup shrink-0 bg-void text-volt shadow-[6px_6px_0_0_#d6ff3c] hover:shadow-[8px_8px_0_0_#d6ff3c]">
            Generate Mockup
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="section-kicker">Who we are</p>
            <h2 className="section-title mt-3">More than a brand — a movement</h2>
            <p className="mt-5 text-base leading-relaxed text-void/70">
              Big Mad Drip is built on hustle, discipline, and confidence. Rooted in competitive sports culture,
              we represent athletes who grind, lead, and show up with purpose.
            </p>
            <ul className="mt-6 space-y-3">
              {MISSION_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-void/75">
                  <span className="mt-1 h-2 w-2 shrink-0 bg-ember" />
                  {point}
                </li>
              ))}
            </ul>
            <Link href="/about" className="btn-mockup mt-8 inline-flex">
              About us
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden bg-void">
            <Image
              src="/logo.png"
              alt="Big Mad Drip logo"
              fill
              className="object-contain p-10 opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-volt px-5 py-4 font-display text-2xl font-extrabold uppercase tracking-[0.06em] text-void">
              Made with attitude
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-void/10 bg-mist/40 py-20">
        <div className="mx-auto max-w-[840px] px-4 sm:px-6">
          <p className="section-kicker">FAQ</p>
          <h2 className="section-title mt-3">Straight answers</h2>
          <div className="mt-10 space-y-4">
            {FAQS.slice(0, 4).map((item) => (
              <details key={item.q} className="group border border-void/10 bg-white p-5 open:shadow-[6px_6px_0_0_rgba(5,7,12,0.08)]">
                <summary className="cursor-pointer list-none font-display text-2xl font-bold uppercase tracking-[0.03em]">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-void/65">{item.a}</p>
              </details>
            ))}
          </div>
          <Link href="/faq" className="mt-8 inline-block text-sm font-bold uppercase tracking-[0.16em] underline decoration-ember decoration-4 underline-offset-4">
            All FAQs
          </Link>
        </div>
      </section>
    </>
  );
}
