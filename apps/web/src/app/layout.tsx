import type { Metadata } from 'next';
import { Bebas_Neue, Sora } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'Quote Request — Big Mad Drip',
  description: 'Custom team uniforms with free AI mockup preview.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${sora.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
