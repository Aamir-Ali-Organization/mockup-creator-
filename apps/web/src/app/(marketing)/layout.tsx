import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-void">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
