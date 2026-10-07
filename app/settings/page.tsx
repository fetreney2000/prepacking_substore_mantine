'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  TextInput,
  NumberInput,
  Button,
  Stack,
  Group,
} from '@mantine/core';
import { IconSettings, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '@/lib/api';
import { catalog, invalidateCatalog } from '@/lib/catalog';

export default function SettingsPage() {
  const [appTitle, setAppTitle] = useState('');
  const [minWeeks, setMinWeeks] = useState<number>(1);
  const [bufferWeeks, setBufferWeeks] = useState<number>(1);
  const [maxWeeks, setMaxWeeks] = useState<number>(12);
  const [defaultFilename, setDefaultFilename] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await catalog.settings();
      if (settings) {
        setAppTitle(settings.appTitle || '');
        setMinWeeks(settings.minWeeks ?? 1);
        setBufferWeeks(settings.bufferWeeks ?? 1);
        setMaxWeeks(settings.maxWeeks ?? 12);
        setDefaultFilename(settings.defaultFilename || '');
      }
    } catch {
      notifications.show({
        title: 'Ralat',
        message: 'Gagal memuatkan tetapan',
        color: 'red',
      });
    }
  }

  async function handleSave() {
    // Mantine can hand back a string for an unparseable value; the old
    // `as number` cast hid that until it reached the database (review #23).
    const numbers: Array<[string, number]> = [
      ['Minimum Minggu', minWeeks],
      ['Minggu Beza', bufferWeeks],
      ['Maksimum Minggu', maxWeeks],
    ];
    for (const [label, value] of numbers) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        notifications.show({
          title: 'Ralat',
          message: `${label} mesti berupa nombor.`,
          color: 'red',
        });
        return;
      }
      // The inputs declare min={1}; a negative week count would produce
      // negative stock levels, where nothing is ever "critical".
      if (value < 1) {
        notifications.show({
          title: 'Ralat',
          message: `${label} mesti sekurang-kurangnya 1.`,
          color: 'red',
        });
        return;
      }
    }
    // Levels are derived as AWU × weeks, so the order min ≤ buffer ≤ max is
    // what keeps critical/low/ok meaningful.
    if (!(minWeeks <= bufferWeeks && bufferWeeks <= maxWeeks)) {
      notifications.show({
        title: 'Ralat',
        message: 'Nilai mesti: Minimum Minggu ≤ Minggu Beza ≤ Maksimum Minggu.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await api.settings.update({
        appTitle,
        minWeeks,
        bufferWeeks,
        maxWeeks,
        defaultFilename,
      });
      invalidateCatalog();
      notifications.show({
        title: 'Berjaya',
        message: 'Tetapan telah disimpan',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Ralat',
        message: 'Gagal menyimpan tetapan',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="lg" py="xl">
      <Group>
        <IconSettings size={28} color="var(--mantine-color-gray-7)" />
        <Title order={2}>Tetapan</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <TextInput
            label="Nama Aplikasi"
            value={appTitle}
            onChange={(e) => setAppTitle(e.currentTarget.value)}
          />

          <NumberInput
            label="Minimum Minggu"
            description="Bilangan minggu minimum untuk pengiraan stok"
            value={minWeeks}
            onChange={(val) => setMinWeeks(typeof val === 'number' ? val : Number(val))}
            min={1}
            max={12}
          />

          <NumberInput
            label="Minggu Beza"
            description="Bilangan minggu beza tambahan"
            value={bufferWeeks}
            onChange={(val) => setBufferWeeks(typeof val === 'number' ? val : Number(val))}
            min={1}
            max={12}
          />

          <NumberInput
            label="Maksimum Minggu"
            description="Bilangan minggu maksimum untuk pengiraan stok"
            value={maxWeeks}
            onChange={(val) => setMaxWeeks(typeof val === 'number' ? val : Number(val))}
            min={1}
            max={52}
          />

          <TextInput
            label="Nama Fail Lalai"
            value={defaultFilename}
            onChange={(e) => setDefaultFilename(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSave}
              loading={loading}
            >
              Simpan Tetapan
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
