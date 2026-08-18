import type { Metadata } from 'next';
import { KnowledgeAdminClient } from '@/components/KnowledgeAdminClient';

export const metadata: Metadata = {
  title: 'Knowledge Base — Big Mad Drip',
  robots: { index: false, follow: false },
};

export default function KnowledgeAdminPage() {
  return <KnowledgeAdminClient />;
}
