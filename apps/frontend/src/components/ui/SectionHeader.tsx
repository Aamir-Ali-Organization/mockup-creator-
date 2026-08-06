type SectionHeaderProps = {
  title: string;
  description: string;
  step: string;
};

export function SectionHeader({ title, description, step }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 md:gap-4">
      <div>
        <h3 className="m-0 font-display text-[clamp(1.45rem,3.4vw,2.1rem)] leading-none tracking-wide">
          {title}
        </h3>
        <p className="mt-1.5 max-w-xl text-[0.9rem] text-ink-soft">{description}</p>
      </div>
      <span className="whitespace-nowrap rounded-lg bg-field/10 px-2.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-field">
        {step}
      </span>
    </div>
  );
}
