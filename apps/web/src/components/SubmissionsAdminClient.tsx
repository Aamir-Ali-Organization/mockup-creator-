'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { SubmissionRecord, SubmissionSummary } from '@/lib/submission-store';

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function statusStyles(status: SubmissionSummary['status']) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-400/15 text-emerald-300';
    case 'error':
      return 'bg-heat/20 text-red-200';
    case 'skipped':
      return 'bg-white/10 text-white/55';
    case 'generating':
      return 'bg-accent/15 text-accent';
    default:
      return 'bg-white/10 text-white/70';
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SubmissionsAdminClient() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/knowledge/auth', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json()) as { user?: string };
          setUser(data.user ?? null);
        } else setUser(null);
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/knowledge/auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loginUser, password: loginPassword }),
      });
      return readJson<{ user: string }>(res);
    },
    onSuccess: (data) => {
      setUser(data.user);
      setLoginPassword('');
      setLoginError(null);
    },
    onError: (err: Error) => setLoginError(err.message),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/knowledge/auth', { method: 'DELETE', credentials: 'include' });
    },
    onSuccess: () => {
      setUser(null);
      setSelectedId(null);
      queryClient.clear();
    },
  });

  const listQuery = useQuery({
    queryKey: ['submissions'],
    enabled: Boolean(user),
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await fetch('/api/submissions?limit=150', { credentials: 'include' });
      const data = await readJson<{ submissions: SubmissionSummary[] }>(res);
      return data.submissions;
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = listQuery.data ?? [];
    if (!q) return list;
    return list.filter((s) =>
      [s.customerName, s.email, s.teamName, s.sport, s.id, s.contactId || '', s.fleadid || '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [listQuery.data, query]);

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const detailQuery = useQuery({
    queryKey: ['submission', selectedId],
    enabled: Boolean(user && selectedId),
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${selectedId}`, { credentials: 'include' });
      return readJson<{ submission: SubmissionRecord; imageUrl: string | null }>(res);
    },
  });

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/55">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form
          className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-black/35 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
        >
          <div className="mb-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Big Mad Drip
            </p>
            <h1 className="font-display text-4xl tracking-wide text-white">Submissions</h1>
          </div>
          <label className="block space-y-1.5">
            <span className="field-label">Email</span>
            <input
              className="input-field"
              type="email"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="field-label">Password</span>
            <input
              className="input-field"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </label>
          {loginError && <p className="text-sm text-red-300">{loginError}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const detail = detailQuery.data?.submission;
  const imageUrl = detailQuery.data?.imageUrl;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">
              Big Mad Drip · Admin
            </p>
            <h1 className="font-display text-2xl tracking-wide text-white sm:text-3xl">
              Submissions
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/knowledge" className="btn-ghost !px-3 !py-2 text-xs">
              Knowledge
            </Link>
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-xs"
              onClick={() => logoutMutation.mutate()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-white/10 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
          <div className="sticky top-[73px] space-y-3 p-4 sm:p-5">
            <input
              className="input-field !py-2.5 text-sm"
              placeholder="Search name, team, email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-[calc(100vh-200px)] space-y-1 overflow-y-auto pr-1">
              {listQuery.isLoading && (
                <p className="px-2 py-4 text-sm text-white/40">Loading…</p>
              )}
              {listQuery.isError && (
                <p className="px-2 py-4 text-sm text-red-300">Failed to load submissions.</p>
              )}
              {!listQuery.isLoading && filtered.length === 0 && (
                <p className="px-2 py-4 text-sm text-white/40">
                  No submissions yet. Submit the public form to see entries here.
                </p>
              )}
              {filtered.map((item) => {
                const active = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? 'bg-accent text-ink'
                        : 'hover:bg-white/[0.06] text-white/80'
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-tight">{item.teamName}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          active ? 'bg-ink/15 text-ink' : statusStyles(item.status)
                        }`}
                      >
                        {item.status}
                      </span>
                    </span>
                    <span className={`mt-1 block text-xs ${active ? 'text-ink/65' : 'text-white/45'}`}>
                      {item.customerName} · {item.sport}
                    </span>
                    <span className={`mt-0.5 block text-[11px] ${active ? 'text-ink/50' : 'text-white/30'}`}>
                      {formatWhen(item.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {!selectedId ? (
            <div className="flex h-64 items-center justify-center text-white/45">
              Select a submission
            </div>
          ) : detailQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center text-white/45">
              Loading submission…
            </div>
          ) : detailQuery.isError || !detail ? (
            <div className="flex h-64 items-center justify-center text-red-200">
              Couldn’t load this submission.
            </div>
          ) : (
            <div className="space-y-8 animate-[fadeUp_0.35s_ease-out]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-white sm:text-5xl">
                    {detail.job.teamName}
                  </h2>
                  <p className="mt-1 text-sm text-white/45">
                    {detail.job.customerName} · {detail.job.email} · {detail.job.phone}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusStyles(detail.status)}`}
                >
                  {detail.status}
                </span>
              </div>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Sport', detail.job.sport],
                  ['Gender', detail.job.gender],
                  ['Age', detail.job.ageGroup],
                  ['Primary', detail.job.primaryColor],
                  ['Secondary', detail.job.secondaryColor],
                  ['Accent', detail.job.alternateColor || '—'],
                  ['Qty', String(detail.job.quantity)],
                  ['Logo', detail.job.logoCreation || '—'],
                  ['Referral', detail.job.referralSource || '—'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      {label}
                    </p>
                    <p className="mt-1 text-sm text-white/85">{value}</p>
                  </div>
                ))}
              </section>

              {(detail.job.accessories?.length > 0 || detail.job.rosterInfo) && (
                <section className="space-y-2">
                  <h3 className="field-label">Extras</h3>
                  {detail.job.accessories?.length > 0 && (
                    <p className="text-sm text-white/70">{detail.job.accessories.join(', ')}</p>
                  )}
                  {detail.job.rosterInfo && (
                    <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                      {detail.job.rosterInfo}
                    </p>
                  )}
                </section>
              )}

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="field-label">Prompt sent to AI</h3>
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() => void navigator.clipboard.writeText(detail.prompt || '')}
                  >
                    Copy
                  </button>
                </div>
                <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/75">
                  {detail.prompt || 'No prompt recorded.'}
                </pre>
              </section>

              <section className="space-y-2">
                <h3 className="field-label">AI mockup result</h3>
                {detail.hasImage && imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`${detail.job.teamName} mockup`}
                      className="mx-auto max-h-[640px] w-full object-contain"
                    />
                    <div className="flex flex-wrap gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/45">
                      {detail.model && <span>Model: {detail.model}</span>}
                      <span>Samples used: {detail.usedSamples ?? 0}</span>
                      <span>Updated {formatWhen(detail.updatedAt)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/45">
                    {detail.status === 'error'
                      ? detail.errorMessage || 'Generation failed.'
                      : detail.status === 'skipped'
                        ? 'Mockup skipped for this lead.'
                        : 'No mockup image yet.'}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-white/35">
                <p>ID: {detail.id}</p>
                {detail.contactId && <p>GHL contact: {detail.contactId}</p>}
                {detail.fleadid && <p>Facebook lead: {detail.fleadid}</p>}
                {detail.knowledgeProfileId && <p>Knowledge profile: {detail.knowledgeProfileId}</p>}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
