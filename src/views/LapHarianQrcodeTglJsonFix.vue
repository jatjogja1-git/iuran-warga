<template>
    <v-container fluid>
      <v-card class="elevation-2 rounded-lg">
        <v-card-title class="d-flex align-center pe-2">
          <v-icon icon="mdi-history" class="me-2" color="primary"></v-icon>
          Laporan Histori & Kuitansi QR Code PBB Warga
        </v-card-title>
        <v-card-subtitle>Kelola iuran dalam rentang waktu tertentu, pantau histori pembayaran, dan cetak kuitansi ber-QR Code per warga.</v-card-subtitle>
  
        <v-divider class="my-3"></v-divider>
  
        <!-- Tambahkan di dalam v-card-text sebelum tabel -->
        <v-card class="mb-4 pa-4" elevation="1">
          <v-card-title class="text-subtitle-1">
            <v-icon color="primary" class="mr-2">mdi-database-import</v-icon>
            Upload File JSON Tagihan Target (Opsional / Acuan Status)
          </v-card-title>
          <v-file-input
            label="Pilih File JSON Target Tagihan"
            prepend-icon="mdi-file-code"
            variant="outlined"
            density="compact"
            accept=".json"
            @change="handleFileUpload"
            clearable
          ></v-file-input>
        </v-card>


        <v-card-text>
          <v-row align="center">
            <!-- Filter Rentang Tanggal awal -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="startDate"
                label="Tanggal Awal"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-range"
                hide-details
                @change="fetchLaporanHistori"
              ></v-text-field>
            </v-col>
  
            <!-- Filter Rentang Tanggal akhir -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="endDate"
                label="Tanggal Akhir"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-range"
                hide-details
                @change="fetchLaporanHistori"
              ></v-text-field>
            </v-col>
  
            <!-- Input Pencarian Warga -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="search"
                label="Cari nama warga..."
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
  
        
            <!-- Tombol Ekspor Rekap Rentang -->
            <v-col cols="12" sm="6" md="3" class="d-flex justify-sm-end">
              <v-btn
                color="primary"
                prepend-icon="mdi-file-pdf-box"
                :disabled="rekapHistori.length === 0 || isLoading"
                @click="generatePdfLaporanHistori"
                class="text-white w-full"
              >
                Ekspor Rekap PDF
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
  
        <!-- Tabel Pratinjau di Layar -->
<v-data-table 
  :headers="headers" 
  :items="filteredRekapHistori"
  :search="search"
  class="elevation-1"
>
  <!-- Gunakan v-slot:item="{ item, index }" bawaan Vuetify -->
  <template v-slot:item="{ item, index }">
    <tr>
      <td>{{ index + 1 }}</td>
      <td>{{ item.NOP }}</td>
      <td>{{ item.namaWarga }}</td>
      <td class="text-right">{{ formatRupiah(item.targetTagihan) }}</td>
      <td class="text-right text-success font-weight-bold">{{ formatRupiah(item.totalIuran) }}</td>
      <td class="text-right text-error font-weight-bold">{{ formatRupiah(Math.max(0, item.targetTagihan - item.totalIuran)) }}</td>
      <td>
        <v-chip :color="item.totalIuran >= item.targetTagihan ? 'success' : 'warning'" size="small">
          {{ item.totalIuran >= item.targetTagihan ? 'LUNAS' : 'BELUM LUNAS' }}
        </v-chip>
      </td>
      <td class="text-center">
        <v-btn size="small" color="primary" :to="{ 
          path: '/verify-kuitansi-pbb', 
          query: { 
            NOP: item.NOP, 
            start: startDate, 
            end: endDate, 
            status: item.totalIuran >= item.targetTagihan ? 'LUNAS' : 'BELUM LUNAS', 
            bayar: item.totalIuran, 
            target: item.targetTagihan 
          } 
        }">
          QR / Kuitansi
        </v-btn>
      </td>
    </tr>
  </template>
</v-data-table>

        <v-card-text class="text-right mt-4 bg-grey-lighten-4 rounded-b-lg">
          <strong class="text-h6 text-primary">Total Penerimaan Rentang Ini: {{ formatRupiah(totalPenerimaanRentang) }}</strong>
        </v-card-text>
      </v-card>
  
      <!-- UI Notifikasi Sederhana pengganti alert() -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
        {{ snackbar.text }}
        <template v-slot:actions>
          <v-btn color="white" variant="text" @click="snackbar.show = false">Tutup</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '../firebasefix/configfix';
  import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
  
  // Library ekspor PDF
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import "jspdf-autotable";

  // --- State Variables ---

  const originalJsonData = ref([]); // Menyimpan data target tagihan dari JSON
  const isLoading = ref(false);
  const isQrLibraryLoaded = ref(false);
  const rekapHistori = ref([]);
  //const wargaList = ref([]);
  const search = ref('');
  const snackbar = ref({ show: false, text: '', color: '' });
  
const filterKelurahan = ref('');

