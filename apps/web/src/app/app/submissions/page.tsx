import type { Metadata } from 'next';
import { SubmissionsAdminClient } from '@/components/SubmissionsAdminClient';

export const metadata: Metadata = {
  title: 'Submissions',
  robots: { index: false, follow: false },
};

export default function AppSubmissionsPage() {
  return <SubmissionsAdminClient />;
}
