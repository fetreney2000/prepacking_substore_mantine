'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
} from '@mantine/core';
import { IconSettings, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [appTitle, setAppTitle] = useState('');
  const [minWeeks, setMinWeeks] = useState<number>(1);
  const [bufferWeeks, setBufferWeeks] = useState<number>(1);
  const [maxWeeks, setMaxWeeks] = useState<number>(12);
  const [defaultFilename, setDefaultFilename] = useState('');
  const [layoutMode, setLayoutMode] = useState<'table' | 'card'>('table');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await api.settings.get();
      if (settings) {
        setAppTitle(settings.appTitle || '');
        setMinWeeks(settings.minWeeks ?? 1);
        setBufferWeeks(settings.bufferWeeks ?? 1);
        setMaxWeeks(settings.maxWeeks ?? 12);
        setDefaultFilename(settings.defaultFilename || '');
        setLayoutMode((settings.layoutMode || 'table') as 'table' | 'card');
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
    setLoading(true);
    try {
      await api.settings.update({
        appTitle,
        minWeeks,
        bufferWeeks,
        maxWeeks,
        defaultFilename,
        layoutMode,
      });
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
    <Stack gap="lg" p="md">
      <Group>
        <IconSettings size={28} />
        <Title order={2}>Tetapan</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <TextInput
            label="Nama Aplikasi"
            placeholder="Nama aplikasi"
            value={appTitle}
            onChange={(e) => setAppTitle(e.currentTarget.value)}
          />

          <NumberInput
            label="Minimum Minggu"
            description="Bilangan minggu minimum untuk pengiraan stok"
            value={minWeeks}
            onChange={(val) => setMinWeeks(val as number)}
            min={1}
            max={12}
          />

          <NumberInput
            label="Minggu Beza"
            description="Bilangan minggu beza tambahan"
            value={bufferWeeks}
            onChange={(val) => setBufferWeeks(val as number)}
            min={1}
            max={12}
          />

          <NumberInput
            label="Maksimum Minggu"
            description="Bilangan minggu maksimum untuk pengiraan stok"
            value={maxWeeks}
            onChange={(val) => setMaxWeeks(val as number)}
            min={1}
            max={52}
          />

          <TextInput
            label="Nama Fail Lalai"
            placeholder="Nama fail untuk eksport"
            value={defaultFilename}
            onChange={(e) => setDefaultFilename(e.currentTarget.value)}
          />

          <Select
            label="Mod Aturan"
            description="Pilih mod paparan"
            data={[
              { value: 'table', label: 'Jadual' },
              { value: 'card', label: 'Kad' },
            ]}
            value={layoutMode}
            onChange={(val) => setLayoutMode(val as 'table' | 'card')}
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
