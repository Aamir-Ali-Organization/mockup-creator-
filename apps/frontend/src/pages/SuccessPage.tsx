import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateMockup, getQuote, getUploadUrl } from '@/api/client';

export function SuccessPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => getQuote(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PROCESSING' ? 3000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateMockup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quote', id] });
    },
  });

  const isProcessing = data?.status === 'PROCESSING';
  const isReady = data?.status === 'MOCKUP_READY' && (data.mockupImages?.length ?? 0) > 0;
  const canRetry =
    data &&
    !isProcessing &&
    !isReady &&
    (data.status === 'PENDING' || data.status === 'CANCELLED');

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
          Thanks for reaching out to Big Mad Drip. Matt’s team will follow up with pricing — and
          your free AI mockup is preparing below.
        </p>

        {isLoading ? <p className="mt-6 text-sm text-white/50">Loading quote details…</p> : null}
        {isError ? (
          <p className="mt-6 text-sm text-heat">
            Could not load quote details, but your submission was saved.
          </p>
        ) : null}

        {data ? (
          <dl className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Team</dt>
              <dd className="font-semibold text-white">{data.teamName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Sport</dt>
              <dd className="font-semibold text-white">{data.sport}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Quantity</dt>
              <dd className="font-semibold text-white">{data.quantity}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Status</dt>
              <dd className="font-semibold text-accent">{data.status}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="m-0 font-display text-2xl tracking-wide text-white">AI Mockup</h2>

          {isProcessing ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-heat to-accent" />
              </div>
              <p className="mt-3 text-sm text-white/55">
                Generating your uniform mockup… this usually takes 15–40 seconds.
              </p>
            </div>
          ) : null}

          {isReady ? (
            <div className="mt-4 space-y-3">
              {data!.mockupImages.map((image) => (
                <img
                  key={image}
                  src={getUploadUrl(image)}
                  alt={`${data!.teamName} uniform mockup`}
                  className="w-full rounded-xl border border-white/10"
                />
              ))}
              <p className="text-sm text-white/55">
                Preview only — final production art is refined by our design team.
              </p>
            </div>
          ) : null}

          {!isProcessing && !isReady ? (
            <div className="mt-4">
              <p className="text-sm text-white/55">
                {canRetry
                  ? 'Mockup isn’t ready yet. Tap below to generate (requires OpenAI API key on the server).'
                  : 'Mockup will appear here once generation finishes.'}
              </p>
              {canRetry ? (
                <button
                  type="button"
                  className="btn-primary mt-4 w-full sm:w-auto"
                  disabled={generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? 'Generating…' : 'Generate AI Mockup'}
                </button>
              ) : null}
              {generateMutation.isError ? (
                <p className="mt-3 text-sm text-heat">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : 'Generation failed'}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="tel:2398391588" className="btn-primary w-full sm:w-auto">
            Call Matt Now
          </a>
          <Link to="/" className="btn-ghost w-full sm:w-auto">
            Submit another quote
          </Link>
        </div>
      </div>
    </div>
  );
}
