import { sportNeedsGarmentDetails } from './constants.js';

export const STYLE_GENDER_FAMILIES = ['Male', 'Female'] as const;
export type StyleGenderFamily = (typeof STYLE_GENDER_FAMILIES)[number];

export const STYLE_FITS = ['Compression', 'Regular Fit'] as const;
export type StyleFit = (typeof STYLE_FITS)[number];

/** Sleeve / hood constructions used in sample titles. */
export const STYLE_SLEEVE_OPTIONS = [
  'Sleeveless with Hood',
  'Short Sleeves with Hood',
  'Sleeveless',
  'Short Sleeves',
  'Long Sleeves with Hood',
  'Long Sleeves',
] as const;
export type StyleSleeveOption = (typeof STYLE_SLEEVE_OPTIONS)[number];

export type StyleComboDefinition = {
  id: string;
  label: string;
  genderFamily: StyleGenderFamily;
  fit: StyleFit;
  sleeveStyle: StyleSleeveOption;
};

function comboId(gender: StyleGenderFamily, fit: StyleFit, sleeve: StyleSleeveOption) {
  return [
    gender.toLowerCase(),
    fit.toLowerCase().replace(/\s+/g, '-'),
    sleeve.toLowerCase().replace(/\s+/g, '-'),
  ].join('--');
}

function comboLabel(gender: StyleGenderFamily, fit: StyleFit, sleeve: StyleSleeveOption) {
  const fitKey = fit === 'Regular Fit' ? 'REGULAR FIT' : 'COMPRESSION';
  return `${gender.toUpperCase()} ${fitKey} (${sleeve.toUpperCase()})`;
}

/** Canonical sample slots shown in admin (matches spreadsheet title pattern). */
export const STYLE_COMBO_DEFINITIONS: StyleComboDefinition[] = STYLE_GENDER_FAMILIES.flatMap(
  (genderFamily) =>
    STYLE_FITS.flatMap((fit) =>
      STYLE_SLEEVE_OPTIONS.map((sleeveStyle) => ({
        id: comboId(genderFamily, fit, sleeveStyle),
        label: comboLabel(genderFamily, fit, sleeveStyle),
        genderFamily,
        fit,
        sleeveStyle,
      })),
    ),
);

export function getStyleComboById(comboIdValue: string): StyleComboDefinition | undefined {
  return STYLE_COMBO_DEFINITIONS.find((c) => c.id === comboIdValue);
}

export function sportUsesStyleCombos(sport: string): boolean {
  return sportNeedsGarmentDetails(sport);
}

/** Map form Team Gender → Male / Female sample family. */
export function genderToStyleFamily(gender: string): StyleGenderFamily | null {
  const g = gender.trim().toLowerCase();
  if (g === 'mens' || g === 'boys' || g === 'male') return 'Male';
  if (g === 'womens' || g === 'girls' || g === 'female') return 'Female';
  return null;
}

/** Map form Shirt Type → Compression / Regular Fit. */
export function shirtTypeToStyleFit(shirtType: string): StyleFit | null {
  const t = shirtType.trim().toLowerCase();
  if (t.includes('compression')) return 'Compression';
  if (t.includes('regular')) return 'Regular Fit';
  return null;
}

/** Map form Shirt Style → sleeve/hood sample key. */
export function shirtStyleToSleeveOption(shirtStyle: string): StyleSleeveOption | null {
  const s = shirtStyle.trim().toLowerCase().replace(/dri\s*fit/g, '').replace(/drifit/g, '');
  const hasHood = s.includes('hood');
  const sleeveless = s.includes('sleeveless');
  const long = s.includes('long');
  const short = s.includes('short');

  if (sleeveless && hasHood) return 'Sleeveless with Hood';
  if (sleeveless) return 'Sleeveless';
  if (long && hasHood) return 'Long Sleeves with Hood';
  if (long) return 'Long Sleeves';
  if (short && hasHood) return 'Short Sleeves with Hood';
  if (short) return 'Short Sleeves';
  return null;
}

export function resolveStyleComboId(input: {
  gender?: string | null;
  shirtType?: string | null;
  shirtStyle?: string | null;
}): string | null {
  const genderFamily = genderToStyleFamily(input.gender || '');
  const fit = shirtTypeToStyleFit(input.shirtType || '');
  const sleeveStyle = shirtStyleToSleeveOption(input.shirtStyle || '');
  if (!genderFamily || !fit || !sleeveStyle) return null;
  return comboId(genderFamily, fit, sleeveStyle);
}
