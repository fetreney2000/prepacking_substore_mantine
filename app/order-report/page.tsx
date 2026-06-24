'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from '@mantine/core';
import { api } from '@/lib/api';
import { formatNum } from '@/lib/format';
import { SKU, Group as GroupType, Order, OrderItem } from '@/lib/types';

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

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterPembuat, setFilterPembuat] = useState('');
  const [filterSkuId, setFilterSkuId] = useState<string | null>(null);

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [colTarikh, setColTarikh] = useState(true);
  const [colPembuat, setColPembuat] = useState(true);
  const [colKod, setColKod] = useState(true);
  const [colNama, setColNama] = useState(true);
  const [colKumpulan, setColKumpulan] = useState(true);
  const [colKuantiti, setColKuantiti] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [skusData, groupsData] = await Promise.all([
          api.skus.list(),
          api.groups.list(),
        ]);
        setSkus(skusData);
        setGroups(groupsData);
      } catch {
        // silent
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

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
    setReportRows([]);
    setHasGenerated(true);

    try {
      const orders = await api.orders.list();

      const filtered = orders.filter((o) => {
        if (dateFrom && o.tarikh < dateFrom) return false;
        if (dateTo && o.tarikh > dateTo) return false;
        if (filterPembuat) {
          if (!o.namaPembuat.toLowerCase().includes(filterPembuat.toLowerCase())) return false;
        }
        return true;
      });

      const rows: ReportRow[] = [];

      for (const order of filtered) {
        const items = order.items ?? (await api.orderItems.list(order.id));

        for (const item of items) {
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
    } catch {
      // silent
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
              placeholder="Tapis mengikut nama pembuat..."
              value={filterPembuat}
              onChange={(e) => setFilterPembuat(e.currentTarget.value)}
            />
            <Select
              label="SKU"
              placeholder="Semua SKU"
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
