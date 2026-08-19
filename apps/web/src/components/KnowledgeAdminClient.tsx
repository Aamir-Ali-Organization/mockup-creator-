'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeProfile } from '@mockup/shared';
import { KNOWLEDGE_PLACEHOLDERS } from '@mockup/shared';

type ProfileSummary = {
  id: string;
  sport: string;
  label: string;
  enabled: boolean;
  sampleCount: number;
  updatedAt: string;
};

type EditorTab = 'instructions' | 'knowledge' | 'template' | 'samples';

const TABS: Array<{ id: EditorTab; label: string; hint: string }> = [
  { id: 'instructions', label: 'Instructions', hint: 'Brand rules the model must always follow' },
  { id: 'knowledge', label: 'Knowledge', hint: 'Playbook notes and style guidance for this sport' },
  { id: 'template', label: 'Prompt', hint: 'Fill-in template used for each quote' },
  { id: 'samples', label: 'Samples', hint: 'Reference mockups that steer visual style' },
];

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string; success?: boolean };
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Request failed');
  }
  return data;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function PlaceholderChips({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {KNOWLEDGE_PLACEHOLDERS.map((key) => {
        const token = `{{${key}}}`;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onInsert(token)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-accent/90 transition hover:border-accent/40 hover:bg-accent/10"
            title={`Insert ${token}`}
          >
            {token}
          </button>
        );
      })}
    </div>
  );
}

