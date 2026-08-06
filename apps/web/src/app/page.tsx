import { Suspense } from 'react';
import { Hero } from '@/components/Hero';
import { QuoteForm } from '@/components/QuoteForm';

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-3 py-6 sm:px-4 sm:py-10">
      <Hero />
      <Suspense
        fallback={
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50">
            Loading form…
          </div>
        }
      >
        <QuoteForm />
      </Suspense>
    </main>
  );
}
