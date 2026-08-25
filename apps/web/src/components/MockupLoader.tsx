'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Reading your logo brief…',
  'Designing your free team logo…',
  'Locking in your team colors…',
  'Building the uniform mockup…',
  'Placing the logo on the jersey…',
  'Adding that Big Mad Drip finish…',
  'Almost there — polishing the look…',
] as const;

type MockupLoaderProps = {
  teamName?: string;
  sport?: string;
  done?: boolean;
};

export function MockupLoader({ teamName, sport, done = false }: MockupLoaderProps) {
  const [progress, setProgress] = useState(4);
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (done) {
      setProgress(100);
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setElapsed(seconds);

      // Ease toward ~92% over ~55s so a 30–60s wait feels alive, then hold.
      setProgress((current) => {
        if (current >= 92) return current;
        const target = Math.min(92, 8 + seconds * 1.55 + Math.sin(seconds / 2.2) * 2);
        return Math.max(current, Math.round(target));
      });
    }, 400);

    return () => window.clearInterval(tick);
  }, [done]);

  useEffect(() => {
    if (done) return;
    const rotate = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % MESSAGES.length);
    }, 3200);
    return () => window.clearInterval(rotate);
  }, [done]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-black/40 p-5 sm:p-7">
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 animate-pulseRing rounded-full bg-heat/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 animate-pulseRing rounded-full bg-accent/20 blur-2xl [animation-delay:0.6s]" />

      <div className="relative z-[1] flex flex-col items-center text-center">
        <div className="relative mb-5 grid place-items-center">
          <div className="absolute h-28 w-28 animate-spinSlow rounded-full border border-dashed border-accent/35" />
          <div className="absolute h-20 w-20 animate-pulseRing rounded-full border border-heat/40" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-black/50 shadow-[0_0_40px_rgba(255,212,0,0.18)]">
            <JerseyIcon />
            <span className="absolute -bottom-1 left-1/2 h-2.5 w-1.5 -translate-x-1/2 animate-drip rounded-full bg-accent" />
            <span className="absolute -bottom-1 left-[42%] h-2 w-1 animate-drip rounded-full bg-heat [animation-delay:0.35s]" />
            <span className="absolute -bottom-1 left-[58%] h-2 w-1 animate-drip rounded-full bg-accent [animation-delay:0.7s]" />
          </div>
        </div>

        <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-accent">
          Cooking your mockup
        </p>
        <h2 className="mt-2 font-display text-[clamp(1.8rem,6vw,2.6rem)] leading-none tracking-wide text-white">
          {teamName ? `${teamName} drip loading` : 'Building your look'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/55">
          {sport ? `${sport} · ` : ''}
          AI preview usually takes 30–60 seconds. Hang tight — it’s worth the wait.
        </p>

        <div className="mt-6 w-full max-w-md">
          <div className="mb-2 flex items-end justify-between gap-3">
            <p
              key={messageIndex}
              className="m-0 text-left text-sm font-medium text-white/80 transition-opacity duration-500"
            >
              {done ? 'Mockup ready.' : MESSAGES[messageIndex]}
            </p>
            <p className="m-0 shrink-0 font-display text-2xl leading-none text-accent">{progress}%</p>
          </div>

          <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-heat via-[#ff6a00] to-accent transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>

          <div className="mt-3 flex items-center justify-between text-[0.72rem] text-white/40">
            <span>{done ? 'Complete' : 'Generating preview'}</span>
            <span>{elapsed}s elapsed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JerseyIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 text-accent" aria-hidden>
      <path
        fill="currentColor"
        d="M16 8c2.2 2.4 5 3.6 8 3.6S29.8 10.4 32 8l7 3.5-3 7.5H34v21H14V19h-2l-3-7.5L16 8z"
        opacity="0.95"
      />
      <path fill="#101418" d="M20 14h8v3h-8z" opacity="0.35" />
    </svg>
  );
}