export function KnowledgeAdminClient() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KnowledgeProfile | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sportQuery, setSportQuery] = useState('');
  const [tab, setTab] = useState<EditorTab>('instructions');
  const [dragOver, setDragOver] = useState(false);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, kind: 'ok' | 'err' = 'ok') => {
    if (kind === 'err') {
      setError(message);
      setStatus(null);
    } else {
      setStatus(message);
      setError(null);
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setStatus(null);
      setError(null);
    }, 3200);
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/knowledge/auth', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json()) as { user?: string };
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
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
      setError(null);
      setStatus(null);
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/knowledge/auth', {
        method: 'DELETE',
        credentials: 'include',
      });
      return readJson(res);
    },
    onSuccess: () => {
      setUser(null);
      setDraft(null);
      setSavedSnapshot('');
      setStatus(null);
      queryClient.clear();
    },
  });

  const listQuery = useQuery({
    queryKey: ['knowledge-profiles'],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await fetch('/api/knowledge', { credentials: 'include' });
      const data = await readJson<{ profiles: ProfileSummary[] }>(res);
      return data.profiles;
    },
    retry: 1,
  });

  useEffect(() => {
    if (listQuery.error) {
      showToast(
        listQuery.error instanceof Error
          ? listQuery.error.message
          : 'Failed to load sports',
        'err',
      );
    }
  }, [listQuery.error]);

  const filteredSports = useMemo(() => {
    const q = sportQuery.trim().toLowerCase();
    const list = listQuery.data ?? [];
    if (!q) return list;
    return list.filter(
      (p) => p.label.toLowerCase().includes(q) || p.sport.toLowerCase().includes(q),
    );
  }, [listQuery.data, sportQuery]);

  const selectedSport = useMemo(() => {
    if (!listQuery.data?.length) return null;
    if (selectedId) {
      return listQuery.data.find((p) => p.id === selectedId) ?? listQuery.data[0];
    }
    return listQuery.data[0];
  }, [listQuery.data, selectedId]);

  const detailQuery = useQuery({
    queryKey: ['knowledge-profile', selectedSport?.id],
    enabled: Boolean(user && selectedSport?.id),
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/${selectedSport!.id}`, {
        credentials: 'include',
      });
      const data = await readJson<{ profile: KnowledgeProfile }>(res);
      return data.profile;
    },
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    setDraft(detailQuery.data);
    setSavedSnapshot(
      JSON.stringify({
        instructions: detailQuery.data.instructions,
        knowledgeBase: detailQuery.data.knowledgeBase,
        promptTemplate: detailQuery.data.promptTemplate,
        enabled: detailQuery.data.enabled,
        label: detailQuery.data.label,
      }),
    );
  }, [detailQuery.data]);

  const isDirty = useMemo(() => {
    if (!draft) return false;
    const current = JSON.stringify({
      instructions: draft.instructions,
      knowledgeBase: draft.knowledgeBase,
      promptTemplate: draft.promptTemplate,
      enabled: draft.enabled,
      label: draft.label,
    });
    return current !== savedSnapshot;
  }, [draft, savedSnapshot]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Nothing to save');
      const res = await fetch(`/api/knowledge/${draft.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: draft.instructions,
          knowledgeBase: draft.knowledgeBase,
          promptTemplate: draft.promptTemplate,
          enabled: draft.enabled,
          label: draft.label,
        }),
      });
      return readJson<{ profile: KnowledgeProfile }>(res);
    },
    onSuccess: (data) => {
      setDraft(data.profile);
      setSavedSnapshot(
        JSON.stringify({
          instructions: data.profile.instructions,
          knowledgeBase: data.profile.knowledgeBase,
          promptTemplate: data.profile.promptTemplate,
          enabled: data.profile.enabled,
          label: data.profile.label,
        }),
      );
      showToast('Profile saved');
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profiles'] });
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profile', data.profile.id] });
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const uploadFile = (file: File) => {
    if (!draft) return;
    uploadMutation.mutate(file);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!draft) throw new Error('Select a sport first');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/knowledge/${draft.id}/samples`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      return readJson<{ profile: KnowledgeProfile }>(res);
    },
    onSuccess: (data) => {
      setDraft(data.profile);
      showToast('Sample uploaded');
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profiles'] });
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      if (!draft) throw new Error('Select a sport first');
      const res = await fetch(`/api/knowledge/${draft.id}/samples/${sampleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return readJson<{ profile: KnowledgeProfile }>(res);
    },
    onSuccess: (data) => {
      setDraft(data.profile);
      showToast('Sample removed');
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profiles'] });
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const insertPlaceholder = (token: string) => {
    if (!draft) return;
    const el = templateRef.current;
    if (!el || tab !== 'template') {
      setDraft({ ...draft, promptTemplate: `${draft.promptTemplate}${token}` });
      setTab('template');
      return;
    }
    const start = el.selectionStart ?? draft.promptTemplate.length;
    const end = el.selectionEnd ?? start;
    const next =
      draft.promptTemplate.slice(0, start) + token + draft.promptTemplate.slice(end);
    setDraft({ ...draft, promptTemplate: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 text-white/55">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Checking session…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,212,0,0.12),transparent_55%)]"
        />
        <div className="relative w-full max-w-[420px] animate-[fadeUp_0.45s_ease-out]">
          <div className="mb-8 text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Big Mad Drip
            </p>
            <h1 className="font-display text-5xl tracking-wide text-white">Knowledge Admin</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Sign in to shape sport prompts, knowledge, and sample references.
            </p>
          </div>

          <form
            className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-6 backdrop-blur-md"
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
          >
            <label className="block space-y-1.5">
              <span className="field-label">Email</span>
              <input
                className="input-field"
                type="email"
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder="admin@admin.com"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="field-label">Password</span>
              <input
                className="input-field"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error && (
              <p className="rounded-lg border border-heat/30 bg-heat/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">
              Big Mad Drip · Admin
            </p>
            <h1 className="font-display truncate text-2xl tracking-wide text-white sm:text-3xl">
              Knowledge Base
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/admin/submissions" className="btn-ghost !px-3 !py-2 text-xs">
              Submissions
            </Link>
            {isDirty && (
              <span className="hidden rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent sm:inline">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              className="btn-primary !px-5 !py-2.5 !text-lg"
              disabled={!draft || !isDirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <div className="hidden h-8 w-px bg-white/10 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[160px] truncate text-xs text-white/45">{user}</span>
              <button
                type="button"
                className="btn-ghost !px-3 !py-2 text-xs"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="border-b border-white/10 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
          <div className="sticky top-[73px] space-y-3 p-4 sm:p-5">
            <div>
              <p className="field-label mb-2">Sport / form type</p>
              <input
                className="input-field !py-2.5 text-sm"
                placeholder="Search sports…"
                value={sportQuery}
                onChange={(e) => setSportQuery(e.target.value)}
              />
            </div>

            {/* Mobile sport select */}
            <label className="block lg:hidden">
              <span className="sr-only">Select sport</span>
              <select
                className="input-field"
                value={selectedSport?.id ?? ''}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setStatus(null);
                  setError(null);
                }}
              >
                {(listQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {!p.enabled ? ' (off)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="hidden max-h-[calc(100vh-220px)] flex-col gap-1 overflow-y-auto pr-1 lg:flex">
              {listQuery.isLoading && (
                <p className="px-2 py-4 text-sm text-white/40">Loading sports…</p>
              )}
              {listQuery.isError && (
                <p className="px-2 py-4 text-sm text-red-300">
                  Failed to load sports. Check API / env, then retry.
                </p>
              )}
              {!listQuery.isLoading && !listQuery.isError && filteredSports.length === 0 && (
                <p className="px-2 py-4 text-sm text-white/40">No sports match.</p>
              )}
              {filteredSports.map((profile) => {
                const active = selectedSport?.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(profile.id);
                      setStatus(null);
                      setError(null);
                    }}
                    className={`group rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? 'bg-accent text-ink shadow-[0_8px_24px_rgba(255,212,0,0.22)]'
                        : 'bg-transparent text-white/75 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold leading-tight">{profile.label}</span>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          profile.enabled
                            ? active
                              ? 'bg-ink/50'
                              : 'bg-emerald-400'
                            : active
                              ? 'bg-ink/30'
                              : 'bg-white/25'
                        }`}
                      />
                    </span>
                    <span
                      className={`mt-1 block text-[11px] ${
                        active ? 'text-ink/65' : 'text-white/40'
                      }`}
                    >
                      {profile.sampleCount} sample{profile.sampleCount === 1 ? '' : 's'}
                      {!profile.enabled ? ' · disabled' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-ghost w-full !py-2 text-xs lg:hidden"
              onClick={() => logoutMutation.mutate()}
            >
              Sign out ({user})
            </button>
          </div>
        </aside>

        {/* Editor */}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {listQuery.isError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <p className="text-red-200">Couldn’t load knowledge profiles.</p>
              <p className="max-w-md text-sm text-white/45">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : 'Check Vercel logs and env vars, then refresh.'}
              </p>
              <button
                type="button"
                className="btn-ghost mt-2 text-sm"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : !selectedSport ? (
            <div className="flex h-64 items-center justify-center text-white/45">
              {listQuery.isLoading ? 'Loading sports…' : 'Select a sport to edit.'}
            </div>
          ) : detailQuery.isLoading && !draft ? (
            <div className="flex h-64 items-center justify-center text-white/45">
              Loading profile…
            </div>
          ) : detailQuery.isError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <p className="text-red-200">Couldn’t load this sport profile.</p>
              <button
                type="button"
                className="btn-ghost mt-2 text-sm"
                onClick={() => void detailQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : !draft ? (
            <div className="flex h-64 items-center justify-center text-white/45">
              Select a sport to edit.
            </div>
          ) : (
            <div className="space-y-6 animate-[fadeUp_0.35s_ease-out]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-white sm:text-5xl">
                    {draft.label}
                  </h2>
                  <p className="mt-1 text-sm text-white/45">
                    Updated {relativeTime(draft.updatedAt)} · used when a lead picks this sport
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.enabled}
                  onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5"
                >
                  <span className="text-sm text-white/70">Enabled</span>
                  <span
                    className={`relative h-6 w-11 rounded-full transition ${
                      draft.enabled ? 'bg-accent' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition ${
                        draft.enabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-px">
                {TABS.map((item) => {
                  const active = tab === item.id;
                  const count =
                    item.id === 'samples' ? draft.sampleImages.length : undefined;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition ${
                        active ? 'text-accent' : 'text-white/45 hover:text-white/75'
                      }`}
                    >
                      {item.label}
                      {typeof count === 'number' && (
                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                            active ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      {active && (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-sm text-white/50">{activeTab.hint}</p>

              {tab === 'instructions' && (
                <label className="block space-y-2">
                  <span className="field-label">Instructions</span>
                  <textarea
                    className="input-field min-h-[320px] resize-y font-mono text-[13px] leading-relaxed"
                    value={draft.instructions}
                    onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                    placeholder="Always-on brand and quality rules…"
                  />
                </label>
              )}

              {tab === 'knowledge' && (
                <label className="block space-y-2">
                  <span className="field-label">Knowledge base</span>
                  <textarea
                    className="input-field min-h-[320px] resize-y font-mono text-[13px] leading-relaxed"
                    value={draft.knowledgeBase}
                    onChange={(e) => setDraft({ ...draft, knowledgeBase: e.target.value })}
                    placeholder="Sport-specific playbook notes, garment details, style language…"
                  />
                </label>
              )}

              {tab === 'template' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="field-label">Insert placeholder</span>
                    <PlaceholderChips onInsert={insertPlaceholder} />
                  </div>
                  <label className="block space-y-2">
                    <span className="field-label">Prompt template</span>
                    <textarea
                      ref={templateRef}
                      className="input-field min-h-[320px] resize-y font-mono text-[13px] leading-relaxed"
                      value={draft.promptTemplate}
                      onChange={(e) => setDraft({ ...draft, promptTemplate: e.target.value })}
                      placeholder="Create a premium custom {{sport}} uniform for {{teamName}}…"
                    />
                  </label>
                </div>
              )}

              {tab === 'samples' && (
                <div className="space-y-5">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadFile(file);
                    }}
                    className={`rounded-2xl border border-dashed px-6 py-10 text-center transition ${
                      dragOver
                        ? 'border-accent bg-accent/10'
                        : 'border-white/15 bg-white/[0.03] hover:border-white/30'
                    }`}
                  >
                    <p className="font-display text-2xl tracking-wide text-white">
                      Drop sample mockups here
                    </p>
                    <p className="mt-2 text-sm text-white/45">
                      PNG, JPEG, or WebP · used as OpenAI style references
                    </p>
                    <label className="btn-ghost mt-5 inline-flex cursor-pointer !px-5 !py-2.5 text-sm">
                      {uploadMutation.isPending ? 'Uploading…' : 'Browse files'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadMutation.isPending}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadFile(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {draft.sampleImages.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-12 text-center">
                      <p className="text-white/55">No samples for {draft.label} yet.</p>
                      <p className="mt-1 text-sm text-white/35">
                        Add a few winning mockups so new generations match your look.
                      </p>
                    </div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {draft.sampleImages.map((sample) => (
                        <li
                          key={sample.id}
                          className="group overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sample.url}
                            alt={sample.caption || sample.filename}
                            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                            <span className="truncate text-xs text-white/50">
                              {sample.caption || sample.filename}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 rounded-md px-2 py-1 text-xs text-red-300 transition hover:bg-heat/15 hover:text-red-200"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(sample.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {(status || error) && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
            error
              ? 'border-heat/40 bg-heat/20 text-red-100'
              : 'border-accent/30 bg-accent/15 text-accent'
          }`}
        >
          {error || status}
        </div>
      )}
    </div>
  );
}
