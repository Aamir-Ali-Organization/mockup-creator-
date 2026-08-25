export const SPORTS = [
  'Flag Football',
  'Tackle Football',
  'Track',
  '7v7',
  'Basketball',
  'Softball',
  'Volleyball',
  'Baseball',
  'Tennis',
  'Soccer',
  'Gymnastics',
  'Pickleball',
  'Other',
] as const;

/** Sports shown on the public quote form. Full `SPORTS` stays available in knowledge admin. */
export const PUBLIC_SPORTS = ['Flag Football'] as const;

export const GENDERS = ['Mens', 'Womens', 'Boys', 'Girls'] as const;

export const AGE_GROUPS = ['Youth', 'Adult'] as const;

/** Genders that always use Adult sizing (Youth/Adult locked). */
export const ADULT_LOCKED_GENDERS = ['Mens', 'Womens'] as const;

/** Sports that collect shirt/short construction details. */
export const GARMENT_DETAIL_SPORTS = ['Flag Football', '7v7'] as const;

export const SHIRT_STYLES = [
  'DRI FIT short sleeves',
  'DRIFIT Sleeveless',
  'DRIFIT Sleeveless with Hoodie',
  'DRIFIT short sleeves with Hoodie',
  'DRIFIT long sleeves with Hoodie',
  'DRIFIT long sleeves with NO Hoodie',
] as const;

export const SHIRT_TYPES = ['COMPRESSION DRI-FIT', 'REGULAR FIT DRI-FIT'] as const;

export const SHORT_TYPES = ['COMPRESSION DRI-FIT', 'REGULAR FIT DRI-FIT'] as const;

export function sportNeedsGarmentDetails(sport: string) {
  return (GARMENT_DETAIL_SPORTS as readonly string[]).includes(sport);
}

export function genderLocksAdult(gender: string) {
  return (ADULT_LOCKED_GENDERS as readonly string[]).includes(gender);
}

export const LOGO_CREATION_OPTIONS = [
  'Yes — create a new logo',
  'No — I’ll attach an existing logo',
  'Not sure yet',
] as const;

/** Option that asks AI to invent a new team logo. */
export const LOGO_CREATE_OPTION = LOGO_CREATION_OPTIONS[0];

/** Option that requires a logo file upload. */
export const LOGO_ATTACH_OPTION = LOGO_CREATION_OPTIONS[1];

/** Logo design questionnaire (shown when creating a new logo). */
export const LOGO_COMPOSITION_OPTIONS = [
  'Wordmark only (text)',
  'Icon / mascot only',
  'Word + icon combined',
  'Badge / shield emblem',
] as const;

export const LOGO_VIBE_OPTIONS = [
  'Bold & aggressive',
  'Clean & modern',
  'Classic / vintage',
  'Playful',
] as const;

export const LOGO_COLOR_SOURCE_OPTIONS = [
  'Use my team colors',
  'I want specific logo colors',
] as const;

export function logoCompositionNeedsIcon(composition: string) {
  return composition !== 'Wordmark only (text)';
}

export function logoCompositionNeedsText(composition: string) {
  return composition !== 'Icon / mascot only';
}

export const ACCESSORY_GROUPS = [
  {
    title: 'Gear',
    items: [
      'Football Receiver Gloves',
      'Sports Sleeve',
      'Headband',
      'Headgear',
      'Socks',
      'Beanie',
    ],
  },
  {
    title: 'Bags',
    items: ['Backpack', 'Duffle Bag', 'Drawstring Bag'],
  },
  {
    title: 'Apparel',
    items: [
      'Baseball Hat',
      "Coach's Polo",
      'Sweatsuit',
      'Sweat Pants',
      "Dri Fit Coach's Hoodie",
    ],
  },
  {
    title: 'Flags',
    items: ['Flag Football Popper Flags', 'Flag Football Triple Threat Flags'],
  },
] as const;

export const REFERRAL_SOURCES = [
  'Instagram',
  'TikTok',
  'Facebook',
  'Google',
  'Friend / teammate',
  'Coach / organization',
  'Event / tournament',
  'Other',
] as const;

export const ACCESSORIES = [
  'Football Receiver Gloves',
  'Backpack',
  'Baseball Hat',
  'Sports Sleeve',
  'Headband',
  'Headgear',
  'Duffle Bag',
  'Drawstring Bag',
  "Coach's Polo",
  'Sweatsuit',
  'Sweat Pants',
  "Dri Fit Coach's Hoodie",
  'Socks',
  'Beanie',
  'Flag Football Popper Flags',
  'Flag Football Triple Threat Flags',
] as const;

export const QUOTE_STATUSES = [
  'PENDING',
  'PROCESSING',
  'MOCKUP_READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.pdf',
  '.docx',
  '.csv',
  '.xlsx',
  '.xls',
] as const;

export const MIN_UNIFORM_QUANTITY = 10;
