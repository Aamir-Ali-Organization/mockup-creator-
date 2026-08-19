import type { Metadata } from 'next';
import { SubmissionsAdminClient } from '@/components/SubmissionsAdminClient';

export const metadata: Metadata = {
  title: 'Submissions — Big Mad Drip',
  robots: { index: false, follow: false },
};

export default function SubmissionsAdminPage() {
  return <SubmissionsAdminClient />;
}
