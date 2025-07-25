
import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider } from '@/context/i18n';

export const metadata: Metadata = {
  title: 'Chess Crawl',
  description: 'A roguelike dungeon crawler chess game.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <I18nProvider>
          {children}
          <Providers />
        </I18nProvider>
      </body>
    </html>
  );
}
