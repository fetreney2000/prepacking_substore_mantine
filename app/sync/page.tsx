'use client';

import { useState, useRef } from 'react';
import {
  Title,
  Paper,
  Button,
  Stack,
  Group,
  Text,
  Modal,
  Table,
  Badge,
} from '@mantine/core';
import {
  IconDownload,
  IconUpload,
  IconFileSpreadsheet,
  IconRefresh,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
import { api } from '@/lib/api';

export default function SyncPage() {
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [importResults, setImportResults] = useState<{
    updated: { table: string; count: number }[];
    missing: { table: string; rows: string[] }[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importingDb, setImportingDb] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const dbFileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  async function handleExportDb() {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({
        title: 'Berjaya',
        message: 'Data berjaya dieksport',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Ralat',
        message: 'Gagal mengeksport data',
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  }

  function handleImportDbClick() {
    dbFileRef.current?.click();
  }

  async function handleDbFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Import akan menimpa data sedia ada. Teruskan?')) {
      e.target.value = '';
      return;
    }

    setImportingDb(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importData(data);
      notifications.show({
        title: 'Berjaya',
        message: 'Data berjaya diimport',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Ralat',
        message: 'Gagal mengimport data. Pastikan fail JSON sah.',
        color: 'red',
      });
    } finally {
      setImportingDb(false);
      e.target.value = '';
    }
  }

  function handleImportExcelClick() {
    excelFileRef.current?.click();
  }

  async function handleExcelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

      const result = await api.importExcel(file.name, rows);
      setImportResults({
        updated: [{ table: 'SKU', count: result.updatedCount }],
        missing: result.missingFromExcel.map((s) => ({ table: s.kod, rows: [s.nama] })),
      });
      setImportModalOpened(true);
    } catch {
      notifications.show({
        title: 'Ralat',
        message: 'Gagal membaca fail Excel. Pastikan format fail betul.',
        color: 'red',
      });
    } finally {
      setImportingExcel(false);
      e.target.value = '';
    }
  }

  return (
    <Stack gap="lg" p="md">
      <Group>
        <IconRefresh size={28} />
        <Title order={2}>Selaraskan Data</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={4}>Eksport Pangkalan Data</Title>
          <Text size="sm" c="dimmed">
            Muat turun semua data sebagai fail JSON untuk sandaran.
          </Text>
          <Group>
            <Button
              leftSection={<IconDownload size={18} />}
              onClick={handleExportDb}
              loading={exporting}
              variant="filled"
            >
              Eksport JSON
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={4}>Import Pangkalan Data</Title>
          <Text size="sm" c="dimmed">
            Import data daripada fail JSON. Peringatan: ini akan menimpa data sedia ada.
          </Text>
          <input
            ref={dbFileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleDbFileChange}
          />
          <Group>
            <Button
              leftSection={<IconUpload size={18} />}
              onClick={handleImportDbClick}
              loading={importingDb}
              variant="filled"
              color="blue"
            >
              Import JSON
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={4}>Import Excel</Title>
          <Text size="sm" c="dimmed">
            Import data daripada fail Excel (.xls, .xlsx). Data akan dikemas kini mengikut jadual yang sepadan.
          </Text>
          <input
            ref={excelFileRef}
            type="file"
            accept=".xls,.xlsx"
            style={{ display: 'none' }}
            onChange={handleExcelFileChange}
          />
          <Group>
            <Button
              leftSection={<IconFileSpreadsheet size={18} />}
              onClick={handleImportExcelClick}
              loading={importingExcel}
              variant="filled"
              color="teal"
            >
              Pilih Fail Excel
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Modal
        opened={importModalOpened}
        onClose={() => setImportModalOpened(false)}
        title="Keputusan Import Excel"
        size="lg"
      >
        {importResults && (
          <Stack gap="md">
            {importResults.updated.length > 0 && (
              <div>
                <Text fw={600} mb="xs">
                  Jadual Dikemas Kini
                </Text>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Jadual</Table.Th>
                      <Table.Th>Bilangan Baris</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {importResults.updated.map((item) => (
                      <Table.Tr key={item.table}>
                        <Table.Td>{item.table}</Table.Td>
                        <Table.Td>
                          <Badge color="green">{item.count}</Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {importResults.missing.length > 0 && (
              <div>
                <Text fw={600} mb="xs">
                  Jadual Tidak Dijumpai
                </Text>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Jadual</Table.Th>
                      <Table.Th>Helaian Excel</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {importResults.missing.map((item) => (
                      <Table.Tr key={item.table}>
                        <Table.Td>{item.table}</Table.Td>
                        <Table.Td>
                          <Badge color="red">{item.rows.join(', ')}</Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {importResults.updated.length === 0 &&
              importResults.missing.length === 0 && (
                <Text c="dimmed">Tiada data dikemas kini.</Text>
              )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