// Pastikan variabel penampung data transaksi ini sudah ada di <script setup> Anda:
 const historiList = ref([]);

  // Rentang tanggal default (Awal bulan s.d Hari ini)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const startDate = ref(firstDayOfMonth.toISOString().substring(0, 10));
  const endDate = ref(today.toISOString().substring(0, 10));
  
  
/* awalnya
const filteredRekapHistori = computed(() => {
  if (!search.value) return rekapHistori.value;
  const keyword = search.value.toLowerCase();
  return rekapHistori.value.filter(item => {
    const nama = (item.namaWarga || '').toLowerCase();
    const nop = (item.NOP || '').toLowerCase();
//    return nama.includes(keyword) || nop.includes(keyword);

// Keyword pencarian umum (nama / NOP)
    const keyword = (search.value || '').toLowerCase();
    const matchSearch = !search.value || nama.includes(keyword) || nop.includes(keyword);
    
    // Filter khusus kode kelurahan
    const kelurahanKeyword = (filterKelurahan.value || '').trim();
    const matchKelurahan = !kelurahanKeyword || nop.includes(kelurahanKeyword);

    return matchSearch && matchKelurahan;

  });
});
*/


const filteredRekapHistori = computed(() => {
  return rekapHistori.value.filter(item => {
    const nama = (item.namaWarga || '').toLowerCase();
    const nop = (item.NOP || '').toLowerCase();
    
    // Keyword pencarian umum (nama / NOP)
    const keyword = (search.value || '').toLowerCase();
    const matchSearch = !search.value || nama.includes(keyword) || nop.includes(keyword);
    
    // Filter khusus kode kelurahan
    const kelurahanKeyword = (filterKelurahan.value || '').trim();
    const matchKelurahan = !kelurahanKeyword || nop.includes(kelurahanKeyword);

    return matchSearch && matchKelurahan;
  });
});

const headers = [
  { title: 'No', key: 'no' },
  { title: 'NOP', key: 'NOP' },
  { title: 'Nama Warga', key: 'namaWarga' },
  { title: 'PBB Harus Bayar', key: 'targetTagihan', align: 'end' },
  { title: 'Total Bayar', key: 'totalIuran', align: 'end' },
  { title: 'Kurang Bayar', key: 'kurangBayar', align: 'end' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi / Kuitansi', key: 'aksi', align: 'center' }
];

 
// Pastikan variabel penampung data transaksi ini sudah ada di <script setup> Anda:
// const historiList = ref([]); 

const hitungTotalBayar = (nopWarga) => {
  // Ganti 'historiList.value' sesuai dengan nama variabel rekap transaksi Anda
  if (!historiList.value || historiList.value.length === 0) return 0;

  const matchedTransactions = historiList.value.filter(item => {
    return String(item.NOP).trim() === String(nopWarga).trim();
  });

  let total = 0;
  matchedTransactions.forEach(trx => {
    // Sesuaikan field jumlah bayar (misal: trx.jumlah, trx.bayar, atau trx.nominal)
    total += Number(trx.jumlah || trx.bayar || trx.nominal || 0);
  });

  return total;
};


  // --- Computed ---
  const totalPenerimaanRentang = computed(() => {
    return rekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);
  });
  
  // --- Helper UI Snackbar ---
  const showNotification = (text, color = 'success') => {
    snackbar.value = { show: true, text, color };
  };
  
  // Format Rupiah Lengkap
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };
  
  // Format Rupiah Sederhana untuk Chip tabel layar
  const formatRupiahSederhana = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}k`;
    }
    return amount.toString();
  };
  
  // Format Tanggal Indonesia Sederhana (DD/MM)
  const formatTanggalIndoSederhana = (dateValue) => {
    if (!dateValue) return '';
    let dateObj = dateValue;
    if (typeof dateValue.toDate === 'function') {
      dateObj = dateValue.toDate();
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    }
    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
  };
  
  // Format Tanggal Indonesia Lengkap (DD-MM-YYYY)
  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${bulanIndo[parseInt(month) - 1]} ${year}`;
  };
  
  // Format Objek Date/Firestore Timestamp ke DD-MM-YYYY HH:mm
  const formatFullDateTime = (dateValue) => {
    if (!dateValue) return '';
    let d = dateValue;
    if (typeof dateValue.toDate === 'function') {
      d = dateValue.toDate();
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      d = new Date(dateValue);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };
  
  // --- Memuat Library QR Generator Lokal (QRious) via CDN ---
  const loadQrLibrary = () => {
    return new Promise((resolve, reject) => {
      if (window.QRious) {
        isQrLibraryLoaded.value = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
      script.onload = () => {
        isQrLibraryLoaded.value = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Gagal memuat library QR Generator lokal.'));
      document.head.appendChild(script);
    });
  };
  

const handleFileUpload = (event) => {
//  const parsedData = JSON.parse(e.target.result);
//console.log("Isi JSON yang di-upload:", parsedData); // Cek apakah berbentuk array langsung atau dibungkus objek lain
  const file = event.target.files[0];

// 1. Validasi ekstensi/tipe file
  if (!file || file.type !== 'application/json') {
    alert('Harap unggah file dengan format JSON yang valid!');
    return;
  }

  // 2. Batasi ukuran file (misal maksimal 2 MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('Ukuran file terlalu besar! Maksimal 2 MB.');
    return;
  }

  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      if (!Array.isArray(parsedData)) {
        throw new Error("Format JSON harus berupa array of objects.");
      }
      originalJsonData.value = parsedData;
      showNotification('File JSON tagihan berhasil dimuat!', 'success');
      
      // Jalankan ulang pemetaan laporan jika data warga sudah ada
      if (wargaList.value.length > 0) {
        fetchLaporanHistori();
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal memproses file JSON. Pastikan format benar.', 'error');
    }
  };
  reader.readAsText(file);
};




  // --- Ambil Data Warga ---
   //data diambil via firestore
const fetchWargaList = async () => {
  const querySnapshot = await getDocs(collection(db, "pembayaran"), orderBy('createdAt', 'asc'));
  
  // Gunakan Map/Set untuk menghindari duplikasi data warga jika ada banyak riwayat pembayaran
  const uniqueWarga = {};
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const NOP = data.NOP ? String(data.NOP).trim() : '';
    if (NOP && !uniqueWarga[NOP]) {
      uniqueWarga[NOP] = {
        id: NOP,
        nama: data.namaWarga || 'Warga Tanpa Nama',
        //tagihanTotal: 0 // Set 0 dulu, nanti dicocokkan dengan JSON
      };
    }
  });
  
  wargaList.value = Object.values(uniqueWarga);
};



