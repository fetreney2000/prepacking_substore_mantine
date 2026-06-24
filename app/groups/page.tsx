'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Group, SKU } from '@/lib/types';
import {
  Container,
  Title,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Group as MantineGroup,
  Badge,
  Text,
  Stack,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [groupsData, skusData] = await Promise.all([
        api.groups.list(),
        api.skus.list(),
      ]);
      setGroups(groupsData);
      setSkus(skusData);
    } catch (error) {
      showNotification({
        title: 'Ralat',
        message: 'Gagal memuatkan data kumpulan',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSKUCount = (groupId: number) => {
    return skus.filter((sku) => sku.groupId === groupId).length;
  };

  const handleOpenModal = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setNotes(group.notes || '');
    } else {
      setEditingGroup(null);
      setName('');
      setNotes('');
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showNotification({
        title: 'Ralat',
        message: 'Nama kumpulan diperlukan',
        color: 'red',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingGroup) {
        await api.groups.update(editingGroup.id, { name: name.trim(), notes: notes.trim() });
        showNotification({
          title: 'Berjaya',
          message: 'Kumpulan berjaya dikemaskini',
          color: 'green',
        });
      } else {
        await api.groups.create({ name: name.trim(), notes: notes.trim() });
        showNotification({
          title: 'Berjaya',
          message: 'Kumpulan berjaya ditambah',
          color: 'green',
        });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification({
        title: 'Ralat',
        message: 'Gagal menyimpan kumpulan',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    const skuCount = getSKUCount(deletingGroup.id as number);
    if (skuCount > 0) {
      showNotification({
        title: 'Ralat',
        message: `Tidak boleh memadam kumpulan yang mempunyai ${skuCount} SKU`,
        color: 'red',
      });
      setDeleteModalOpen(false);
      return;
    }

    try {
      await api.groups.delete(deletingGroup.id);
      showNotification({
        title: 'Berjaya',
        message: 'Kumpulan berjaya dipadam',
        color: 'green',
      });
      setDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification({
        title: 'Ralat',
        message: 'Gagal memadam kumpulan',
        color: 'red',
      });
    }
  };

  const rows = groups.map((group) => (
    <tr key={group.id}>
      <td>{group.id}</td>
      <td>{group.name}</td>
      <td>{group.notes || '-'}</td>
      <td>
        <Badge variant="light">{getSKUCount(group.id)}</Badge>
      </td>
      <td>
        <MantineGroup gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleOpenModal(group)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => {
              setDeletingGroup(group);
              setDeleteModalOpen(true);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </MantineGroup>
      </td>
    </tr>
  ));

  return (
    <Container size="xl" py="xl">
      <MantineGroup justify="space-between" mb="xl">
        <Title order={2}>Kumpulan</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenModal()}
        >
          Tambah Kumpulan
        </Button>
      </MantineGroup>

      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama</th>
            <th>Nota</th>
            <th>SKU</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5}>
                <Text ta="center" py="xl">
                  Memuatkan...
                </Text>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <Text ta="center" py="xl">
                  Tiada kumpulan ditemui
                </Text>
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </Table>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? 'Kemaskini Kumpulan' : 'Tambah Kumpulan'}
      >
        <Stack gap="md">
          <TextInput
            label="Nama"
            placeholder="Masukkan nama kumpulan"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Nota"
            placeholder="Masukkan nota (pilihan)"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />
          <MantineGroup justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingGroup ? 'Kemaskini' : 'Tambah'}
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
            Adakah anda pasti ingin memadam kumpulan{' '}
            <strong>{deletingGroup?.name}</strong>?
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
