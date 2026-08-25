'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LOGO_COMPOSITION_OPTIONS,
  LOGO_PROMPT_PLACEHOLDERS,
  PUBLIC_SPORTS,
  STYLE_COMBO_DEFINITIONS,
  STYLE_FITS,
  STYLE_GENDER_FAMILIES,
  getLogoSamplesForComposition,
  getStyleComboById,
  sportToSlug,
  sportUsesStyleCombos,
  type KnowledgeProfile,
  type KnowledgeSample,
} from '@mockup/shared';
import { KNOWLEDGE_PLACEHOLDERS } from '@mockup/shared';

type ProfileSummary = {
  id: string;
  sport: string;
  label: string;
  enabled: boolean;
  sampleCount: number;
  comboCount?: number;
  updatedAt: string;
};

type EditorTab = 'looks' | 'defaults';

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'looks', label: 'Looks' },
  { id: 'defaults', label: 'Defaults' },
];

const TOTAL_LOOKS = STYLE_COMBO_DEFINITIONS.length;

const PUBLIC_SPORT_IDS = new Set(
  PUBLIC_SPORTS.map((sport) => sportToSlug(sport)),
);

function samplesForCombo(profile: KnowledgeProfile, comboId: string): KnowledgeSample[] {
  return profile.comboSampleSets?.find((s) => s.comboId === comboId)?.samples ?? [];
}

function comboField(
  profile: KnowledgeProfile,
  comboId: string,
  field: 'instructions' | 'knowledgeBase' | 'promptTemplate',
): string {
  return profile.comboSampleSets?.find((s) => s.comboId === comboId)?.[field] ?? '';
}

function upsertComboDraft(
  profile: KnowledgeProfile,
  comboId: string,
  patch: Partial<{ instructions: string; knowledgeBase: string; promptTemplate: string }>,
): KnowledgeProfile {
  const sets = [...(profile.comboSampleSets ?? [])];
  const index = sets.findIndex((s) => s.comboId === comboId);
  if (index >= 0) {
    sets[index] = { ...sets[index], ...patch };
  } else {
    sets.push({
      comboId,
      samples: [],
      instructions: '',
      knowledgeBase: '',
      promptTemplate: '',
      ...patch,
    });
  }
  return { ...profile, comboSampleSets: sets };
}

