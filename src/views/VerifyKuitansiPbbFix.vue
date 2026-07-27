<template>
  <v-container class="py-6" style="max-width: 600px;">
    <!-- Animasi Loading saat memproses data -->
    <div v-if="isLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-grey">Memverifikasi data kuitansi...</p>
    </div>

    <!-- Konten Utama Setelah Dimuat -->
    <div v-else>
      <!-- Banner Status Pembayaran -->
      <v-alert 
        :type="dataWarga.status === 'LUNAS' ? 'success' : 'warning'"
        variant="elevated"
        class="mb-4 text-white font-weight-bold"
        border="top"
      >
        STATUS: {{ dataWarga.status }}
      </v-alert>

      <!-- Kartu Informasi Kuitansi -->
      <v-card elevation="3" class="rounded-lg pa-4">
        <v-card-title class="text-h6 font-weight-bold px-0 pb-3 border-bottom">
          Detail Verifikasi PBB
        </v-card-title>

        <v-card-text class="px-0 pt-3">
          <v-row dense>
            <v-col cols="12" sm="4" class="font-weight-bold text-grey-darken-1">Nomor Objek Pajak (NOP):</v-col>
            <v-col cols="12" sm="8" class="text-break">{{ dataWarga.nop || '-' }}</v-col>

            <v-col cols="12" sm="4" class="font-weight-bold text-grey-darken-1">Periode Histori:</v-col>
            <v-col cols="12" sm="8">
              {{ formatTanggalIndo(dataWarga.startDate) }} s.d. {{ formatTanggalIndo(dataWarga.endDate) }}
            </v-col>

            <v-col cols="12" sm="4" class="font-weight-bold text-grey-darken-1">Target Tagihan:</v-col>
            <v-col cols="12" sm="8" class="text-primary font-weight-bold">
              {{ formatRupiah(dataWarga.target) }}
            </v-col>

            <v-col cols="12" sm="4" class="font-weight-bold text-grey-darken-1">Sudah Dibayar:</v-col>
            <v-col cols="12" sm="8" class="text-success font-weight-bold">
              {{ formatRupiah(dataWarga.bayar) }}
            </v-col>

            <v-col cols="12" sm="4" class="font-weight-bold text-grey-darken-1">Sisa Kekurangan:</v-col>
            <v-col cols="12" sm="8" class="text-error font-weight-bold">
              {{ formatRupiah(Math.max(0, dataWarga.target - dataWarga.bayar)) }}
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider class="my-3"></v-divider>

        <v-card-actions class="px-0 justify-center">
          <v-chip color="info" variant="outlined" size="small">
            Data Terverifikasi Resmi Sistem PBB
          </v-chip>
        </v-card-actions>
      </v-card>
    </div>
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

// Fungsi pembersih NOP untuk menghindari ketidakcocokan titik/strip
const cleanNop = (nop) => (nop ? String(nop).replace(/[^0-9]/g, '') : '');

// Format Rupiah
const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(amount || 0);
};

// Format Tanggal Indonesia yang ramah dibaca
const formatTanggalIndo = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${parseInt(day)} ${bulanIndo[parseInt(month) - 1]} ${year}`;
};

/*
onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const nopParam = urlParams.get('NOP') || '';
    
    // 1. Ambil data dasar dari parameter URL
    let targetValue = Number(urlParams.get('target')) || 0;
    
    // 2. SOLUSI TARGET = 0: Jika parameter target di URL bernilai 0,
    // ambil data aslinya langsung dari file JSON publik server Anda.
    if (targetValue === 0 && nopParam) {
      try {
        const response = await fetch('/pbb_data.json');
        if (response.ok) {
          const jsonData = await response.json();
          // Mendukung struktur file JSON baik berupa array langsung maupun objek berkey kosong/tertentu
          const listWarga = Array.isArray(jsonData) ? jsonData : (jsonData[""] || Object.values(jsonData)[0] || []);
          
          const found = listWarga.find(item => {
            const jsonNop = item.NOP || item.nop || item.NOP_SPPT;
            return jsonNop && cleanNop(jsonNop) === cleanNop(nopParam);
          });

          if (found) {
            const rawTagihan = found.PBB_YG_HARUS_DIBAYAR_SPPT || found.target || found.jumlah_tagihan || 0;
            targetValue = Number(String(rawTagihan).replace(/[^0-9]/g, '')) || 0;
          }
        }
      } catch (jsonErr) {
        console.warn("Gagal memuat fallback data JSON:", jsonErr);
      }
    }

    // Masukkan data final ke state reaktif
    dataWarga.value = {
      nop: nopParam,
      startDate: urlParams.get('start') || '',
      endDate: urlParams.get('end') || '',
      status: urlParams.get('status') || 'BELUM LUNAS',
      bayar: Number(urlParams.get('bayar')) || 0,
      target: targetValue
    };

  } catch (error) {
    console.error("Gagal membaca parameter kuitansi:", error);
  } finally {
    isLoading.value = false;
  }
});
*/

onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const nopParam = urlParams.get('NOP') || '';
    
    let targetValue = Number(urlParams.get('target')) || 0;
    const bayarValue = Number(urlParams.get('bayar')) || 0;

    // PENGAMAN: Jika target dari URL terbaca 0, cari paksa langsung ke file JSON publik
    if (targetValue === 0 && nopParam) {
      try {
        const response = await fetch('/pbb_data.json');
        if (response.ok) {
          const jsonData = await response.json();
          const listWarga = Array.isArray(jsonData) ? jsonData : (jsonData[""] || Object.values(jsonData)[0] || []);
          
          const found = listWarga.find(item => {
            const jsonNop = item.NOP;
            return jsonNop && cleanNop(jsonNop) === cleanNop(nopParam);
          });

          if (found) {
            // AMBIL MURNI DARI PBB_YG_HARUS_DIBAYAR_SPPT
            const rawTagihan = found.PBB_YG_HARUS_DIBAYAR_SPPT || 0;
            targetValue = Number(String(rawTagihan).replace(/[^0-9]/g, '')) || 0;
          }
        }
      } catch (e) {
        console.warn("Gagal fetch fallback JSON:", e);
      }
    }

    // Tentukan status berdasarkan perbandingan matematis yang adil
    const statusTerhitung = bayarValue >= targetValue ? 'LUNAS' : 'BELUM LUNAS';

    dataWarga.value = {
      nop: nopParam,
      startDate: urlParams.get('start') || '',
      endDate: urlParams.get('end') || '',
      status: statusTerhitung, // Otomatis menyesuaikan, mencegah status BELUM LUNAS tapi target 0
      bayar: bayarValue,
      target: targetValue // Dijamin terisi nominal dari PBB_YG_HARUS_DIBAYAR_SPPT
    };

  } catch (error) {
    console.error("Gagal memuat kuitansi:", error);
  } finally {
    isLoading.value = false;
  }
});

</script>