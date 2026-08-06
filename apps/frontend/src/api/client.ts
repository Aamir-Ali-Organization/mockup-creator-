import type { QuoteFormValues, QuoteResponse } from '@mockup/shared';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

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

export type CreateQuoteResult = {
  success: boolean;
  quote: QuoteResponse;
};

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

export async function createQuote(values: CreateQuotePayload): Promise<CreateQuoteResult> {
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
  formData.append('rosterInfo', values.rosterInfo || '');
  formData.append('logoCreation', values.logoCreation || '');
  formData.append('referralSource', values.referralSource);

  values.accessories.forEach((item) => formData.append('accessories', item));

  if (values.fleadid) formData.append('fleadid', values.fleadid);
  if (values.ghlContactId) formData.append('ghlContactId', values.ghlContactId);

  const roster = values.rosterFile?.[0];
  if (roster) formData.append('rosterFile', roster);

  const logo = values.logoFile?.[0];
  if (logo) formData.append('logoFile', logo);

  const response = await fetch(`${API_URL}/api/quotes`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<CreateQuoteResult>;
}

export async function resolveLead(fleadid?: string | null): Promise<LeadResolveResult> {
  const params = new URLSearchParams();
  if (fleadid) params.set('fleadid', fleadid);
  const response = await fetch(`${API_URL}/api/leads/resolve?${params.toString()}`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<LeadResolveResult>;
}

export async function getQuote(id: string): Promise<QuoteResponse> {
  const response = await fetch(`${API_URL}/api/quotes/${id}`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const data = (await response.json()) as { quote: QuoteResponse };
  return data.quote;
}

export async function generateMockup(quoteId: string) {
  const response = await fetch(`${API_URL}/api/mockups/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteId }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<{
    success: boolean;
    status: string;
    mockupImages: string[];
  }>;
}

export function getUploadUrl(pathOrFile: string): string {
  if (pathOrFile.startsWith('http://') || pathOrFile.startsWith('https://')) {
    return pathOrFile;
  }
  const normalized = pathOrFile.startsWith('/') ? pathOrFile : `/uploads/${pathOrFile}`;
  return `${API_URL}${normalized}`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
