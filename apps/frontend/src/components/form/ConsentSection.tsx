import { useFormContext } from 'react-hook-form';
import type { QuoteFormValues } from '@mockup/shared';
import { SectionHeader } from '@/components/ui/SectionHeader';

type ConsentSectionProps = {
  isSubmitting: boolean;
};

export function ConsentSection({ isSubmitting }: ConsentSectionProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<QuoteFormValues>();

  return (
    <section className="pt-[clamp(1.35rem,3vw,2rem)]">
      <SectionHeader
        title="Consent"
        description="Confirm contact preferences before you submit."
        step="Step 05"
      />

      <label className="grid grid-cols-1 items-start gap-3 rounded-[14px] border border-black/10 bg-black/[0.04] p-4 text-[0.78rem] leading-relaxed text-ink-soft sm:grid-cols-[auto_1fr] sm:gap-3.5">
        <input
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] accent-field"
          {...register('consent')}
        />
        <span>
          By checking this box and clicking <strong className="text-ink">“Submit”</strong>, I
          confirm that I am the subscriber or authorized user of the phone number provided and
          consent to be contacted by <strong className="text-ink">Big Mad Drip and Comlink Media</strong>{' '}
          via calls or text messages (including automated technology) regarding phone carrier and
          internet services, even if my number is on a Do-Not-Call registry. Consent is not required
          to continue my inquiry. This site may use third-party lead verification technology,
          including TrustedForm and Jornaya. I may revoke consent at any time. To continue without
          sharing information, call <strong className="text-ink">(866) 260-9473</strong>. Message
          and data rates may apply. Reply <strong className="text-ink">STOP</strong> to unsubscribe
          or <strong className="text-ink">HELP</strong> to{' '}
          <strong className="text-ink">(866) 640-3667</strong>.
        </span>
      </label>
      {errors.consent ? (
        <p className="mt-2 text-sm font-medium text-heat">{errors.consent.message}</p>
      ) : null}

      <div className="mt-7 flex flex-col-reverse flex-wrap items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap justify-center gap-4 text-sm text-ink-soft md:justify-start">
          <a href="#" className="border-b border-transparent hover:border-current hover:text-ink">
            Privacy Policy
          </a>
          <a href="#" className="border-b border-transparent hover:border-current hover:text-ink">
            Terms of Service
          </a>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-accent px-7 py-3.5 font-display text-[clamp(1.15rem,3.5vw,1.35rem)] tracking-wide text-ink shadow-[0_10px_28px_rgba(255,212,0,0.35)] transition hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
        >
          {isSubmitting ? 'Submitting…' : 'Submit Quote Request'}
        </button>
      </div>
    </section>
  );
}
