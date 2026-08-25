import type { QuoteFormValues } from '@mockup/shared';

export type CreateQuotePayload = QuoteFormValues & {
  rosterFile?: FileList | null;
  logoFile?: FileList | null;
  fleadid?: string | null;
  ghlContactId?: string | null;
};

export type LeadResolveResult = {
  success: boolean;
  ghlReady: boolean;
  lead: {
    mode: 'existing' | 'new';
    fleadid: string | null;
    contactId: string | null;
    prefill: Partial<QuoteFormValues>;
    mockupAlreadyGenerated: boolean;
  };
};

export type MockupJob = {
  customerName: string;
  email: string;
  phone: string;
  teamName: string;
  sport: string;
  gender: string;
  ageGroup: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor?: string | null;
  quantity: number;
  shirtStyle?: string | null;
  shirtType?: string | null;
  shortType?: string | null;
  accessories: string[];
  rosterInfo?: string | null;
  logoCreation?: string | null;
  logoComposition?: string | null;
  logoText?: string | null;
  logoIcon?: string | null;
  logoColorSource?: string | null;
  logoPrimaryColor?: string | null;
  logoSecondaryColor?: string | null;
  logoAlternateColor?: string | null;
  logoVibe?: string | null;
  logoNotes?: string | null;
  referralSource: string;
};

export type SubmitResult = {
  success: boolean;
  contactId: string | null;
  fleadid: string | null;
  submissionId?: string | null;
  skipMockup: boolean;
  shouldGenerate: boolean;
  job: MockupJob;
};

export type GenerateResult = {
  success: boolean;
  skipped: boolean;
  alreadyGenerated?: boolean;
  message?: string;
  contactId?: string | null;
  fleadid?: string | null;
  submissionId?: string | null;
  imageDataUrl?: string;
  logoDataUrl?: string;
  model?: string;
};

export const MOCKUP_SESSION_KEY = 'bmd-mockup-session';

export type MockupSession = {
  contactId: string | null;
  fleadid: string | null;
  submissionId?: string | null;
  skipMockup: boolean;
  shouldGenerate: boolean;
  /** True after the free mockup finished (used to avoid regenerating on refresh). */
  hasGenerated?: boolean;
  job: MockupJob;
};

function sessionStorageKey(contactId?: string | null) {
  return contactId ? `${MOCKUP_SESSION_KEY}:${contactId}` : MOCKUP_SESSION_KEY;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
    if (data.details?.fieldErrors) {
      const first = Object.values(data.details.fieldErrors).flat()[0];
      if (first) return first;
    }
    return data.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function resolveLead(fleadid?: string | null): Promise<LeadResolveResult> {
  const params = new URLSearchParams();
  if (fleadid) params.set('fleadid', fleadid);
  const response = await fetch(`/api/leads/resolve?${params.toString()}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<LeadResolveResult>;
}

export async function submitQuote(values: CreateQuotePayload): Promise<SubmitResult> {
  const formData = new FormData();

  formData.append('customerName', values.customerName);
  formData.append('email', values.email);
  formData.append('phone', values.phone);
  formData.append('teamName', values.teamName);
  formData.append('sport', values.sport);
  formData.append('gender', values.gender);
  formData.append('ageGroup', values.ageGroup);
  formData.append('primaryColor', values.primaryColor);
  formData.append('secondaryColor', values.secondaryColor);
  formData.append('alternateColor', values.alternateColor || '');
  formData.append('quantity', String(values.quantity));
  formData.append('shirtStyle', values.shirtStyle || '');
  formData.append('shirtType', values.shirtType || '');
  formData.append('shortType', values.shortType || '');
  formData.append('rosterInfo', values.rosterInfo || '');
  formData.append('logoCreation', values.logoCreation || '');
  formData.append('logoComposition', values.logoComposition || '');
  formData.append('logoText', values.logoText || '');
  formData.append('logoIcon', values.logoIcon || '');
  formData.append('logoColorSource', values.logoColorSource || '');
  formData.append('logoPrimaryColor', values.logoPrimaryColor || '');
  formData.append('logoSecondaryColor', values.logoSecondaryColor || '');
  formData.append('logoAlternateColor', values.logoAlternateColor || '');
  formData.append('logoVibe', values.logoVibe || '');
  formData.append('logoNotes', values.logoNotes || '');
  formData.append('referralSource', values.referralSource);

  values.accessories.forEach((item) => formData.append('accessories', item));

  if (values.fleadid) formData.append('fleadid', values.fleadid);
  if (values.ghlContactId) formData.append('ghlContactId', values.ghlContactId);

  const roster = values.rosterFile?.[0];
  if (roster) formData.append('rosterFile', roster);

  const logo = values.logoFile?.[0];
  if (logo) formData.append('logoFile', logo);

  const response = await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<SubmitResult>;
}

export async function generateMockup(payload: {
  contactId: string | null;
  fleadid: string | null;
  submissionId?: string | null;
  job: MockupJob;
  force?: boolean;
}): Promise<GenerateResult> {
  const response = await fetch('/api/mockups/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<GenerateResult>;
}

export function saveMockupSession(session: MockupSession) {
  const payload = JSON.stringify(session);
  sessionStorage.setItem(sessionStorageKey(session.contactId), payload);
  // Keep a latest pointer for `/success` fallback redirects.
  sessionStorage.setItem(MOCKUP_SESSION_KEY, payload);
}

export function loadMockupSession(contactId?: string | null): MockupSession | null {
  try {
    const raw =
      sessionStorage.getItem(sessionStorageKey(contactId)) ||
      sessionStorage.getItem(MOCKUP_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MockupSession;
    if (contactId && session.contactId && session.contactId !== contactId) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function buildSuccessPath(contactId: string, fleadid?: string | null) {
  const params = new URLSearchParams();
  if (fleadid) params.set('fleadid', fleadid);
  const query = params.toString();
  return `/success/${encodeURIComponent(contactId)}${query ? `?${query}` : ''}`;
}
