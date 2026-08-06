import { useFormContext } from 'react-hook-form';
import { ACCESSORIES, type QuoteFormValues } from '@mockup/shared';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CheckboxTile } from '@/components/ui/CheckboxTile';

export function AccessoriesSection() {
  const { register } = useFormContext<QuoteFormValues>();

  return (
    <section className="border-b border-black/10 py-[clamp(1.35rem,3vw,2rem)]">
      <SectionHeader
        title="Accessories"
        description="Add extras to complete the look. Optional."
        step="Step 03"
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESSORIES.map((item) => (
          <CheckboxTile key={item} label={item} value={item} {...register('accessories')} />
        ))}
      </div>
    </section>
  );
}
