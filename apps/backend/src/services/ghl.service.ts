import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export type GhlContact = {
  id: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  customFields?: Array<{ id?: string; key?: string; fieldKey?: string; value?: unknown }>;
  facebookLeadId?: string;
  [key: string]: unknown;
};

export type LeadPrefill = {
  mode: 'existing' | 'new';
  fleadid: string | null;
  contactId: string | null;
  prefill: {
    customerName?: string;
    email?: string;
    phone?: string;
    teamName?: string;
    sport?: string;
    primaryColor?: string;
    secondaryColor?: string;
    alternateColor?: string;
    gender?: string;
    ageGroup?: string;
    quantity?: number;
    referralSource?: string;
  };
  mockupAlreadyGenerated: boolean;
  raw?: GhlContact | null;
};

type UpsertLeadInput = {
  fleadid?: string | null;
  contactId?: string | null;
  customerName: string;
  email: string;
  phone: string;
  teamName: string;
  sport: string;
  gender: string;
  ageGroup: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor?: string;
  quantity: number;
  accessories: string[];
  rosterInfo?: string;
  logoCreation?: string | null;
  referralSource: string;
  mockupGenerated?: boolean;
  mockupImageUrl?: string | null;
};

function assertGhlConfigured() {
  if (!env.GHL_API_KEY) {
    throw new AppError('GHL_API_KEY is not configured', 503);
  }
  if (!env.GHL_LOCATION_ID) {
    throw new AppError(
      'GHL_LOCATION_ID is not configured. Copy it from your GHL sub-account URL.',
      503,
    );
  }
}

