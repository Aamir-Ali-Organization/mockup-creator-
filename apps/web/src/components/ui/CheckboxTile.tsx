import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type CheckboxTileProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const CheckboxTile = forwardRef<HTMLInputElement, CheckboxTileProps>(function CheckboxTile(
  { label, className = '', ...props },
  ref,
) {
  return (
    <label
      className={`group relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium leading-snug text-white/85 transition has-[:checked]:border-accent/60 has-[:checked]:bg-accent/10 ${className}`}
    >
      <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
      <span className="inline-block h-[18px] w-[18px] shrink-0 rounded-[5px] border border-white/30 bg-transparent transition peer-checked:border-accent peer-checked:bg-accent peer-checked:shadow-[inset_0_0_0_3px_#101418]" />
      {label}
    </label>
  );
});
