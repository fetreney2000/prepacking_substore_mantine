'use client';

import { AppShell, Group, Text, Box, NavLink, ScrollArea, Stack, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconDashboard, IconPackage, IconUsers, IconPlus,
  IconClipboardList, IconReport, IconChartBar,
  IconSettings, IconRefresh, IconHelp, IconCopyright,
  IconLogout,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { catalog } from '@/lib/catalog';
import ColorSchemeToggle from './ColorSchemeToggle';
import BrandIcon from './BrandIcon';

// Each feature owns one identity hue, used by its nav icon, its help-section
// icon and its page title — colour decorates, the label carries the meaning.
const navItems = [
  { label: 'Papan Pemuka', href: '/dashboard', icon: IconDashboard, color: 'var(--mantine-color-blue-6)' },
  { label: 'Pengurusan Item', href: '/skus', icon: IconPackage, color: 'var(--mantine-color-teal-7)' },
  { label: 'Pengurusan Kumpulan', href: '/groups', icon: IconUsers, color: 'var(--mantine-color-violet-6)' },
  { label: 'Cipta Pesanan', href: '/create-order', icon: IconPlus, color: 'var(--mantine-color-green-7)' },
  { label: 'Senarai Pesanan', href: '/edit-order', icon: IconClipboardList, color: 'var(--mantine-color-orange-6)' },
  { label: 'Laporan Pesanan', href: '/order-report', icon: IconReport, color: 'var(--mantine-color-pink-6)' },
  { label: 'Laporan Item', href: '/sku-report', icon: IconChartBar, color: 'var(--mantine-color-grape-6)' },
  { label: 'Tetapan', href: '/settings', icon: IconSettings, color: 'var(--mantine-color-gray-7)' },
  { label: 'Penyelarasan Data', href: '/sync', icon: IconRefresh, color: 'var(--mantine-color-lime-7)' },
  { label: 'Bantuan', href: '/help', icon: IconHelp, color: 'var(--mantine-color-indigo-6)' },
  { label: 'Hak Cipta', href: '/copyright', icon: IconCopyright, color: 'var(--mantine-color-cyan-8)' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [clock, setClock] = useState('');
  const [appTitle, setAppTitle] = useState('Sistem Inventori Farmasi');

  useEffect(() => {
    const update = () => {
      setClock(new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' }));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    catalog.settings().then((settings) => {
      setAppTitle(settings.appTitle || 'Sistem Inventori Farmasi');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Still drop the local session state even if the call failed.
    }
    router.replace('/login');
    router.refresh();
  };

  // The sign-in page renders bare, without the nav shell.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 260, breakpoint: 'md' }}
      footer={{ height: 32 }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <BrandIcon size={24} />
            <Text size="lg" fw={600} c="white" truncate maw={600}>
              {appTitle}
            </Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="rgba(255,255,255,0.8)">
              {clock}
            </Text>
            <Tooltip label="Keluar" position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                onClick={handleLogout}
                aria-label="Keluar"
                color="var(--mantine-color-red-3)"
              >
                <IconLogout size={18} />
              </ActionIcon>
            </Tooltip>
            {/* Far right of the header: manual light/dark switch (the scheme
                still follows the OS until this is pressed once). */}
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <ScrollArea h="100%">
          <Stack gap={0} p={4}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  leftSection={<Icon size={20} color={item.color} />}
                  label={item.label}
                  active={active}
                  variant="subtle"
                  color="blue"
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="md">
          {children}
        </Box>
      </AppShell.Main>

      <AppShell.Footer p="xs" px="md">
        <Group justify="space-between" h="100%">
          <Text size="xs" c="dimmed">{clock}</Text>
          <Text size="xs" c="dimmed">{appTitle} v2.0</Text>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
