import { useState, type ChangeEvent } from 'react';
import { forwardRef } from 'react';

type FileFieldProps = {
  label: string;
  name: string;
  error?: string;
  accept?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const FileField = forwardRef<HTMLInputElement, FileFieldProps>(function FileField(
  { label, name, error, accept, onChange },
  ref,
) {
  const [fileName, setFileName] = useState('');

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="field-label">{label}</span>
      <label className="relative cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-4 text-center transition hover:border-accent/50 hover:bg-accent/5">
        <input
          ref={ref}
          type="file"
          name={name}
          accept={accept}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name || '');
            onChange?.(event);
          }}
        />
        <strong className="mb-1 block text-sm text-white">Drop file or browse</strong>
        <small className="text-[0.75rem] text-white/45">PNG, JPEG, PDF, DOCX, CSV, XLSX</small>
        <span className="mt-2 block min-h-[1.2em] text-[0.8rem] font-semibold text-accent">
          {fileName}
        </span>
      </label>
      {error ? <p className="m-0 text-sm font-medium text-heat">{error}</p> : null}
    </div>
  );
});