// Di dalam LapPbbQrcodeTgl.vue
const wargaList = ref([]); // Pastikan ini menampung data master (nama + tagihan)


 
// --- Ambil Laporan Histori Berdasarkan Interval Tanggal ---
const fetchLaporanHistori = async () => {
  isLoading.value = true;
  try {
    const start = new Date(startDate.value);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate.value);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'pembayaran'),
      where('tanggal', '>=', start),
      where('tanggal', '<=', end)
    );

    const querySnapshot = await getDocs(q);
    const rekapMap = {};

    // 1. Petakan data master warga dan gabungkan dengan target JSON



// 1. Pastikan Anda memiliki fungsi pembersih angka NOP ini di bagian atas file Anda
const cleanNop = (NOP) => (NOP ? String(NOP).replace(/[^0-9]/g, '') : '');



wargaList.value.forEach(warga => {
  // 1. Ambil target murni dari file JSON (PBB_YG_HARUS_DIBAYAR_SPPT)
  const targetFromJson = originalJsonData.value.find(j => {
    const jsonNop = j.NOP;
    return jsonNop && cleanNop(jsonNop) === cleanNop(warga.id);
  });
  
  let pbbHarusBayar = 0;
  if (targetFromJson) {
    const rawTagihan = targetFromJson.PBB_YG_HARUS_DIBAYAR_SPPT || 0;
    pbbHarusBayar = Number(String(rawTagihan).replace(/[^0-9]/g, '')) || 0;
  }

  // 2. Hitung total bayar dari histori Firestore
  const totalBayar = hitungTotalBayar(warga.id); 

  // 3. Hitung kurang bayar (jika minus, jadikan 0)
  const kurangBayar = Math.max(0, pbbHarusBayar - totalBayar);

  // Status LUNAS hanya diberikan jika PBB Harus Bayar > 0 DAN Total Bayar mencukupi.
  const statusBayar = (pbbHarusBayar > 0 && totalBayar >= pbbHarusBayar) ? 'LUNAS' : 'BELUM LUNAS';

  // SESUAIKAN KEY DENGAN TEMPLATE TABEL: targetTagihan & totalIuran
  rekapMap[warga.id] = {
    NOP: warga.id,
    namaWarga: warga.nama,
    targetTagihan: pbbHarusBayar,  // <-- Diselaraskan dengan template
    totalIuran: totalBayar,        // <-- Diselaraskan dengan template
    kurangBayar: kurangBayar,
    status: statusBayar,
    histori: [] 
  };
});


/* awalnya
// 2. Akumulasi transaksi pembayaran dari Firestore
querySnapshot.docs.forEach(doc => {
  const data = doc.data();
  const NOP = data.NOP ? String(data.NOP).trim() : '';
  if (!NOP) return;

  if (!rekapMap[NOP]) {
    const targetFromJson = originalJsonData.value.find(j => {
      const jsonNop = j.NOP;
      return jsonNop && String(jsonNop).trim() === NOP;
    });

    let nominalTarget = 0;
    if (targetFromJson) {
      const rawTagihan = targetFromJson.PBB_YG_HARUS_DIBAYAR_SPPT || 0;
      nominalTarget = Number(String(rawTagihan).replace(/[^0-9]/g, '')) || 0;
    }

    rekapMap[NOP] = {
      NOP: NOP,
      namaWarga: data.namaWarga || 'Warga Tanpa Nama',
      targetTagihan: nominalTarget,  // <-- Konsisten
      totalIuran: 0,                 // <-- Konsisten
      histori: []
    };
  }
  
  rekapMap[NOP].totalIuran += Number(data.jumlah || 0);
  rekapMap[NOP].histori.push({
    id: doc.id,
    tanggal: data.tanggal,
    jumlah: data.jumlah,
    keterangan: data.keterangan || 'Iuran PBB'
  });
});
*/


querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const NOP = data.NOP ? String(data.NOP).trim() : '';
      if (!NOP) return;

      const cleanCurrentNop = cleanNop(NOP);

      // Cari apakah NOP ini sudah ada di rekapMap (pencocokan bersih)
      let matchedKey = Object.keys(rekapMap).find(key => cleanNop(key) === cleanCurrentNop);

      if (!matchedKey) {
        const targetFromJson = originalJsonData.value.find(j => cleanNop(j.NOP) === cleanCurrentNop);
        let nominalTarget = 0;
        if (targetFromJson) {
          const rawTagihan = targetFromJson.PBB_YG_HARUS_DIBAYAR_SPPT || 0;
          nominalTarget = Number(String(rawTagihan).replace(/[^0-9]/g, '')) || 0;
        }

        rekapMap[NOP] = {
          NOP: NOP,
          namaWarga: data.namaWarga || 'Warga Tanpa Nama',
          targetTagihan: nominalTarget,
          totalIuran: 0,
          histori: []
        };
        matchedKey = NOP;
      }
      
      rekapMap[matchedKey].totalIuran += Number(data.jumlah || 0);
      rekapMap[matchedKey].histori.push({
        id: doc.id,
        tanggal: data.tanggal,
        jumlah: data.jumlah,
        keterangan: data.keterangan || 'Iuran PBB'
      });
    });


// --- TAMBAHAN LANGKAH VALIDASI AKHIR ---
// Memastikan semua data di rekapMap (baik dari wargaList maupun Firestore tambahan)
// menghitung ulang kurangBayar dan status-nya secara konsisten.
Object.values(rekapMap).forEach(item => {
  item.kurangBayar = Math.max(0, item.targetTagihan - item.totalIuran);
  item.status = (item.targetTagihan > 0 && item.totalIuran >= item.targetTagihan) ? 'LUNAS' : 'BELUM LUNAS';
});

rekapHistori.value = Object.values(rekapMap);

} catch (error) {
  console.error("Gagal memuat data histori:", error);
  showNotification("Gagal memuat data: " + error.message, "error");
} finally {
  isLoading.value = false;
}
};

//perbaikan dari atas sbb
const generateQrCodeBase64Local = (text) => {
  if (!window.QRious) return null;
  
  const qr = new window.QRious({
    value: text,
    size: 300,       // Naikkan resolusi dasar canvas agar gambar tajam di PDF
    level: 'H',      // Naikkan ke High (Toleransi kerusakan/distorsi hingga 30%)
    padding: 4       // Berikan margin/quiet zone pembatas di sekeliling QR Code
  });
  
  return qr.toDataURL('image/png');
};
  

