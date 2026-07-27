<template>
  <v-container class="fill-height justify-center bg-grey-lighten-4" fluid>
    <v-responsive max-width="500" class="mx-auto">
      
      <!-- Loading State -->
      <v-card v-if="isLoading" class="text-center pa-6 rounded-xl elevation-3">
        <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
        <div class="mt-4 text-body-1 text-grey-darken-1">Memvalidasi Data Kuitansi...</div>
      </v-card>

      <!-- Data Tersedia -->
      <v-card v-else-if="wargaData && targetTagihan > 0" class="rounded-xl elevation-4 overflow-hidden">
        <!-- Header Status -->
        <v-sheet 
          :color="isLunas ? 'success' : 'error'" 
          class="pa-6 text-center text-white"
        >
          <v-icon 
            :icon="isLunas ? 'mdi-check-decagram' : 'mdi-alert-circle'" 
            size="64" 
            class="mb-2"
          ></v-icon>
          
          <h2 class="text-h4 font-weight-bold mb-1">
            {{ isLunas ? 'PEMBAYARAN LUNAS' : 'PEMBAYARAN BELUM LUNAS' }}
          </h2>
          
          <div class="text-subtitle-1">
            {{ isLunas ? 'Terima kasih, kewajiban PBB telah terpenuhi.' : 'Segera selesaikan sisa kekurangan pembayaran Anda.' }}
          </div>
        </v-sheet> 

        <!-- Ringkasan Pembayaran -->
        <v-card-text class="pa-0">
          <v-row no-gutters class="text-center">
            -col class="pa-4 bg-grey-lighten-4">
            <v-col class="pa-4">
              <div class="text-caption">TAGIHAN></div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatRupiah(targetTagihan) }}</div>
            </v-col>
            <v-col class="pa-4">
              <div class="text-caption">SUDAH DIBAY</div>
              <div class="text-subtitle-1 font-bold text-success">{{ formatRupiah(totalIuran) }}</div>
            </v-col>
            <v-col class="pa-4 bg-red-lighten-5" v-if="!isLunas">
              <div class="text-caption text-error">KEKURANGAN</div>
              <div class="text-subtitle-1 font-weight-bold text-error">{{ formatRupiah(sisaBayar) }}</div>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Detail Informasi -->
        <v-card-text class="pa-">
          <v-list lines="two" class="bg-transparent pa-0">
            <v-list-item prepend-icon="mdi-identifier" title="Nomor Objek Pajak (NOP)" :subtitle="NOP"></v-list-item>
            <v-list-item prepend-icon="mdi-account" title="Nama Warga" :subtitle="wargaData?.nama || '-'"></v-list-item>
            <v-list-item title="Total Tagihan PBB" :subtitle="formatRupiah(targetTagihan)"></v-list-item>
            <v-list-item title="Sudah Dibayar" :subtitle="formatRupiah(totalIuran)"></v-list-item>
            
            <v-divider class="my-2"></v-divider>
            
            <v-list-item 
              :title="isLunas ? 'Status: LUNAS' : 'Status: KURANG BAYAR'" 
              :class="isLunas ? 'text-success' : 'text-error'"
            >
              <template v-slot:subtitle v-if="!isLunas">
                <span class="text-h6 font-weight-bold">
                  Kekurangan: {{ formatRupiah(sisaBayar) }}
                </span>
              </template>
            </v-list-item>
          </v-list>

          <!-- Riwayat Transaksi -->
          <v-divider class="my-4"></v-divider>
          <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-2">Rincian Riwayat Transaksi:</div>
          
          <v-timeline side="end" align="start" density="compact">
            <v-timeline-item 
              v-for="(h, idx) in historiList" 
              :key="idx" 
              :dot-color="totalIuran >= 15000 ? 'success' : 'warning'" 
              size="x-small"
            >
              <div class="text-body-2 font-weight-bold">{{ formatRupiah(h.jumlah) }}</div>
              <div class="text-caption text-grey">{{ formatFullDateTime(h.tanggal) }}</div>
              <div class="text-caption italic text-primary">{{ h.keterangan || 'Iuran Harian' }}</div>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>

        <v-card-actions class="bg-grey-lighten-4 pa-4 justify-center">
          <!-- Actions jika diperlukan -->
        </v-card-actions>
      </v-card>

      <!-- Data Tidak Ditemukan -->
      <v-card v-else class="text-center pa-6 rounded-xl elevation-3">
        <v-sheet color="error" class="pa-4 rounded-lg mb-4 text-white">
          <v-icon icon="mdi-alert-circle" size="48"></v-icon>
        </v-sheet>
        <h3 class="text-h6 font-weight-bold text-red">Kuitansi Tidak Valid</h3>
        <p class="text-body-2 text-grey mt-2">Data transaksi tidak ditemukan atau parameter tidak lengkap.</p>
      </v-card>

    </v-responsive>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const route = useRoute();
