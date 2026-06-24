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
  Modal,
  Select,
  ActionIcon,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconSearch, IconPrinter, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { calculateOrderQty } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU, Order, OrderItem } from '@/lib/types';

interface EditItem {
  skuId: number | null;
  kod: string;
  qtyOrdered: number;
  notes: string;
}

function groupNameFromId(groups: { id: number; name: string }[], gid: number | null): string {
  if (!gid) return '(Tiada Kumpulan)';
  const g = groups.find((gr) => gr.id === gid);
  return g ? g.name : '(Tiada Kumpulan)';
}

function buildPrintHtml(
  order: Order,
  items: OrderItem[],
  skus: SKU[],
  groups: { id: number; name: string }[],
  appTitle: string
): string {
  const grouped: Record<string, OrderItem[]> = {};
  for (const item of items) {
    const sku = skus.find((s) => s.id === item.skuId);
    const gName = groupNameFromId(groups, sku?.groupId ?? null);
    if (!grouped[gName]) grouped[gName] = [];
    grouped[gName].push(item);
  }

  let rowsHtml = '';
  let idx = 1;
  for (const gName of Object.keys(grouped).sort()) {
    rowsHtml += `<tr style="background:#e0e7ff"><td colspan="4" style="font-weight:700;padding:6px 8px">${gName}</td></tr>`;
    for (const item of grouped[gName]) {
      const sku = skus.find((s) => s.id === item.skuId);
      rowsHtml += `<tr><td style="padding:5px 8px;text-align:center">${idx++}</td><td style="padding:5px 8px"><code>${item.kod}</code></td><td style="padding:5px 8px">${sku?.nama ?? '-'}</td><td style="padding:5px 8px;text-align:right;font-weight:600">${formatNum(item.qtyOrdered)}</td></tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<title>${appTitle} — Pesanan #${order.id}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;padding:32px;font-size:13px;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#1e3a8a;color:#fff;padding:8px 12px;text-align:left;font-weight:600;font-size:12px}
  td{border-bottom:1px solid #e5e7eb}
  .header-bar{background:linear-gradient(135deg,#1E3A8A,#2563EB);color:#fff;text-align:center;margin-bottom:16px;padding:16px;border-radius:6px}
  .header-bar h2{font-size:16pt;margin:0;color:#fff}
  .header-bar h3{font-size:13pt;margin:4px 0;color:#93c5fd}
  .info-box{margin-bottom:12px;font-size:10pt;border:1px solid #c0d4e8;padding:10px;border-radius:4px;background:#f0f4ff}
  .sig-row{display:flex;gap:60px;margin-top:40px}
  .sig-box{flex:1}
  .sig-box p{margin-bottom:50px}
  .print-actions{text-align:center;margin-top:24px}
  .print-actions button{padding:10px 24px;margin:0 8px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
  .btn-print{background:#2563eb;color:#fff}
  .btn-print:hover{background:#1d4ed8}
  .btn-close{background:#e5e7eb;color:#374151}
  .btn-close:hover{background:#d1d5db}
  @media print{.print-actions{display:none!important}body{padding:16px}}
</style>
</head>
<body>
  <div class="header-bar">
    <h2>${appTitle}</h2>
    <h3>Borang Permohonan Stok</h3>
  </div>
  <div class="info-box">
    <strong>ID Pesanan:</strong> ${order.id} &nbsp;|&nbsp;
    <strong>Tarikh:</strong> ${order.tarikh || ''} &nbsp;|&nbsp;
    <strong>Pembuat:</strong> ${order.namaPembuat || ''} &nbsp;|&nbsp;
    <strong>Tempoh:</strong> ${order.tempohMinggu} minggu
    ${order.notes ? `<br><strong>Nota:</strong> ${order.notes}` : ''}
  </div>
  <table>
    <thead><tr><th style="width:40px">#</th><th>Kod</th><th>Nama</th><th style="width:80px;text-align:right">Kuantiti</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sig-row">
    <div class="sig-box"><p><strong>Disediakan oleh:</strong><br><small>(Pembuat Pesanan)</small></p></div>
    <div class="sig-box"><p><strong>Disahkan oleh:</strong><br><small>(Tandatangan &amp; Cop)</small></p></div>
  </div>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">Cetak</button>
    <button class="btn-close" onclick="window.close()">Tutup</button>
  </div>
</body>
</html>`;
}

export default function EditOrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editTarikh, setEditTarikh] = useState('');
  const [editNamaPembuat, setEditNamaPembuat] = useState('');
  const [editTempohMinggu, setEditTempohMinggu] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  const fetchData = async () => {
    try {
      const [ordersData, skusData, groupsData] = await Promise.all([
        api.orders.list(),
        api.skus.list(),
        api.groups.list(),
      ]);
      setOrders(ordersData);
      setSkus(skusData);
      setGroups(groupsData);
    } catch {
      showNotification({ title: 'Ralat', message: 'Gagal memuatkan data pesanan', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        String(o.id).includes(q) ||
        (o.tarikh && o.tarikh.toLowerCase().includes(q)) ||
        (o.namaPembuat && o.namaPembuat.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const skuOptions = useMemo(
    () => skus.map((s) => ({ value: String(s.id), label: `${s.kod} — ${s.nama}` })),
    [skus]
  );

  const handleOpenEdit = async (order: Order) => {
    try {
      const fullOrder = await api.orders.get(order.id);
      setEditingOrder(fullOrder);
      setEditTarikh(fullOrder.tarikh || '');
      setEditNamaPembuat(fullOrder.namaPembuat || '');
      setEditTempohMinggu(fullOrder.tempohMinggu || 0);
      setEditNotes(fullOrder.notes || '');
      const items = (fullOrder.items || []).map((it) => ({
        skuId: it.skuId,
        kod: it.kod,
        qtyOrdered: it.qtyOrdered,
        notes: it.notes || '',
      }));
      setEditItems(items.length > 0 ? items : []);
      setEditModalOpen(true);
    } catch {
      showNotification({ title: 'Ralat', message: 'Gagal memuatkan butiran pesanan', color: 'red' });
    }
  };

  const handleAddItem = () => {
    setEditItems((prev) => [{ skuId: null, kod: '', qtyOrdered: 0, notes: '' }, ...prev]);
  };

  const handleRemoveItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemSkuChange = (idx: number, val: string | null) => {
    if (!val) {
      setEditItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, skuId: null, kod: '' } : it))
      );
      return;
    }
    const skuId = Number(val);
    const sku = skus.find((s) => s.id === skuId);
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              skuId,
              kod: sku?.kod || '',
              qtyOrdered:
                editTempohMinggu > 0 && sku ? calculateOrderQty(sku, editTempohMinggu) : it.qtyOrdered,
            }
          : it
      )
    );
  };

  const handleItemQtyChange = (idx: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : parseInt(val as string) || 0;
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qtyOrdered: qty } : it)));
  };

  const handleItemNotesChange = (idx: number, val: string) => {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, notes: val } : it)));
  };

  const handleTempohChange = (val: number | string) => {
    const weeks = typeof val === 'number' ? val : parseInt(val as string) || 0;
    setEditTempohMinggu(weeks);
    if (weeks > 0) {
      setEditItems((prev) =>
        prev.map((it) => {
          if (!it.skuId) return it;
          const sku = skus.find((s) => s.id === it.skuId);
          if (!sku) return it;
          return { ...it, qtyOrdered: calculateOrderQty(sku, weeks) };
        })
      );
    }
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    if (!editTarikh) {
      showNotification({ title: 'Ralat', message: 'Tarikh diperlukan', color: 'red' });
      return;
    }
    const items = editItems
      .filter((it) => it.skuId !== null)
      .map((it) => ({
        skuId: it.skuId!,
        kod: it.kod,
        qtyOrdered: it.qtyOrdered,
        notes: it.notes,
      }));

    setSaving(true);
    try {
      await api.orders.update(editingOrder.id, {
        tarikh: editTarikh,
        namaPembuat: editNamaPembuat,
        tempohMinggu: editTempohMinggu,
        notes: editNotes,
        items,
      });
      showNotification({ title: 'Berjaya', message: 'Pesanan berjaya dikemaskini', color: 'green' });
      setEditModalOpen(false);
      fetchData();
    } catch {
      showNotification({ title: 'Ralat', message: 'Gagal menyimpan pesanan', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrder) return;
    try {
      await api.orders.delete(deletingOrder.id);
      showNotification({ title: 'Berjaya', message: 'Pesanan berjaya dipadam', color: 'green' });
      setDeleteModalOpen(false);
      fetchData();
    } catch {
      showNotification({ title: 'Ralat', message: 'Gagal memadam pesanan', color: 'red' });
    }
  };

  const handlePrint = async (order: Order) => {
    try {
      const fullOrder = await api.orders.get(order.id);
      const items = fullOrder.items || [];
      const html = buildPrintHtml(fullOrder, items, skus, groups, 'Sistem Inventori Prabungkus Hospital Keningau');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        showNotification({ title: 'Amaran', message: 'Sila benarkan pop-up untuk mencetak', color: 'yellow' });
      }
    } catch {
      showNotification({ title: 'Ralat', message: 'Gagal memuatkan data untuk cetak', color: 'red' });
    }
  };

  if (loading) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Edit / Urus Pesanan</Title>

      <Paper withBorder p="md">
        <TextInput
          placeholder="Cari mengikut ID, tarikh, atau pembuat..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </Paper>

      <Paper withBorder p="md">
        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Tarikh</Table.Th>
                <Table.Th>Pembuat</Table.Th>
                <Table.Th>Tempoh</Table.Th>
                <Table.Th ta="right">Item</Table.Th>
                <Table.Th>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredOrders.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">
                      Tiada pesanan ditemui
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredOrders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td>{order.id}</Table.Td>
                    <Table.Td>{order.tarikh}</Table.Td>
                    <Table.Td>{order.namaPembuat}</Table.Td>
                    <Table.Td>{order.tempohMinggu} minggu</Table.Td>
                    <Table.Td ta="right">{formatNum(order.itemCount ?? 0)}</Table.Td>
                    <Table.Td>
                       <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handlePrint(order)}
                          title="Cetak"
                        >
                          <IconPrinter size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="yellow"
                          onClick={() => handleOpenEdit(order)}
                          title="Edit"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            setDeletingOrder(order);
                            setDeleteModalOpen(true);
                          }}
                          title="Padam"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>

        <Divider my="md" />
        <Text size="sm" c="dimmed">
          Jumlah pesanan: {formatNum(filteredOrders.length)}
        </Text>
      </Paper>

      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Kemaskini Pesanan"
        size="xl"
      >
        <Stack gap="md">
          <Group grow align="flex-end">
            <TextInput
              label="Tarikh"
              type="date"
              value={editTarikh}
              onChange={(e) => setEditTarikh(e.currentTarget.value)}
            />
            <TextInput
              label="Nama Pembuat"
              value={editNamaPembuat}
              onChange={(e) => setEditNamaPembuat(e.currentTarget.value)}
            />
            <NumberInput
              label="Tempoh Minggu"
              value={editTempohMinggu}
              onChange={handleTempohChange}
              min={0}
            />
          </Group>
          <TextInput
            label="Nota"
            placeholder="Nota pesanan"
            value={editNotes}
            onChange={(e) => setEditNotes(e.currentTarget.value)}
          />

          <Divider />

          <Group justify="space-between">
            <Text fw={600}>Item Pesanan</Text>
            <Button
              leftSection={<IconPlus size={14} />}
              variant="light"
              size="xs"
              onClick={handleAddItem}
            >
              Tambah Item
            </Button>
          </Group>

          {editItems.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" py="md">
              Tiada item. Klik &quot;Tambah Item&quot; untuk menambah.
            </Text>
          )}

          {editItems.map((item, idx) => (
            <Paper key={idx} withBorder p="sm">
              <Group grow align="flex-end" gap="sm">
                <Select
                  label="SKU"
                  placeholder="Pilih SKU"
                  data={skuOptions}
                  value={item.skuId !== null ? String(item.skuId) : null}
                  onChange={(val) => handleItemSkuChange(idx, val)}
                  searchable
                  clearable
                  size="xs"
                />
                <NumberInput
                  label="Kuantiti"
                  value={item.qtyOrdered}
                  onChange={(val) => handleItemQtyChange(idx, val ?? 0)}
                  min={0}
                  size="xs"
                  maw={120}
                />
                <TextInput
                  label="Nota"
                  placeholder="Nota item"
                  value={item.notes}
                  onChange={(e) => handleItemNotesChange(idx, e.currentTarget.value)}
                  size="xs"
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => handleRemoveItem(idx)}
                  title="Padam item"
                  mt="auto"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}

          <Divider />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Jumlah item: {editItems.length}
            </Text>
            <Group gap="sm">
              <Button variant="default" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button color="red" onClick={() => {
                setEditModalOpen(false);
                if (editingOrder) {
                  setDeletingOrder(editingOrder);
                  setDeleteModalOpen(true);
                }
              }}>
                Padam
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Simpan
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Sahkan Padaman"
      >
        <Stack gap="md">
          <Text>
            Adakah anda pasti ingin memadam pesanan{' '}
            <strong>#{deletingOrder?.id}</strong> yang dibuat oleh{' '}
            <strong>{deletingOrder?.namaPembuat}</strong>?
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button color="red" onClick={handleDelete}>
              Padam
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