/* data eksport pdf awalnya
const generatePdfLaporanHistori = () => {
  //if (rekapHistori.value.length === 0) return;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const totalPenerimaanLangsung = rekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);

    // Desain Atas Slate Dark
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 8, 'F');

    // Header Utama
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN REKAPITULASI IURAN PBB WARGA", 14, 20);

    // Informasi Periode
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
    doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, 32);

    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 36, 196, 36);

    const columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
      { header: 'Jumlah Transaksi', dataKey: 'transaksi' },
      { header: 'Status Pembayaran', dataKey: 'status' },
      { header: 'Total Penerimaan', dataKey: 'jumlah' },
      { header: 'Verifikasi QR', dataKey: 'qrcode' }
    ];



const bodyData = rekapHistori.value.map((item, index) => {
  const targetTagihan = item.targetTagihan || 0; 
  const sudahDibayar = item.totalIuran || 0;
  
  // Status Pembayaran yang konsisten
  const statusPembayaran = (targetTagihan > 0 && sudahDibayar >= targetTagihan) ? 'LUNAS' : 'BELUM LUNAS';
 
  // URL untuk verifikasi online dengan menyertakan parameter lengkap
  const qrTextContent = `https://iuran-warga-five.vercel.app/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}&bayar=${sudahDibayar}&target=${targetTagihan}`;
  // URL verifikasi singkat agar QR Code tidak terlalu padat
//const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}`;

  let qrBase64 = null;
  if (window.QRious) {
    const qrInstance = new window.QRious({
      value: qrTextContent,
      size: 300,
      level: 'M',
      padding: 2
    });
    qrBase64 = qrInstance.toDataURL('image/png');
  }

  return {
    no: index + 1,
    namaWarga: item.namaWarga,
    transaksi: `${item.histori.length} kali`,
    status: statusPembayaran,
    jumlah: formatRupiah(item.totalIuran),
    qrcode: qrBase64 
  };
});

    // Jalankan Autotable
    autoTable(doc, {
      columns: columns,
      body: bodyData,
      startY: 40,
      theme: 'striped',
      
      // --- PERBAIKAN 1: Terapkan minCellHeight secara GLOBAL di sini ---
// --- PERBAIKAN 2: CEGAH BARIS TERPOTONG DI ANTARA PERALIHAN HALAMAN ---
        rowPageBreak: 'avoid',

      styles: {
        valign: 'middle',     // Mengatur posisi teks semua kolom tegak lurus di tengah
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        minCellHeight: 22     // Memaksa seluruh baris (No, Nama, dll) ikut meninggi 22mm
      },
      
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 8      // Khusus baris judul tabel, tingginya dibuat normal saja
      },
      
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        namaWarga: { fontStyle: 'bold', cellWidth: 45 },
        transaksi: { halign: 'center', cellWidth: 30 },
        status: { halign: 'center', cellWidth: 32 },
        jumlah: { halign: 'right', cellWidth: 35 },
        qrcode: { halign: 'center', cellWidth: 30 } // Menghapus minCellHeight dari sini
      },
      
      didParseCell: (data) => {if (data.section === 'body' && data.column.dataKey === 'status') {
          // Menyesuaikan warna teks status di PDF berdasarkan isinya
          data.cell.styles.textColor = data.cell.raw === 'LUNAS' ? [22, 101, 52] : [185, 28, 28]; // Hijau atau Merah
          data.cell.styles.fontStyle = 'bold';        
        }
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; // Mengosongkan teks mentah agar QR tergambar dengan bersih
        }
      },

      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          const base64Img = data.cell.raw; 
          if (base64Img) {
            const qrSize = 14; // Ukuran cetak QR disesuaikan sedikit ke 15mm
            
            // Rumus penempatan titik tengah vertikal & horizontal
            const posX = data.cell.x + (data.cell.width / 2) - (qrSize / 2);
            const posY = data.cell.y + (data.cell.height / 2) - (qrSize / 2);
            
            // PENTING: Memaksa jsPDF menggambar QR di nomor halaman yang aktif saat ini (Mencegah QR tertinggal di halaman 1)
            doc.setPage(data.pageNumber);

            doc.addImage(base64Img, 'PNG', posX, posY, qrSize, qrSize);
          }
        }
      },

      foot: [
        [
          { content: 'Total Penerimaan Rentang Ini', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10 } },
          { content: formatRupiah(totalPenerimaanLangsung), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10} }
        ]
      ],
      margin: { left: 14, right: 14 }
    });

    // Bagian Tanda Tangan
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text("Mengetahui,", 140, finalY);
      doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(148, 163, 184);
      doc.line(140, finalY + 25, 185, finalY + 25);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
    }

    doc.save(`Rekap_Iuran_RT_${startDate.value}_sd_${endDate.value}.pdf`);
    showNotification("Rekap Laporan PDF berhasil diunduh.");
  } catch (error) {
    console.error("Gagal mencetak laporan rekap:", error);
    showNotification("Gagal mencetak rekap laporan", "error");
  }
};
*/


