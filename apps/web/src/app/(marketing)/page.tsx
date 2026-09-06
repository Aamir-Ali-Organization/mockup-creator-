import Image from 'next/image';
import Link from 'next/link';
import { BRAND, FAQS, PACKAGES, PILLARS, SPORTS } from '@/lib/site-content';

function HeroArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(225,6,0,0.28),transparent_55%),linear-gradient(115deg,#0a0a0a_0%,#151515_48%,#0a0a0a_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at 70% 45%, black 10%, transparent 70%)',
        }}
      />
      <div className="absolute -right-[8%] top-[8%] hidden h-[84%] w-[58%] lg:block">
        <div className="absolute inset-0 bg-[conic-gradient(from_210deg_at_50%_50%,transparent_0deg,#e10600_48deg,transparent_95deg)] opacity-40 blur-3xl" />
        <Image
          src="/logo.png"
          alt=""
          fill
          priority
          className="object-contain object-center opacity-90 drop-shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent" />
    </div>
  );
}

export default function HomePage() {
  const marquee = [...SPORTS, ...SPORTS];

  return (
    <>
      {/* Hero: brand + one line + CTAs + dominant visual */}
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-void text-white">
        <HeroArt />
        <div className="relative mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="max-w-3xl">
            <div className="animate-line mb-7 h-px w-24 bg-signal" />
            <p className="animate-fade-up font-display text-[clamp(4.5rem,14vw,9rem)] font-black uppercase leading-[0.78] tracking-[-0.03em]">
              Big Mad
              <span className="mt-1 block text-signal">Drip</span>
            </p>
            <p
              className="animate-fade-up mt-6 max-w-md text-base leading-relaxed text-white/65 sm:text-lg"
              style={{ animationDelay: '120ms' }}
            >
              Custom team apparel with attitude. Preview your kit free — then lock the order with Matt.
            </p>
            <div
              className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '220ms' }}
            >
              <Link href="/generate" className="btn-mockup w-full sm:w-auto">
                Generate Mockup
              </Link>
              <a href={BRAND.phoneHref} className="btn-ghost-light w-full sm:w-auto">
                Call {BRAND.phone}
              </a>
            </div>
          </div>

          <div className="mt-14 block lg:hidden">
            <div className="relative mx-auto aspect-[5/4] w-full max-w-md">
              <Image src="/logo.png" alt="" fill priority className="object-contain opacity-95" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust / process — one job */}
      <section className="border-b border-void/10 bg-paper">
        <div className="mx-auto grid max-w-[1280px] divide-y divide-void/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { step: '01', title: 'Design the look', body: 'Colors, logo, and fit in a fast guided form.' },
            { step: '02', title: 'See the mockup', body: 'Free AI preview so the team can approve the drip.' },
            { step: '03', title: 'Order with Matt', body: 'Pricing, packages, and production locked in.' },
          ].map((item) => (
            <div key={item.step} className="px-4 py-10 sm:px-8 lg:px-10">
              <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-signal">{item.step}</p>
              <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-[-0.02em]">{item.title}</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-void/60">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6 lg:px-8">
        <p className="section-kicker">The standard</p>
        <h2 className="section-title mt-4 max-w-[12ch]">Built to compete. Made to stand out.</h2>
        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {PILLARS.map((item, index) => (
            <div key={item.title} className="animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
              <div className="mb-5 h-px w-10 bg-signal" />
              <h3 className="font-display text-[2rem] font-black uppercase leading-none tracking-[-0.02em]">
                {item.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-void/60">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sports marquee */}
      <section className="overflow-hidden border-y border-void bg-void py-8 text-white">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap pr-10">
          {marquee.map((sport, i) => (
            <span key={`${sport}-${i}`} className="flex items-center gap-10">
              <span className="font-display text-4xl font-black uppercase tracking-[-0.02em] sm:text-5xl">
                {sport}
              </span>
              <span className="h-1.5 w-1.5 bg-signal" />
            </span>
          ))}
        </div>
      </section>

      {/* Packages — cleaner commercial grid */}
      <section className="bg-mist/50 py-24">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Flag football packages</p>
              <h2 className="section-title mt-4">Pick a level. Preview it free.</h2>
            </div>
            <Link href="/generate" className="btn-mockup w-fit shrink-0">
              Generate Mockup
            </Link>
          </div>

          <div className="mt-14 grid gap-px bg-void/10 sm:grid-cols-2 xl:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <article key={pkg.id} className="flex flex-col bg-paper p-7 transition hover:bg-white">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-3xl font-black uppercase tracking-[-0.02em]">{pkg.name}</h3>
                  <p className="font-display text-2xl font-bold text-signal">${pkg.price.toFixed(0)}</p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-void/60">
                  {pkg.perks.map((perk) => (
                    <li key={perk} className="border-l-2 border-void/10 pl-3">
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/generate"
                  className="mt-8 inline-flex text-[12px] font-bold uppercase tracking-[0.2em] text-void underline decoration-signal decoration-2 underline-offset-[6px]"
                >
                  Preview this package
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Conversion band */}
      <section className="relative overflow-hidden bg-signal py-20 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.25) 41%, transparent 41%)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative mx-auto flex max-w-[1280px] flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="font-display text-[clamp(3rem,8vw,5.5rem)] font-black uppercase leading-[0.88] tracking-[-0.03em]">
              See the drip before you pay.
            </p>
            <p className="mt-4 max-w-lg text-base text-white/85">
              First AI mockup is free. Approve the look with your team, then call Matt to finalize production.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/generate" className="btn-mockup-invert">
              Generate Mockup
            </Link>
            <a href={BRAND.phoneHref} className="btn-ghost-light border-white/40">
              Call Matt
            </a>
          </div>
        </div>
      </section>

      {/* About snippet */}
      <section className="mx-auto max-w-[1280px] px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="section-kicker">Who we are</p>
            <h2 className="section-title mt-4">Florida-rooted. Competition-obsessed.</h2>
            <p className="mt-6 text-[15px] leading-relaxed text-void/60">
              Big Mad Drip is a movement built on hustle, discipline, and confidence. We outfit athletes who
              grind, lead, and show up with purpose — on and off the field.
            </p>
            <Link href="/about" className="btn-line mt-8 inline-flex">
              Our story
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden bg-void">
            <Image src="/logo.png" alt="Big Mad Drip" fill className="object-contain p-12" />
            <div className="absolute inset-x-0 bottom-0 bg-white px-6 py-4">
              <p className="font-display text-2xl font-black uppercase tracking-[-0.02em] text-void">
                Made with attitude
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-void/10 bg-paper py-24">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6">
          <p className="section-kicker">FAQ</p>
          <h2 className="section-title mt-4">Straight answers</h2>
          <div className="mt-12 divide-y divide-void/10 border-y border-void/10">
            {FAQS.slice(0, 4).map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none font-display text-2xl font-bold uppercase tracking-[-0.02em] text-void marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-signal transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-void/60">{item.a}</p>
              </details>
            ))}
          </div>
          <Link
            href="/faq"
            className="mt-8 inline-block text-[12px] font-bold uppercase tracking-[0.2em] text-void underline decoration-signal decoration-2 underline-offset-[6px]"
          >
            View all FAQs
          </Link>
        </div>
      </section>
    </>
  );
}
