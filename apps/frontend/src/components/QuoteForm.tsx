import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ACCESSORIES,
  AGE_GROUPS,
  GENDERS,
  LOGO_CREATION_OPTIONS,
  REFERRAL_SOURCES,
  SPORTS,
  quoteFormSchema,
  type QuoteFormValues,
} from '@mockup/shared';
import { createQuote, resolveLead } from '@/api/client';
import { StepProgress } from '@/components/form/StepProgress';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { FileField } from '@/components/ui/FileField';
import { CheckboxTile } from '@/components/ui/CheckboxTile';

type FormValues = QuoteFormValues & {
  rosterFile?: FileList;
  logoFile?: FileList;
};

const STEPS = ['Contact', 'Team Look', 'Extras', 'Submit'] as const;

const stepFields: Record<number, (keyof FormValues)[]> = {
  1: ['customerName', 'phone', 'email', 'teamName', 'sport'],
  2: ['primaryColor', 'secondaryColor', 'gender', 'ageGroup', 'quantity'],
  3: ['accessories', 'rosterInfo', 'logoCreation'],
  4: ['referralSource', 'consent'],
};

export function QuoteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    defaultValues: {
      customerName: '',
      email: '',
      phone: '',
      teamName: '',
      sport: undefined,
      gender: undefined,
      ageGroup: undefined,
      primaryColor: '',
      secondaryColor: '',
      alternateColor: '',
      quantity: 12,
      accessories: [],
      rosterInfo: '',
      logoCreation: '',
      referralSource: fleadid ? 'Facebook' : undefined,
      consent: undefined,
    },
  });

  useEffect(() => {
    const prefill = leadQuery.data?.lead.prefill;
    if (!prefill) return;

    const entries = Object.entries(prefill) as Array<[keyof FormValues, unknown]>;
    for (const [key, value] of entries) {
      if (value === undefined || value === null || value === '') continue;
      methods.setValue(key, value as never, { shouldValidate: false, shouldDirty: false });
    }
  }, [leadQuery.data, methods]);

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: (data) => {
      navigate(`/success/${data.quote.id}`);
    },
  });

  const next = async () => {
    const valid = await methods.trigger(stepFields[step], { shouldFocus: true });
    if (valid) setStep((value) => Math.min(value + 1, STEPS.length));
  };

  const back = () => setStep((value) => Math.max(value - 1, 1));

  const onSubmit = methods.handleSubmit((values) => {
    mutation.mutate({
      ...values,
      rosterFile: methods.getValues('rosterFile'),
      logoFile: methods.getValues('logoFile'),
      fleadid: fleadid || null,
      ghlContactId: leadQuery.data?.lead.contactId || null,
    });
  });

  const leadMode = leadQuery.data?.lead.mode || 'new';
  const mockupAlreadyGenerated = Boolean(leadQuery.data?.lead.mockupAlreadyGenerated);

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

        <div className="mb-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/60">
          {leadQuery.isLoading ? (
            <span>Checking lead details…</span>
          ) : fleadid && leadMode === 'existing' ? (
            <span>
              Facebook lead linked · details prefilled from GHL
              {mockupAlreadyGenerated ? ' · mockup already generated (won’t regenerate)' : ''}
            </span>
          ) : fleadid ? (
            <span>Facebook lead id found, but no GHL contact yet — we’ll create one on submit.</span>
          ) : (
            <span>Public form · new lead will be saved to GHL on submit.</span>
          )}
        </div>

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
              <TextField
                label="Phone"
                requiredMark
                type="tel"
                placeholder="(239) 555-0100"
                error={errors.phone?.message}
                {...register('phone')}
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
                options={SPORTS}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Primary Color"
                requiredMark
                placeholder="Red"
                error={errors.primaryColor?.message}
                {...register('primaryColor')}
              />
              <TextField
                label="Secondary Color"
                requiredMark
                placeholder="Black"
                error={errors.secondaryColor?.message}
                {...register('secondaryColor')}
              />
              <TextField
                label="Alternate Color"
                placeholder="Gold"
                error={errors.alternateColor?.message}
                {...register('alternateColor')}
              />
              <TextField
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
                error={errors.ageGroup?.message}
                {...register('ageGroup')}
              />
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div>
              <h2 className="m-0 font-display text-3xl tracking-wide text-white">Extras</h2>
              <p className="mt-1 text-sm text-white/55">
                Optional — skip anything and add later with your rep.
              </p>
            </div>
            <div>
              <p className="field-label mb-2">Popular accessories</p>
              <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {ACCESSORIES.map((item) => (
                  <CheckboxTile key={item} label={item} value={item} {...register('accessories')} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextAreaField
                className="sm:col-span-2"
                label="Roster notes"
                placeholder="Names, numbers, sizes (or attach a file)"
                {...register('rosterInfo')}
              />
              <FileField
                label="Attach roster"
                accept=".png,.jpg,.jpeg,.pdf,.docx,.csv,.xlsx,.xls"
                {...register('rosterFile')}
              />
              <FileField
                label="Attach logo"
                accept=".png,.jpg,.jpeg,.pdf,.docx,.csv,.xlsx,.xls"
                {...register('logoFile')}
              />
              <SelectField
                className="sm:col-span-2"
                label="Need a logo created?"
                placeholder="Optional"
                options={LOGO_CREATION_OPTIONS}
                {...register('logoCreation')}
              />
            </div>
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
                consent to be contacted by <strong className="text-white">Big Mad Drip and Comlink Media</strong>{' '}
                via calls or texts (including automated technology). Consent is not required to
                inquire. Reply STOP to opt out.
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
