type StepProgressProps = {
  current: number;
  total: number;
  labels: string[];
};

export function StepProgress({ current, total, labels }: StepProgressProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold text-white/80">
          Step {current} of {total}
          <span className="ml-2 text-white/45">· {labels[current - 1]}</span>
        </p>
        <p className="m-0 text-xs font-bold uppercase tracking-wider text-accent">{percent}%</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-heat to-accent transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 hidden grid-cols-4 gap-2 sm:grid">
        {labels.map((label, index) => {
          const step = index + 1;
          const active = step <= current;
          return (
            <div
              key={label}
              className={`rounded-lg px-2 py-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-wide ${
                active ? 'bg-accent/15 text-accent' : 'bg-white/5 text-white/35'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
