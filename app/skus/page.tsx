'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { calculateLevels, determineStockStatus, statusLabel, statusColor } from '@/lib/calculations';
import { formatNum } from '@/lib/format';
import { SKU, Group, Settings } from '@/lib/types';
import {
  Container,
  Title,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Checkbox,
  Select,
  Group as MantineGroup,
  Badge,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  Box,
  Tooltip,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconCheck, IconX } from '@tabler/icons-react';
import ColumnToggle from '@/components/ColumnToggle';

const emptyForm = {
  kod: '',
  nama: '',
  saizPek: 1,
  groupId: null as number | null,
  stokSemasa: 0,
  notes: '',
  usageMonth1: 0,
  usageMonth2: 0,
  usageMonth3: 0,
  enabled: true,
  fullStockAlways: false,
  useManualLevels: false,
  minManual: 0,
  penimbalManual: 0,
  maksManual: 0,
};

export default function SKUsPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [deletingSKU, setDeletingSKU] = useState<SKU | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const [colKod, setColKod] = useState(true);
  const [colNama, setColNama] = useState(true);
  const [colKumpulan, setColKumpulan] = useState(true);
  const [colStok, setColStok] = useState(true);
  const [colAwu, setColAwu] = useState(true);
  const [colMin, setColMin] = useState(true);
  const [colPenimbal, setColPenimbal] = useState(true);
  const [colMaks, setColMaks] = useState(true);
  const [colStatus, setColStatus] = useState(true);
  const [colAksi, setColAksi] = useState(true);

  const fetchData = async () => {
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
      showNotification({
        title: 'Ralat',
        message: 'Gagal memuatkan data SKU',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSKUs = useMemo(() => {
    return skus.filter((sku) => {
      if (activeOnly && !sku.enabled) return false;
      if (filterGroup && sku.groupId !== Number(filterGroup)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          sku.kod.toLowerCase().includes(q) ||
          sku.nama.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [skus, search, filterGroup, activeOnly]);

  const groupName = (groupId: number | null) => {
    if (!groupId) return '-';
    const g = groups.find((gr) => gr.id === groupId);
    return g ? g.name : '-';
  };

  const groupOptions = groups.map((g) => ({
    value: String(g.id),
    label: g.name,
  }));

  const setFormField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (sku?: SKU) => {
    if (sku) {
      setEditingSKU(sku);
      setForm({
        kod: sku.kod,
        nama: sku.nama,
        saizPek: sku.saizPek,
        groupId: sku.groupId,
        stokSemasa: sku.stokSemasa,
        notes: sku.notes || '',
        usageMonth1: sku.usageMonth1,
        usageMonth2: sku.usageMonth2,
        usageMonth3: sku.usageMonth3,
        enabled: sku.enabled,
        fullStockAlways: sku.fullStockAlways,
        useManualLevels: sku.useManualLevels,
        minManual: sku.minManual,
        penimbalManual: sku.penimbalManual,
        maksManual: sku.maksManual,
      });
    } else {
      setEditingSKU(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.kod.trim()) {
      showNotification({ title: 'Ralat', message: 'Kod SKU diperlukan', color: 'red' });
      return;
    }
    if (!form.nama.trim()) {
      showNotification({ title: 'Ralat', message: 'Nama SKU diperlukan', color: 'red' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingSKU) {
        await api.skus.update(editingSKU.id, form);
        showNotification({ title: 'Berjaya', message: 'SKU berjaya dikemaskini', color: 'green' });
      } else {
        await api.skus.create(form);
        showNotification({ title: 'Berjaya', message: 'SKU berjaya ditambah', color: 'green' });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification({ title: 'Ralat', message: 'Gagal menyimpan SKU', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSKU) return;
    try {
      await api.skus.delete(deletingSKU.id);
      showNotification({ title: 'Berjaya', message: 'SKU berjaya dipadam', color: 'green' });
      setDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification({ title: 'Ralat', message: 'Gagal memadam SKU', color: 'red' });
    }
  };

  const rows = useMemo(() => {
    if (!settings) return [];
    return filteredSKUs.map((sku) => {
      const levels = calculateLevels(sku, settings);
      const status = determineStockStatus(sku, levels);
      return (
        <tr key={sku.id}>
          {colKod && <td>{sku.kod}</td>}
          {colNama && <td>{sku.nama}</td>}
          {colKumpulan && <td>{groupName(sku.groupId)}</td>}
          {colStok && <td>{formatNum(sku.stokSemasa)}</td>}
          {colAwu && <td>{formatNum(levels.awu)}</td>}
          {colMin && <td>{formatNum(levels.min)}</td>}
          {colPenimbal && <td>{formatNum(levels.penimbal)}</td>}
          {colMaks && <td>{formatNum(levels.maks)}</td>}
          {colStatus && (
            <td>
              <Badge color={statusColor(status)} variant="light">
                {statusLabel(status)}
              </Badge>
            </td>
          )}
          {colAksi && (
            <td>
              <MantineGroup gap="xs" wrap="nowrap">
                <Tooltip label="Edit" position="top" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => handleOpenModal(sku)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Padam" position="top" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      setDeletingSKU(sku);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </MantineGroup>
            </td>
          )}
        </tr>
      );
    });
  }, [filteredSKUs, settings, groups, colKod, colNama, colKumpulan, colStok, colAwu, colMin, colPenimbal, colMaks, colStatus, colAksi]);

  const visibleCount = [colKod, colNama, colKumpulan, colStok, colAwu, colMin, colPenimbal, colMaks, colStatus, colAksi].filter(Boolean).length;

  return (
    <Container size="xl" py="xl">
      <MantineGroup justify="space-between" mb="xl">
        <Title order={2}>Pengurusan SKU</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Tambah SKU
        </Button>
      </MantineGroup>

      <Paper p="md" mb="xl" withBorder>
        <MantineGroup gap="md" align="flex-end">
          <TextInput
            placeholder="Cari kod atau nama..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Semua kumpulan"
            data={groupOptions}
            value={filterGroup}
            onChange={setFilterGroup}
            clearable
            style={{ minWidth: 180 }}
          />
          <Checkbox
            label="Aktif sahaja"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          />
        </MantineGroup>
      </Paper>

      <Box mb="md">
        <ColumnToggle columns={[
          { key: 'kod', label: 'Kod', visible: colKod, onChange: setColKod },
          { key: 'nama', label: 'Nama', visible: colNama, onChange: setColNama },
          { key: 'kumpulan', label: 'Kumpulan', visible: colKumpulan, onChange: setColKumpulan },
          { key: 'stok', label: 'Stok', visible: colStok, onChange: setColStok },
          { key: 'awu', label: 'AWU', visible: colAwu, onChange: setColAwu },
          { key: 'min', label: 'Min', visible: colMin, onChange: setColMin },
          { key: 'penimbal', label: 'Penimbal', visible: colPenimbal, onChange: setColPenimbal },
          { key: 'maks', label: 'Maks', visible: colMaks, onChange: setColMaks },
          { key: 'status', label: 'Status', visible: colStatus, onChange: setColStatus },
          { key: 'aksi', label: 'Aksi', visible: colAksi, onChange: setColAksi },
        ]} />
      </Box>

      <Box style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover style={{ minWidth: '1024px' }}>
          <thead>
            <tr>
              {colKod && <th>Kod</th>}
              {colNama && <th>Nama</th>}
              {colKumpulan && <th>Kumpulan</th>}
              {colStok && <th>Stok</th>}
              {colAwu && <th>AWU</th>}
              {colMin && <th>Min</th>}
              {colPenimbal && <th>Penimbal</th>}
              {colMaks && <th>Maks</th>}
              {colStatus && <th>Status</th>}
              {colAksi && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleCount}>
                  <Text ta="center" py="xl">
                    Memuatkan...
                  </Text>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCount}>
                  <Text ta="center" py="xl">
                    Tiada SKU ditemui
                  </Text>
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </Table>
      </Box>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSKU ? 'Kemaskini SKU' : 'Tambah SKU'}
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <TextInput
              label="Kod"
              placeholder="Masukkan kod SKU"
              value={form.kod}
              onChange={(e) => setFormField('kod', e.currentTarget.value)}
              required
            />
            <TextInput
              label="Nama"
              placeholder="Masukkan nama SKU"
              value={form.nama}
              onChange={(e) => setFormField('nama', e.currentTarget.value)}
              required
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <NumberInput
              label="Saiz Pek"
              value={form.saizPek}
              onChange={(val) => setFormField('saizPek', val ?? 1)}
              min={1}
            />
            <Select
              label="Kumpulan"
              data={groupOptions}
              value={form.groupId !== null ? String(form.groupId) : null}
              onChange={(val) => setFormField('groupId', val ? Number(val) : null)}
              clearable
            />
          </SimpleGrid>

          <NumberInput
            label="Stok Semasa"
            value={form.stokSemasa}
            onChange={(val) => setFormField('stokSemasa', val ?? 0)}
            min={0}
          />

          <TextInput
            label="Nota"
            placeholder="Nota (pilihan)"
            value={form.notes}
            onChange={(e) => setFormField('notes', e.currentTarget.value)}
          />

          <Text size="sm" fw={500}>
            Penggunaan Bulanan
          </Text>
          <SimpleGrid cols={3}>
            <NumberInput
              label="Bulan 1"
              value={form.usageMonth1}
              onChange={(val) => setFormField('usageMonth1', val ?? 0)}
              min={0}
            />
            <NumberInput
              label="Bulan 2"
              value={form.usageMonth2}
              onChange={(val) => setFormField('usageMonth2', val ?? 0)}
              min={0}
            />
            <NumberInput
              label="Bulan 3"
              value={form.usageMonth3}
              onChange={(val) => setFormField('usageMonth3', val ?? 0)}
              min={0}
            />
          </SimpleGrid>

          <MantineGroup gap="xl">
            <Switch
              label="Aktif"
              checked={form.enabled}
              onChange={(e) => setFormField('enabled', e.currentTarget.checked)}
            />
            <Switch
              label="Stok Penuh Sentiasa"
              checked={form.fullStockAlways}
              onChange={(e) => setFormField('fullStockAlways', e.currentTarget.checked)}
            />
            <Switch
              label="Guna Tahap Manual"
              checked={form.useManualLevels}
              onChange={(e) => setFormField('useManualLevels', e.currentTarget.checked)}
            />
          </MantineGroup>

          {form.useManualLevels && (
            <SimpleGrid cols={3}>
              <NumberInput
                label="Min Manual"
                value={form.minManual}
                onChange={(val) => setFormField('minManual', val ?? 0)}
                min={0}
              />
              <NumberInput
                label="Penimbal Manual"
                value={form.penimbalManual}
                onChange={(val) => setFormField('penimbalManual', val ?? 0)}
                min={0}
              />
              <NumberInput
                label="Maks Manual"
                value={form.maksManual}
                onChange={(val) => setFormField('maksManual', val ?? 0)}
                min={0}
              />
            </SimpleGrid>
          )}

          <MantineGroup justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingSKU ? 'Kemaskini' : 'Tambah'}
            </Button>
          </MantineGroup>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Sahkan Padaman"
      >
        <Stack gap="md">
          <Text>
            Adakah anda pasti ingin memadam SKU{' '}
            <strong>{deletingSKU?.kod}</strong> ({deletingSKU?.nama})?
          </Text>
          <MantineGroup justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button color="red" onClick={handleDelete}>
              Padam
            </Button>
          </MantineGroup>
        </Stack>
      </Modal>
    </Container>
  );
}
