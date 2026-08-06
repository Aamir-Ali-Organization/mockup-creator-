import type { FieldValues, Path, UseFormSetValue } from 'react-hook-form';
import { formatUsPhone } from '@/lib/phone';

/**
 * Browser autofill / form-filler tools often set input.value without firing React
 * onChange, so RHF state stays empty while the UI looks filled. Pull DOM values
 * into RHF before validation.
 */
export function syncFieldsFromDom<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
  fields: Path<T>[],
) {
  for (const name of fields) {
    const key = String(name);
    if (key === 'accessories' || key === 'logoFile' || key === 'rosterFile') continue;

    const el = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${CSS.escape(key)}"]`,
    );
    if (!el) continue;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      if (key === 'consent') {
        setValue(name, (el.checked ? true : undefined) as T[Path<T>], {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      continue;
    }

    let value: string = el.value;
    if (key === 'phone') {
      value = formatUsPhone(value);
      if (el instanceof HTMLInputElement && el.value !== value) {
        el.value = value;
      }
    }

    setValue(name, value as T[Path<T>], {
      shouldDirty: true,
      shouldValidate: false,
    });
  }
}
