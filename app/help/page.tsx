'use client';

import {
  Title,
  Paper,
  Stack,
  Text,
  List,
  Divider,
  Group,
} from '@mantine/core';
import {
  IconHelp,
  IconDashboard,
  IconPackage,
  IconUsers,
  IconClipboardList,
  IconEdit,
  IconReport,
  IconCalculator,
  IconSettings,
  IconRefresh,
  IconTable,
  IconDeviceMobile,
  IconKeyboard,
} from '@tabler/icons-react';

export default function HelpPage() {
  return (
    <Stack gap="lg" p="md">
      <Group>
        <IconHelp size={28} />
        <Title order={2}>Bantuan</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={4}>Pengenalan</Title>
          <Text>
            Sistem Inventori Prabungkus adalah aplikasi pengurusan inventori untuk Substor Hospital Keningau. 
            Sistem ini membantu pengurus farmasi menjejaki stok ubat prabungkus, mengira tahap inventori optimum, 
            membuat pesanan pembelian, dan menjana laporan.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconDashboard size={20} />
              <span>Papan Pemuka (Dashboard)</span>
            </Group>
          </Title>
          <Text>
            Papan pemuka menunjukkan ringkasan inventori semasa. Ia memaparkan jumlah SKU aktif, 
            jumlah stok semasa, nilai inventori, dan item yang memerlukan perhatian. Anda boleh 
            menapis data mengikut kumpulan dan mencari SKU tertentu.
          </Text>
          <Text>
            Klik pada mana-mana item dalam senarai untuk melihat butiran lanjut atau mengedit maklumat stok.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconPackage size={20} />
              <span>Pengurusan SKU</span>
            </Group>
          </Title>
          <Text>
            SKU (Stock Keeping Unit) adalah unit penyimpanan stok. Setiap item dalam inventori 
            mempunyai SKU unik. Anda boleh menambah, mengedit, dan memadam SKU.
          </Text>
          <List>
            <List.Item>Nama SKU: Nama pendek item</List.Item>
            <List.Item>Deskripsi: Penerangan lengkap item</List.Item>
            <List.Item>Kumpulan: Kategori item</List.Item>
            <List.Item>Unit: Unit pengukuran (cth: tablet, ml, kotak)</List.Item>
            <List.Item>Stok Semasa: Kuantiti stok pada masa ini</List.Item>
            <List.Item>Purata Mingguan: Purata penggunaan setiap minggu</List.Item>
          </List>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconUsers size={20} />
              <span>Kumpulan</span>
            </Group>
          </Title>
          <Text>
            Kumpulan membolehkan anda mengorganisasikan SKU mengikut kategori. Contoh kumpulan 
            termasuk: Analgesik, Antibiotik, Vitamin, dan lain-lain. Setiap SKU boleh 
            dikaitkan dengan satu kumpulan.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconClipboardList size={20} />
              <span>Cipta Pesanan</span>
            </Group>
          </Title>
          <Text>
            Untuk mencipta pesanan baru:
          </Text>
          <List type="ordered">
            <List.Item>Pilih kumpulan yang dikehendaki</List.Item>
            <List.Item>Pilih minggu permulaan dan minggu tamat</List.Item>
            <List.Item>Sistem akan mengira keperluan stok secara automatik</List.Item>
            <List.Item>Semak senarai item yang perlu dipesan</List.Item>
            <List.Item>Simpan atau cetak pesanan</List.Item>
          </List>
          <Text>
            Pesanan akan dikira berdasarkan purata penggunaan mingguan dan tempoh yang dipilih.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconEdit size={20} />
              <span>Edit Pesanan</span>
            </Group>
          </Title>
          <Text>
            Anda boleh mengedit pesanan yang sedia ada. Pilih pesanan daripada senarai, 
            kemudian ubah kuantiti atau item mengikut keperluan. Perubahan akan disimpan 
            secara automatik.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconReport size={20} />
              <span>Laporan Pesanan</span>
            </Group>
          </Title>
          <Text>
            Laporan pesanan menunjukkan senarai semua pesanan yang telah dibuat. Anda boleh 
            menapis mengikut tarikh, kumpulan, dan status. Laporan boleh dieksport ke format 
            Excel atau PDF.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconReport size={20} />
              <span>Laporan SKU</span>
            </Group>
          </Title>
          <Text>
            Laporan SKU memberikan gambaran keseluruhan stok setiap item. Ia menunjukkan 
            stok semasa, purata penggunaan, dan ramalan keperluan masa depan. Laporan ini 
            membantu dalam membuat keputusan pembelian.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconCalculator size={20} />
              <span>Pengiraan Inventori</span>
            </Group>
          </Title>
          <Text>
            Sistem mengira keperluan stok berdasarkan formula berikut:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>Minimum Mingguan:</Text> Purata penggunaan × Minimum Minggu
            </List.Item>
            <List.Item>
              <Text fw={600}>Minggu Beza:</Text> Tambahan untuk menghadapi turun naik permintaan
            </List.Item>
            <List.Item>
              <Text fw={600}>Maksimum Mingguan:</Text> Had atas untuk mengelakkan lebihan stok
            </List.Item>
          </List>

          <Divider />

          <Title order={4}>Status Stok</Title>
          <Text>
            Status stok ditentukan oleh perbandingan antara stok semasa dan paras minimum:
          </Text>
          <List>
            <List.Item>
              <Text fw={600} c="green">Stok Mencukupi:</Text> Stok semasa melebihi minimum mingguan
            </List.Item>
            <List.Item>
              <Text fw={600} c="yellow">Stok Rendah:</Text> Stok semasa berhampiran minimum mingguan
            </List.Item>
            <List.Item>
              <Text fw={600} c="red">Stok Kritikal:</Text> Stok semasa di bawah minimum mingguan
            </List.Item>
          </List>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconSettings size={20} />
              <span>Tetapan</span>
            </Group>
          </Title>
          <Text>
            Halaman tetapan membolehkan anda mengkonfigurasi aplikasi:
          </Text>
          <List>
            <List.Item>Nama Aplikasi: Nama yang dipaparkan</List.Item>
            <List.Item>Minimum Minggu: Minggu minimum untuk pengiraan stok</List.Item>
            <List.Item>Minggu Beza: Tambahan untuk turun naik permintaan</List.Item>
            <List.Item>Maksimum Minggu: Had atas pengiraan stok</List.Item>
            <List.Item>Nama Fail Lalai: Nama fail untuk eksport</List.Item>

          </List>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconRefresh size={20} />
              <span>Penyelarasan Data</span>
            </Group>
          </Title>
          <Text>
            Halaman penyelarasan membolehkan anda:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>Eksport JSON:</Text> Muat turun semua data sebagai sandaran
            </List.Item>
            <List.Item>
              <Text fw={600}>Import JSON:</Text> Pulihkan data daripada sandaran
            </List.Item>
            <List.Item>
              <Text fw={600}>Import Excel:</Text> Import data daripada fail Excel
            </List.Item>
          </List>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconTable size={20} />
              <span>Pilihan Kolum Jadual</span>
            </Group>
          </Title>
          <Text>
            Anda boleh menyesuaikan kolum yang dipaparkan dalam jadual. Pilih kolum yang 
            ingin ditunjukkan atau disembunyikan mengikut keperluan anda. Pilihan kolum 
            disimpan untuk sesi seterusnya.
          </Text>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconDeviceMobile size={20} />
              <span>Ciri Mudah Alih</span>
            </Group>
          </Title>
          <Text>
            Aplikasi ini direka untuk berfungsi dengan baik pada peranti mudah alih. Ciri-ciri 
            termasuk:
          </Text>
          <List>
            <List.Item>Reka bentuk responsif yang menyesuaikan saiz skrin</List.Item>
            <List.Item>Navigasi mudah dengan menu burgher</List.Item>
            <List.Item>Sokongan skrin sentuh</List.Item>
            <List.Item>Paparan kad untuk pandangan ringkas</List.Item>
          </List>

          <Divider />

          <Title order={4}>
            <Group gap="xs">
              <IconKeyboard size={20} />
              <span>Pintasan Papan Kekunci</span>
            </Group>
          </Title>
          <Text>
            Pintasan papan kekunci tersedia untuk tindakan biasa:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>Ctrl + S:</Text> Simpan semula
            </List.Item>
            <List.Item>
              <Text fw={600}>Ctrl + F:</Text> Cari
            </List.Item>
            <List.Item>
              <Text fw={600}>Ctrl + P:</Text> Cetak
            </List.Item>
            <List.Item>
              <Text fw={600}>Escape:</Text> Tutup tetingkap atau dialog
            </List.Item>
          </List>
        </Stack>
      </Paper>
    </Stack>
  );
}


