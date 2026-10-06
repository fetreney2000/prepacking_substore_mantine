'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Center,
  Stack,
  Paper,
  PasswordInput,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconLogin } from '@tabler/icons-react';
import { api } from '@/lib/api';

/** Only same-origin paths are accepted as a post-login redirect target. */
function safeRedirectTarget(): string {
  const from = new URLSearchParams(window.location.search).get('from') || '/dashboard';
  return from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Sila masukkan kata laluan');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.auth.login(password);
      router.replace(safeRedirectTarget());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal log masuk');
      setSubmitting(false);
    }
  };

  return (
    <Center mih="100vh" bg="var(--mantine-color-body)">
      <Paper withBorder p="xl" radius="md" w={380} shadow="sm">
        <Stack gap="md">
          <div>
            <Title order={3}>Sistem Inventori Prabungkus</Title>
            <Text size="sm" c="dimmed">
              Substor Hospital Keningau — sila log masuk untuk meneruskan.
            </Text>
          </div>

          {error && (
            <Alert
              color="red"
              icon={<IconAlertCircle size={16} />}
              title="Gagal log masuk"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <PasswordInput
                label="Kata Laluan"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoFocus
                data-autofocus
              />
              <Button
                type="submit"
                leftSection={<IconLogin size={16} />}
                loading={submitting}
                fullWidth
              >
                Log Masuk
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  );
}
