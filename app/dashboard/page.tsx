'use client';

import { useState, useEffect } from 'react';
import {
  SimpleGrid,
  Stack,
  Group,
  Text,
  Title,
  Badge,
  Table,
  Paper,
  Loader,
  Center,
  Box,
} from '@mantine/core';
import {
  IconPackage,
  IconUsers,
  IconChartBar,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { api } from '@/lib/api';
import {
  calculateLevels,
  determineStockStatus,
  statusLabel,
  statusColor,
} from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU, Group as GroupType, Settings } from '@/lib/types';
import ColumnToggle from '@/components/ColumnToggle';

export default function DashboardPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const [colKod, setColKod] = useState(true);
  const [colNama, setColNama] = useState(true);
  const [colKumpulan, setColKumpulan] = useState(true);
  const [colStokSemasa, setColStokSemasa] = useState(true);
  const [colMin, setColMin] = useState(true);
  const [colStatus, setColStatus] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [skusData, groupsData, settingsData] = await Promise.all([
          api.skus.list(),
          api.groups.list(),
          api.settings.get(),
        ]);
        setSkus(skusData);
        setGroups(groupsData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  const activeSkus = skus.filter((s) => s.enabled);
  const totalStock = activeSkus.reduce((sum, s) => sum + (s.stokSemasa || 0), 0);

  const skusWithStatus = activeSkus.map((sku) => {
    const group = groups.find((g) => g.id === sku.groupId);
    const levels = settings
      ? calculateLevels(sku, settings)
      : { awu: 0, min: 0, penimbal: 0, maks: 0 };
    const status = determineStockStatus(sku, levels);
    return { ...sku, group, levels, status };
  });

  const lowStockSkus = skusWithStatus.filter(
    (s) => s.status === 'low' || s.status === 'critical' || s.status === 'out'
  );

  const summaryCards = [
    {
      title: 'Jumlah SKU Aktif',
      value: formatNum(activeSkus.length),
      icon: IconPackage,
      color: 'blue',
    },
    {
      title: 'Kumpulan',
      value: formatNum(groups.length),
      icon: IconUsers,
      color: 'green',
    },
    {
      title: 'Jumlah Stok',
      value: formatNum(totalStock),
      icon: IconChartBar,
      color: 'teal',
    },
    {
      title: 'Stok Rendah',
      value: formatNum(lowStockSkus.length),
      icon: IconAlertTriangle,
      color: 'orange',
    },
  ];

  return (
    <Stack gap="lg">
      <Title order={2}>Papan Pemuka</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {summaryCards.map((card) => (
          <Paper
            key={card.title}
            withBorder
            p="md"
            style={{
              borderLeft: `4px solid var(--mantine-color-${card.color}-6)`,
            }}
          >
            <Group justify="space-between">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  {card.title}
                </Text>
                <Text fw={700} size="xl">
                  {card.value}
                </Text>
              </Stack>
              <card.icon
                size={32}
                color={`var(--mantine-color-${card.color}-6)`}
              />
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder p="md">
        <Title order={4} mb="md">
          Stok Rendah / Kehabisan Stok
        </Title>
        {lowStockSkus.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            Tiada item stok rendah pada masa ini.
          </Text>
        ) : (
          <>
            <Box mb="md">
              <ColumnToggle columns={[
                { key: 'kod', label: 'Kod', visible: colKod, onChange: setColKod },
                { key: 'nama', label: 'Nama', visible: colNama, onChange: setColNama },
                { key: 'kumpulan', label: 'Kumpulan', visible: colKumpulan, onChange: setColKumpulan },
                { key: 'stokSemasa', label: 'Stok Semasa', visible: colStokSemasa, onChange: setColStokSemasa },
                { key: 'min', label: 'Min', visible: colMin, onChange: setColMin },
                { key: 'status', label: 'Status', visible: colStatus, onChange: setColStatus },
              ]} />
            </Box>
            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {colKod && <Table.Th>Kod</Table.Th>}
                    {colNama && <Table.Th>Nama</Table.Th>}
                    {colKumpulan && <Table.Th>Kumpulan</Table.Th>}
                    {colStokSemasa && <Table.Th>Stok Semasa</Table.Th>}
                    {colMin && <Table.Th>Min</Table.Th>}
                    {colStatus && <Table.Th>Status</Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lowStockSkus.map((sku) => (
                    <Table.Tr key={sku.id}>
                      {colKod && <Table.Td><code>{sku.kod}</code></Table.Td>}
                      {colNama && <Table.Td>{sku.nama}</Table.Td>}
                      {colKumpulan && <Table.Td>{sku.group?.name || '-'}</Table.Td>}
                      {colStokSemasa && <Table.Td>{formatNum(sku.stokSemasa)}</Table.Td>}
                      {colMin && <Table.Td>{formatNum(sku.levels.min)}</Table.Td>}
                      {colStatus && (
                        <Table.Td>
                          <Badge color={statusColor(sku.status)}>
                            {statusLabel(sku.status)}
                          </Badge>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </>
        )}
      </Paper>
    </Stack>
  );
}
