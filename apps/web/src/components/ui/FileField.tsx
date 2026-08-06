'use client';

import { forwardRef, useEffect, useState, type ChangeEvent } from 'react';

type FileFieldProps = {
  label: string;
  name?: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
  accept?: string;
  value?: FileList | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
};

export const FileField = forwardRef<HTMLInputElement, FileFieldProps>(function FileField(
  { label, name, error, hint, requiredMark, accept, value, onChange, onBlur },
  ref,
) {
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    setFileName(value?.[0]?.name || '');
  }, [value]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="field-label">
        {label}
        {requiredMark ? <span className="ml-1 text-heat">*</span> : null}
      </span>
      <label
        className={`relative cursor-pointer rounded-xl border border-dashed px-4 py-4 text-center transition ${
          error
            ? 'border-heat/60 bg-heat/5'
            : fileName
              ? 'border-accent/40 bg-accent/5'
              : 'border-white/25 bg-white/[0.03] hover:border-accent/50 hover:bg-accent/5'
        }`}
      >
        <input
          ref={ref}
          type="file"
          name={name}
          accept={accept}
          className="absolute inset-0 cursor-pointer opacity-0"
          onBlur={onBlur}
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name || '');
            onChange?.(event);
          }}
        />
        <strong className="mb-1 block text-sm text-white">
          {fileName ? 'File selected' : 'Drop file or browse'}
        </strong>
        <small className="text-[0.75rem] text-white/45">
          {hint || 'PNG, JPEG, PDF, DOCX, CSV, XLSX'}
        </small>
        <span className="mt-2 block min-h-[1.2em] truncate text-[0.8rem] font-semibold text-accent">
          {fileName}
        </span>
      </label>
      {error ? (
        <p className="m-0 text-sm font-medium text-heat" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
