'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AGE_GROUPS,
  GENDERS,
  PUBLIC_SPORTS,
  REFERRAL_SOURCES,
  SHIRT_STYLES,
  SHIRT_TYPES,
  SHORT_TYPES,
  genderLocksAdult,
  quoteFormSchema,
  sportNeedsGarmentDetails,
  type QuoteFormValues,
} from '@mockup/shared';
import { buildSuccessPath, resolveLead, saveMockupSession, submitQuote } from '@/lib/api';
import { formatUsPhone } from '@/lib/phone';
import { syncFieldsFromDom } from '@/lib/sync-form-dom';
import { StepProgress } from '@/components/form/StepProgress';
import { TextField } from '@/components/ui/TextField';
import { PhoneField } from '@/components/ui/PhoneField';
import { SelectField } from '@/components/ui/SelectField';
import { TeamColorsSection } from '@/components/form/TeamColorsSection';
import { ExtrasSection } from '@/components/form/ExtrasSection';

type FormValues = QuoteFormValues;

const STEPS = ['Contact', 'Team Look', 'Extras', 'Submit'] as const;

const stepFields: Record<number, (keyof FormValues)[]> = {
  1: ['customerName', 'phone', 'email', 'teamName', 'sport'],
  2: [
    'primaryColor',
    'secondaryColor',
    'gender',
    'ageGroup',
    'quantity',
    'shirtStyle',
    'shirtType',
    'shortType',
  ],
  3: [
    'accessories',
    'rosterInfo',
    'logoCreation',
    'logoFile',
    'logoComposition',
    'logoText',
    'logoIcon',
    'logoColorSource',
    'logoPrimaryColor',
    'logoSecondaryColor',
    'logoAlternateColor',
    'logoVibe',
    'logoNotes',
  ],
  4: ['referralSource', 'consent'],
};

