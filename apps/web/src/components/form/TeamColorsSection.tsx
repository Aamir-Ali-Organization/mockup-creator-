'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { colorPreviewHex } from '@/lib/colors';
import { ColorField } from '@/components/ui/ColorField';

function isLightHex(hex: string): boolean {
  const expanded = hex.replace('#', '');
  if (expanded.length !== 6) return false;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

const SLOTS = [
  { key: 'primaryColor', short: 'Primary', watch: 'primary' as const },
  { key: 'secondaryColor', short: 'Secondary', watch: 'secondary' as const },
  { key: 'alternateColor', short: 'Alternate', watch: 'alternate' as const },
] as const;

export function TeamColorsSection() {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const primary = (useWatch({ control, name: 'primaryColor' }) || '') as string;
  const secondary = (useWatch({ control, name: 'secondaryColor' }) || '') as string;
  const alternate = (useWatch({ control, name: 'alternateColor' }) || '') as string;

  const values = { primary, secondary, alternate };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
        <div className="flex min-h-[4.5rem]">
          {SLOTS.map((slot) => {
            const raw = values[slot.watch];
            const filled = Boolean(raw.trim());
            const hex = filled ? colorPreviewHex(raw) : null;
            const light = hex ? isLightHex(hex) : false;

            return (
              <div
                key={slot.key}
                className="relative flex min-w-0 flex-1 flex-col justify-between border-r border-white/10 px-2.5 py-2.5 last:border-r-0"
                style={{
                  backgroundColor: hex || 'transparent',
                  backgroundImage: hex
                    ? undefined
                    : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                }}
              >
                <span
                  className={`w-fit rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
                    hex
                      ? light
                        ? 'bg-black/45 text-white'
                        : 'bg-white/90 text-ink'
                      : 'bg-white/10 text-white/55'
                  }`}
                >
                  {slot.short}
                </span>
                <span
                  className={`truncate text-sm font-semibold ${
                    hex ? (light ? 'text-ink' : 'text-white') : 'text-white/35'
                  }`}
                >
                  {filled ? raw : 'Not set'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="primaryColor"
          control={control}
          render={({ field }) => (
            <ColorField
              label="Primary"
              requiredMark
              name={field.name}
              value={field.value || ''}
              onBlur={field.onBlur}
              onChange={field.onChange}
              error={errors.primaryColor?.message as string | undefined}
              ref={field.ref}
            />
          )}
        />
        <Controller
          name="secondaryColor"
          control={control}
          render={({ field }) => (
            <ColorField
              label="Secondary"
              requiredMark
              name={field.name}
              value={field.value || ''}
              onBlur={field.onBlur}
              onChange={field.onChange}
              error={errors.secondaryColor?.message as string | undefined}
              ref={field.ref}
            />
          )}
        />
        <Controller
          name="alternateColor"
          control={control}
          render={({ field }) => (
            <ColorField
              className="sm:col-span-2"
              label="Alternate"
              optional
              name={field.name}
              value={field.value || ''}
              onBlur={field.onBlur}
              onChange={field.onChange}
              error={errors.alternateColor?.message as string | undefined}
              ref={field.ref}
            />
          )}
        />
      </div>
    </div>
  );
}
