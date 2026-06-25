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
  Tooltip,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconSearch, IconPrinter, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { calculateOrderQty, calculateAWU, calculateLevels, determineStockStatus, statusLabel, statusColor } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU, Order, OrderItem, Settings } from '@/lib/types';
import ColumnToggle from '@/components/ColumnToggle';

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
  appTitle: string,
  settings: Settings | null
): string {
  const grouped: Record<string, OrderItem[]> = {};
  for (const item of items) {
    const sku = skus.find((s) => s.id === item.skuId);
    const gName = groupNameFromId(groups, sku?.groupId ?? null);
    if (!grouped[gName]) grouped[gName] = [];
    grouped[gName].push(item);
  }

  const defaultSettings: Settings = {
    id: 3, minWeeks: 2, bufferWeeks: 4, maxWeeks: 6,
    defaultFilename: '', appTitle: ''
  };
  const effectiveSettings = settings || defaultSettings;

  let rowsHtml = '';
  let idx = 1;
  for (const gName of Object.keys(grouped).sort()) {
    rowsHtml += `<tr style="background:#e0e7ff"><td colspan="9" style="font-weight:700;padding:6px 8px">${gName}</td></tr>`;
    for (const item of grouped[gName]) {
      const sku = skus.find((s) => s.id === item.skuId);
      const levels = sku ? calculateLevels(sku, effectiveSettings) : { awu: 0, min: 0, penimbal: 0, maks: 0 };
      rowsHtml += `<tr>`;
      rowsHtml += `<td style="padding:5px 8px;text-align:center">${idx++}</td>`;
      rowsHtml += `<td class="pc-kod" style="padding:5px 8px"><code>${item.kod}</code></td>`;
      rowsHtml += `<td class="pc-nama" style="padding:5px 8px">${sku?.nama ?? '-'}</td>`;
      rowsHtml += `<td class="pc-stok" style="padding:5px 8px;text-align:right">${formatNum(sku?.stokSemasa || 0)}</td>`;
      rowsHtml += `<td class="pc-awu" style="padding:5px 8px;text-align:right">${levels.awu}</td>`;
      rowsHtml += `<td class="pc-min" style="padding:5px 8px;text-align:right">${formatNum(levels.min)}</td>`;
      rowsHtml += `<td class="pc-penimbal" style="padding:5px 8px;text-align:right">${formatNum(levels.penimbal)}</td>`;
      rowsHtml += `<td class="pc-maks" style="padding:5px 8px;text-align:right">${formatNum(levels.maks)}</td>`;
      rowsHtml += `<td style="padding:5px 8px;text-align:right;font-weight:600">${formatNum(item.qtyOrdered)}</td>`;
      rowsHtml += `</tr>`;
    }
  }

  const orderedSkuIds = new Set<number>();
  for (const item of items) {
    if (item.skuId) orderedSkuIds.add(item.skuId);
  }

  const notOrderedSkus = skus
    .filter(s => s.enabled && !orderedSkuIds.has(s.id))
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  let notOrderedHtml = '';
  if (notOrderedSkus.length > 0) {
    const notOrderedGrouped: Record<string, SKU[]> = {};
    for (const sku of notOrderedSkus) {
      const gName = groupNameFromId(groups, sku.groupId);
      if (!notOrderedGrouped[gName]) notOrderedGrouped[gName] = [];
      notOrderedGrouped[gName].push(sku);
    }

    notOrderedHtml += `<div style="margin-top:24px;page-break-before:always">`;
    notOrderedHtml += `<h3 style="font-size:12pt;margin-bottom:8px;border-bottom:2px solid #2563EB;padding-bottom:4px;background:#1E3A8A;color:#fff;padding:8px 12px;border-radius:4px 4px 0 0">Item Yang Tidak Dipesan (${notOrderedSkus.length} item)</h3>`;
    notOrderedHtml += `<table style="margin-top:0">`;
    notOrderedHtml += `<thead><tr><th class="pc-kod">Kod</th><th class="pc-nama">Nama</th><th class="pc-kumpulan">Kumpulan</th><th class="pc-stok">Stok Semasa</th><th class="pc-awu">AWU</th><th class="pc-min">Min</th><th class="pc-penimbal">Penimbal</th><th class="pc-maks">Maks</th><th class="pc-status">Status</th></tr></thead>`;
    notOrderedHtml += `<tbody>`;

    for (const gName of Object.keys(notOrderedGrouped).sort()) {
      notOrderedHtml += `<tr style="background:#e0e7ff"><td colspan="9" style="font-weight:700;padding:6px 12px">${gName}</td></tr>`;
      for (const sku of notOrderedGrouped[gName]) {
        const levels = calculateLevels(sku, effectiveSettings);
        const status = determineStockStatus(sku, levels);
        const statusText = statusLabel(status);
        notOrderedHtml += `<tr>`;
        notOrderedHtml += `<td class="pc-kod" style="padding:5px 8px"><code>${sku.kod}</code></td>`;
        notOrderedHtml += `<td class="pc-nama" style="padding:5px 8px">${sku.nama}</td>`;
        notOrderedHtml += `<td class="pc-kumpulan" style="padding:5px 8px">${groupNameFromId(groups, sku.groupId)}</td>`;
        notOrderedHtml += `<td class="pc-stok" style="padding:5px 8px;text-align:right">${formatNum(sku.stokSemasa || 0)}</td>`;
        notOrderedHtml += `<td class="pc-awu" style="padding:5px 8px;text-align:right">${levels.awu}</td>`;
        notOrderedHtml += `<td class="pc-min" style="padding:5px 8px;text-align:right">${formatNum(levels.min)}</td>`;
        notOrderedHtml += `<td class="pc-penimbal" style="padding:5px 8px;text-align:right">${formatNum(levels.penimbal)}</td>`;
        notOrderedHtml += `<td class="pc-maks" style="padding:5px 8px;text-align:right">${formatNum(levels.maks)}</td>`;
        notOrderedHtml += `<td class="pc-status" style="padding:5px 8px">${statusText}</td>`;
        notOrderedHtml += `</tr>`;
      }
    }

    notOrderedHtml += `</tbody></table></div>`;
  }

  const toggleStyle = `.col-toggle-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.col-toggle-bar label{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;font-size:11px;cursor:pointer;user-select:none}.col-toggle-bar input{display:none}.toggle-slider{width:28px;height:16px;background:#cbd5e1;border-radius:8px;position:relative;transition:background .2s;flex-shrink:0;display:inline-block}.toggle-slider::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}.col-toggle-bar input:checked+.toggle-slider{background:#2563eb}.col-toggle-bar input:checked+.toggle-slider::after{transform:translateX(12px)}.col-toggle-bar .toggle-label{font-size:11px;color:#333}@media print{.col-toggle-bar{display:none!important}.col-hidden,.col-hidden *{display:none!important}}`;

  const colToggleBar = `
    <div class="col-toggle-bar">
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-kod').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Kod</span></label>
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-nama').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Nama</span></label>
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-stok').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Stok</span></label>
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-awu').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">AWU</span></label>
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-min').forEach(el=>el.classList.toggle('col-hidden',!this.checked));document.querySelectorAll('.pc-penimbal').forEach(el=>el.classList.toggle('col-hidden',!this.checked));document.querySelectorAll('.pc-maks').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Min/Penimbal/Maks</span></label>
      <label><input type="checkbox" checked onchange="document.querySelectorAll('.pc-kumpulan').forEach(el=>el.classList.toggle('col-hidden',!this.checked));document.querySelectorAll('.pc-status').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Kumpulan/Status</span></label>
    </div>`;

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
  ${toggleStyle}
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
  ${colToggleBar}
  <table>
    <thead><tr><th style="width:30px">#</th><th class="pc-kod">Kod</th><th class="pc-nama">Nama</th><th class="pc-stok" style="text-align:right">Stok</th><th class="pc-awu" style="text-align:right">AWU</th><th class="pc-min" style="text-align:right">Min</th><th class="pc-penimbal" style="text-align:right">Penimbal</th><th class="pc-maks" style="text-align:right">Maks</th><th style="text-align:right">Kuantiti</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  ${notOrderedHtml}
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
  const [settings, setSettings] = useState<Settings | null>(null);
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

  const [colId, setColId] = useState(true);
  const [colTarikh, setColTarikh] = useState(true);
  const [colPembuat, setColPembuat] = useState(true);
  const [colTempoh, setColTempoh] = useState(true);
  const [colItem, setColItem] = useState(true);
  const [colAksi, setColAksi] = useState(true);

  const [colItemNama, setColItemNama] = useState(true);
  const [colItemStok, setColItemStok] = useState(true);
  const [colItemAwu, setColItemAwu] = useState(true);
  const [colItemNota, setColItemNota] = useState(true);

  const fetchData = async () => {
    try {
      const [ordersData, skusData, groupsData, settingsData] = await Promise.all([
        api.orders.list(),
        api.skus.list(),
        api.groups.list(),
        api.settings.get(),
      ]);
      setOrders(ordersData);
      setSkus(skusData);
      setGroups(groupsData);
      setSettings(settingsData);
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
      const html = buildPrintHtml(fullOrder, items, skus, groups, 'Sistem Inventori Prabungkus Hospital Keningau', settings);
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

  const ordersVisibleCount = [colId, colTarikh, colPembuat, colTempoh, colItem, colAksi].filter(Boolean).length;

  const getSkuDetails = (skuId: number | null) => {
    if (!skuId) return null;
    const sku = skus.find((s) => s.id === skuId);
    if (!sku) return null;
    const levels = calculateAWU(sku);
    return { nama: sku.nama, stok: sku.stokSemasa, awu: Math.round(levels) };
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Senarai Pesanan</Title>

      <Paper withBorder p="md">
        <TextInput
          placeholder="Cari mengikut ID, tarikh, atau pembuat..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </Paper>

      <Paper withBorder p="md">
        <Box mb="md">
          <ColumnToggle columns={[
            { key: 'id', label: 'ID', visible: colId, onChange: setColId },
            { key: 'tarikh', label: 'Tarikh', visible: colTarikh, onChange: setColTarikh },
            { key: 'pembuat', label: 'Pembuat', visible: colPembuat, onChange: setColPembuat },
            { key: 'tempoh', label: 'Tempoh', visible: colTempoh, onChange: setColTempoh },
            { key: 'item', label: 'Item', visible: colItem, onChange: setColItem },
            { key: 'aksi', label: 'Aksi', visible: colAksi, onChange: setColAksi },
          ]} />
        </Box>
        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {colId && <Table.Th>ID</Table.Th>}
                {colTarikh && <Table.Th>Tarikh</Table.Th>}
                {colPembuat && <Table.Th>Pembuat</Table.Th>}
                {colTempoh && <Table.Th>Tempoh</Table.Th>}
                {colItem && <Table.Th ta="right">Item</Table.Th>}
                {colAksi && <Table.Th>Aksi</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredOrders.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={ordersVisibleCount}>
                    <Text ta="center" c="dimmed" py="xl">
                      Tiada pesanan ditemui
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredOrders.map((order) => (
                  <Table.Tr key={order.id}>
                    {colId && <Table.Td>{order.id}</Table.Td>}
                    {colTarikh && <Table.Td>{order.tarikh}</Table.Td>}
                    {colPembuat && <Table.Td>{order.namaPembuat}</Table.Td>}
                    {colTempoh && <Table.Td>{order.tempohMinggu} minggu</Table.Td>}
                    {colItem && <Table.Td ta="right">{formatNum(order.itemCount ?? 0)}</Table.Td>}
                    {colAksi && (
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip label="Cetak" position="top" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => handlePrint(order)}
                            >
                              <IconPrinter size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Edit" position="top" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="yellow"
                              onClick={() => handleOpenEdit(order)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Padam" position="top" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => {
                                setDeletingOrder(order);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    )}
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

          {editItems.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              Tiada item. Klik &quot;Tambah Item&quot; untuk menambah.
            </Text>
          ) : (
            <>
              <ColumnToggle columns={[
                { key: 'nama', label: 'Nama', visible: colItemNama, onChange: setColItemNama },
                { key: 'stok', label: 'Stok', visible: colItemStok, onChange: setColItemStok },
                { key: 'awu', label: 'AWU', visible: colItemAwu, onChange: setColItemAwu },
                { key: 'nota', label: 'Nota', visible: colItemNota, onChange: setColItemNota },
              ]} />
              <Box style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>SKU</Table.Th>
                      {colItemNama && <Table.Th>Nama</Table.Th>}
                      {colItemStok && <Table.Th ta="right">Stok</Table.Th>}
                      {colItemAwu && <Table.Th ta="right">AWU</Table.Th>}
                      <Table.Th ta="right">Kuantiti</Table.Th>
                      {colItemNota && <Table.Th>Nota</Table.Th>}
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {editItems.map((item, idx) => {
                      const details = getSkuDetails(item.skuId);
                      return (
                        <Table.Tr key={idx}>
                          <Table.Td>
                            <Select
                              placeholder="Pilih SKU"
                              data={skuOptions}
                              value={item.skuId !== null ? String(item.skuId) : null}
                              onChange={(val) => handleItemSkuChange(idx, val)}
                              searchable
                              clearable
                              size="xs"
                            />
                          </Table.Td>
                          {colItemNama && (
                            <Table.Td>{details?.nama || '-'}</Table.Td>
                          )}
                          {colItemStok && (
                            <Table.Td ta="right">{details ? formatNum(details.stok) : '-'}</Table.Td>
                          )}
                          {colItemAwu && (
                            <Table.Td ta="right">{details ? formatNum(details.awu) : '-'}</Table.Td>
                          )}
                          <Table.Td ta="right">
                            <NumberInput
                              value={item.qtyOrdered}
                              onChange={(val) => handleItemQtyChange(idx, val ?? 0)}
                              min={0}
                              size="xs"
                              maw={100}
                            />
                          </Table.Td>
                          {colItemNota && (
                            <Table.Td>
                              <TextInput
                                placeholder="Nota item"
                                value={item.notes}
                                onChange={(e) => handleItemNotesChange(idx, e.currentTarget.value)}
                                size="xs"
                              />
                            </Table.Td>
                          )}
                          <Table.Td>
                            <Tooltip label="Padam item" position="top" withArrow>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Box>
            </>
          )}

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
