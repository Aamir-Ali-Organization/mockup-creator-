import { useFormContext } from 'react-hook-form';
import type { QuoteFormValues } from '@mockup/shared';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';

export function CustomerSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<QuoteFormValues>();

  return (
    <section className="border-b border-black/10 pb-[clamp(1.35rem,3vw,2rem)]">
      <SectionHeader
        title="Your Details"
        description="Who should we reach for this order?"
        step="Step 01"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Full Name"
          requiredMark
          autoComplete="name"
          placeholder="Jordan Lee"
          error={errors.customerName?.message}
          {...register('customerName')}
        />
        <TextField
          label="Phone"
          requiredMark
          type="tel"
          autoComplete="tel"
          placeholder="(239) 555-0100"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="Email"
          requiredMark
          type="email"
          autoComplete="email"
          placeholder="you@team.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
    </section>
  );
}
