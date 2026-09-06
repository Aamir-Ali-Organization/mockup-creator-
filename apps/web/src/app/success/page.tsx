'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildSuccessPath, loadMockupSession } from '@/lib/api';
import { SuccessClient } from '@/components/SuccessClient';

function SuccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = loadMockupSession();
    if (session?.contactId) {
      router.replace(buildSuccessPath(session.contactId, session.fleadid));
    }
  }, [router]);

  return <SuccessClient />;
}

/** Legacy `/success` — redirect into `/success/[ghlContactId]` when possible. */
export default function SuccessPage() {
  return (
    <div className="tool-shell min-h-screen">
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-screen w-full max-w-[720px] items-center justify-center px-3 text-sm text-white/50">
            Loading…
          </div>
        }
      >
        <SuccessRedirect />
      </Suspense>
    </div>
  );
}
