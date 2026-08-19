'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateMockup, loadMockupSession, type MockupSession } from '@/lib/api';
import { MockupLoader } from '@/components/MockupLoader';

type Phase = 'loading-session' | 'generating' | 'ready' | 'skipped' | 'error' | 'empty';

type SuccessClientProps = {
  /** GHL contact / lead id from the URL. */
  contactId?: string;
};

export function SuccessClient({ contactId: contactIdFromRoute }: SuccessClientProps) {
  const searchParams = useSearchParams();
  const fleadidFromUrl = (searchParams.get('fleadid') || '').trim() || null;

  const [session, setSession] = useState<MockupSession | null>(null);
  const [phase, setPhase] = useState<Phase>('loading-session');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const ghlContactId = contactIdFromRoute || session?.contactId || null;

  useEffect(() => {
    const stored = loadMockupSession(contactIdFromRoute);
    if (!stored) {
      setPhase('empty');
      return;
    }

    const merged: MockupSession = {
      ...stored,
      contactId: contactIdFromRoute || stored.contactId,
      fleadid: fleadidFromUrl || stored.fleadid,
    };
    setSession(merged);

    if (merged.skipMockup || !merged.shouldGenerate) {
      setPhase('skipped');
      return;
    }

    if (started.current) return;
    started.current = true;
    setPhase('generating');

    void generateMockup({
      contactId: merged.contactId,
      fleadid: merged.fleadid,
      submissionId: merged.submissionId,
      job: merged.job,
    })
      .then((result) => {
        if (result.skipped) {
          setPhase('skipped');
          return;
        }
        if (result.imageDataUrl) {
          setImageDataUrl(result.imageDataUrl);
          setPhase('ready');
          return;
        }
        setError('Mockup generated but no image was returned.');
        setPhase('error');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Mockup generation failed');
        setPhase('error');
      });
  }, [contactIdFromRoute, fleadidFromUrl]);

  const retry = () => {
    if (!session) return;
    setError(null);
    setPhase('generating');
    void generateMockup({
      contactId: ghlContactId || session.contactId,
      fleadid: fleadidFromUrl || session.fleadid,
      submissionId: session.submissionId,
      job: session.job,
      force: true,
    })
      .then((result) => {
        if (result.imageDataUrl) {
          setImageDataUrl(result.imageDataUrl);
          setPhase('ready');
          return;
        }
        setError('Mockup generated but no image was returned.');
        setPhase('error');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Mockup generation failed');
        setPhase('error');
      });
  };

  if (phase === 'empty') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col justify-center px-3 py-10 sm:px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-8">
          <h1 className="m-0 font-display text-4xl tracking-wide text-white">No quote found</h1>
          <p className="mt-3 text-sm text-white/60">
            Submit the quote form first — your mockup session is tied to the GHL lead id in this URL.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Start a quote
          </Link>
        </div>
      </div>
    );
  }

  const job = session?.job;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col justify-center px-3 py-10 sm:px-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
        <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-accent">
          Request received
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.2rem,8vw,3.4rem)] leading-none tracking-wide text-white">
          You’re locked in
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">
          Thanks for reaching out to Big Mad Drip. Matt’s team will follow up with pricing — and your
          free AI mockup is preparing below.
        </p>

        {job ? (
          <dl className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Team</dt>
              <dd className="font-semibold text-white">{job.teamName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Sport</dt>
              <dd className="font-semibold text-white">{job.sport}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Quantity</dt>
              <dd className="font-semibold text-white">{job.quantity}</dd>
            </div>
            {ghlContactId ? (
              <div className="flex justify-between gap-4">
                <dt className="text-white/45">GHL Lead</dt>
                <dd className="truncate font-mono text-xs font-semibold text-accent">
                  {ghlContactId}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-6">
          {phase === 'loading-session' || phase === 'generating' ? (
            <MockupLoader teamName={job?.teamName} sport={job?.sport} done={false} />
          ) : null}

          {phase === 'ready' && imageDataUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
                Your free mockup is ready — check the drip.
              </div>
              <Image
                src={imageDataUrl}
                alt={`${job?.teamName || 'Team'} uniform mockup`}
                width={1024}
                height={1024}
                unoptimized
                className="h-auto w-full rounded-xl border border-white/10"
                priority
              />
              <p className="text-sm text-white/55">
                Preview only — final production art is refined by our design team.
              </p>
            </div>
          ) : null}

          {phase === 'skipped' ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h2 className="m-0 font-display text-2xl tracking-wide text-white">AI Mockup</h2>
              <p className="mt-3 text-sm text-white/55">
                {session?.skipMockup
                  ? 'A mockup was already generated for this Facebook lead, so we skipped a new one to control cost.'
                  : 'Your quote was saved. Mockup auto-generation is off or unavailable on the server.'}
              </p>
              <button type="button" className="btn-primary mt-4" onClick={retry}>
                Generate anyway
              </button>
            </div>
          ) : null}

          {phase === 'error' ? (
            <div className="rounded-xl border border-heat/30 bg-heat/10 p-4">
              <h2 className="m-0 font-display text-2xl tracking-wide text-white">Almost there</h2>
              <p className="mt-3 text-sm text-heat">{error}</p>
              <p className="mt-2 text-sm text-white/55">
                Your quote still went through. You can retry the mockup or call Matt.
              </p>
              <button type="button" className="btn-primary mt-4" onClick={retry}>
                Retry mockup
              </button>
            </div>
          ) : null}
        </div>

        {phase === 'loading-session' || phase === 'generating' ? (
          <div className="mt-8 flex justify-center">
            <a href="tel:2398391588" className="btn-primary w-full max-w-xs sm:w-auto">
              Call Matt Now
            </a>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="tel:2398391588" className="btn-primary w-full sm:w-auto">
              Call Matt Now
            </a>
            <Link href="/" className="btn-ghost w-full sm:w-auto">
              Submit another quote
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