/*
//Eksport pdf berdasar filter kal sudah jalan
const generatePdfLaporanHistori = () => {


  if (!filteredRekapHistori.value || filteredRekapHistori.value.length === 0) {
    showNotification("Tidak ada data yang tersedia untuk diekspor pada filter ini!", "warning");
    return;
  }

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Gunakan filteredRekapHistori agar total penerimaan di PDF sesuai dengan yang tampil di layar
    const totalPenerimaanLangsung = filteredRekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);

    // Desain Atas Slate Dark
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 8, 'F');

    // Header Utama
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN REKAPITULASI IURAN PBB WARGA", 14, 20);

    // Informasi Periode & Keterangan Filter Kelurahan (Opsional)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
    
    let infoY = 32;
    if (filterKelurahan.value) {
      doc.text(`Filter Kelurahan : ${filterKelurahan.value}`, 14, infoY);
      infoY += 5;
    }
    doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, infoY);

    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, infoY + 4, 196, infoY + 4);

    const columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
      { header: 'Jumlah Transaksi', dataKey: 'transaksi' },
      { header: 'Status Pembayaran', dataKey: 'status' },
      { header: 'Total Penerimaan', dataKey: 'jumlah' },
      { header: 'Verifikasi QR', dataKey: 'qrcode' }
    ];

    // MENGGUNAKAN filteredRekapHistori.value DI SINI
    const bodyData = filteredRekapHistori.value.map((item, index) => {
      const targetTagihan = item.targetTagihan || 0; 
      const sudahDibayar = item.totalIuran || 0;
      
      const statusPembayaran = (targetTagihan > 0 && sudahDibayar >= targetTagihan) ? 'LUNAS' : 'BELUM LUNAS';
      
      const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}&bayar=${sudahDibayar}&target=${targetTagihan}`;

      let qrBase64 = null;
      if (window.QRious) {
        const qrInstance = new window.QRious({
          value: qrTextContent,
          size: 300,
          level: 'M',
          padding: 2
        });
        qrBase64 = qrInstance.toDataURL('image/png');
      }

      return {
        no: index + 1,
        namaWarga: item.namaWarga,
        transaksi: `${item.histori.length} kali`,
        status: statusPembayaran,
        jumlah: formatRupiah(item.totalIuran),
        qrcode: qrBase64 
      };
    });

    // Jalankan Autotable
    autoTable(doc, {
      columns: columns,
      body: bodyData,
      startY: infoY + 8,
      theme: 'striped',
      rowPageBreak: 'avoid',
      styles: {
        valign: 'middle',
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        minCellHeight: 22
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 8
      },
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        namaWarga: { fontStyle: 'bold', cellWidth: 45 },
        transaksi: { halign: 'center', cellWidth: 30 },
        status: { halign: 'center', cellWidth: 32 },
        jumlah: { halign: 'right', cellWidth: 35 },
        qrcode: { halign: 'center', cellWidth: 30 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'status') {
          data.cell.styles.textColor = data.cell.raw === 'LUNAS' ? [22, 101, 52] : [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';        
        }
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; 
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          const base64Img = data.cell.raw; 
          if (base64Img) {
            const qrSize = 14;
            const posX = data.cell.x + (data.cell.width / 2) - (qrSize / 2);
            const posY = data.cell.y + (data.cell.height / 2) - (qrSize / 2);
            
            doc.setPage(data.pageNumber);
            doc.addImage(base64Img, 'PNG', posX, posY, qrSize, qrSize);
          }
        }
      },
      foot: [
        [
          { content: 'Total Penerimaan Filter Ini', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10 } },
          { content: formatRupiah(totalPenerimaanLangsung), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10} }
        ]
      ],
      margin: { left: 14, right: 14 }
    });

    // Bagian Tanda Tangan
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text("Mengetahui,", 140, finalY);
      doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(148, 163, 184);
      doc.line(140, finalY + 25, 185, finalY + 25);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
    }

    const fileSuffix = filterKelurahan.value ? `_Kel_${filterKelurahan.value}` : '';
    doc.save(`Rekap_Iuran${fileSuffix}_${startDate.value}_sd_${endDate.value}.pdf`);
    showNotification("Rekap Laporan PDF berhasil diunduh.");
  } catch (error) {
    console.error("Gagal mencetak laporan rekap:", error);
    showNotification("Gagal mencetak rekap laporan", "error");
  }
};
*/

  
//coba pdf baru

