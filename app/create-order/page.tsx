'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Title,
  TextInput,
  NumberInput,
  Button,
  Table,
  Box,
  Divider,
  Loader,
  Center,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { api } from '@/lib/api';
import { calculateAWU, calculateOrderQty } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU } from '@/lib/types';
import ColumnToggle from '@/components/ColumnToggle';

interface OrderRow {
  skuId: number;
  kod: string;
  nama: string;
  awu: number;
  stok: number;
  qty: number;
  notes: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateOrderPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tarikh, setTarikh] = useState(todayStr());
  const [namaPembuat, setNamaPembuat] = useState('Ahmad Fetre');
  const [tempohMinggu, setTempohMinggu] = useState<number>(0);
  const [nota, setNota] = useState('');
  const [rows, setRows] = useState<OrderRow[]>([]);

  const [colKodNama, setColKodNama] = useState(true);
  const [colAwu, setColAwu] = useState(true);
  const [colStok, setColStok] = useState(true);
  const [colKuantiti, setColKuantiti] = useState(true);
  const [colNota, setColNota] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.skus.list();
        const active = data.filter((s) => s.enabled);
        setSkus(active);
        setRows(
          active.map((s) => ({
            skuId: s.id,
            kod: s.kod,
            nama: s.nama,
            awu: Math.round(calculateAWU(s)),
            stok: s.stokSemasa || 0,
            qty: 0,
            notes: '',
          }))
        );
      } catch {
        showNotification({
          title: 'Ralat',
          message: 'Gagal memuatkan data SKU',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recalcQty = (weeks: number) => {
    setRows((prev) =>
      prev.map((r) => {
        const sku = skus.find((s) => s.id === r.skuId);
        if (!sku) return r;
        return { ...r, qty: calculateOrderQty(sku, weeks) };
      })
    );
  };

  const handleTempohChange = (val: number | string) => {
    const weeks = typeof val === 'number' ? val : parseInt(val) || 0;
    setTempohMinggu(weeks);
    recalcQty(weeks);
  };

  const handleQtyChange = (skuId: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : parseInt(val) || 0;
    setRows((prev) =>
      prev.map((r) => (r.skuId === skuId ? { ...r, qty } : r))
    );
  };

  const handleNotesChange = (skuId: number, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.skuId === skuId ? { ...r, notes: val } : r))
    );
  };

  const handleSave = async () => {
    if (!tarikh) {
      showNotification({
        title: 'Ralat',
        message: 'Tarikh diperlukan',
        color: 'red',
      });
      return;
    }

    const items = rows
      .filter((r) => r.qty > 0)
      .map((r) => ({
        skuId: r.skuId,
        kod: r.kod,
        qtyOrdered: r.qty,
        notes: r.notes,
      }));

    if (items.length === 0) {
      showNotification({
        title: 'Ralat',
        message: 'Sila pilih sekurang-kurangnya satu item',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      await api.orders.create({
        tarikh,
        namaPembuat,
        tempohMinggu,
        notes: nota,
        items,
      });
      showNotification({
        title: 'Berjaya',
        message: 'Pesanan berjaya disimpan',
        color: 'green',
      });
      resetForm();
    } catch {
      showNotification({
        title: 'Ralat',
        message: 'Gagal menyimpan pesanan',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTarikh(todayStr());
    setNamaPembuat('Ahmad Fetre');
    setTempohMinggu(0);
    setNota('');
    setRows((prev) => prev.map((r) => ({ ...r, qty: 0, notes: '' })));
  };

  const totalQty = useMemo(() => rows.reduce((sum, r) => sum + r.qty, 0), [rows]);

  if (loading) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  const visibleCount = [colKodNama, colAwu, colStok, colKuantiti, colNota].filter(Boolean).length;

  return (
    <Stack gap="lg">
      <Title order={2}>Cipta Pesanan Baru</Title>

      <Paper withBorder p="md">
        <Group grow align="flex-end">
          <TextInput
            label="Tarikh"
            type="date"
            value={tarikh}
            onChange={(e) => setTarikh(e.currentTarget.value)}
          />
          <TextInput
            label="Nama Pembuat"
            value={namaPembuat}
            onChange={(e) => setNamaPembuat(e.currentTarget.value)}
          />
          <NumberInput
            label="Tempoh Minggu"
            value={tempohMinggu}
            onChange={handleTempohChange}
            min={0}
          />
          <TextInput
            label="Nota"
            placeholder="Nota pilihan"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
          />
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="md">
          Item Pesanan
        </Title>

        <Box mb="md">
          <ColumnToggle columns={[
            { key: 'kodNama', label: 'Kod & Nama', visible: colKodNama, onChange: setColKodNama },
            { key: 'awu', label: 'AWU', visible: colAwu, onChange: setColAwu },
            { key: 'stok', label: 'Stok', visible: colStok, onChange: setColStok },
            { key: 'kuantiti', label: 'Kuantiti', visible: colKuantiti, onChange: setColKuantiti },
            { key: 'nota', label: 'Nota', visible: colNota, onChange: setColNota },
          ]} />
        </Box>

        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {colKodNama && <Table.Th>Kod & Nama</Table.Th>}
                {colAwu && <Table.Th ta="right">AWU</Table.Th>}
                {colStok && <Table.Th ta="right">Stok</Table.Th>}
                {colKuantiti && <Table.Th ta="right">Kuantiti</Table.Th>}
                {colNota && <Table.Th>Nota</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.skuId}>
                  {colKodNama && (
                    <Table.Td>
                      <Text size="sm">
                        <Text component="span" fw={600}>
                          {row.kod}
                        </Text>
                        {' — '}
                        {row.nama}
                      </Text>
                    </Table.Td>
                  )}
                  {colAwu && <Table.Td ta="right">{formatNum(row.awu)}</Table.Td>}
                  {colStok && <Table.Td ta="right">{formatNum(row.stok)}</Table.Td>}
                  {colKuantiti && (
                    <Table.Td ta="right">
                      <NumberInput
                        value={row.qty}
                        onChange={(val) => handleQtyChange(row.skuId, val ?? 0)}
                        min={0}
                        step={1}
                        size="xs"
                        maw={100}
                      />
                    </Table.Td>
                  )}
                  {colNota && (
                    <Table.Td>
                      <TextInput
                        value={row.notes}
                        onChange={(e) =>
                          handleNotesChange(row.skuId, e.currentTarget.value)
                        }
                        placeholder="Nota"
                        size="xs"
                      />
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        <Divider my="md" />

        <Group justify="space-between">
          <Text fw={600}>
            Jumlah Item: {formatNum(totalQty)}
          </Text>
          <Button onClick={handleSave} loading={saving}>
            Simpan Pesanan
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
