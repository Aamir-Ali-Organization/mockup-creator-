import { useFormContext } from 'react-hook-form';
import {
  LOGO_CREATION_OPTIONS,
  REFERRAL_SOURCES,
  type QuoteFormValues,
} from '@mockup/shared';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { SelectField } from '@/components/ui/SelectField';
import { FileField } from '@/components/ui/FileField';

type ExtendedValues = QuoteFormValues & {
  rosterFile?: FileList;
  logoFile?: FileList;
};

export function RosterSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ExtendedValues>();

  return (
    <section className="border-b border-black/10 py-[clamp(1.35rem,3vw,2rem)]">
      <SectionHeader
        title="Roster & Logo"
        description="List jersey names, numbers, sizes, and styles — or attach your roster file."
        step="Step 04"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextAreaField
          className="md:col-span-2"
          label="Roster Info"
          placeholder="Ex: BACK OF JERSEY NAME, UNIFORM NUMBER, SIZE, STYLE"
          hint="Double-check spelling, numbers, and sizes. We’re not responsible for errors from incorrect info."
          error={errors.rosterInfo?.message}
          {...register('rosterInfo')}
        />
        <FileField
          label="Attach Roster"
          accept=".png,.jpg,.jpeg,.pdf,.docx,.csv,.xlsx,.xls"
          {...register('rosterFile')}
        />
        <FileField
          label="Attach Logo"
          accept=".png,.jpg,.jpeg,.pdf,.docx,.csv,.xlsx,.xls"
          {...register('logoFile')}
        />
        <SelectField
          label="Logo Creation"
          placeholder="Would you like us to create a logo?"
          options={LOGO_CREATION_OPTIONS}
          error={errors.logoCreation?.message}
          {...register('logoCreation')}
        />
        <SelectField
          label="How did you hear about us?"
          requiredMark
          options={REFERRAL_SOURCES}
          error={errors.referralSource?.message}
          {...register('referralSource')}
        />
      </div>
    </section>
  );
}