export function QuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  const fleadid = useMemo(() => {
    return (
      searchParams.get('fleadid') ||
      searchParams.get('fLeadId') ||
      searchParams.get('leadId') ||
      searchParams.get('facebookLeadId') ||
      ''
    ).trim();
  }, [searchParams]);

  const leadQuery = useQuery({
    queryKey: ['lead-resolve', fleadid || 'public'],
    queryFn: () => resolveLead(fleadid || null),
  });

  const methods = useForm<FormValues>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    criteriaMode: 'firstError',
    shouldFocusError: true,
    defaultValues: {
      customerName: '',
      email: '',
      phone: '',
      teamName: '',
      sport: 'Flag Football',
      gender: undefined,
      ageGroup: undefined,
      primaryColor: '',
      secondaryColor: '',
      alternateColor: '',
      quantity: 12,
      shirtStyle: '',
      shirtType: '',
      shortType: '',
      accessories: [],
      rosterInfo: '',
      logoCreation: '',
      logoComposition: '',
      logoText: '',
      logoIcon: '',
      logoColorSource: '',
      logoPrimaryColor: '',
      logoSecondaryColor: '',
      logoAlternateColor: '',
      logoVibe: '',
      logoNotes: '',
      referralSource: fleadid ? 'Facebook' : undefined,
      consent: undefined,
    },
  });

  const sport = useWatch({ control: methods.control, name: 'sport' });
  const gender = useWatch({ control: methods.control, name: 'gender' });
  const showGarmentDetails = sportNeedsGarmentDetails(sport || '');
  const adultLocked = genderLocksAdult(gender || '');

  useEffect(() => {
    if (!adultLocked) return;
    methods.setValue('ageGroup', 'Adult', { shouldValidate: true, shouldDirty: true });
  }, [adultLocked, methods]);

  useEffect(() => {
    if (showGarmentDetails) return;
    methods.setValue('shirtStyle', '', { shouldValidate: false });
    methods.setValue('shirtType', '', { shouldValidate: false });
    methods.setValue('shortType', '', { shouldValidate: false });
  }, [showGarmentDetails, methods]);

  useEffect(() => {
    const prefill = leadQuery.data?.lead.prefill;
    if (!prefill) return;

    const entries = Object.entries(prefill) as Array<[keyof FormValues, unknown]>;
    for (const [key, value] of entries) {
      if (value === undefined || value === null || value === '') continue;
      if (key === 'sport') {
        const allowed = (PUBLIC_SPORTS as readonly string[]).includes(String(value));
        methods.setValue('sport', (allowed ? value : 'Flag Football') as never, {
          shouldValidate: false,
          shouldDirty: false,
        });
        continue;
      }
      if (key === 'gender') {
        const allowed = (GENDERS as readonly string[]).includes(String(value));
        if (!allowed) continue;
        methods.setValue('gender', value as never, { shouldValidate: false, shouldDirty: false });
        continue;
      }
      if (key === 'ageGroup') {
        const allowed = (AGE_GROUPS as readonly string[]).includes(String(value));
        if (!allowed) continue;
        methods.setValue('ageGroup', value as never, { shouldValidate: false, shouldDirty: false });
        continue;
      }
      const next =
        key === 'phone' && typeof value === 'string' ? formatUsPhone(value) : value;
      methods.setValue(key, next as never, { shouldValidate: false, shouldDirty: false });
    }
  }, [leadQuery.data, methods]);

  const mutation = useMutation({
    mutationFn: async (values: Parameters<typeof submitQuote>[0]) => {
      const data = await submitQuote(values);
      if (!data.contactId) {
        throw new Error(
          'No GHL lead id returned. Check GHL API key / location settings, then try again.',
        );
      }
      return data;
    },
    onSuccess: (data) => {
      saveMockupSession({
        contactId: data.contactId,
        fleadid: data.fleadid,
        submissionId: data.submissionId ?? null,
        skipMockup: data.skipMockup,
        shouldGenerate: data.shouldGenerate,
        job: data.job,
      });
      // Success is always tied to the GHL contact id for future mockup URL storage.
      router.push(buildSuccessPath(data.contactId!, data.fleadid));
    },
  });

  const next = async () => {
    const fields = stepFields[step];
    // Autofill / fake form fillers often skip React onChange — sync DOM first.
    syncFieldsFromDom(methods.setValue, fields);
    const valid = await methods.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    // Full Zod schema runs on every trigger, so later-step fields (consent, etc.)
    // get errors early. Clear those until the user actually reaches that step.
    const futureFields = ([1, 2, 3, 4] as const)
      .filter((stepNumber) => stepNumber > step)
      .flatMap((stepNumber) => stepFields[stepNumber]);
    if (futureFields.length) {
      methods.clearErrors(futureFields);
    }

    setStep((value) => Math.min(value + 1, STEPS.length));
  };

  const back = () => setStep((value) => Math.max(value - 1, 1));

  const submitQuoteForm = methods.handleSubmit((values) => {
    mutation.mutate({
      ...values,
      rosterFile: methods.getValues('rosterFile'),
      logoFile: methods.getValues('logoFile'),
      fleadid: fleadid || null,
      ghlContactId: leadQuery.data?.lead.contactId || null,
    });
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const allFields = ([1, 2, 3, 4] as const).flatMap((stepNumber) => stepFields[stepNumber]);
    syncFieldsFromDom(methods.setValue, allFields);
    void submitQuoteForm(event);
  };

  const {
    register,
    formState: { errors },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={onSubmit}
        className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6"
        noValidate
      >
        <StepProgress current={step} total={STEPS.length} labels={[...STEPS]} />

        {step === 1 ? (
          <section className="space-y-4">
            <div>
              <h2 className="m-0 font-display text-3xl tracking-wide text-white">Quick start</h2>
              <p className="mt-1 text-sm text-white/55">
                30 seconds. We’ll text/call you with pricing and a mockup.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Full Name"
                requiredMark
                placeholder="Jordan Lee"
                error={errors.customerName?.message}
                {...register('customerName')}
              />
              <Controller
                name="phone"
                control={methods.control}
                render={({ field }) => (
                  <PhoneField
                    label="Phone"
                    requiredMark
                    name={field.name}
                    value={field.value || ''}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    error={errors.phone?.message}
                    ref={field.ref}
                  />
                )}
              />
              <TextField
                className="sm:col-span-2"
                label="Email"
                requiredMark
                type="email"
                placeholder="you@team.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label="Team Name"
                requiredMark
                placeholder="Mad Dogs FC"
                error={errors.teamName?.message}
                {...register('teamName')}
              />
              <SelectField
                label="Sport"
                requiredMark
                placeholder="Select sport"
                options={PUBLIC_SPORTS}
                error={errors.sport?.message}
                {...register('sport')}
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <div>
              <h2 className="m-0 font-display text-3xl tracking-wide text-white">Your team look</h2>
              <p className="mt-1 text-sm text-white/55">
                Colors + sizing so we can build the right uniform style.
              </p>
            </div>
            <TeamColorsSection />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                className="sm:col-span-2"
                label="How many uniforms?"
                requiredMark
                type="number"
                min={10}
                hint="10-piece minimum"
                error={errors.quantity?.message}
                {...register('quantity')}
              />
              <SelectField
                label="Team Gender"
                requiredMark
                options={GENDERS}
                error={errors.gender?.message}
                {...register('gender')}
              />
              <SelectField
                label="Youth or Adult"
                requiredMark
                options={AGE_GROUPS}
                hint={adultLocked ? 'Adult is required for Mens / Womens' : undefined}
                error={errors.ageGroup?.message}
                {...register('ageGroup')}
                className={adultLocked ? 'pointer-events-none opacity-70' : undefined}
                aria-disabled={adultLocked || undefined}
                tabIndex={adultLocked ? -1 : undefined}
                onChange={(event) => {
                  if (adultLocked) {
                    methods.setValue('ageGroup', 'Adult', { shouldValidate: true });
                    return;
                  }
                  void register('ageGroup').onChange(event);
                }}
              />
            </div>
            {showGarmentDetails ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField
                  className="sm:col-span-2"
                  label="Shirt Style"
                  requiredMark
                  placeholder="Select shirt style"
                  options={SHIRT_STYLES}
                  error={errors.shirtStyle?.message}
                  {...register('shirtStyle')}
                />
                <SelectField
                  label="Shirt Type"
                  requiredMark
                  placeholder="Select shirt type"
                  options={SHIRT_TYPES}
                  error={errors.shirtType?.message}
                  {...register('shirtType')}
                />
                <SelectField
                  label="Short Type"
                  requiredMark
                  placeholder="Select short type"
                  options={SHORT_TYPES}
                  error={errors.shortType?.message}
                  {...register('shortType')}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div>
              <h2 className="m-0 font-display text-3xl tracking-wide text-white">Extras</h2>
              <p className="mt-1 text-sm text-white/55">
                Optional extras — skip anything and finish later with your rep.
              </p>
            </div>
            <ExtrasSection />
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-4">
            <div>
              <h2 className="m-0 font-display text-3xl tracking-wide text-white">Lock it in</h2>
              <p className="mt-1 text-sm text-white/55">
                Submit to get your quote + free AI mockup preview.
              </p>
            </div>
            <SelectField
              label="How did you hear about us?"
              requiredMark
              options={REFERRAL_SOURCES}
              error={errors.referralSource?.message}
              {...register('referralSource')}
            />
            <label className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-[0.78rem] leading-relaxed text-white/60">
              <input
                type="checkbox"
                className="mt-0.5 h-[18px] w-[18px] accent-accent"
                {...register('consent')}
              />
              <span>
                By checking this box and clicking <strong className="text-white">Submit</strong>, I
                consent to be contacted by{' '}
                <strong className="text-white">Big Mad Drip and Comlink Media</strong> via calls or
                texts (including automated technology). Consent is not required to inquire. Reply
                STOP to opt out.
              </span>
            </label>
            {errors.consent ? (
              <p className="m-0 text-sm font-medium text-heat">{errors.consent.message}</p>
            ) : null}
          </section>
        ) : null}

        {mutation.isError ? (
          <p className="mt-4 rounded-xl border border-heat/40 bg-heat/10 px-4 py-3 text-sm font-medium text-heat">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 1 ? (
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={back}>
              Back
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}

          {step < STEPS.length ? (
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => void next()}>
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Get Free Mockup Quote'}
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
