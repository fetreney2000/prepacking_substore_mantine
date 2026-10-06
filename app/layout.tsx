import type { Metadata } from 'next';
import { ColorSchemeScript } from '@mantine/core';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Sistem Inventori Prabungkus Hospital Keningau',
  description: 'Sistem pengurusan inventori prabungkus untuk Substor Hospital Keningau',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ms">
      <head>
        {/* Applies the stored/system colour scheme before first paint, so a
            dark-mode user never sees a white flash (review item #10). */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
