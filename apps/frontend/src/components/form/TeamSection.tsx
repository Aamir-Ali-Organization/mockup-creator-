import { useFormContext } from 'react-hook-form';
import { AGE_GROUPS, GENDERS, SPORTS, type QuoteFormValues } from '@mockup/shared';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';

export function TeamSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<QuoteFormValues>();

  return (
    <section className="border-b border-black/10 py-[clamp(1.35rem,3vw,2rem)]">
      <SectionHeader
        title="Team Specs"
        description="Sizing, style, and colors for your uniform set. 10-piece minimum."
        step="Step 02"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          placeholder="Select a sport"
          options={SPORTS}
          error={errors.sport?.message}
          {...register('sport')}
        />
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
          placeholder="Gold"
          error={errors.secondaryColor?.message}
          {...register('secondaryColor')}
        />
        <TextField
          label="Alternate Color"
          placeholder="Black"
          error={errors.alternateColor?.message}
          {...register('alternateColor')}
        />
        <SelectField
          label="Team Gender"
          requiredMark
          options={GENDERS}
          hint="Used for sizing and style."
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
        <TextField
          label="How many uniforms?"
          requiredMark
          type="number"
          min={10}
          placeholder="10+"
          hint="10-piece minimum."
          error={errors.quantity?.message}
          {...register('quantity')}
        />
      </div>
      <p className="mt-4 rounded-xl border border-accent/45 bg-accent/20 px-4 py-3 text-[0.82rem] text-ink-soft">
        Clearly list primary, secondary, and alternative colors so we can match your team identity.
      </p>
    </section>
  );
}
