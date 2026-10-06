'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { catalog } from '@/lib/catalog';
import { usePersistedState } from '@/lib/usePersistedState';
import { calculateLevels, determineStockStatus, statusLabel, STOCK_STATUS } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { escapeHtml, PRINT_TOGGLE_STYLE, buildPrintToggleBar } from '@/lib/print';
import StatusBadge from '@/components/StatusBadge';
import TableSkeleton from '@/components/Skeletons';
import { SKU, Group, Settings, StockLevels, StockStatus } from '@/lib/types';
import {
  Container,
  Title,
  Button,
  Table,
  Select,
  Group as MantineGroup,
  Text,
  Paper,
  Stack,
  Switch,
  Box,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPrinter, IconReport, IconAlertCircle } from '@tabler/icons-react';

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

/**
 * Ink for the status pills in the printed report. The previous per-status
 * colours measured 2.74-3.95:1 on their pastel backgrounds (WCAG 1.4.3 needs
 * 4.5:1); one dark ink measures 14.5-16.5:1 and the hue still comes from the
 * background — same treatment as the on-screen StatusBadge.
 */
const PRINT_STATUS_INK = '#111827';

export default function SKUReportPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [reportGenerated, setReportGenerated] = useState(false);

  const [showKumpulan, setShowKumpulan] = usePersistedState('col:sku-report:kumpulan', false);
  const [showMin, setShowMin] = usePersistedState('col:sku-report:min', false);
  const [showPenimbal, setShowPenimbal] = usePersistedState('col:sku-report:penimbal', false);
  const [showMaks, setShowMaks] = usePersistedState('col:sku-report:maks', false);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
      const [skusData, groupsData, settingsData] = await Promise.all([
        catalog.skus(),
        catalog.groups(),
        catalog.settings(),
      ]);
      setSkus(skusData);
      setGroups(groupsData);
      setSettings(settingsData);
    } catch (err) {
      // console.error only, previously: without settings the report silently
      // renders as "Tiada data ditemui" (review #14).
      setLoadError(
        err instanceof Error && err.message ? err.message : 'Gagal memuatkan data laporan.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      rowsHtml += `<tr><td colspan="${colCount}" style="background:#e6eff8;font-weight:700;padding:8px 12px;border:1px solid #d9e1ec;">${escapeHtml(gName)}</td></tr>`;

      rows.forEach((row) => {
        // From the shared status palette (review #8) — screen and paper
        // cannot drift apart.
        const statusBadgeBg = STOCK_STATUS[row.status]?.printBg ?? '#f3f4f6';

        rowsHtml += '<tr>';
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;">${escapeHtml(row.sku.kod)}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;">${escapeHtml(row.sku.nama)}</td>`;
        rowsHtml += `<td class="sr-kumpulan" style="padding:6px 12px;border:1px solid #d9e1ec;">${escapeHtml(row.groupName)}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.sku.stokSemasa)}</td>`;
        rowsHtml += `<td style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.awu)}</td>`;
        rowsHtml += `<td class="sr-min" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.min)}</td>`;
        rowsHtml += `<td class="sr-penimbal" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.penimbal)}</td>`;
        rowsHtml += `<td class="sr-maks" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${formatNum(row.levels.maks)}</td>`;
        rowsHtml += `<td class="sr-minggu" style="padding:6px 12px;border:1px solid #d9e1ec;text-align:right;">${row.mingguStok !== null ? row.mingguStok.toFixed(2) : '-'}</td>`;
        rowsHtml += `<td class="sr-status" style="padding:6px 12px;border:1px solid #d9e1ec;"><span style="background:${statusBadgeBg};color:${PRINT_STATUS_INK};padding:2px 8px;border-radius:4px;font-size:12px;">${escapeHtml(statusLabel(row.status))}</span></td>`;
        rowsHtml += '</tr>';
      });
    });

    const colToggleBar = buildPrintToggleBar([
      { label: 'Kumpulan', selectors: ['.sr-kumpulan'] },
      { label: 'Min/Penimbal/Maks', selectors: ['.sr-min', '.sr-penimbal', '.sr-maks'] },
      { label: 'Minggu Stok', selectors: ['.sr-minggu'] },
      { label: 'Status', selectors: ['.sr-status'] },
    ]);

    const html = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<title>Laporan Item</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 12px; text-align: left; border: 1px solid #152c6b; }
  .record-count { margin-top: 12px; font-size: 12px; color: #64748b; }
  ${PRINT_TOGGLE_STYLE}
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Laporan Item</h1>
<div class="meta">Dijana pada: ${escapeHtml(dateStr)}</div>
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
    } else {
      // A blocked popup used to look like "the button did nothing".
      notifications.show({
        title: 'Amaran',
        message: 'Sila benarkan pop-up untuk mencetak',
        color: 'yellow',
      });
    }
  }, [groupedRows, filteredRows, groupNameMap]);

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
        <StatusBadge status={row.status} />
      </td>
    </>
  );

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Title order={2} mb="xl">
          Laporan Item
        </Title>
        <TableSkeleton rows={6} columns={6} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="xl">
        Laporan Item
      </Title>

      {loadError && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Gagal memuatkan data"
          mb="xl"
        >
          <MantineGroup justify="space-between" align="center" gap="sm">
            <Text size="sm">{loadError}</Text>
            <Button size="xs" variant="light" onClick={fetchData}>
              Cuba semula
            </Button>
          </MantineGroup>
        </Alert>
      )}

      <Paper p="md" mb="xl" withBorder>
        <MantineGroup gap="md" align="flex-end">
          <Select
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

          <Box className="table-scroll">
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