function snapshotOf(profile: KnowledgeProfile) {
  return JSON.stringify({
    instructions: profile.instructions,
    knowledgeBase: profile.knowledgeBase,
    promptTemplate: profile.promptTemplate,
    logoInstructions: profile.logoInstructions,
    logoPromptTemplate: profile.logoPromptTemplate,
    logoSampleSets: profile.logoSampleSets ?? [],
    enabled: profile.enabled,
    label: profile.label,
    comboSampleSets: profile.comboSampleSets ?? [],
  });
}

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
  placeholders,
  onInsert,
}: {
  placeholders: readonly string[];
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {placeholders.map((key) => {
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
  const [tab, setTab] = useState<EditorTab>('looks');
  const [dragOver, setDragOver] = useState(false);
  const [selectedComboId, setSelectedComboId] = useState<string>(
    STYLE_COMBO_DEFINITIONS[0]?.id ?? '',
  );
  const [genderFilter, setGenderFilter] = useState<(typeof STYLE_GENDER_FAMILIES)[number] | 'All'>(
    'All',
  );
  const [fitFilter, setFitFilter] = useState<(typeof STYLE_FITS)[number] | 'All'>('All');
  const [lookModal, setLookModal] = useState<{
    comboId: string;
    mode: 'photo' | 'instructions';
  } | null>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const logoTemplateRef = useRef<HTMLTextAreaElement>(null);
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
    const list = (listQuery.data ?? []).filter((p) => PUBLIC_SPORT_IDS.has(p.id));
    if (!q) return list;
    return list.filter(
      (p) => p.label.toLowerCase().includes(q) || p.sport.toLowerCase().includes(q),
    );
  }, [listQuery.data, sportQuery]);

  const selectedSport = useMemo(() => {
    if (!filteredSports.length) return null;
    if (selectedId) {
      return filteredSports.find((p) => p.id === selectedId) ?? filteredSports[0];
    }
    return filteredSports[0];
  }, [filteredSports, selectedId]);

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
    setSavedSnapshot(snapshotOf(detailQuery.data));
  }, [detailQuery.data]);

  const isDirty = useMemo(() => {
    if (!draft) return false;
    return snapshotOf(draft) !== savedSnapshot;
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
          logoInstructions: draft.logoInstructions,
          logoPromptTemplate: draft.logoPromptTemplate,
          logoSampleSets: draft.logoSampleSets ?? [],
          enabled: draft.enabled,
          label: draft.label,
          comboSampleSets: draft.comboSampleSets ?? [],
        }),
      });
      return readJson<{ profile: KnowledgeProfile }>(res);
    },
    onSuccess: (data) => {
      setDraft(data.profile);
      setSavedSnapshot(snapshotOf(data.profile));
      showToast('Profile saved');
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profiles'] });
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profile', data.profile.id] });
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      comboId,
      logoComposition,
    }: {
      file: File;
      comboId?: string | null;
      logoComposition?: string | null;
    }) => {
      if (!draft) throw new Error('Select a sport first');
      const form = new FormData();
      form.append('file', file);
      if (comboId) form.append('comboId', comboId);
      if (logoComposition) form.append('logoComposition', logoComposition);
      const res = await fetch(`/api/knowledge/${draft.id}/samples`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      return readJson<{ profile: KnowledgeProfile }>(res);
    },
    onSuccess: (data) => {
      setDraft(data.profile);
      showToast('Example uploaded');
      void queryClient.invalidateQueries({ queryKey: ['knowledge-profiles'] });
    },
    onError: (err: Error) => showToast(err.message, 'err'),
  });

  const uploadFile = (
    file: File,
    options?: { comboId?: string | null; logoComposition?: string | null },
  ) => {
    if (!draft) return;
    uploadMutation.mutate({
      file,
      comboId: options?.comboId ?? null,
      logoComposition: options?.logoComposition ?? null,
    });
  };

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
    if (!el || tab !== 'defaults') {
      setDraft({ ...draft, promptTemplate: `${draft.promptTemplate}${token}` });
      setTab('defaults');
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

  const insertLogoPlaceholder = (token: string) => {
    if (!draft) return;
    const el = logoTemplateRef.current;
    const current = draft.logoPromptTemplate || '';
    if (!el || tab !== 'defaults') {
      setDraft({ ...draft, logoPromptTemplate: `${current}${token}` });
      setTab('defaults');
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    const next = current.slice(0, start) + token + current.slice(end);
    setDraft({ ...draft, logoPromptTemplate: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const usesStyleCombos = draft ? sportUsesStyleCombos(draft.sport) : false;
  const filteredCombos = STYLE_COMBO_DEFINITIONS.filter((combo) => {
    if (genderFilter !== 'All' && combo.genderFamily !== genderFilter) return false;
    if (fitFilter !== 'All' && combo.fit !== fitFilter) return false;
    return true;
  });
  const selectedCombo = getStyleComboById(selectedComboId) ?? STYLE_COMBO_DEFINITIONS[0];
  const modalCombo = lookModal ? getStyleComboById(lookModal.comboId) : null;
  const modalComboSamples =
    draft && lookModal ? samplesForCombo(draft, lookModal.comboId) : [];
  const looksWithPhoto = draft
    ? STYLE_COMBO_DEFINITIONS.filter((c) => samplesForCombo(draft, c.id).length > 0).length
    : 0;
  const looksWithInstructions = draft
    ? STYLE_COMBO_DEFINITIONS.filter((c) => {
        const tips = comboField(draft, c.id, 'knowledgeBase').trim();
        const rules = comboField(draft, c.id, 'instructions').trim();
        return Boolean(tips || rules);
      }).length
    : 0;
  const looksProgress = TOTAL_LOOKS > 0 ? Math.round((looksWithPhoto / TOTAL_LOOKS) * 100) : 0;

  useEffect(() => {
    if (!lookModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLookModal(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lookModal]);

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
            <h1 className="font-display text-5xl tracking-wide text-white">Style Admin</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Upload example uniforms and add short style notes.
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
              Style Guide
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
              <p className="field-label mb-2">Sport</p>
              {filteredSports.length > 1 ? (
                <input
                  className="input-field !py-2.5 text-sm"
                  placeholder="Search…"
                  value={sportQuery}
                  onChange={(e) => setSportQuery(e.target.value)}
                />
              ) : (
                <p className="text-sm text-white/45">Currently showing Flag Football only.</p>
              )}
            </div>

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
                      setTab('looks');
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
                      {profile.sampleCount} example{profile.sampleCount === 1 ? '' : 's'}
                      {!profile.enabled ? ' · off' : ''}
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
                    Updated {relativeTime(draft.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.enabled}
                  onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5"
                >
                  <span className="text-sm text-white/70">On</span>
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
              <div className="flex gap-1 border-b border-white/10 pb-px">
                {TABS.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`relative shrink-0 px-5 py-3 text-sm font-semibold transition ${
                        active ? 'text-accent' : 'text-white/45 hover:text-white/75'
                      }`}
                    >
                      {item.label}
                      {active && (
                        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>

              {tab === 'looks' && (
                <div className="space-y-5">
                  {usesStyleCombos ? (
                    <>
                      {/* Progress */}
                      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/[0.08] to-transparent px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="m-0 text-sm font-semibold text-white">
                            {looksWithPhoto} of {TOTAL_LOOKS} looks have a photo
                            <span className="ml-2 font-normal text-white/45">
                              · {looksWithInstructions} with custom instructions
                            </span>
                          </p>
                          <span className="text-xs font-semibold text-accent">{looksProgress}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-500"
                            style={{ width: `${looksProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap gap-2">
                        {(['All', ...STYLE_GENDER_FAMILIES] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGenderFilter(g)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                              genderFilter === g
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-white/12 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {g === 'All' ? 'All' : g}
                          </button>
                        ))}
                        <span className="mx-1 h-6 w-px self-center bg-white/10" />
                        {(['All', ...STYLE_FITS] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFitFilter(f)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                              fitFilter === f
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-white/12 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      <p className="m-0 text-sm text-white/50">
                        Tap <span className="text-accent">Add photo</span> or{' '}
                        <span className="text-accent">Add instruction</span> on a look card.
                      </p>

                      {/* Combo cards */}
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredCombos.map((combo) => {
                          const samples = samplesForCombo(draft, combo.id);
                          const ready = samples.length > 0;
                          const thumb = samples[0]?.url;
                          const hasText =
                            Boolean(comboField(draft, combo.id, 'knowledgeBase').trim()) ||
                            Boolean(comboField(draft, combo.id, 'instructions').trim());
                          return (
                            <div
                              key={combo.id}
                              className={`flex flex-col overflow-hidden rounded-2xl border bg-[#0c0c0e] transition ${
                                ready
                                  ? 'border-accent/70 shadow-[0_0_0_1px_rgba(255,212,0,0.12)]'
                                  : 'border-accent/35'
                              }`}
                            >
                              <div className="relative aspect-square bg-black/50">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={`Add photo for ${combo.label}`}
                                    onClick={() =>
                                      setLookModal({ comboId: combo.id, mode: 'photo' })
                                    }
                                    className="flex h-full w-full items-center justify-center text-4xl text-white/20 transition hover:bg-white/[0.03] hover:text-accent/70"
                                  >
                                    +
                                  </button>
                                )}

                                <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLookModal({ comboId: combo.id, mode: 'photo' })
                                    }
                                    className="rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/75 backdrop-blur-sm transition hover:border-accent/50 hover:text-accent"
                                  >
                                    {ready ? 'Photos' : 'Add photo'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLookModal({ comboId: combo.id, mode: 'instructions' })
                                    }
                                    className="rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/75 backdrop-blur-sm transition hover:border-accent/50 hover:text-accent"
                                  >
                                    {hasText ? 'Edit instruction' : 'Add instruction'}
                                  </button>
                                </div>
                              </div>

                              <div className="border-t border-white/10 bg-[#121214] px-3 py-3 text-center">
                                <p className="m-0 text-[11px] font-bold uppercase leading-snug tracking-[0.07em] text-accent">
                                  {combo.label}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Look modals */}
                      {lookModal && modalCombo && draft ? (
                        <div
                          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"
                          onClick={() => setLookModal(null)}
                          role="presentation"
                        >
                          <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={modalCombo.label}
                            className="flex max-h-[min(90vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-accent/30 bg-[#121214] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                              <div>
                                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                                  {lookModal.mode === 'photo' ? 'Photos' : 'Instructions'}
                                </p>
                                <h3 className="mt-1 font-display text-2xl tracking-wide text-white">
                                  {modalCombo.label}
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLookModal(null)}
                                className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
                              >
                                Close
                              </button>
                            </div>

                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                              {lookModal.mode === 'photo' ? (
                                <>
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
                                      if (file) uploadFile(file, { comboId: modalCombo.id });
                                    }}
                                    className={`rounded-2xl border border-dashed px-5 py-8 text-center transition ${
                                      dragOver
                                        ? 'border-accent bg-accent/10'
                                        : 'border-white/15 bg-white/[0.03]'
                                    }`}
                                  >
                                    <p className="font-display text-xl tracking-wide text-white">
                                      Drop a photo here
                                    </p>
                                    <p className="mt-1 text-sm text-white/45">PNG or JPEG</p>
                                    <label className="btn-ghost mt-4 inline-flex cursor-pointer !px-5 !py-2.5 text-sm">
                                      {uploadMutation.isPending ? 'Uploading…' : 'Choose photo'}
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        disabled={uploadMutation.isPending}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadFile(file, { comboId: modalCombo.id });
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {modalComboSamples.length === 0 ? (
                                    <p className="m-0 text-center text-sm text-white/40">
                                      No photos yet for this look.
                                    </p>
                                  ) : (
                                    <ul className="grid gap-3 sm:grid-cols-2">
                                      {modalComboSamples.map((sample) => (
                                        <li
                                          key={sample.id}
                                          className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={sample.url}
                                            alt={sample.caption || modalCombo.label}
                                            className="aspect-[3/4] w-full object-cover"
                                          />
                                          <button
                                            type="button"
                                            className="w-full px-2 py-2 text-xs text-red-300 transition hover:bg-heat/15"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => deleteMutation.mutate(sample.id)}
                                          >
                                            Remove
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="m-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/50">
                                    Leave blank to use Defaults for this sport.
                                  </p>
                                  <label className="block space-y-2">
                                    <span className="field-label">Tips for this look</span>
                                    <textarea
                                      className="input-field min-h-[110px] resize-y text-sm leading-relaxed"
                                      value={comboField(draft, modalCombo.id, 'knowledgeBase')}
                                      onChange={(e) =>
                                        setDraft(
                                          upsertComboDraft(draft, modalCombo.id, {
                                            knowledgeBase: e.target.value,
                                          }),
                                        )
                                      }
                                      placeholder="Optional notes for this exact look…"
                                    />
                                  </label>
                                  <label className="block space-y-2">
                                    <span className="field-label">Style rules for this look</span>
                                    <textarea
                                      className="input-field min-h-[120px] resize-y text-sm leading-relaxed"
                                      value={comboField(draft, modalCombo.id, 'instructions')}
                                      onChange={(e) =>
                                        setDraft(
                                          upsertComboDraft(draft, modalCombo.id, {
                                            instructions: e.target.value,
                                          }),
                                        )
                                      }
                                      placeholder="Optional — overrides Defaults only for this look"
                                    />
                                  </label>
                                  <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                    <summary className="cursor-pointer text-sm font-semibold text-white/65">
                                      Advanced prompt (optional)
                                    </summary>
                                    <textarea
                                      className="input-field mt-3 min-h-[120px] resize-y font-mono text-[13px] leading-relaxed"
                                      value={comboField(draft, modalCombo.id, 'promptTemplate')}
                                      onChange={(e) =>
                                        setDraft(
                                          upsertComboDraft(draft, modalCombo.id, {
                                            promptTemplate: e.target.value,
                                          }),
                                        )
                                      }
                                      placeholder="Leave blank to use Defaults."
                                    />
                                  </details>
                                  <button
                                    type="button"
                                    className="btn-primary w-full"
                                    disabled={!isDirty || saveMutation.isPending}
                                    onClick={() => saveMutation.mutate()}
                                  >
                                    {saveMutation.isPending ? 'Saving…' : 'Save instructions'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
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
                          Drop example uniforms here
                        </p>
                        <p className="mt-2 text-sm text-white/45">
                          PNG or JPEG · these teach the AI your look
                        </p>
                        <label className="btn-ghost mt-5 inline-flex cursor-pointer !px-5 !py-2.5 text-sm">
                          {uploadMutation.isPending ? 'Uploading…' : 'Choose photos'}
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
                          <p className="text-white/55">No examples yet for {draft.label}.</p>
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
                                className="aspect-square w-full object-cover"
                              />
                              <div className="flex items-center justify-end px-3 py-2.5">
                                <button
                                  type="button"
                                  className="rounded-md px-2 py-1 text-xs text-red-300"
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
                    </>
                  )}
                </div>
              )}

              {tab === 'defaults' && (
                <div className="mx-auto max-w-2xl space-y-6">
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/55">
                    These apply to every look for this sport. Individual looks can override them —
                    if a look leaves a field blank, these Defaults are used.
                  </p>

                  <label className="block space-y-2">
                    <span className="field-label">Rules every look follows</span>
                    <textarea
                      className="input-field min-h-[180px] resize-y text-sm leading-relaxed"
                      value={draft.instructions}
                      onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                      placeholder="Example: Always show the full uniform head to toe. Bold graphics. Clean white background. No watermarks."
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="field-label">Extra notes</span>
                    <textarea
                      className="input-field min-h-[140px] resize-y text-sm leading-relaxed"
                      value={draft.knowledgeBase}
                      onChange={(e) => setDraft({ ...draft, knowledgeBase: e.target.value })}
                      placeholder="Optional. Example: Compression tops + shorts. Aggressive mascot graphics. Keep numbers readable."
                    />
                  </label>

                  <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-white/65">
                      Advanced prompt template
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="m-0 text-sm text-white/45">
                        Optional. Only change this if you know how prompt templates work.
                      </p>
                      <div className="space-y-2">
                        <span className="field-label">Insert placeholder</span>
                        <PlaceholderChips
                          placeholders={KNOWLEDGE_PLACEHOLDERS}
                          onInsert={insertPlaceholder}
                        />
                      </div>
                      <textarea
                        ref={templateRef}
                        className="input-field min-h-[200px] resize-y font-mono text-[13px] leading-relaxed"
                        value={draft.promptTemplate}
                        onChange={(e) => setDraft({ ...draft, promptTemplate: e.target.value })}
                        placeholder="Create a premium custom {{sport}} uniform for {{teamName}}…"
                      />
                    </div>
                  </details>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="m-0 font-display text-2xl tracking-wide text-white">
                      Logo
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">
                      Logo prompts for this sport when a lead chooses “create a new logo.” Step 1
                      generates the logo; step 2 puts it on the uniform mockup.
                    </p>
                  </div>

                  <label className="block space-y-2">
                    <span className="field-label">Logo rules (always applied)</span>
                    <textarea
                      className="input-field min-h-[140px] resize-y text-sm leading-relaxed"
                      value={draft.logoInstructions || ''}
                      onChange={(e) =>
                        setDraft({ ...draft, logoInstructions: e.target.value })
                      }
                      placeholder="Output ONLY the logo on a clean white background…"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="field-label">Logo prompt template</span>
                    <div className="space-y-2">
                      <span className="text-xs text-white/40">Insert placeholder</span>
                      <PlaceholderChips
                        placeholders={LOGO_PROMPT_PLACEHOLDERS}
                        onInsert={insertLogoPlaceholder}
                      />
                    </div>
                    <textarea
                      ref={logoTemplateRef}
                      className="input-field min-h-[240px] resize-y font-mono text-[13px] leading-relaxed"
                      value={draft.logoPromptTemplate || ''}
                      onChange={(e) =>
                        setDraft({ ...draft, logoPromptTemplate: e.target.value })
                      }
                      placeholder="Create a single premium sports team logo for {{teamName}}…"
                    />
                    <p className="m-0 text-xs text-white/40">
                      Use {'{{textSentence}}'}, {'{{iconSentence}}'}, and {'{{notesSentence}}'} for
                      optional lines that auto-hide when empty.
                    </p>
                  </label>

                  <div className="space-y-3">
                    <div>
                      <h4 className="m-0 text-sm font-semibold text-white/80">
                        Logo samples by type
                      </h4>
                      <p className="mt-1 text-sm text-white/45">
                        Upload example logos for each form category. When a lead picks that logo
                        type, these images guide the free logo AI.
                      </p>
                    </div>

                    {LOGO_COMPOSITION_OPTIONS.map((composition) => {
                      const samples = getLogoSamplesForComposition(draft, composition);
                      return (
                        <div
                          key={composition}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="m-0 text-sm font-semibold text-white">{composition}</p>
                              <p className="mt-0.5 text-xs text-white/40">
                                {samples.length
                                  ? `${samples.length} sample${samples.length === 1 ? '' : 's'}`
                                  : 'No samples yet'}
                              </p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-accent/50 hover:text-accent">
                              {uploadMutation.isPending ? 'Uploading…' : 'Add photo'}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="sr-only"
                                disabled={uploadMutation.isPending}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (file) {
                                    uploadFile(file, { logoComposition: composition });
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {samples.length > 0 ? (
                            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {samples.map((sample) => (
                                <li
                                  key={sample.id}
                                  className="overflow-hidden rounded-lg border border-white/10 bg-black/30"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={sample.url}
                                    alt={sample.caption || sample.filename}
                                    className="aspect-square w-full object-cover"
                                  />
                                  <div className="flex items-center justify-end px-2 py-1.5">
                                    <button
                                      type="button"
                                      className="rounded-md px-1.5 py-0.5 text-[11px] text-red-300"
                                      disabled={deleteMutation.isPending}
                                      onClick={() => deleteMutation.mutate(sample.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
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
