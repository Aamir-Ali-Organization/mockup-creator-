import type { Metadata } from 'next';
import { KnowledgeAdminClient } from '@/components/KnowledgeAdminClient';

export const metadata: Metadata = {
  title: 'App',
  robots: { index: false, follow: false },
};

export default function AppHomePage() {
  return <KnowledgeAdminClient />;
}
