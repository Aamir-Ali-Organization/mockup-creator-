import Image from 'next/image';

export function Hero() {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 px-4 py-6 sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-heat/25 blur-3xl" />

      <div className="relative z-[1] flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
        <Image
          src="/logo.png"
          alt="Big Mad Drip"
          width={900}
          height={600}
          className="h-auto w-[180px] shrink-0 drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] sm:w-[210px]"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-accent">
            Free quote · AI mockup preview
          </p>
          <h1 className="mt-1 font-display text-[clamp(2rem,7vw,3.4rem)] leading-[0.95] tracking-wide text-white">
            Custom team uniforms in minutes
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/65 sm:mx-0 sm:text-[0.95rem]">
            Tell us your team. We’ll price it and generate a free AI mockup so you can see the drip
            before you buy.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
              10-piece minimum
            </span>
            <a
              href="tel:2398391588"
              className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
            >
              Call Matt · 239-839-1588
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
