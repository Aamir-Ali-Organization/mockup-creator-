import { Suspense } from 'react';
import { SuccessClient } from '@/components/SuccessClient';

type SuccessLeadPageProps = {
  params: Promise<{ contactId: string }>;
};

export default async function SuccessLeadPage({ params }: SuccessLeadPageProps) {
  const { contactId } = await params;

  return (
    <div className="tool-shell min-h-screen">
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-screen w-full max-w-[720px] items-center justify-center px-3 text-sm text-white/50">
            Loading your mockup…
          </div>
        }
      >
        <SuccessClient contactId={decodeURIComponent(contactId)} />
      </Suspense>
    </div>
  );
}
