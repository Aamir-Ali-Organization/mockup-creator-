'use client';

import { forwardRef, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { formatUsPhone } from '@/lib/phone';

type PhoneFieldProps = {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
};

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  {
    label,
    name,
    error,
    hint = 'US number · (239) 555-0100 · don’t include +1',
    requiredMark,
    value = '',
    onChange,
    onBlur,
    className = '',
  },
  ref,
) {
  const fieldId = name || 'phone';

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
      </label>
      <input
        ref={ref}
        id={fieldId}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoCorrect="off"
        spellCheck={false}
        maxLength={14}
        placeholder="(239) 555-0100"
        aria-invalid={error ? true : undefined}
        value={value}
        onFocus={(event) => {
          // Autofill may set DOM value without React onChange — pull it in on focus.
          const formatted = formatUsPhone(event.currentTarget.value);
          if (formatted && formatted !== value) onChange?.(formatted);
        }}
        onBlur={(event) => {
          const formatted = formatUsPhone(event.currentTarget.value);
          if (formatted !== value) onChange?.(formatted);
          onBlur?.(event);
        }}
        onChange={(event) => onChange?.(formatUsPhone(event.target.value))}
        onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
          event.preventDefault();
          onChange?.(formatUsPhone(event.clipboardData.getData('text')));
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === '+' || event.key === 'e' || event.key === 'E') {
            event.preventDefault();
          }
        }}
        className={`input-field ${error ? 'border-heat/70 focus:border-heat focus:shadow-[0_0_0_4px_rgba(227,6,19,0.18)]' : ''}`}
      />
      {hint && !error ? <p className="m-0 text-[0.8rem] text-white/45">{hint}</p> : null}
      {error ? (
        <p className="m-0 text-sm font-medium text-heat" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
