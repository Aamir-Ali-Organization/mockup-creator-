/** US local phone only — strips +1 / leading country code 1. */
export function normalizeUsPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');

  // Drop country code so users never keep +1 in the field.
  if (digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

export function formatUsPhone(value: string): string {
  const digits = normalizeUsPhoneDigits(value);
  if (!digits) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isCompleteUsPhone(value: string): boolean {
  return normalizeUsPhoneDigits(value).length === 10;
}
