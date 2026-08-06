import { Hero } from '@/components/Hero';
import { QuoteForm } from '@/components/QuoteForm';

export function QuotePage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-3 pb-16 pt-4 sm:px-4 sm:pt-6">
      <Hero />
      <QuoteForm />
      <p className="mt-6 text-center text-[0.75rem] text-white/35">
        © 2026 Big Mad Drip · Sports apparel made with attitude
      </p>
    </div>
  );
}
