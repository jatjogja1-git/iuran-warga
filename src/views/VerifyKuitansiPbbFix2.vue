<template>
  <v-container class="py-6" style="max-width: 600px;">
    <v-card elevation="3" class="rounded-lg pa-4">
      <v-card-title class="text-h6 font-weight-bold px-0 pb-3 text-center">
        RINCIAN PEMBAYARAN PBB
      </v-card-title>

      <!-- Banner Status -->
      <v-alert 
        :type="dataWarga.status === 'LUNAS' ? 'success' : 'warning'"
        variant="elevated"
        class="mb-4 text-white font-weight-bold text-center"
      >
        STATUS: {{ dataWarga.status }}
      </v-alert>

      <v-card-text class="px-0 pt-3">
        <v-row dense>
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Nomor Objek Pajak (NOP):</v-col>
          <v-col cols="12" sm="7" class="text-break">{{ dataWarga.NOP || '-' }}</v-col>

          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Nama Warga:</v-col>
          <v-col cols="12" sm="7" class="text-break font-weight-bold">{{ dataWarga.namaWarga || '-' }}</v-col>

          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Periode:</v-col>
          <v-col cols="12" sm="7">
            {{ formatTanggalIndo(dataWarga.startDate) }} s.d. {{ formatTanggalIndo(dataWarga.endDate) }}
          </v-col>

          <v-divider class="my-3"></v-divider>

          <!-- PBB Harus Bayar (Target) -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">PBB Harus Bayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-primary text-h6">
            {{ formatRupiah(dataWarga.targetTagihan) }}
          </v-col>

          <!-- Total Sudah Dibayar -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Total Sudah Dibayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-success text-h6">
            {{ formatRupiah(dataWarga.totalIuran) }}
          </v-col>

          <!-- Kurang Bayar -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Kurang Bayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-error text-h6">
            {{ formatRupiah(Math.max(0, dataWarga.targetTagihan - dataWarga.totalIuran)) }}
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <!-- Rincian Histori Transaksi -->
        <div class="text-subtitle-1 font-weight-bold mb-3 text-grey-darken-3">
          Rincian Riwayat Transaksi ({{ dataWarga.histori.length }} kali):
        </div>

        <div v-if="dataWarga.histori.length === 0" class="text-grey text-italic text-sm pb-2">
          Belum ada catatan transaksi pada rentang tanggal ini.
        </div>

        <div v-for="(h, index) in dataWarga.histori" :key="index" class="mb-3 p-2 bg-grey-lighten-4 rounded">
          <div class="font-weight-bold text-success">{{ formatRupiah(h.jumlah) }}</div>
          <div class="text-caption text-grey-darken-1">
            {{ formatFullDateTime(h.tanggal) }} — Keterangan: {{ h.keterangan }}
          </div>
        </div>

      </v-card-text>

      <v-divider class="my-3"></v-divider>

      <v-card-actions class="px-0 justify-center">
        <v-chip color="info" variant="outlined" size="small">
          Terverifikasi Resmi Sistem PBB Warga
        </v-chip>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const route = useRoute();

// Menggunakan satu nama state yang konsisten: dataWarga
const dataWarga = ref({
  namaWarga: 'Memuat...',
  NOP: '',
  totalIuran: 0,
  targetTagihan: 0,
  startDate: '',
  endDate: '',
  status: 'BELUM LUNAS',
  histori: []
});

const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
};

const formatTanggalIndo = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${parseInt(day)} ${bulanIndo[parseInt(month) - 1]} ${year}`;
};

const formatFullDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(dateObj)) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(dateObj);
};

const fetchDetailVerifikasi = async () => {
  const nop = route.query.NOP || route.query.nop || route.query.NomorOP;
  const startStr = route.query.start;
  const endStr = route.query.end;

  if (!nop) {
    console.warn("Parameter NOP tidak ditemukan di URL!");
    dataWarga.value.namaWarga = 'NOP Tidak Ditemukan';
    return;
  }

  try {
    const start = startStr ? new Date(startStr) : new Date(new Date().getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);

    const end = endStr ? new Date(endStr) : new Date();
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'pembayaran'),
      where('NOP', '==', String(nop).trim()),
      where('tanggal', '>=', start),
      where('tanggal', '<=', end),
      orderBy('tanggal', 'asc')
    );

    const querySnapshot = await getDocs(q);
    
    let total = 0;
    let nama = '';
    const historiList = [];

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      total += Number(data.jumlah || 0);
      if (!nama && data.namaWarga) {
        nama = data.namaWarga;
      }
      historiList.push({
        id: doc.id,
        tanggal: data.tanggal,
        jumlah: data.jumlah,
        keterangan: data.keterangan || 'Iuran PBB'
      });
    });

    // Ambil target dari URL query, fallback ke 0 jika tidak ada
    const target = Number(route.query.target || 0);
    
    // Logika penentuan status yang benar (harus lunas jika total >= target dan target > 0)
    const status = (target > 0 && total >= target) ? 'LUNAS' : 'BELUM LUNAS';

    // Masukkan data ke state dataWarga
    dataWarga.value = {
      NOP: nop,
      namaWarga: nama || 'Warga (Tidak Bernama)',
      totalIuran: total,
      targetTagihan: target,
      startDate: startStr || '',
      endDate: endStr || '',
      status: status,
      histori: historiList
    };

  } catch (error) {
    console.error("Gagal memuat rincian verifikasi:", error);
  }
};

onMounted(() => {
  fetchDetailVerifikasi();
});
</script>