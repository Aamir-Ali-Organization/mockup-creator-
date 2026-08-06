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

export const GENDERS = ['Mens', 'Womens', 'Boys', 'Girls', 'Co-ed'] as const;

export const AGE_GROUPS = ['Youth', 'Adult', 'Both'] as const;

export const LOGO_CREATION_OPTIONS = [
  'Yes — create a new logo',
  'No — I’ll attach an existing logo',
  'Not sure yet',
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
