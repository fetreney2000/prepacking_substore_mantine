'use client';

import { AppShell, Group, Text, Box, NavLink, ScrollArea, Stack } from '@mantine/core';
import {
  IconDashboard, IconPackage, IconUsers, IconPlus,
  IconClipboardList, IconReport, IconChartBar,
  IconSettings, IconRefresh, IconHelp, IconCopyright,
  IconMenu2,
} from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const navItems = [
  { label: 'Papan Pemuka', href: '/dashboard', icon: IconDashboard },
  { label: 'Pengurusan SKU', href: '/skus', icon: IconPackage },
  { label: 'Pengurusan Kumpulan', href: '/groups', icon: IconUsers },
  { label: 'Cipta Pesanan', href: '/create-order', icon: IconPlus },
  { label: 'Senarai Pesanan', href: '/edit-order', icon: IconClipboardList },
  { label: 'Laporan Pesanan', href: '/order-report', icon: IconReport },
  { label: 'Laporan SKU', href: '/sku-report', icon: IconChartBar },
  { label: 'Tetapan', href: '/settings', icon: IconSettings },
  { label: 'Penyelarasan Data', href: '/sync', icon: IconRefresh },
  { label: 'Bantuan', href: '/help', icon: IconHelp },
  { label: 'Hak Cipta', href: '/copyright', icon: IconCopyright },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
    api.settings.get().then((settings) => {
      setAppTitle(settings.appTitle || 'Sistem Inventori Farmasi');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 260, breakpoint: 'md' }}
      footer={{ height: 32 }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Text size="lg" fw={600} c="white" truncate maw={600}>
              {appTitle}
            </Text>
          </Group>
          <Text size="xs" c="rgba(255,255,255,0.8)">
            {clock}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <ScrollArea h="100%">
          <Stack gap={0} p={4}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} passHref>
                  <NavLink
                    leftSection={<Icon size={20} />}
                    label={item.label}
                    active={active}
                    variant="subtle"
                    color="blue"
                    style={{
                      borderRadius: 'var(--mantine-radius-md)',
                    }}
                  />
                </Link>
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
