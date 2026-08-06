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
  {
    label,
    error,
    hint,
    requiredMark,
    options,
    placeholder = 'Select',
    className = '',
    id,
    ...props
  },
  ref,
) {
  const fieldId = id || props.name;

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
      </label>
      <select
        ref={ref}
        id={fieldId}
        className="input-field bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%233a424c%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 6l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10"
        {...props}
      >
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
