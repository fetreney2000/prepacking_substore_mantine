'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Table,
  Box,
  Text,
  Select,
  Switch,
  Divider,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { catalog } from '@/lib/catalog';
import { usePersistedState } from '@/lib/usePersistedState';
import { formatNum } from '@/lib/format';
import { SKU, Group as GroupType } from '@/lib/types';

interface ReportRow {
  tarikh: string;
  pembuat: string;
  kod: string;
  nama: string;
  kumpulan: string;
  kuantiti: number;
}

export default function OrderReportPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterPembuat, setFilterPembuat] = useState('');
  const [filterSkuId, setFilterSkuId] = useState<string | null>(null);

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [colTarikh, setColTarikh] = usePersistedState('col:order-report:tarikh', true);
  const [colPembuat, setColPembuat] = usePersistedState('col:order-report:pembuat', true);
  const [colKod, setColKod] = usePersistedState('col:order-report:kod', true);
  const [colNama, setColNama] = usePersistedState('col:order-report:nama', true);
  const [colKumpulan, setColKumpulan] = usePersistedState('col:order-report:kumpulan', true);
  const [colKuantiti, setColKuantiti] = usePersistedState('col:order-report:kuantiti', true);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [skusData, groupsData] = await Promise.all([
        catalog.skus(),
        catalog.groups(),
      ]);
      setSkus(skusData);
      setGroups(groupsData);
    } catch (err) {
      setLoadError(
        err instanceof Error && err.message ? err.message : 'Gagal memuatkan senarai SKU dan kumpulan.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const skuOptions = useMemo(
    () => skus.map((s) => ({ value: String(s.id), label: `${s.kod} - ${s.nama}` })),
    [skus]
  );

  const groupName = (groupId: number | null) => {
    if (!groupId) return '-';
    const g = groups.find((gr) => gr.id === groupId);
    return g ? g.name : '-';
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setLoadError(null);
    setReportRows([]);
    setHasGenerated(true);

    try {
      // One request: the date range is applied server-side and every order
      // arrives with its items embedded — previously this made one HTTP call
      // per order, in sequence.
      const orders = await api.report.orders(dateFrom, dateTo);

      const filtered = orders.filter((o) => {
        if (filterPembuat) {
          if (!o.namaPembuat.toLowerCase().includes(filterPembuat.toLowerCase())) return false;
        }
        return true;
      });

      const rows: ReportRow[] = [];

      for (const order of filtered) {
        for (const item of order.items ?? []) {
          if (filterSkuId && item.skuId !== Number(filterSkuId)) continue;

          const sku = skus.find((s) => s.id === item.skuId);
          const kumpulan = sku ? groupName(sku.groupId) : groupName(null);

          rows.push({
            tarikh: order.tarikh,
            pembuat: order.namaPembuat,
            kod: item.kod,
            nama: sku?.nama ?? '-',
            kumpulan,
            kuantiti: item.qtyOrdered,
          });
        }
      }

      rows.sort((a, b) => a.tarikh.localeCompare(b.tarikh));
      setReportRows(rows);
    } catch (err) {
      // This used to be swallowed, so a failed request rendered as
      // "Tiada rekod ditemui" — indistinguishable from a genuinely empty
      // report (review #14). Show why it failed instead.
      setLoadError(
        err instanceof Error && err.message ? err.message : 'Gagal menjana laporan.'
      );
      setHasGenerated(false);
    } finally {
      setGenerating(false);
    }
  };

  if (loadingData) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">
        Laporan Pesanan
      </Title>

      {loadError && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Gagal memuatkan data"
          mb="lg"
        >
          <Group justify="space-between" align="center" gap="sm">
            <Text size="sm">{loadError}</Text>
            <Button size="xs" variant="light" onClick={loadData}>
              Cuba semula
            </Button>
          </Group>
        </Alert>
      )}

      <Paper withBorder p="md" mb="lg">
        <Stack gap="md">
          <Group grow align="flex-end">
            <TextInput
              label="Dari Tarikh"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.currentTarget.value)}
            />
            <TextInput
              label="Hingga Tarikh"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.currentTarget.value)}
            />
            <TextInput
              label="Pembuat"
              value={filterPembuat}
              onChange={(e) => setFilterPembuat(e.currentTarget.value)}
            />
            <Select
              label="SKU"
              data={skuOptions}
              value={filterSkuId}
              onChange={setFilterSkuId}
              clearable
              searchable
            />
          </Group>
          <Group justify="flex-end">
            <Button onClick={handleGenerate} loading={generating}>
              Jana Laporan
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" mb="lg">
        <Text size="sm" fw={600} mb="sm">
          Paparkan Tunjang
        </Text>
        <Group gap="md">
          <Switch
            label="Tarikh"
            checked={colTarikh}
            onChange={(e) => setColTarikh(e.currentTarget.checked)}
          />
          <Switch
            label="Pembuat"
            checked={colPembuat}
            onChange={(e) => setColPembuat(e.currentTarget.checked)}
          />
          <Switch
            label="Kod"
            checked={colKod}
            onChange={(e) => setColKod(e.currentTarget.checked)}
          />
          <Switch
            label="Nama"
            checked={colNama}
            onChange={(e) => setColNama(e.currentTarget.checked)}
          />
          <Switch
            label="Kumpulan"
            checked={colKumpulan}
            onChange={(e) => setColKumpulan(e.currentTarget.checked)}
          />
          <Switch
            label="Kuantiti"
            checked={colKuantiti}
            onChange={(e) => setColKuantiti(e.currentTarget.checked)}
          />
        </Group>
      </Paper>

      <Paper withBorder p="md">
        {hasGenerated && (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {colTarikh && <Table.Th>Tarikh</Table.Th>}
                  {colPembuat && <Table.Th>Pembuat</Table.Th>}
                  {colKod && <Table.Th>Kod</Table.Th>}
                  {colNama && <Table.Th>Nama</Table.Th>}
                  {colKumpulan && <Table.Th>Kumpulan</Table.Th>}
                  {colKuantiti && <Table.Th ta="right">Kuantiti</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {generating ? (
                  <Table.Tr>
                    <Table.Td
                      colSpan={
                        [colTarikh, colPembuat, colKod, colNama, colKumpulan, colKuantiti].filter(
                          Boolean
                        ).length || 1
                      }
                    >
                      <Center py="xl">
                        <Loader size="sm" />
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : reportRows.length === 0 ? (
                  <Table.Tr>
                    <Table.Td
                      colSpan={
                        [colTarikh, colPembuat, colKod, colNama, colKumpulan, colKuantiti].filter(
                          Boolean
                        ).length || 1
                      }
                    >
                      <Text ta="center" c="dimmed" py="xl">
                        Tiada rekod ditemui
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  reportRows.map((row, idx) => (
                    <Table.Tr key={idx}>
                      {colTarikh && <Table.Td>{row.tarikh}</Table.Td>}
                      {colPembuat && <Table.Td>{row.pembuat}</Table.Td>}
                      {colKod && <Table.Td>{row.kod}</Table.Td>}
                      {colNama && <Table.Td>{row.nama}</Table.Td>}
                      {colKumpulan && <Table.Td>{row.kumpulan}</Table.Td>}
                      {colKuantiti && (
                        <Table.Td ta="right">{formatNum(row.kuantiti)}</Table.Td>
                      )}
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {!hasGenerated && (
          <Text ta="center" c="dimmed" py="xl">
            Klik &quot;Jana Laporan&quot; untuk menjana laporan
          </Text>
        )}

        <Divider my="md" />

        <Text size="sm" c="dimmed">
          Jumlah rekod: {formatNum(reportRows.length)}
        </Text>
      </Paper>
    </Container>
  );
}
