'use client';

import { Title, Paper, Stack, Text, Group, Center, Avatar } from '@mantine/core';
import { IconCopyright, IconUser, IconPhone, IconMail } from '@tabler/icons-react';

export default function CopyrightPage() {
  return (
    <Stack gap="lg" p="md" align="center">
      <Group>
        <IconCopyright size={28} />
        <Title order={2}>Hak Cipta</Title>
      </Group>

      <Paper withBorder p="xl" radius="md" maw={500} w="100%">
        <Stack gap="md" align="center">
          <Avatar size={80} radius="xl" color="blue">
            <IconUser size={40} />
          </Avatar>

          <div style={{ textAlign: 'center' }}>
            <Title order={3}>Sistem Inventori Pra-Packing</Title>
            <Text size="lg" fw={500} c="blue">
              Versi 2.0
            </Text>
          </div>

          <Stack gap="xs" align="center">
            <Text fw={600} size="lg">
              Ahmad Fetre Bin Mohammad Zime
            </Text>
            <Text c="dimmed">Pembangun Aplikasi</Text>
          </Stack>

          <Stack gap="xs" align="center">
            <Group gap="xs">
              <IconPhone size={16} />
              <Text>016-881 3920</Text>
            </Group>
            <Group gap="xs">
              <IconMail size={16} />
              <Text>fetreney2000@gmail.com</Text>
            </Group>
          </Stack>

          <Text size="sm" c="dimmed" ta="center">
            Hak Cipta © {new Date().getFullYear()} Ahmad Fetre Bin Mohammad Zime. 
            Semua hak cipta terpelihara.
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
