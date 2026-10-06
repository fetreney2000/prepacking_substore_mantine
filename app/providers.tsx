'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import AppLayout from '@/components/AppLayout';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  // Keep label text legible on filled variants by picking light/dark by
  // luminance instead of assuming white (WCAG 1.4.3, item #4).
  autoContrast: true,
  // Honour the OS "reduce motion" setting rather than animating regardless.
  respectReducedMotion: true,
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: true,
        withColumnBorders: false,
      },
    },
    Card: {
      defaultProps: {
        padding: 'md',
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        size: 'lg',
        overlayProps: { backgroundOpacity: 0.55, blur: 4 },
      },
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="bottom-right" />
      <AppLayout>
        {children}
      </AppLayout>
    </MantineProvider>
  );
}
