import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, requiredMark, className = '', id, ...props },
  ref,
) {
  const fieldId = id || props.name;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
      </label>
      <input ref={ref} id={fieldId} className="input-field" {...props} />
      {hint ? <p className="m-0 text-[0.8rem] text-white/45">{hint}</p> : null}
      {error ? <p className="m-0 text-sm font-medium text-heat">{error}</p> : null}
    </div>
  );
});
