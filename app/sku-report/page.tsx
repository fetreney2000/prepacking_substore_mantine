'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { api } from '@/lib/api';
import { calculateLevels, determineStockStatus, statusLabel, statusColor } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU, Group, Settings, StockLevels, StockStatus } from '@/lib/types';
import {
  Container,
  Title,
  Button,
  Table,
  Select,
  Group as MantineGroup,
  Badge,
  Text,
  Paper,
  Stack,
  Switch,
  Box,
  Loader,
  Center,
} from '@mantine/core';
import { IconPrinter, IconReport } from '@tabler/icons-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'critical', label: 'Tiada Stok/Kritikal' },
  { value: 'low', label: 'Amaran' },
  { value: 'ok', label: 'Baik' },
  { value: 'out', label: 'Kehabisan' },
];

interface ReportRow {
  sku: SKU;
  levels: StockLevels;
  status: StockStatus;
  mingguStok: number | null;
  groupName: string;
  groupId: number | null;
}

export default function SKUReportPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [reportGenerated, setReportGenerated] = useState(false);

  const [showKumpulan, setShowKumpulan] = useState(false);
  const [showMin, setShowMin] = useState(false);
  const [showPenimbal, setShowPenimbal] = useState(false);
  const [showMaks, setShowMaks] = useState(false);

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
      } catch {
        console.error('Gagal memuatkan data laporan');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const groupNameMap = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groups]);

  const reportRows = useMemo<ReportRow[]>(() => {
    if (!settings) return [];
    return skus
      .filter((sku) => sku.enabled)
      .map((sku) => {
        const levels = calculateLevels(sku, settings);
        const status = determineStockStatus(sku, levels);
        const mingguStok =
          levels.awu > 0 ? Math.round((sku.stokSemasa / levels.awu) * 100) / 100 : null;
        return {
          sku,
          levels,
          status,
          mingguStok,
          groupName: sku.groupId ? groupNameMap.get(sku.groupId) || '-' : '-',
          groupId: sku.groupId,
        };
      });
  }, [skus, settings, groupNameMap]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return reportRows;
    return reportRows.filter((row) => {
      if (statusFilter === 'critical') {
        return row.status === 'critical' || row.status === 'out';
      }
      return row.status === statusFilter;
    });
  }, [reportRows, statusFilter]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string | number, ReportRow[]>();
    filteredRows.forEach((row) => {
      const key = row.groupId ?? 'none';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });
    return groups;
  }, [filteredRows]);

  const handleGenerate = useCallback(() => {
    setReportGenerated(true);
  }, []);

  const handlePrint = useCallback(() => {
    const colCount = 10;

    const visibleHeaders = [
      'Kod',
      'Nama',
      ...(showKumpulan ? ['Kumpulan'] : []),
      'Stok Semasa',
      'AWU',
      ...(showMin ? ['Min'] : []),
      ...(showPenimbal ? ['Penimbal'] : []),
      ...(showMaks ? ['Maks'] : []),
      'Minggu Stok',
      'Status',
    ];

    let rowsHtml = '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('ms-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    groupedRows.forEach((rows, groupId) => {
      const gName =
        groupId === 'none' ? 'Tanpa Kumpulan' : groupNameMap.get(groupId as number) || 'Tidak Diketahui';
      rowsHtml += `<tr><td colspan="${colCount}" style="background:#e6eff8;font-weight:700;padding:8px 12px;border:1px solid #d9e1ec;">${gName}</td></tr>`;

      rows.forEach((row) => {
        const statusBadgeColor =
          row.status === 'ok'
            ? '#16a34a'
            : row.status === 'low'
            ? '#ca8a04'
            : row.status === 'critical'
            ? '#dc2626'
            : '#6b7280';
        const statusBadgeBg =
          row.status === 'ok'
            ? '#dcfce7'
            : row.status === 'low'
            ? '#fef9c3'
            : row.status === 'critical'
            ? '#fee2e2'
            : '#f3f4f6';

        rowsHtml += '<tr>';
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;">${row.sku.kod}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;">${row.sku.nama}</td>`;
        rowsHtml += `<td class="sr-kumpulan" style="padding:6px 12px;border:1px solid #d9e1ec;">${row.groupName}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.sku.stokSemasa)}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.awu)}</td>`;
        rowsHtml += `<td class="sr-min" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.min)}</td>`;
        rowsHtml += `<td class="sr-penimbal" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.penimbal)}</td>`;
        rowsHtml += `<td class="sr-maks" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.maks)}</td>`;
        rowsHtml += `<td class="sr-minggu" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${row.mingguStok !== null ? row.mingguStok.toFixed(2) : '-'}</td>`;
        rowsHtml += `<td class="sr-status" style="padding:6px 12px;border:1px solid #d9e1ec;"><span style="background:${statusBadgeBg};color:${statusBadgeColor};padding:2px 8px;border-radius:4px;font-size:12px;">${statusLabel(row.status)}</span></td>`;
        rowsHtml += '</tr>';
      });
    });

    const toggleStyle = `.col-toggle-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.col-toggle-bar label{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid #ccc;border-radius:6px;background:#f5f5f5;font-size:11px;cursor:pointer;user-select:none}.col-toggle-bar input{display:none}.toggle-slider{width:28px;height:16px;background:#cbd5e1;border-radius:8px;position:relative;transition:background .2s;flex-shrink:0;display:inline-block}.toggle-slider::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}.col-toggle-bar input:checked+.toggle-slider{background:#2563eb}.col-toggle-bar input:checked+.toggle-slider::after{transform:translateX(12px)}.col-toggle-bar .toggle-label{font-size:11px;color:#333}@media print{.col-toggle-bar{display:none!important}.col-hidden,.col-hidden *{display:none!important}}`;

    const colToggleBar = `
      <div class="col-toggle-bar">
        <label><input type="checkbox" checked onchange="document.querySelectorAll('.sr-kumpulan').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Kumpulan</span></label>
        <label><input type="checkbox" checked onchange="document.querySelectorAll('.sr-min').forEach(el=>el.classList.toggle('col-hidden',!this.checked));document.querySelectorAll('.sr-penimbal').forEach(el=>el.classList.toggle('col-hidden',!this.checked));document.querySelectorAll('.sr-maks').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Min/Penimbal/Maks</span></label>
        <label><input type="checkbox" checked onchange="document.querySelectorAll('.sr-minggu').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Minggu Stok</span></label>
        <label><input type="checkbox" checked onchange="document.querySelectorAll('.sr-status').forEach(el=>el.classList.toggle('col-hidden',!this.checked))"><span class="toggle-slider"></span><span class="toggle-label">Status</span></label>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<title>Laporan SKU</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 12px; text-align: left; border: 1px solid #152c6b; }
  .record-count { margin-top: 12px; font-size: 12px; color: #64748b; }
  ${toggleStyle}
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Laporan SKU</h1>
<div class="meta">Dijana pada: ${dateStr}</div>
${colToggleBar}
<table>
<thead>
<tr>
  <th>Kod</th>
  <th>Nama</th>
  <th class="sr-kumpulan">Kumpulan</th>
  <th>Stok Semasa</th>
  <th>AWU</th>
  <th class="sr-min">Min</th>
  <th class="sr-penimbal">Penimbal</th>
  <th class="sr-maks">Maks</th>
  <th class="sr-minggu">Minggu Stok</th>
  <th class="sr-status">Status</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>
</table>
<div class="record-count">Jumlah rekod: ${filteredRows.length}</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const popup = window.open('', '_blank', 'width=1000,height=700');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
    }
  }, [groupedRows, filteredRows, showKumpulan, showMin, showPenimbal, showMaks, groupNameMap]);

  const visibleColCount =
    2 + (showKumpulan ? 1 : 0) + 1 + 1 + (showMin ? 1 : 0) + (showPenimbal ? 1 : 0) + (showMaks ? 1 : 0) + 1 + 1;

  const renderRowCells = (row: ReportRow) => (
    <>
      <td>{row.sku.kod}</td>
      <td>{row.sku.nama}</td>
      {showKumpulan && <td>{row.groupName}</td>}
      <td style={{ textAlign: 'right' }}>{formatNum(row.sku.stokSemasa)}</td>
      <td style={{ textAlign: 'right' }}>{formatNum(row.levels.awu)}</td>
      {showMin && <td style={{ textAlign: 'right' }}>{formatNum(row.levels.min)}</td>}
      {showPenimbal && <td style={{ textAlign: 'right' }}>{formatNum(row.levels.penimbal)}</td>}
      {showMaks && <td style={{ textAlign: 'right' }}>{formatNum(row.levels.maks)}</td>}
      <td style={{ textAlign: 'right' }}>
        {row.mingguStok !== null ? row.mingguStok.toFixed(2) : '-'}
      </td>
      <td>
        <Badge color={statusColor(row.status)} variant="light">
          {statusLabel(row.status)}
        </Badge>
      </td>
    </>
  );

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="xl">
        Laporan SKU
      </Title>

      <Paper p="md" mb="xl" withBorder>
        <MantineGroup gap="md" align="flex-end">
          <Select
            placeholder="Status"
            data={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ minWidth: 200 }}
          />
          <Button leftSection={<IconReport size={16} />} onClick={handleGenerate}>
            Jana Laporan
          </Button>
          <Button
            leftSection={<IconPrinter size={16} />}
            variant="light"
            onClick={handlePrint}
            disabled={!reportGenerated || filteredRows.length === 0}
          >
            Cetak
          </Button>
        </MantineGroup>
      </Paper>

      <Paper p="md" mb="md" withBorder>
        <Text size="sm" fw={500} mb="xs">
          Paparan Kolum
        </Text>
        <MantineGroup gap="xl">
          <Switch
            label="Kumpulan"
            checked={showKumpulan}
            onChange={(e) => setShowKumpulan(e.currentTarget.checked)}
          />
          <Switch
            label="Min"
            checked={showMin}
            onChange={(e) => setShowMin(e.currentTarget.checked)}
          />
          <Switch
            label="Penimbal"
            checked={showPenimbal}
            onChange={(e) => setShowPenimbal(e.currentTarget.checked)}
          />
          <Switch
            label="Maks"
            checked={showMaks}
            onChange={(e) => setShowMaks(e.currentTarget.checked)}
          />
        </MantineGroup>
      </Paper>

      {reportGenerated && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Jumlah rekod: {filteredRows.length}
          </Text>

          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Nama</th>
                  {showKumpulan && <th>Kumpulan</th>}
                  <th style={{ textAlign: 'right' }}>Stok Semasa</th>
                  <th style={{ textAlign: 'right' }}>AWU</th>
                  {showMin && <th style={{ textAlign: 'right' }}>Min</th>}
                  {showPenimbal && <th style={{ textAlign: 'right' }}>Penimbal</th>}
                  {showMaks && <th style={{ textAlign: 'right' }}>Maks</th>}
                  <th style={{ textAlign: 'right' }}>Minggu Stok</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColCount}>
                      <Text ta="center" py="xl">
                        Tiada data ditemui
                      </Text>
                    </td>
                  </tr>
                ) : (
                  Array.from(groupedRows.entries()).map(([groupId, rows]) => (
                    <Fragment key={String(groupId)}>
                      <tr>
                        <td
                          colSpan={visibleColCount}
                          style={{
                            background: 'var(--mantine-color-blue-0)',
                            fontWeight: 700,
                            padding: '8px 12px',
                          }}
                        >
                          {groupId === 'none'
                            ? 'Tanpa Kumpulan'
                            : groupNameMap.get(groupId as number) || 'Tidak Diketahui'}
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <tr key={row.sku.id}>{renderRowCells(row)}</tr>
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </Table>
          </Box>
        </Stack>
      )}
    </Container>
  );
}


