import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
  options: readonly string[];
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, requiredMark, options, placeholder = 'Select', className = '', id, ...props },
  ref,
) {
  const fieldId = id || props.name;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
      </label>
      <select ref={ref} id={fieldId} className="input-field pr-10" {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {hint ? <p className="m-0 text-[0.8rem] text-white/45">{hint}</p> : null}
      {error ? <p className="m-0 text-sm font-medium text-heat">{error}</p> : null}
    </div>
  );
});