const generatePdfLaporanHistori = () => {
  if (!filteredRekapHistori.value || filteredRekapHistori.value.length === 0) {
    showNotification("Tidak ada data yang tersedia untuk diekspor pada filter ini!", "warning");
    return;
  }

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const totalPenerimaanLangsung = filteredRekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);

    // Desain Atas Slate Dark
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 8, 'F');

    // Header Utama
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN REKAPITULASI & HISTORI PBB WARGA", 14, 20);

    // Informasi Periode & Keterangan Filter
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
    
    let infoY = 32;
    if (filterKelurahan && filterKelurahan.value) {
      doc.text(`Filter Kelurahan : ${filterKelurahan.value}`, 14, infoY);
      infoY += 5;
    }
    doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, infoY);

    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, infoY + 4, 196, infoY + 4);

    const columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Warga & Rincian Histori Pembayaran', dataKey: 'namaWarga' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Total Bayar', dataKey: 'jumlah' },
      { header: 'Verifikasi QR', dataKey: 'qrcode' }
    ];

    const bodyData = filteredRekapHistori.value.map((item, index) => {
      const targetTagihan = item.targetTagihan || 0; 
      const sudahDibayar = item.totalIuran || 0;
      const statusPembayaran = (targetTagihan > 0 && sudahDibayar >= targetTagihan) ? 'LUNAS' : 'BELUM LUNAS';
      
      // Susun teks rincian histori pembayaran ke dalam kolom nama warga
      let rincianHistoriText = item.namaWarga || 'Tanpa Nama';
      if (item.histori && item.histori.length > 0) {
        const listTrx = item.histori.map((h, idx) => 
          `   • [${formatFullDateTime(h.tanggal)}] : ${formatRupiah(h.jumlah)} (${h.keterangan || 'Iuran PBB'})`
        ).join('\n');
        rincianHistoriText += `\nHistori Transaksi (${item.histori.length}x):\n${listTrx}`;
      } else {
        rincianHistoriText += `\n   • Belum ada transaksi pada rentang ini.`;
      }

//      const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}&bayar=${sudahDibayar}&target=${targetTagihan}`;
      const qrTextContent = `https://iuran-warga-five.vercel.app/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}&bayar=${sudahDibayar}&target=${targetTagihan}`;




      let qrBase64 = null;
      if (window.QRious) {
        const qrInstance = new window.QRious({
          value: qrTextContent,
          size: 300,
          level: 'M',
          padding: 2
        });
        qrBase64 = qrInstance.toDataURL('image/png');
      }

      return {
        no: index + 1,
        namaWarga: rincianHistoriText,
        status: statusPembayaran,
        jumlah: formatRupiah(item.totalIuran),
        qrcode: qrBase64 
      };
    });

    autoTable(doc, {
      columns: columns,
      body: bodyData,
      startY: infoY + 8,
      theme: 'striped',
      rowPageBreak: 'avoid',
      styles: {
        valign: 'middle',
        fontSize: 8.5,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        minCellHeight: 18
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 8
      },
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        namaWarga: { cellWidth: 95 }, // Diperlebar agar teks histori muat dengan rapi
        status: { halign: 'center', cellWidth: 28 },
        jumlah: { halign: 'right', cellWidth: 28 },
        qrcode: { halign: 'center', cellWidth: 21 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'status') {
          data.cell.styles.textColor = data.cell.raw === 'LUNAS' ? [22, 101, 52] : [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';        
        }
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; 
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          const base64Img = data.cell.raw; 
          if (base64Img) {
            const qrSize = 14;
            const posX = data.cell.x + (data.cell.width / 2) - (qrSize / 2);
            const posY = data.cell.y + (data.cell.height / 2) - (qrSize / 2);
            
            doc.setPage(data.pageNumber);
            doc.addImage(base64Img, 'PNG', posX, posY, qrSize, qrSize);
          }
        }
      },
      foot: [
        [
          { content: 'Total Penerimaan Filter Ini', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10 } },
          { content: formatRupiah(totalPenerimaanLangsung), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10} }
        ]
      ],
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text("Mengetahui,", 140, finalY);
      doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(148, 163, 184);
      doc.line(140, finalY + 25, 185, finalY + 25);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
    }

    const fileSuffix = (filterKelurahan && filterKelurahan.value) ? `_Kel_${filterKelurahan.value}` : '';
    doc.save(`Rekap_Histori_PBB${fileSuffix}_${startDate.value}_sd_${endDate.value}.pdf`);
    showNotification("Laporan rekap dan histori PDF berhasil diunduh.");
  } catch (error) {
    console.error("Gagal mencetak laporan rekap:", error);
    showNotification("Gagal mencetak rekap laporan", "error");
  }
};

  // --- 2. CETAK KUITANSI HISTORI TUNGGAL (Detail Riwayat & Satu QR Code Terpusat) ---
  const generateSingleKuitansiHistoriPdf = async (item) => {
    if (!window.QRious) {
      showNotification("Engine QR Code belum siap. Coba muat ulang halaman.", "error");
      return;
    }
  
    try {
      // Membuat PDF ukuran A4 potret untuk menyajikan riwayat histori secara lengkap
      const doc = new jsPDF('p', 'mm', 'a4');
      const width = 210;
      const height = 297;
  
      const validationCode = `RT-VAL-HIST-${item.NOP}-${startDate.value.replace(/-/g, '')}_${endDate.value.replace(/-/g, '')}`;
  
      // --- TAMBAHKAN VALIDASI STATUS & PARAMETER LENGKAP DI SINI ---
      const targetTagihan = item.targetTagihan || 0; 
      const sudahDibayar = item.totalIuran || 0;
      const statusPembayaran = (targetTagihan > 0 && sudahDibayar >= targetTagihan) ? 'LUNAS' : 'BELUM LUNAS';
      // Desain isi ringkasan untuk QR Code Verifikasi
      const rincianSingkat = item.histori.map((h, i) => `${i+1}. ${formatFullDateTime(h.tanggal).split(' ')[0]}: ${formatRupiah(h.jumlah)}`).join('\n');

 // default ini, tapi qrcode sulit dibaca kamera hp
// KODE BARU (Status dinamis berdasarkan batas nominal Rp15.000)
 //   const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';

  // URL verifikasi online dengan parameter lengkap (Status, Bayar, Target)
      //const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}&bayar=${sudahDibayar}&target=${targetTagihan}`;
      const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?nop=${item.NOP}&start=${startDate.value}&end=${endDate.value}`;
      // Ambil gambar QR tunggal secara lokal
      const qrImageBase64 = generateQrCodeBase64Local(qrTextContent);

// Mengubah data menjadi URL verifikasi singkat
//const qrTextContent = `https://iuran-warga-five.vercel.app/verify-histori/${item.NOP}`;

      // Ambil gambar QR tunggal secara lokal
  //    const qrImageBase64 = generateQrCodeBase64Local(qrTextContent);
  
      // --- DEKORASI BINGKAI KUITANSI ---
      doc.setLineWidth(0.4);
      doc.setDrawColor(30, 41, 59);
      doc.rect(8, 8, width - 16, height - 16); // Bingkai Luar
  
      doc.setLineWidth(0.15);
      doc.setDrawColor(203, 213, 225);
      doc.rect(10, 10, width - 20, height - 20); // Bingkai Dalam
  
      // HEADER KUITANSI PREMIUM (DEEP NAVY)
      doc.setFillColor(30, 58, 138);
      doc.rect(10, 10, width - 20, 24, 'F');
  
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("KWITANSI & BUKTI PEMBAYARAN JIMPITAN WARGA RT.06 KLEBAKAN", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(226, 232, 240);
      doc.text("Sistem Keuangan RT Modern, Transparan, & Akuntabel", 16, 28);
  
      // INFORMASI UTAMA KUITANSI (KIRI)
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
  
      let currentY = 46;
      const drawMetaRow = (label, value, isBold = false) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, 14, currentY);
        doc.text(":", 54, currentY);
        if (isBold) {
          doc.setFont("helvetica", "bold");
        }
        doc.text(value, 58, currentY);
        currentY += 8;
      };
  
      drawMetaRow("No. Validasi Sistem", validationCode);
      drawMetaRow("Nama Lengkap Warga", item.namaWarga, true);
      drawMetaRow("Periode Histori", `${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`);
      drawMetaRow("Total Akumulasi Iuran", formatRupiah(item.totalIuran), true);
  
      // TABEL HISTORI TRANSAKSI DI DALAM KUITANSI
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Rincian Setoran Pembayaran Jimpitan:", 14, currentY + 3);
  
      const historiColumns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal Pembayaran', dataKey: 'tanggal' },
        { header: 'Keterangan/Alokasi', dataKey: 'keterangan' },
        { header: 'Nominal Setoran', dataKey: 'jumlah' }
      ];
  
      const historiBody = item.histori.map((h, i) => ({
        no: i + 1,
        tanggal: formatFullDateTime(h.tanggal),
        keterangan: h.keterangan,
        jumlah: formatRupiah(h.jumlah)
      }));
  
      autoTable(doc, {
        columns: historiColumns,
        body: historiBody,
        startY: currentY + 7,
        theme: 'grid',
        styles: {
          valign: 'middle',
          fontSize: 9,
          cellPadding: 2.5
        },
        headStyles: {
          fillColor: [71, 85, 105], // Slate gray
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          no: { halign: 'center', cellWidth: 12 },
          tanggal: { halign: 'center', cellWidth: 45 },
          keterangan: { cellWidth: 'auto' },
          jumlah: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: 14, right: 14 }
      });
  
      let nextY = doc.lastAutoTable.finalY + 12;
  
      // JIKA TRANSAKSI TERLALU BANYAK, HINDARI OVERFLOW KE BINGKAI BAWAH
      if (nextY > 210) {
        doc.addPage();
        // Bingkai halaman kedua
        doc.setLineWidth(0.4);
        doc.setDrawColor(30, 41, 59);
        doc.rect(8, 8, width - 16, height - 16);
        doc.setLineWidth(0.15);
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, 10, width - 20, height - 20);
        nextY = 25;
      }
  
      // QR CODE VERIFIKASI (BAGIAN KIRI BAWAH)
      if (qrImageBase64) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, nextY, 115, 52, 2, 2, 'F');
  
        doc.addImage(qrImageBase64, 'PNG', 18, nextY + 4, 44, 44);
  
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("QR CODE VERIFIKASI RESMI", 68, nextY + 14);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Aplikasi validasi iuran digital RT.", 68, nextY + 20);
        doc.text("Pindai QR ini menggunakan kamera ponsel", 68, nextY + 25);
        doc.text("untuk melihat bukti rekam transaksi langsung", 68, nextY + 30);
        doc.text("secara digital.", 68, nextY + 35);
      }
  
      // AREA TANDA TANGAN (BAGIAN KANAN BAWAH)
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Mengetahui & Mengesahkan,", 142, nextY + 10);
      doc.text("Bendahara RT,", 142, nextY + 15);
  
      doc.setDrawColor(148, 163, 184);
      doc.line(140, nextY + 38, 192, nextY + 38); // Garis tanda tangan
      doc.setFont("helvetica", "bold");
      doc.text("Sistem RT Digital", 142, nextY + 43);
  
      // SIMPAN PDF INDIVIDU WARGA
      const cleanFileName = item.namaWarga.replace(/\s+/g, '_');
      doc.save(`Kwitansi_Jimpitan_${cleanFileName}.pdf`);
      showNotification(`Kuitansi histori untuk ${item.namaWarga} berhasil dibuat!`);
  
    } catch (error) {
      console.error("Gagal membuat kuitansi histori:", error);
      showNotification("Gagal mencetak kuitansi histori warga", "error");
    }
  };
  
  // --- Lifecycle Hook ---
  onMounted(async () => {
    try {
      await loadQrLibrary();
    } catch (error) {
      console.error(error);
      showNotification("Gagal memuat pustaka QR Code. Menggunakan fallback API...", "warning");
    }
    await fetchWargaList();
    await fetchLaporanHistori();
  });
  </script>