async function ghlFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertGhlConfigured();

  const response = await fetch(`${env.GHL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GHL_API_KEY}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      `GHL API error (${response.status})`;
    throw new AppError(message, response.status === 401 ? 503 : response.status, data);
  }

  return data as T;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Lead', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function readCustomField(contact: GhlContact, keys: string[]): string | undefined {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  for (const field of contact.customFields || []) {
    const key = String(field.key || field.fieldKey || field.id || '').toLowerCase();
    if (wanted.has(key) && field.value != null && String(field.value).trim()) {
      return String(field.value);
    }
  }
  return undefined;
}

function contactHasMockup(contact: GhlContact): boolean {
  const flag = readCustomField(contact, [
    env.GHL_MOCKUP_GENERATED_FIELD,
    'mockup_generated',
    'mockupGenerated',
  ]);
  if (flag && ['true', '1', 'yes'].includes(flag.toLowerCase())) return true;
  const images = readCustomField(contact, [env.GHL_MOCKUP_IMAGE_FIELD, 'mockup_image', 'mockupUrl']);
  return Boolean(images);
}

function mapContactToPrefill(contact: GhlContact): LeadPrefill['prefill'] {
  const fullName =
    contact.name ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    undefined;

  const quantityRaw = readCustomField(contact, ['quantity', 'uniform_quantity', 'uniforms']);
  const quantity = quantityRaw ? Number(quantityRaw) : undefined;

  return {
    customerName: fullName,
    email: contact.email,
    phone: contact.phone,
    teamName: readCustomField(contact, ['team_name', 'teamName', 'team']),
    sport: readCustomField(contact, ['sport']),
    primaryColor: readCustomField(contact, ['primary_color', 'primaryColor', 'color_primary']),
    secondaryColor: readCustomField(contact, [
      'secondary_color',
      'secondaryColor',
      'color_secondary',
    ]),
    alternateColor: readCustomField(contact, [
      'alternate_color',
      'alternateColor',
      'accent_color',
    ]),
    gender: readCustomField(contact, ['gender', 'team_gender']),
    ageGroup: readCustomField(contact, ['age_group', 'ageGroup', 'youth_or_adult']),
    quantity: Number.isFinite(quantity) ? quantity : undefined,
    referralSource: readCustomField(contact, ['referral_source', 'referralSource']) || 'Facebook',
  };
}

async function searchContacts(query: string): Promise<GhlContact[]> {
  const data = await ghlFetch<{ contacts?: GhlContact[] }>('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      locationId: env.GHL_LOCATION_ID,
      pageLimit: 20,
      query,
    }),
  });
  return data.contacts || [];
}

function contactMatchesFleadid(contact: GhlContact, fleadid: string): boolean {
  if (contact.facebookLeadId && String(contact.facebookLeadId) === fleadid) return true;
  const custom = readCustomField(contact, [
    env.GHL_FACEBOOK_LEAD_FIELD,
    'facebook_lead_id',
    'facebookLeadId',
    'fleadid',
    'fb_lead_id',
  ]);
  return custom === fleadid;
}

/**
 * Resolve lead for the public form.
 * - no fleadid => public/new lead mode
 * - fleadid found => existing contact prefill
 * - fleadid missing in GHL => treat as new lead
 */
export async function resolveLeadByFleadid(fleadid?: string | null): Promise<LeadPrefill> {
  const cleaned = fleadid?.trim() || null;

  if (!cleaned) {
    return {
      mode: 'new',
      fleadid: null,
      contactId: null,
      prefill: {},
      mockupAlreadyGenerated: false,
      raw: null,
    };
  }

  try {
    const contacts = await searchContacts(cleaned);
    const match = contacts.find((contact) => contactMatchesFleadid(contact, cleaned)) || null;

    if (!match) {
      return {
        mode: 'new',
        fleadid: cleaned,
        contactId: null,
        prefill: { referralSource: 'Facebook' },
        mockupAlreadyGenerated: false,
        raw: null,
      };
    }

    return {
      mode: 'existing',
      fleadid: cleaned,
      contactId: match.id,
      prefill: mapContactToPrefill(match),
      mockupAlreadyGenerated: contactHasMockup(match),
      raw: match,
    };
  } catch (error) {
    // If GHL is misconfigured/scopes missing, fall back to public/new lead UX.
    if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 503)) {
      return {
        mode: 'new',
        fleadid: cleaned,
        contactId: null,
        prefill: { referralSource: 'Facebook' },
        mockupAlreadyGenerated: false,
        raw: null,
      };
    }
    throw error;
  }
}

function buildCustomFields(input: UpsertLeadInput) {
  const values: Record<string, string> = {
    [env.GHL_FACEBOOK_LEAD_FIELD]: input.fleadid || '',
    team_name: input.teamName,
    sport: input.sport,
    gender: input.gender,
    age_group: input.ageGroup,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    alternate_color: input.alternateColor || '',
    quantity: String(input.quantity),
    accessories: input.accessories.join(', '),
    roster_info: input.rosterInfo || '',
    logo_creation: input.logoCreation || '',
    referral_source: input.referralSource,
  };

  if (input.mockupGenerated != null) {
    values[env.GHL_MOCKUP_GENERATED_FIELD] = input.mockupGenerated ? 'true' : 'false';
  }
  if (input.mockupImageUrl) {
    values[env.GHL_MOCKUP_IMAGE_FIELD] = input.mockupImageUrl;
  }

  return Object.entries(values)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => ({ key, field_value: value }));
}

/**
 * Create or update a GHL contact for this form submission.
 * Public traffic and missing fleadid contacts become new GHL leads.
 */
export async function upsertLeadInGhl(input: UpsertLeadInput): Promise<{
  contactId: string;
  created: boolean;
  contact: GhlContact;
}> {
  assertGhlConfigured();
  const { firstName, lastName } = splitName(input.customerName);

  let existing: GhlContact | null = null;

  if (input.contactId) {
    try {
      const data = await ghlFetch<{ contact: GhlContact }>(`/contacts/${input.contactId}`);
      existing = data.contact;
    } catch {
      existing = null;
    }
  }

  if (!existing && input.fleadid) {
    const searched = await searchContacts(input.fleadid);
    existing = searched.find((contact) => contactMatchesFleadid(contact, input.fleadid!)) || null;
  }

  if (!existing && input.email) {
    const searched = await searchContacts(input.email);
    existing =
      searched.find((contact) => contact.email?.toLowerCase() === input.email.toLowerCase()) ||
      null;
  }

  const payload = {
    firstName,
    lastName,
    name: input.customerName,
    email: input.email,
    phone: input.phone,
    locationId: env.GHL_LOCATION_ID,
    source: input.fleadid ? 'Facebook Lead Form + Mockup Form' : 'Public Mockup Form',
    tags: ['mockup-form', input.fleadid ? 'facebook-lead' : 'public-lead'],
    customFields: buildCustomFields(input),
  };

  if (existing?.id) {
    const data = await ghlFetch<{ contact: GhlContact }>(`/contacts/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { contactId: data.contact.id, created: false, contact: data.contact };
  }

  const data = await ghlFetch<{ contact: GhlContact }>('/contacts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return { contactId: data.contact.id, created: true, contact: data.contact };
}

export function isGhlReady(): boolean {
  return Boolean(env.GHL_API_KEY && env.GHL_LOCATION_ID);
}
