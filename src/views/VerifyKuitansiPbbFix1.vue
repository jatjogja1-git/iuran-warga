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
          <v-col cols="12" sm="7" class="text-break">{{ dataWarga.nop || '-' }}</v-col>

          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Periode:</v-col>
          <v-col cols="12" sm="7">
            {{ formatTanggalIndo(dataWarga.startDate) }} s.d. {{ formatTanggalIndo(dataWarga.endDate) }}
          </v-col>

          <v-divider class="my-3"></v-divider>

          <!-- Kolom 1: PBB Harus Bayar (Target) -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">PBB Harus Bayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-primary text-h6">
            {{ formatRupiah(dataWarga.target) }}
          </v-col>

          <!-- Kolom 2: Total Bayar -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Total Sudah Dibayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-success text-h6">
            {{ formatRupiah(dataWarga.bayar) }}
          </v-col>

          <!-- Kolom 3: Kurang Bayar -->
          <v-col cols="12" sm="5" class="font-weight-bold text-grey-darken-1">Kurang Bayar:</v-col>
          <v-col cols="12" sm="7" class="font-weight-bold text-error text-h6">
            {{ formatRupiah(Math.max(0, dataWarga.target - dataWarga.bayar)) }}
          </v-col>
        </v-row>
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

const isLoading = ref(true);
const dataWarga = ref({
  nop: '',
  startDate: '',
  endDate: '',
  status: 'BELUM LUNAS',
  bayar: 0,
  target: 0
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

onMounted(() => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetVal = Number(urlParams.get('target')) || 0;
    const bayarVal = Number(urlParams.get('bayar')) || 0;
    const statusVal = bayarVal >= targetVal ? 'LUNAS' : (urlParams.get('status') || 'BELUM LUNAS');

    dataWarga.value = {
      nop: urlParams.get('NOP') || '',
      startDate: urlParams.get('start') || '',
      endDate: urlParams.get('end') || '',
      status: statusVal,
      bayar: bayarVal,
      target: targetVal
    };
  } catch (error) {
    console.error("Gagal memuat kuitansi:", error);
  } finally {
    isLoading.value = false;
  }
});
</script>
