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
  IconSunMoon,
} from '@tabler/icons-react';
import StatusBadge from '@/components/StatusBadge';

export default function HelpPage() {
  return (
    <Stack gap="lg" p="md">
      <Group>
        <IconHelp size={28} />
        <Title order={2}>Bantuan</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={3}>Pengenalan</Title>
          <Text>
            Sistem Inventori Prabungkus adalah aplikasi pengurusan inventori untuk Substor Hospital Keningau. 
            Sistem ini membantu pengurus farmasi menjejaki stok ubat prabungkus, mengira tahap inventori optimum, 
            membuat pesanan pembelian, dan menjana laporan.
          </Text>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconDashboard size={20} />
              <span>Papan Pemuka (Dashboard)</span>
            </Group>
          </Title>
          <Text>
            Papan pemuka menunjukkan ringkasan inventori semasa: jumlah SKU aktif, bilangan
            kumpulan, jumlah stok semasa dan bilangan item pada paras stok rendah atau
            kritikal. Di bawah ringkasan, senarai item stok rendah dan kehabisan stok
            dipaparkan beserta status masing-masing.
          </Text>
          <Text>
            Untuk mencari, menapis atau mengedit item, gunakan halaman Pengurusan Item.
          </Text>

          <Divider />

          <Title order={3}>
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
            <List.Item>Kod: Kod item - mesti unik, dan dipadankan dengan fail Excel stok</List.Item>
            <List.Item>Nama: Nama item</List.Item>
            <List.Item>Saiz Pek: Kuantiti setiap pembungkusan; paras stok dibulatkan ke atas ke saiz pek ini</List.Item>
            <List.Item>Kumpulan: Kategori item</List.Item>
            <List.Item>Stok Semasa: Kuantiti stok pada masa ini</List.Item>
            <List.Item>Penggunaan Bulanan: Penggunaan tiga bulan terakhir - asas kepada purata mingguan (AWU)</List.Item>
            <List.Item>Nota: Sebarang catatan tambahan</List.Item>
            <List.Item>Guna Tahap Manual: Tetapkan minimum, penimbal dan maksimum sendiri</List.Item>
          </List>

          <Divider />

          <Title order={3}>
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

          <Title order={3}>
            <Group gap="xs">
              <IconClipboardList size={20} />
              <span>Cipta Pesanan</span>
            </Group>
          </Title>
          <Text>
            Untuk mencipta pesanan baru:
          </Text>
          <List type="ordered">
            <List.Item>Masukkan tarikh, nama pembuat dan tempoh (bilangan minggu)</List.Item>
            <List.Item>Tapis item mengikut kod atau nama jika senarai panjang</List.Item>
            <List.Item>Sistem mengira keperluan stok secara automatik bagi setiap item</List.Item>
            <List.Item>Semak dan laraskan kuantiti serta nota item yang perlu dipesan</List.Item>
            <List.Item>Klik Simpan Pesanan</List.Item>
          </List>
          <Text>
            Pesanan dikira berdasarkan purata penggunaan mingguan (AWU) daripada tiga bulan
            penggunaan terakhir, ditolak stok semasa, dan dibulatkan ke atas ke saiz pek.
            Cetakan borang permohonan terdapat pada halaman Senarai Pesanan.
          </Text>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconEdit size={20} />
              <span>Edit Pesanan</span>
            </Group>
          </Title>
          <Text>
            Anda boleh mengedit pesanan yang sedia ada. Pilih pesanan daripada senarai,
            kemudian ubah kuantiti atau item mengikut keperluan. Perubahan hanya disimpan
            setelah anda menekan butang Simpan.
          </Text>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconReport size={20} />
              <span>Laporan Pesanan</span>
            </Group>
          </Title>
          <Text>
            Laporan pesanan menunjukkan semua item yang telah dipesan merentas semua
            pesanan. Anda boleh menapis mengikut tarikh, nama pembuat dan SKU, serta
            memilih kolum yang dipaparkan sebelum dicetak melalui pelayar.
          </Text>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconReport size={20} />
              <span>Laporan Item</span>
            </Group>
          </Title>
          <Text>
            Laporan Item memberikan gambaran keseluruhan stok setiap item: stok semasa,
            AWU, paras minimum, penimbal dan maksimum, bilangan minggu stok serta status
            stok. Ia boleh ditapis mengikut status dan dicetak terus daripada halaman.
          </Text>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconCalculator size={20} />
              <span>Pengiraan Inventori</span>
            </Group>
          </Title>
          <Text>
            AWU (purata penggunaan mingguan) dikira daripada purata penggunaan tiga bulan
            terakhir bahagi 4.33 minggu. Sistem kemudian mengira:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>Minimum:</Text> AWU x Minimum Minggu
            </List.Item>
            <List.Item>
              <Text fw={600}>Penimbal:</Text> AWU x Minggu Beza (paras amaran sebelum kritikal)
            </List.Item>
            <List.Item>
              <Text fw={600}>Maksimum:</Text> AWU x Maksimum Minggu
            </List.Item>
            <List.Item>Setiap paras dibulatkan ke atas ke kelipatan Saiz Pek, kecuali tahap manual dipilih</List.Item>
          </List>

          <Divider />

          <Title order={3}>Status Stok</Title>
          <Text>
            Status stok ditentukan oleh perbandingan antara stok semasa dengan paras minimum
            dan penimbal:
          </Text>
          <List>
            <List.Item>
              <Group gap="xs" align="center">
                <StatusBadge status="ok" />
                <Text component="span">Stok pada atau melebihi paras penimbal</Text>
              </Group>
            </List.Item>
            <List.Item>
              <Group gap="xs" align="center">
                <StatusBadge status="low" />
                <Text component="span">Stok di antara paras minimum dan penimbal</Text>
              </Group>
            </List.Item>
            <List.Item>
              <Group gap="xs" align="center">
                <StatusBadge status="critical" />
                <Text component="span">Stok pada atau di bawah paras minimum</Text>
              </Group>
            </List.Item>
            <List.Item>
              <Group gap="xs" align="center">
                <StatusBadge status="out" />
                <Text component="span">Stok sifar</Text>
              </Group>
            </List.Item>
            <List.Item>
              <Group gap="xs" align="center">
                <StatusBadge status="disabled" />
                <Text component="span">Item tidak dikira dan tidak dipesan</Text>
              </Group>
            </List.Item>
          </List>

          <Divider />

          <Title order={3}>
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
            <List.Item>Nilai minggu mesti: Minimum Minggu &#8804; Minggu Beza &#8804; Maksimum Minggu</List.Item>

          </List>

          <Divider />

          <Title order={3}>
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
              <Text fw={600}>Import JSON:</Text> Menimpa kesemua data dengan isi sandaran.
              Sandaran data semasa dimuat turun secara automatik sebelum import, dan tiada
              perubahan dibuat jika mana-mana rekod tidak sah.
            </List.Item>
            <List.Item>
              <Text fw={600}>Import Excel:</Text> Mengemas kini stok semasa mengikut padanan
              kod. Baris tanpa padanan atau kuantiti tidak sah dilaporkan dan tidak ditulis.
            </List.Item>
          </List>

          <Divider />

          <Title order={3}>
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

          <Title order={3}>
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
            <List.Item>Sokongan skrin sentuh</List.Item>
            <List.Item>Paparan kad untuk pandangan ringkas</List.Item>
          </List>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconSunMoon size={20} />
              <span>Mod Cerah dan Gelap</span>
            </Group>
          </Title>
          <Text>
            Secara lalau aplikasi mengikut tema sistem. Untuk memaksa pilihan
            sendiri:
          </Text>
          <List>
            <List.Item>
              Klik butang di hujung kanan pengepala untuk bertukar antara mod
              cerah dan mod gelap
            </List.Item>
            <List.Item>
              Pilihan disimpan pada pelayar ini dan digunakan semula pada
              lawatan seterusnya
            </List.Item>
          </List>

          <Divider />

          <Title order={3}>
            <Group gap="xs">
              <IconKeyboard size={20} />
              <span>Pintasan Papan Kekunci</span>
            </Group>
          </Title>
          <Text>
            Satu pintasan ditetapkan oleh aplikasi ini sendiri:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>/</Text> Fokus ke kotak carian halaman (senarai
              item, cipta pesanan, senarai pesanan) supaya boleh terus menaip
              carian tanpa menyentuh tetikus
            </List.Item>
          </List>
          <Text>
            Selain itu, pintasan pelayar berikut berguna:
          </Text>
          <List>
            <List.Item>
              <Text fw={600}>Escape:</Text> Tutup modal atau dialog
            </List.Item>
            <List.Item>
              <Text fw={600}>Ctrl + P:</Text> Cetak halaman melalui pelayar
            </List.Item>
          </List>
        </Stack>
      </Paper>
    </Stack>
  );
}