const isLoading = ref(true);
const wargaData = ref(null);
const historiList = ref([]);
const totalIuran = ref(0);

// Ambil parameter dari URL
const NOP = route.query.NOP;
const startDate = route.query.start;
const endDate = route.query.end;

// Target tagihan dari parameter URL (prioritas utama)
const targetTagihan = computed(() => {
  const params = new URLSearchParams(window.location.search);
  const target = Number(params.get('target'));
  
  // Fallback ke data dari Firestore jika parameter URL tidak ada
  if (target > 0) return target;
  
  // Jika masih tidak ada, coba dari data warga yang sudah di-fetch
  return wargaData.value?.tagihan || 0;
});

// Logika LUNAS yang benar
const isLunas = computed(() => {
  // Validasi: jika targetTagihan <= 0, jangan pernah anggap LUNAS
  if (targetTagihan.value <= 0) return false;
  return totalIuran.value >= targetTagihan.value;
});

const sisaBay = computed(() => {
  return Math.max(0, targetTagihan.value - totalIuran.value);
});

// Fungsi untuk mengambil data verifikasi
const fetchVerificationData = async () => {
  // Validasi parameter
  if (!NOP) {
    console.error("NOP tidak ditemukan di URL");
    isLoading.value = false;
    return;
  }

  try {
    // 1. Ambil data warga dari Firestore
    const wargaDocRef = doc(db, 'warga', NOP)    
    const wargaSnapshot = await getDoc(wargaDocRef);
    
    if (wargaSnapshot.exists()) {
      wargaData.value = wargaSnapshot.data();
    } else {
      // Fallback: coba dari koleksi 'pembayaran'
      console.log("Dataarga tidak ditemukan, coba fallback...");
      
      // Cari data warga dari transaksi terakhir
      constbackQuery = query(
        collection(db, 'pembay'),
        where('NOP', '==', NOP),
        orderBy('tanggal', 'desc'),
        limit(1)
      );
      
      const fallbackSnapshot = await getDocs(fQuery);
      if (!fallbackSnapshot.empty) {
        constData = fallbackSnapshot.docs[0].data();
       argaData.value = {
          nama: firstData.namaWarga || 'Warga Tidak Dikenal'
        };
      }
    }

    // 2. Ambil histori pembayaran (dengan filter tanggal jika ada)
    let q;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      q = query(
        collection(db, 'pembayaran'),
        where('NOP', '==', NOP),
        where('tanggal', '>=', start),
        where('tanggal', '<=', end),
        orderBy('tanggal', 'asc')
      );
    } else {
      // Jika tidak ada filter tanggal, ambil semua histori
      q = query(
        collection(db, 'pembayaran'),
        where('NOP', '==', NOP),
        orderBy('tanggal', 'asc')
      );
    }

    // Eksekusi query
    const querySnapshot = await getDocs(q);
    console.log("Jumlah histori ditemukan:", querySnapshot.size);

    // Reset data
    historiList.value = [];
    totalIuran.value = 0;

    // Process hasil query
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Konversi jumlah ke number
      const jumlah = Number(data.jumlah) || 0;
      totalIuran.value += jumlah;
      
      historiList.value.push({
        ...data,
        jumlah: jumlah,
        tanggal: data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal)
      });
    });

    // Jika totalIuran masih 0, coba ambil dari field totalBayar di dokumen warga
    if (totalIuran.value === 0 && wargaData.value?.totalBayar) {
      totalIuran.value = Number(wargaData.value.totalBayar) || 0;
    }

    // Update data warga jika belum lengkap
    if (!wargaData.value) {
      wargaData.value = {
        nama: 'Warga Tidak Dikenal',
        tagihan: targetTagihan.value
      };
    }

  } catch (error) {
    console.error("Gagal memuat data verifikasi:", error);
    
    // Coba fallback: ambil dari localStorage atau session
    const cachedData = sessionStorage.getItem(`verifikasi_${NOP}`);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      wargaData.value = parsed.warga;
      historiList.value = parsed.histori || [];
      totalIuran.value = parsed.totalIuran || 0;
    }
  } finally {
    isLoading.value = false;
  }
};

