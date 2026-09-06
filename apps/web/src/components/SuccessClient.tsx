'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  checkEntitlement,
  createCheckoutSession,
  fetchPricing,
  generateMockup,
  isPaymentRequiredError,
  loadMockupSession,
  resolveMockupImageSrc,
  resolveMockupLogoSrc,
  saveMockupSession,
  type MockupSession,
  type PricingInfo,
} from '@/lib/api';
import { MockupLoader } from '@/components/MockupLoader';

type Phase =
  | 'loading-session'
  | 'generating'
  | 'ready'
  | 'skipped'
  | 'paywall'
  | 'error'
  | 'empty';

type GalleryItem = {
  imageDataUrl: string;
  logoDataUrl?: string | null;
};

type SuccessClientProps = {
  /** GHL contact / lead id from the URL. */
  contactId?: string;
};

async function waitForEntitlement(
  sessionId: string,
  attempts = 8,
): Promise<{ ok: boolean; remaining: number; total: number }> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await checkEntitlement(sessionId);
      if (result.available) {
        return {
          ok: true,
          remaining: result.quantityRemaining ?? 1,
          total: result.quantityTotal ?? 1,
        };
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return { ok: false, remaining: 0, total: 0 };
}

export function SuccessClient({ contactId: contactIdFromRoute }: SuccessClientProps) {
  const searchParams = useSearchParams();
  const fleadidFromUrl = (searchParams.get('fleadid') || '').trim() || null;
  const paidSessionId = (searchParams.get('paid_session_id') || '').trim() || null;
  const canceled = searchParams.get('canceled') === '1';

  const [session, setSession] = useState<MockupSession | null>(null);
  const [phase, setPhase] = useState<Phase>('loading-session');
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(0);
  const started = useRef(false);

  const ghlContactId = contactIdFromRoute || session?.contactId || null;
  const imageDataUrl = gallery[gallery.length - 1]?.imageDataUrl ?? null;
  const logoDataUrl = gallery[gallery.length - 1]?.logoDataUrl ?? null;
  const unitLabel = pricing?.unitAmountLabel || '~$15';
  const maxQuantity = pricing?.maxQuantity ?? 20;
  const totalLabel = pricing
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        (pricing.unitAmountCents * quantity) / 100,
      )
    : null;

  const markSessionGenerated = (current: MockupSession, submissionId?: string | null) => {
    const next: MockupSession = {
      ...current,
      submissionId: submissionId || current.submissionId,
      hasGenerated: true,
      skipMockup: false,
      shouldGenerate: true,
      requiresPayment: false,
    };
    setSession(next);
    saveMockupSession(next);
  };

  const pushGallery = (item: GalleryItem) => {
    setGallery((prev) => [...prev, item]);
  };

  const goToPaywall = (message?: string) => {
    if (message) setError(message);
    setPhase('paywall');
  };

  const startCheckout = async () => {
    if (!session) return;
    setCheckoutBusy(true);
    setError(null);
    try {
      const checkout = await createCheckoutSession({
        contactId: ghlContactId || session.contactId,
        fleadid: fleadidFromUrl || session.fleadid,
        submissionId: session.submissionId,
        email: session.job.email,
        teamName: session.job.teamName,
        quantity,
      });
      window.location.href = checkout.url;
    } catch (err: unknown) {
      setCheckoutBusy(false);
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setPhase('paywall');
    }
  };

  const runPaidGenerate = async (current: MockupSession) => {
    const result = await generateMockup({
      contactId: current.contactId,
      fleadid: current.fleadid,
      submissionId: current.submissionId,
      paymentSessionId: paidSessionId,
      job: current.job,
      force: true,
    });
    if (!result.imageDataUrl && !result.imageUrl) {
      throw new Error('Mockup generated but no image was returned.');
    }
    pushGallery({
      imageDataUrl: resolveMockupImageSrc(result)!,
      logoDataUrl: resolveMockupLogoSrc(result),
    });
    markSessionGenerated(current, result.submissionId);
    setCreditsRemaining(result.paidCreditsRemaining ?? 0);
    setCreditsTotal(result.paidCreditsTotal ?? creditsTotal);
    setPhase('ready');
  };

  useEffect(() => {
    void fetchPricing()
      .then((info) => {
        setPricing(info);
        setQuantity((q) => Math.min(Math.max(1, q), info.maxQuantity || 20));
      })
      .catch(() => undefined);
  }, []);

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

    if (started.current) return;
    started.current = true;

    // Returning from Stripe Checkout with a paid session.
    if (paidSessionId) {
      setPhase('generating');
      void (async () => {
        const entitled = await waitForEntitlement(paidSessionId);
        if (!entitled.ok) {
          goToPaywall(
            'Payment is still confirming. If you were charged, wait a moment and retry — or unlock again.',
          );
          return;
        }
        setCreditsRemaining(entitled.remaining);
        setCreditsTotal(entitled.total);

        try {
          await runPaidGenerate(merged);
        } catch (err: unknown) {
          if (isPaymentRequiredError(err)) {
            goToPaywall(err instanceof Error ? err.message : undefined);
            return;
          }
          setError(err instanceof Error ? err.message : 'Mockup generation failed');
          setPhase('error');
        }
      })();
      return;
    }

    // Free quota already used / already generated — show paywall (not free regen).
    if ((merged.skipMockup || merged.requiresPayment) && !merged.hasGenerated) {
      if (canceled) {
        setError('Checkout was canceled. Your first free mockup is used — unlock another when ready.');
      }
      setPhase('paywall');
      return;
    }

    if (!merged.shouldGenerate && !merged.hasGenerated) {
      setPhase('skipped');
      return;
    }

    if (merged.hasGenerated) {
      setPhase('generating');
      void generateMockup({
        contactId: merged.contactId,
        fleadid: merged.fleadid,
        submissionId: merged.submissionId,
        job: merged.job,
      })
        .then((result) => {
          if (result.imageDataUrl || result.imageUrl) {
            pushGallery({
              imageDataUrl: resolveMockupImageSrc(result)!,
              logoDataUrl: resolveMockupLogoSrc(result),
            });
            markSessionGenerated(merged, result.submissionId);
            setPhase('ready');
            return;
          }
          setPhase('paywall');
        })
        .catch((err: unknown) => {
          if (isPaymentRequiredError(err)) {
            goToPaywall(err instanceof Error ? err.message : undefined);
            return;
          }
          setError(err instanceof Error ? err.message : 'Mockup generation failed');
          setPhase('error');
        });
      return;
    }

    setPhase('generating');
    void generateMockup({
      contactId: merged.contactId,
      fleadid: merged.fleadid,
      submissionId: merged.submissionId,
      job: merged.job,
    })
      .then((result) => {
        if (result.imageDataUrl || result.imageUrl) {
          pushGallery({
            imageDataUrl: resolveMockupImageSrc(result)!,
            logoDataUrl: resolveMockupLogoSrc(result),
          });
          markSessionGenerated(merged, result.submissionId);
          setPhase('ready');
          return;
        }
        if (result.requiresPayment || result.skipped) {
          setPhase('paywall');
          return;
        }
        setError('Mockup generated but no image was returned.');
        setPhase('error');
      })
      .catch((err: unknown) => {
        if (isPaymentRequiredError(err)) {
          goToPaywall(err instanceof Error ? err.message : undefined);
          return;
        }
        setError(err instanceof Error ? err.message : 'Mockup generation failed');
        setPhase('error');
      });
  }, [contactIdFromRoute, fleadidFromUrl, paidSessionId, canceled]);

  const retry = () => {
    if (!session) return;
    setError(null);
    setPhase('generating');
    void (async () => {
      try {
        if (paidSessionId) {
          await runPaidGenerate(session);
          return;
        }
        const result = await generateMockup({
          contactId: ghlContactId || session.contactId,
          fleadid: fleadidFromUrl || session.fleadid,
          submissionId: session.submissionId,
          job: session.job,
          force: false,
        });
        if (result.imageDataUrl || result.imageUrl) {
          pushGallery({
            imageDataUrl: resolveMockupImageSrc(result)!,
            logoDataUrl: resolveMockupLogoSrc(result),
          });
          markSessionGenerated(session, result.submissionId);
          setPhase('ready');
          return;
        }
        if (result.requiresPayment || result.skipped) {
          setPhase('paywall');
          return;
        }
        setError('Mockup generated but no image was returned.');
        setPhase('error');
      } catch (err: unknown) {
        if (isPaymentRequiredError(err)) {
          goToPaywall(err instanceof Error ? err.message : undefined);
          return;
        }
        setError(err instanceof Error ? err.message : 'Mockup generation failed');
        setPhase('error');
      }
    })();
  };

  const generateNextPaid = () => {
    if (!session || !paidSessionId || creditsRemaining <= 0) return;
    setError(null);
    setPhase('generating');
    void runPaidGenerate(session).catch((err: unknown) => {
      if (isPaymentRequiredError(err)) {
        goToPaywall(err instanceof Error ? err.message : undefined);
        return;
      }
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
          <Link href="/generate" className="btn-primary mt-6 inline-flex">
            Generate Mockup
          </Link>
        </div>
      </div>
    );
  }

  const job = session?.job;
  const paywallReason = session?.freeQuotaUsed
    ? 'Your free mockup for this network was already used.'
    : session?.skipMockup || session?.requiresPayment
      ? 'A free mockup was already generated for this lead.'
      : 'Your free AI mockup is used up for this visit.';

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
          Thanks for reaching out to Big Mad Drip. Matt’s team will follow up with pricing — your
          first AI mockup is free; extras unlock at {unitLabel} each.
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
                Your {paidSessionId ? 'extra' : 'free'}{' '}
                {logoDataUrl ? 'logo + mockup are' : 'mockup is'} ready — check the drip.
                {paidSessionId && creditsTotal > 0 ? (
                  <span className="mt-1 block text-accent/80">
                    {creditsRemaining > 0
                      ? `${creditsRemaining} of ${creditsTotal} paid mockup${creditsTotal === 1 ? '' : 's'} left on this payment.`
                      : `All ${creditsTotal} paid mockup${creditsTotal === 1 ? '' : 's'} from this payment are used.`}
                  </span>
                ) : null}
              </div>
              {gallery.length > 1 ? (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((item, index) => (
                    <button
                      key={`${index}-${item.imageDataUrl.slice(0, 24)}`}
                      type="button"
                      className="overflow-hidden rounded-lg border border-white/10"
                      onClick={() =>
                        setGallery((prev) => {
                          const next = [...prev];
                          const [picked] = next.splice(index, 1);
                          next.push(picked);
                          return next;
                        })
                      }
                    >
                      <Image
                        src={item.imageDataUrl}
                        alt={`Mockup ${index + 1}`}
                        width={256}
                        height={256}
                        unoptimized
                        className="h-auto w-full"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              {logoDataUrl ? (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                    {paidSessionId ? 'Logo' : 'Free logo'}
                  </p>
                  <Image
                    src={logoDataUrl}
                    alt={`${job?.teamName || 'Team'} logo`}
                    width={512}
                    height={512}
                    unoptimized
                    className="mx-auto h-auto w-full max-w-[320px] rounded-xl border border-white/10 bg-white"
                  />
                </div>
              ) : null}
              <div>
                {logoDataUrl ? (
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Uniform mockup
                  </p>
                ) : null}
                <Image
                  src={imageDataUrl}
                  alt={`${job?.teamName || 'Team'} uniform mockup`}
                  width={1024}
                  height={1024}
                  unoptimized
                  className="h-auto w-full rounded-xl border border-white/10"
                  priority
                />
              </div>
              <p className="text-sm text-white/55">
                Preview only — final production art is refined by our design team.
              </p>
              {paidSessionId && creditsRemaining > 0 ? (
                <button type="button" className="btn-primary mt-2" onClick={generateNextPaid}>
                  Generate next paid mockup ({creditsRemaining} left)
                </button>
              ) : (
                <button type="button" className="btn-ghost mt-2" onClick={() => setPhase('paywall')}>
                  Unlock more mockups ({unitLabel} each)
                </button>
              )}
            </div>
          ) : null}

          {phase === 'paywall' ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h2 className="m-0 font-display text-2xl tracking-wide text-white">
                Unlock more mockups
              </h2>
              <p className="mt-3 text-sm text-white/55">
                {paywallReason} Choose how many extras you want — {unitLabel} each.
              </p>
              <label className="mt-4 block space-y-1.5">
                <span className="field-label">Number of mockups</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-2"
                    disabled={quantity <= 1 || checkoutBusy}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <input
                    className="input-field max-w-[96px] text-center"
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) {
                        setQuantity(1);
                        return;
                      }
                      setQuantity(Math.min(maxQuantity, Math.max(1, n)));
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-2"
                    disabled={quantity >= maxQuantity || checkoutBusy}
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  >
                    +
                  </button>
                </div>
              </label>
              <p className="mt-2 text-sm text-white/70">
                Total: <span className="font-semibold text-white">{totalLabel || unitLabel}</span>
                {quantity > 1 ? (
                  <span className="text-white/45"> ({quantity} × {unitLabel})</span>
                ) : null}
              </p>
              {error ? <p className="mt-2 text-sm text-heat">{error}</p> : null}
              <button
                type="button"
                className="btn-primary mt-4"
                disabled={checkoutBusy || !session || pricing?.stripeReady === false}
                onClick={() => void startCheckout()}
              >
                {checkoutBusy
                  ? 'Redirecting…'
                  : `Pay ${totalLabel || unitLabel} · unlock ${quantity} mockup${quantity === 1 ? '' : 's'}`}
              </button>
              {pricing?.stripeReady === false ? (
                <p className="mt-2 text-xs text-white/45">
                  Checkout is temporarily unavailable. Call Matt to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          {phase === 'skipped' ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h2 className="m-0 font-display text-2xl tracking-wide text-white">AI Mockup</h2>
              <p className="mt-3 text-sm text-white/55">
                Your quote was saved. Mockup auto-generation is off or unavailable on the server.
              </p>
              <button type="button" className="btn-primary mt-4" onClick={() => setPhase('paywall')}>
                Unlock a mockup ({unitLabel})
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
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={retry}>
                  Retry mockup
                </button>
                <button type="button" className="btn-ghost" onClick={() => setPhase('paywall')}>
                  Unlock more ({unitLabel} each)
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <a href="tel:2398391588" className="btn-primary w-full max-w-xs sm:w-auto">
            Call Matt Now
          </a>
        </div>
      </div>
    </div>
  );
}
