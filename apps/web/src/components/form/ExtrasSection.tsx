'use client';

import { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  ACCESSORIES,
  ACCESSORY_GROUPS,
  LOGO_ATTACH_OPTION,
  LOGO_COLOR_SOURCE_OPTIONS,
  LOGO_COMPOSITION_OPTIONS,
  LOGO_CREATE_OPTION,
  LOGO_CREATION_OPTIONS,
  LOGO_VIBE_OPTIONS,
  logoCompositionNeedsIcon,
  logoCompositionNeedsText,
} from '@mockup/shared';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { FileField } from '@/components/ui/FileField';
import { ColorField } from '@/components/ui/ColorField';
import { colorPreviewHex } from '@/lib/colors';

type Accessory = (typeof ACCESSORIES)[number];

function isLightHex(hex: string): boolean {
  const expanded = hex.replace('#', '');
  if (expanded.length !== 6) return false;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

const LOGO_COLOR_SLOTS = [
  { key: 'logoPrimaryColor', short: 'Primary', watch: 'primary' as const, required: true },
  { key: 'logoSecondaryColor', short: 'Secondary', watch: 'secondary' as const, required: true },
  { key: 'logoAlternateColor', short: 'Alternate', watch: 'alternate' as const, required: false },
] as const;

export function ExtrasSection() {
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext();

  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const accessories = (useWatch({ control, name: 'accessories' }) || []) as Accessory[];
  const logoCreation = (useWatch({ control, name: 'logoCreation' }) || '') as string;
  const logoComposition = (useWatch({ control, name: 'logoComposition' }) || '') as string;
  const logoColorSource = (useWatch({ control, name: 'logoColorSource' }) || '') as string;
  const teamName = (useWatch({ control, name: 'teamName' }) || '') as string;
  const logoPrimaryColor = (useWatch({ control, name: 'logoPrimaryColor' }) || '') as string;
  const logoSecondaryColor = (useWatch({ control, name: 'logoSecondaryColor' }) || '') as string;
  const logoAlternateColor = (useWatch({ control, name: 'logoAlternateColor' }) || '') as string;
  const needsLogoUpload = logoCreation === LOGO_ATTACH_OPTION;
  const needsLogoBrief = logoCreation === LOGO_CREATE_OPTION;
  const showLogoText =
    needsLogoBrief && Boolean(logoComposition) && logoCompositionNeedsText(logoComposition);
  const showLogoIcon =
    needsLogoBrief && Boolean(logoComposition) && logoCompositionNeedsIcon(logoComposition);
  const showCustomColors = needsLogoBrief && logoColorSource === 'I want specific logo colors';
  const logoColorValues = {
    primary: logoPrimaryColor,
    secondary: logoSecondaryColor,
    alternate: logoAlternateColor,
  };

  useEffect(() => {
    if (!needsLogoUpload) {
      setValue('logoFile', undefined, { shouldValidate: true });
    }
  }, [needsLogoUpload, setValue]);

  useEffect(() => {
    if (!needsLogoBrief) {
      setValue('logoComposition', '', { shouldValidate: false });
      setValue('logoText', '', { shouldValidate: false });
      setValue('logoIcon', '', { shouldValidate: false });
      setValue('logoColorSource', '', { shouldValidate: false });
      setValue('logoPrimaryColor', '', { shouldValidate: false });
      setValue('logoSecondaryColor', '', { shouldValidate: false });
      setValue('logoAlternateColor', '', { shouldValidate: false });
      setValue('logoVibe', '', { shouldValidate: false });
      setValue('logoNotes', '', { shouldValidate: false });
      return;
    }
    const currentText = String(getValues('logoText') || '').trim();
    if (!currentText && teamName) {
      setValue('logoText', teamName, { shouldValidate: false, shouldDirty: false });
    }
  }, [needsLogoBrief, teamName, getValues, setValue]);

  useEffect(() => {
    if (!accessoriesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccessoriesOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [accessoriesOpen]);

  const toggleAccessory = (item: Accessory, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...accessories, item]))
      : accessories.filter((value) => value !== item);
    setValue('accessories', next, { shouldDirty: true, shouldValidate: true });
  };

  const clearAccessories = () => {
    setValue('accessories', [], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="m-0 font-display text-2xl tracking-wide text-white">Accessories</h3>
            <p className="mt-1 text-sm text-white/45">Optional add-ons for the order</p>
          </div>
          <button
            type="button"
            onClick={() => setAccessoriesOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:border-accent/50 hover:text-accent"
          >
            {accessories.length ? `Edit · ${accessories.length}` : 'Select accessories'}
          </button>
        </div>

        {accessories.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {accessories.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => toggleAccessory(item, false)}
                  className="rounded-full px-1 text-accent/80 hover:bg-accent/20 hover:text-accent"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-0 mt-3 text-sm text-white/35">No accessories selected</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="mb-3">
          <h3 className="m-0 font-display text-2xl tracking-wide text-white">Roster</h3>
          <p className="mt-1 text-sm text-white/45">
            Add notes and/or attach a roster file — whichever is easiest.
          </p>
        </div>
        <div className="space-y-3">
          <TextAreaField
            label="Roster notes"
            placeholder="Names, numbers, sizes…"
            {...register('rosterInfo')}
          />
          <Controller
            name="rosterFile"
            control={control}
            render={({ field }) => (
              <FileField
                label="Attach roster file"
                name={field.name}
                accept=".png,.jpg,.jpeg,.pdf,.docx,.csv,.xlsx,.xls"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.files)}
                ref={field.ref}
                error={errors.rosterFile?.message as string | undefined}
              />
            )}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="mb-3">
          <h3 className="m-0 font-display text-2xl tracking-wide text-white">Logo</h3>
          <p className="mt-1 text-sm text-white/45">
            Already have a logo? Attach a PNG/JPEG. Need one made? Pick create new.
          </p>
        </div>
        <div className="space-y-3">
          <SelectField
            label="Need a logo created?"
            placeholder="Select an option"
            options={LOGO_CREATION_OPTIONS}
            error={errors.logoCreation?.message as string | undefined}
            {...register('logoCreation')}
          />

          {needsLogoUpload ? (
            <Controller
              name="logoFile"
              control={control}
              render={({ field }) => (
                <FileField
                  label="Attach your logo"
                  requiredMark
                  name={field.name}
                  accept=".png,.jpg,.jpeg,.webp"
                  hint="PNG, JPEG, or WebP — this exact logo goes on the uniform"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.files)}
                  ref={field.ref}
                  error={errors.logoFile?.message as string | undefined}
                />
              )}
            />
          ) : null}

          {needsLogoBrief ? (
            <div className="space-y-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3 sm:p-4">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  Free logo design
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Answer a few questions — we create your logo first, then put it on the mockup.
                </p>
              </div>

              <SelectField
                label="Logo type"
                requiredMark
                placeholder="Select logo type"
                options={LOGO_COMPOSITION_OPTIONS}
                error={errors.logoComposition?.message as string | undefined}
                {...register('logoComposition')}
              />

              {showLogoText ? (
                <TextField
                  label="What text goes on the logo?"
                  requiredMark
                  placeholder={teamName || 'Team name'}
                  hint="Usually the team name"
                  error={errors.logoText?.message as string | undefined}
                  {...register('logoText')}
                />
              ) : null}

              {showLogoIcon ? (
                <TextField
                  label="What icon or mascot?"
                  requiredMark
                  placeholder="e.g. roaring cheetah, lightning bolt, bull skull"
                  error={errors.logoIcon?.message as string | undefined}
                  {...register('logoIcon')}
                />
              ) : null}

              <SelectField
                label="Logo style"
                requiredMark
                placeholder="Select style"
                options={LOGO_VIBE_OPTIONS}
                error={errors.logoVibe?.message as string | undefined}
                {...register('logoVibe')}
              />

              <SelectField
                label="Logo colors"
                requiredMark
                placeholder="Select colors"
                options={LOGO_COLOR_SOURCE_OPTIONS}
                error={errors.logoColorSource?.message as string | undefined}
                {...register('logoColorSource')}
              />

              {showCustomColors ? (
                <div className="space-y-3">
                  <p className="m-0 text-sm text-white/55">
                    Pick the colors for the logo — same style as team colors.
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    <div className="flex min-h-[4.5rem]">
                      {LOGO_COLOR_SLOTS.map((slot) => {
                        const raw = logoColorValues[slot.watch];
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
                      name="logoPrimaryColor"
                      control={control}
                      render={({ field }) => (
                        <ColorField
                          label="Logo primary"
                          requiredMark
                          name={field.name}
                          value={field.value || ''}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          error={errors.logoPrimaryColor?.message as string | undefined}
                          ref={field.ref}
                        />
                      )}
                    />
                    <Controller
                      name="logoSecondaryColor"
                      control={control}
                      render={({ field }) => (
                        <ColorField
                          label="Logo secondary"
                          requiredMark
                          name={field.name}
                          value={field.value || ''}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          error={errors.logoSecondaryColor?.message as string | undefined}
                          ref={field.ref}
                        />
                      )}
                    />
                    <Controller
                      name="logoAlternateColor"
                      control={control}
                      render={({ field }) => (
                        <ColorField
                          className="sm:col-span-2"
                          label="Logo alternate"
                          optional
                          name={field.name}
                          value={field.value || ''}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          error={errors.logoAlternateColor?.message as string | undefined}
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>
                </div>
              ) : null}

              <TextAreaField
                label="Anything else for the logo? (optional)"
                placeholder="Must include a #23, no script font, aggressive eyes…"
                {...register('logoNotes')}
              />
            </div>
          ) : null}
        </div>
      </section>

      {accessoriesOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          onClick={() => setAccessoriesOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select accessories"
            className="flex h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
              <div>
                <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
                  Optional
                </p>
                <h3 className="mt-1 font-display text-3xl tracking-wide text-white">Accessories</h3>
                <p className="mt-1 text-sm text-white/50">
                  {accessories.length
                    ? `${accessories.length} selected`
                    : 'Tap items to add them'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccessoriesOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
              >
                Done
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5 [-webkit-overflow-scrolling:touch]">
              {ACCESSORY_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/35">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => {
                      const selected = accessories.includes(item as Accessory);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAccessory(item as Accessory, !selected)}
                          className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition ${
                            selected
                              ? 'border-accent bg-accent/15 text-accent'
                              : 'border-white/12 bg-white/[0.04] text-white/75 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {selected ? `✓ ${item}` : item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-3 border-t border-white/10 p-4 sm:p-5">
              <button
                type="button"
                onClick={clearAccessories}
                disabled={!accessories.length}
                className="text-sm font-semibold text-white/45 transition hover:text-white disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setAccessoriesOpen(false)}
                className="btn-primary px-5 py-2.5 text-lg"
              >
                Save accessories
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
