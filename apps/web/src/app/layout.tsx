import type { Metadata } from 'next';
import { Figtree, Oswald } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const display = Oswald({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
});

const body = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: {
    default: 'Big Mad Drip — Sports Apparel Made With Attitude',
    template: '%s · Big Mad Drip',
  },
  description:
    'Florida-based custom sports apparel. Generate a free AI uniform mockup, then gear up with Big Mad Drip.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
