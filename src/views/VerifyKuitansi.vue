<template>
    <v-container class="fill-height justify-center bg-grey-lighten-4" fluid>
      <v-responsive max-width="500" class="mx-auto">
        
        <v-card v-if="isLoading" class="text-center pa-6 rounded-xl elevation-3">
          <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
          <div class="mt-4 text-body-1 text-grey-darken-1">Memvalidasi Data Kuitansi...</div>
        </v-card>
  
        <v-card v-else-if="wargaData && totalIuran > 0" class="rounded-xl elevation-4 overflow-hidden">
          <v-sheet :color="totalIuran >= 15000 ? 'success' : 'warning'" class="pa-6 text-center text-white">
            <v-icon 
              :icon="totalIuran >= 15000 ? 'mdi-check-circle' : 'mdi-alert-circle'" 
              size="64" 
              class="mb-2"
            ></v-icon>
            <h2 class="text-h5 font-weight-bold">
              {{ totalIuran >= 15000 ? 'KUITANSI VALID (LUNAS)' : 'KUITANSI VALID (BELUM LUNAS)' }}
            </h2>
            <p class="text-caption text-white-opacity-80">Sistem Validasi Keuangan RT Digital</p>
          </v-sheet>  
          <v-card-text class="pa-6">
            <v-list lines="two" class="bg-transparent pa-0">
              <v-list-item prepend-icon="mdi-account" title="Nama Warga" :subtitle="wargaData.nama"></v-list-item>
              <v-list-item prepend-icon="mdi-calendar-range" title="Periode Histori">
                <template v-slot:subtitle>
                  {{ formatTanggalIndo(startDate) }} s.d {{ formatTanggalIndo(endDate) }}
                </template>
              </v-list-item>
              <v-list-item prepend-icon="mdi-cash-multiple" title="Total Akumulasi Pembayaran">
        <template v-slot:subtitle>
          <strong :class="totalIuran >= 15000 ? 'text-success text-h6' : 'text-warning text-h6'">
            {{ formatRupiah(totalIuran) }}
          </strong>
          
          <div v-if="totalIuran < 15000" class="text-caption text-grey mt-1">
            ⚠️ Kurang <span class="font-weight-bold text-red">{{ formatRupiah(15000 - totalIuran) }}</span> lagi untuk status Lunas.
          </div>
        </template>
      </v-list-item>
            </v-list>
  
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
    <div class="text-subtitle-2 font-weight-bold">
      STATUS RESMI: 
      <span :class="totalIuran >= 15000 ? 'text-success' : 'text-warning'">
        {{ totalIuran >= 15000 ? 'LUNAS & SAH' : 'BELUM LUNAS' }}
      </span>
    </div>
  </v-card-actions>
        </v-card>
  
        <v-card v-else class="text-center pa-6 rounded-xl elevation-3">
          <v-sheet color="error" class="pa-4 rounded-lg mb-4 text-white">
            <v-icon icon="mdi-alert-circle" size="48"></v-icon>
          </v-sheet>
          <h3 class="text-h6 font-weight-bold text-red">Kuitansi Tidak Valid</h3>
          <p class="text-body-2 text-grey mt-2">Data transaksi tidak ditemukan atau rentang histori kosong.</p>
        </v-card>
  
      </v-responsive>
    </v-container>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { db } from '../firebase/configfix';
  import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
  
  const route = useRoute();
  const isLoading = ref(true);
  const wargaData = ref(null);
  const historiList = ref([]);
  const totalIuran = ref(0);
  
  // Menangkap query params dari URL (?wargaId=xxx&start=xxx&end=xxx)
  const wargaId = route.query.wargaId;
  const startDate = route.query.start;
  const endDate = route.query.end;
  
  
  const fetchVerificationData = async () => {
  if (!wargaId || !startDate || !endDate) {
    isLoading.value = false;
    return;
  }

  try {
    // 1. Ambil Data Profil Warga (Pastikan nama koleksi 'wargart' sudah sesuai)
    const wargaDoc = await getDoc(doc(db, 'wargart', wargaId));
    
    // PERBAIKAN 1: Mengubah wargadoc menjadi wargaDoc (D Kapital)
    if (wargaDoc.exists()) {
      wargaData.value = wargaDoc.data();
    } else {
      console.log("Warga tidak ditemukan di database!");
      isLoading.value = false;
      return;
    }

    // 2. Format Tanggal Rentang
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'iuran'),
      where('wargaId', '==', wargaId),
      where('tanggal', '>=', start),
      where('tanggal', '<=', end)
    );

    // Ambil data dokumen dari Firestore
    const querySnapshot = await getDocs(q);
    
    // PERBAIKAN 2: Pastikan console.log berada TEPAT DI SINI (Di dalam blok try)
    console.log("Jumlah Histori Iuran ditemukan:", querySnapshot.size);
    
    let tempTotal = 0;
    const tempHistori = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      tempTotal += data.jumlah;
      tempHistori.push(data);
    });

    // Urutkan transaksi dari terlama ke terbaru
    tempHistori.sort((a, b) => {
      const tA = a.tanggal.toDate ? a.tanggal.toDate() : new Date(a.tanggal);
      const tB = b.tanggal.toDate ? b.tanggal.toDate() : new Date(b.tanggal);
      return tA - tB;
    });

    historiList.value = tempHistori;
    totalIuran.value = tempTotal;

  } catch (error) {
    // Menangkap jika ada error index Firestore yang tadi sempat muncul
    console.error("Gagal melakukan verifikasi QR:", error);
  } finally {
    isLoading.value = false;
  }
};

  // --- Helper Formatter (Sama dengan kuitansi Anda) ---
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };
  
  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${day} ${bulanIndo[parseInt(month) - 1]} ${year}`;
  };
  
  const formatFullDateTime = (dateValue) => {
    if (!dateValue) return '';
    let d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  
  onMounted(() => {
    fetchVerificationData();
  });
  </script>