// Fungsi ambil data dari JSON (fallback)
const fetchFromJSONFallback = async (nop) => {
  try {
    const response = await fetch('/data/pbb_data.json');
    const result = await response.json();
    
    // Sesuaikan dengan struktur JSON Anda
    const dataArray = result.data || result.warga || result;
    const warga = dataArray.find(item => item.NOP === nop);
    
    if (warga) {
      wargaData.value = {
        nama: warga.NAMA_WARGA || warga.nama || '-',
        alamat: warga.ALAMAT_OP || warga.alamat || '',
        tagihan: Number(warga.PBB_YG_HARUS_DIBAYAR_SPPT) || 0
      };
      
      // Update targetTagihan jika dari JSON
      if (targetTagihan.value === 0) {
        targetTagihan.value = Number(warga.PBB_YG_HARUS_DIBAYAR_SPPT) || 0;
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Gagal memuat JSON fallback:", error);
    return false;
  }
};

// Fungsi Format
const formatRupiah = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(amount);
};

const formatFullDateTime = (dateValue) => {
  if (!dateValue) return '-';
  
  let d;
  if (dateValue instanceof Date) {
    d = dateValue;
  } else if (dateValue?.toDate) {
    d = dateValue.toDate();
  } else {
    d = new Date(dateValue);
  }
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `day/{day}/day/{month}/year{year}year{hours}:${minutes}`;
};

const formatTanggalIndo = (dateStr) => {
  if (!dateStr) return '-';
  
  let d;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else if (dateStr.toDate) {
    d = dateStr.toDate();
  } else {
    d = new Date(dateStr);
  }
  
  if (isNaN(d.getTime())) return dateStr;
  
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  return `d.getDate(){d.getDate()}d.getDate(){bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
};


// Validasi data sebelum tampil
const isValidData = computed(() => {
  return wargaData.value && targetTagihan.value > 0;
});

// Lifecycle hook
onMounted(async () => {
  console.log("Route Query:", route.query);
  console.log("NOP:", NOP);
  console.log("Start Date:", startDate);
  console.log("End Date:", endDate);
  
  // Cek apakah ada data dari parameter URL langsung
  const params = new URLSearchParams(window.location.search);
  const targetFromUrl = Number(params.get('target'));
  const bayarFromUrl = Number(params.get('bayar'));
  const statusFromUrl = params.get('status');
  
  console.log("Parameter URL:", { targetFromUrl, bayarFromUrl, statusFromUrl });
  
  // Jika parameter URL lengkap, gunakan langsung
  if (targetFromUrl > 0 && statusFromUrl) {
    targetTagihan.value = targetFromUrl;
    totalIuran.value = bayarFromUrl || 0;
    
    // Buat data dummy untuk tampilan
    wargaData.value = {
      nama: params.get('nama') || 'Warga',
      NOP: NOP
    };
    
    isLoading.value = false;
    return;
  }
  
  // Jika tidak, fetch dari database
  await fetchVerificationData();
  
  // Jika masih gagal, coba fallback ke JSON
  if (!wargaData.value && NOP) {
    const jsonSuccess = await fetchFromJSONFallback(NOP);
    if (jsonSuccess) {
      isLoading.value = false;
    }
  }
  
  // Cache data untuk kunjungan berikutnya
  if (wargaData.value && NOP) {
    const cacheData = {
      warga: wargaData.value,
      histori: historiList.value,
      totalIuran: totalIuran.value,
      timestamp: Date.now()
    };
    sessionStorage.setItem(`verifikasi_${NOP}`, JSON.stringify(cacheData));
  }
});

// Expose untuk testing (hanya di development)
if (import.meta.env.DEV) {
  window.__verifikasiData = {
    NOP,
    wargaData,
    historiList,
    totalIuran,
    targetTagihan,
    isLunas,
    sisaBayar
  };
}
</script>

<style scoped>
/* Tambahkan style jika diperlukan */
.v-timeline-item {
  margin-bottom: 8px;
}

.v-card {
  transition: all 0.3s ease;
}

.v-sheet {
  transition: background-color 0.3s ease;
}
</style>
