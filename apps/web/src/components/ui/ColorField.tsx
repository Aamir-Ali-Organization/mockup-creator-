'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
} from 'react';
import { TEAM_COLOR_PRESETS, colorPreviewHex, findPresetByHex } from '@/lib/colors';

type ColorFieldProps = {
  label: string;
  name?: string;
  error?: string;
  requiredMark?: boolean;
  optional?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
};

function isLightHex(hex: string): boolean {
  const expanded = hex.replace('#', '');
  if (expanded.length !== 6) return false;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

export const ColorField = forwardRef<HTMLInputElement, ColorFieldProps>(function ColorField(
  {
    label,
    name,
    error,
    requiredMark,
    optional,
    value = '',
    onChange,
    onBlur,
    className = '',
  },
  ref,
) {
  const reactId = useId();
  const fieldId = name || `color-${reactId}`;
  const pickerId = `${fieldId}-picker`;
  const dialogId = `${fieldId}-quick`;
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const hasValue = Boolean(value.trim());
  const preview = hasValue ? colorPreviewHex(value) : null;
  const activeName = value.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const pickPreset = (colorName: string) => {
    onChange?.(colorName);
    setOpen(false);
  };

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
        {optional ? (
          <span className="ml-1.5 normal-case tracking-normal text-white/35">optional</span>
        ) : null}
      </label>

      <div
        className={`flex items-center overflow-hidden rounded-xl border bg-white/[0.06] transition ${
          error
            ? 'border-heat/70'
            : 'border-white/15 hover:border-white/30 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(255,212,0,0.12)]'
        }`}
      >
        <label
          htmlFor={pickerId}
          title="Open color picker"
          className={`relative m-1.5 grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border transition ${
            preview
              ? 'border-white/25'
              : 'border-dashed border-white/35 bg-gradient-to-br from-white/10 to-white/[0.02] hover:border-accent/50'
          }`}
          style={preview ? { backgroundColor: preview } : undefined}
        >
          <input
            id={pickerId}
            type="color"
            value={preview || '#E30613'}
            aria-label={`${label} color picker`}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              const hex = event.target.value.toUpperCase();
              const match = findPresetByHex(hex);
              onChange?.(match ? match.name : hex);
            }}
          />
          {preview ? (
            <span
              className={`relative z-[1] rounded px-1 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide ${
                isLightHex(preview) ? 'bg-black/50 text-white' : 'bg-white/85 text-ink'
              }`}
            >
              Edit
            </span>
          ) : (
            <span className="relative z-[1] text-[0.58rem] font-bold uppercase tracking-[0.06em] text-white/70">
              Pick
            </span>
          )}
        </label>

        <input
          ref={ref}
          id={fieldId}
          name={name}
          type="text"
          autoComplete="off"
          placeholder="e.g. Red"
          aria-invalid={error ? true : undefined}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange?.(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-3 text-base font-medium text-white outline-none placeholder:text-white/35"
        />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="m-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-white/80 transition hover:border-accent/50 hover:text-accent"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
        >
          <span className="flex -space-x-1" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-heat ring-1 ring-black/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent ring-1 ring-black/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#1E4DD8] ring-1 ring-black/40" />
          </span>
          Quick
        </button>
      </div>

      {error ? (
        <p className="m-0 text-sm font-medium text-heat" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={`Quick colors for ${label}`}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
                  Quick colors
                </p>
                <h3 className="mt-1 font-display text-3xl tracking-wide text-white">{label}</h3>
                <p className="mt-1 text-sm text-white/50">Tap a color to use it for this field.</p>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TEAM_COLOR_PRESETS.map((preset) => {
                const selected = activeName === preset.name.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => pickPreset(preset.name)}
                    className={`flex flex-col overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 ${
                      selected
                        ? 'border-accent shadow-[0_0_0_2px_rgba(255,212,0,0.3)]'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span
                      className={`h-12 w-full ${isLightHex(preset.hex) ? 'border-b border-black/10' : ''}`}
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span
                      className={`px-2 py-1.5 text-xs font-semibold ${
                        selected ? 'bg-accent/15 text-accent' : 'bg-white/[0.04] text-white/75'
                      }`}
                    >
                      {selected ? `✓ ${preset.name}` : preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-0 mt-4 text-center text-[0.75rem] text-white/40">
              Or tap the Pick square for a custom color
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
});
