'use client';

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { catalog } from '@/lib/catalog';
import { usePersistedState } from '@/lib/usePersistedState';
import { useSlashToFocus } from '@/lib/useSlashToFocus';
import { calculateAWU, calculateOrderQty } from '@/lib/calculations';
import { formatNum, localDateStr } from '@/lib/format';
import { SKU } from '@/lib/types';
import ColumnToggle from '@/components/ColumnToggle';
import TableSkeleton from '@/components/Skeletons';

interface OrderRow {
  skuId: number;
  kod: string;
  nama: string;
  awu: number;
  stok: number;
  qty: number;
  notes: string;
}

interface RowColumns {
  kodNama: boolean;
  awu: boolean;
  stok: boolean;
  qty: boolean;
  notes: boolean;
}

/**
 * One item row, memoised: editing a quantity updates only that row's object,
 * so the other rows keep their identity and skip re-rendering. Without this,
 * typing in one cell re-rendered every row in the table (review #21).
 */
const OrderRowView = memo(function OrderRowView({
  row,
  columns,
  onQtyChange,
  onNotesChange,
}: {
  row: OrderRow;
  columns: RowColumns;
  onQtyChange: (skuId: number, val: number | string) => void;
  onNotesChange: (skuId: number, val: string) => void;
}) {
  return (
    <Table.Tr>
      {columns.kodNama && (
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
      {columns.awu && <Table.Td ta="right">{formatNum(row.awu)}</Table.Td>}
      {columns.stok && <Table.Td ta="right">{formatNum(row.stok)}</Table.Td>}
      {columns.qty && (
        <Table.Td ta="right">
          <NumberInput
            value={row.qty}
            onChange={(val) => onQtyChange(row.skuId, val ?? 0)}
            min={0}
            step={1}
            size="xs"
            maw={100}
          />
        </Table.Td>
      )}
      {columns.notes && (
        <Table.Td>
          <TextInput
            value={row.notes}
            onChange={(e) => onNotesChange(row.skuId, e.currentTarget.value)}
            size="xs"
          />
        </Table.Td>
      )}
    </Table.Tr>
  );
});

/** Today's date in LOCAL time (see `localDateStr` — UTC showed yesterday). */
function todayStr(): string {
  return localDateStr();
}

export default function CreateOrderPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tarikh, setTarikh] = useState(todayStr());
  const [namaPembuat, setNamaPembuat] = useState('');
  const [tempohMinggu, setTempohMinggu] = useState<number>(0);
  const [nota, setNota] = useState('');
  const [rows, setRows] = useState<OrderRow[]>([]);

  const [colKodNama, setColKodNama] = usePersistedState('col:create-order:kod-nama', true);
  const [colAwu, setColAwu] = usePersistedState('col:create-order:awu', true);
  const [colStok, setColStok] = usePersistedState('col:create-order:stok', true);
  const [colKuantiti, setColKuantiti] = usePersistedState('col:create-order:kuantiti', true);
  const [colNota, setColNota] = usePersistedState('col:create-order:nota', true);
  const [search, setSearch] = useState('');

  // `/` jumps straight to the "Tapis item" box (review #9).
  useSlashToFocus();

  // Remember the order creator on this machine instead of defaulting to a
  // hardcoded name (review #31).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('namaPembuat');
      if (saved) setNamaPembuat(saved);
    } catch {
      // storage unavailable; the field simply starts empty
    }
  }, []);

  const handleNamaPembuatChange = (value: string) => {
    setNamaPembuat(value);
    try {
      window.localStorage.setItem('namaPembuat', value);
    } catch {
      // remembering is a convenience, not a requirement
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await catalog.skus();
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

  const handleQtyChange = useCallback((skuId: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : parseInt(val) || 0;
    setRows((prev) => prev.map((r) => (r.skuId === skuId ? { ...r, qty } : r)));
  }, []);

  const handleNotesChange = useCallback((skuId: number, val: string) => {
    setRows((prev) => prev.map((r) => (r.skuId === skuId ? { ...r, notes: val } : r)));
  }, []);

  const handleSave = async () => {
    if (!tarikh) {
      showNotification({
        title: 'Ralat',
        message: 'Tarikh diperlukan',
        color: 'red',
      });
      return;
    }
    if (!namaPembuat.trim()) {
      showNotification({
        title: 'Ralat',
        message: 'Nama pembuat diperlukan',
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
    setTempohMinggu(0);
    setNota('');
    setRows((prev) => prev.map((r) => ({ ...r, qty: 0, notes: '' })));
  };

  const totalQty = useMemo(() => rows.reduce((sum, r) => sum + r.qty, 0), [rows]);

  // Stable identity so OrderRowView's memo actually holds (review #21).
  const columns = useMemo<RowColumns>(
    () => ({
      kodNama: colKodNama,
      awu: colAwu,
      stok: colStok,
      qty: colKuantiti,
      notes: colNota,
    }),
    [colKodNama, colAwu, colStok, colKuantiti, colNota]
  );

  // Rendering is filtered, state is not: every SKU keeps its computed
  // quantity and is still saved, whether or not it is currently on screen.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.kod.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (loading) {
    return (
      <Stack gap="lg">
        <Title order={2}>Cipta Pesanan Baru</Title>
        <TableSkeleton rows={8} columns={5} />
      </Stack>
    );
  }

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
            onChange={(e) => handleNamaPembuatChange(e.currentTarget.value)}
          />
          <NumberInput
            label="Tempoh Minggu"
            value={tempohMinggu}
            onChange={handleTempohChange}
            min={0}
          />
          <TextInput
            label="Nota"
            value={nota}
            onChange={(e) => setNota(e.currentTarget.value)}
          />
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <Title order={3} mb="md">
          Item Pesanan
        </Title>

        <Group mb="md" align="flex-end">
          <TextInput
            label="Tapis item"
            placeholder="Kod atau nama"
            data-search-input="true"
            leftSection={<IconSearch size={16} color="var(--mantine-color-blue-6)" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <ColumnToggle columns={[
            { key: 'kodNama', label: 'Kod & Nama', visible: colKodNama, onChange: setColKodNama },
            { key: 'awu', label: 'AWU', visible: colAwu, onChange: setColAwu },
            { key: 'stok', label: 'Stok', visible: colStok, onChange: setColStok },
            { key: 'kuantiti', label: 'Kuantiti', visible: colKuantiti, onChange: setColKuantiti },
            { key: 'nota', label: 'Nota', visible: colNota, onChange: setColNota },
          ]} />
        </Group>

        <Box className="table-scroll">
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
              {visibleRows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={Object.values(columns).filter(Boolean).length || 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {rows.length === 0 ? 'Tiada SKU aktif untuk dipesan.' : 'Tiada item sepadan.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                visibleRows.map((row) => (
                  <OrderRowView
                    key={row.skuId}
                    row={row}
                    columns={columns}
                    onQtyChange={handleQtyChange}
                    onNotesChange={handleNotesChange}
                  />
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>

        {search.trim() !== '' && (
          <Text size="sm" c="dimmed" mt="xs">
            Menunjukkan {visibleRows.length} daripada {rows.length} item — item
            lain kekal dikira dalam jumlah dan turut disimpan.
          </Text>
        )}

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
