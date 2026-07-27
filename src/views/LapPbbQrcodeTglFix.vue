<template>
    <v-container fluid>
      <v-card class="elevation-2 rounded-lg">
        <v-card-title class="d-flex align-center pe-2">
          <v-icon icon="mdi-history" class="me-2" color="primary"></v-icon>
          Laporan Histori & Kuitansi QR Code PBB Warga
        </v-card-title>
        <v-card-subtitle>Kelola iuran dalam rentang waktu tertentu, pantau histori pembayaran, dan cetak kuitansi ber-QR Code per warga.</v-card-subtitle>
  
        <v-divider class="my-3"></v-divider>
  
        <v-btn-group>
          <v-btn @click="exportToExcel" color="success">Export Excel</v-btn>
          <v-btn @click="exportToPDF" color="success" class="ml-2">Export PDF</v-btn>
          <v-btn @click="logout" color="primary" class="ml-2">Logout</v-btn>
        </v-btn-group>

<v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedKecamatan"
              :items="kecamatanList"
              item-title="name"
              item-value="code"
              label="Pilih Kapanewon"
              @update:model-value="onKecamatanChange"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedKelurahan"
              :items="kelurahanList"
              item-title="name"
              item-value="code"
              label="Pilih Kalurahan"
              :disabled="!selectedKecamatan"
              @update:model-value="fetchData"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedTahun"
              :items="tahunList"
              item-title="name"
              item-value="code"
              label="Pilih Tahun"
              @update:model-value="loadAllData"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              label="Search"
              append-icon="mdi-magnify"
              clearable
            ></v-text-field>
          </v-col>
        </v-row>        
</v-card-text>

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
                @update:model-value="handleDateChange"
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
                @update:model-value="handleDateChange"
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
                :disabled="(rekapHistori?.length ?? 0) === 0 || isLoading"
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
          :items="rekapHistori"
          :search="search"
          class="elevation-1"
          :loading="isLoading"
          loading-text="Sedang memuat data histori iuran..."
          no-data-text="Tidak ada transaksi iuran dalam rentang tanggal ini"
        >
          <!-- Format Kolom No -->
          <template v-slot:item.nomor="{ index }">
            {{ index + 1 }}
          </template>
  
          <!-- Format Kolom Histori Transaksi Sederhana di Layar -->
          <template v-slot:item.historiSummary="{ item }">
            <div v-if="item.histori.length > 0">
              <v-chip
                size="x-small"
                color="info"
                class="ma-1"
                v-for="(h, idx) in item.histori.slice(0, 2)"
                :key="idx"
              >
                {{ formatTanggalIndoSederhana(h.tanggal) }}: {{ formatRupiahSederhana(h.jumlah) }}
              </v-chip>
              <span v-if="item.histori.length > 2" class="text-caption text-grey">
                +{{ item.histori.length - 2 }} lainnya
              </span>
            </div>
            <span v-else class="text-caption text-grey-lighten-1">Tidak ada transaksi</span>
          </template>
  
          <!-- Format Kolom Status Pembayaran -->         
          <template v-slot:item.status="{ item }">
            <v-chip 
              :color="item.totalIuran >= item.tagihanTotal ? 'success' : 'warning'"
              class="font-weight-bold text-white"
            >
              {{ item.totalIuran >= item.tagihanTotal ? 'LUNAS' : 'BELUM LUNAS' }}
            </v-chip>
          </template>

          <!-- Format Kolom Rupiah -->
          <template v-slot:item.totalIuran="{ item }">
            <span class="font-weight-bold">{{ formatRupiah(item.totalIuran) }}</span>
          </template>
  
          <!-- Kolom Aksi Cetak Kuitansi QR Histori -->
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="success"
              size="small"
              density="comfortable"
              prepend-icon="mdi-qrcode"
              :disabled="!isQrLibraryLoaded || item.totalIuran === 0"
              @click="generateSingleKuitansiHistoriPdf(item)"
            >
              Kuitansi
            </v-btn>
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
  
  <script>
import { ref, onMounted, computed } from 'vue';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { bpajakService } from '@/apiauth_blmbyr.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

  
// --- STATE ---
const isLoading = ref(false);
const rekapHistori = ref([]);
const wargaList = ref([]);
const search = ref('');
const snackbar = ref({ show: false, text: '', color: '' });
const isQrLibraryLoaded = ref(false);

// Filter Selection (untuk API)
const selectedKecamatan = ref(null);
const selectedKelurahan = ref(null);
const selectedTahun = ref(null);
const kelurahanList = ref([]);

// Tanggal
//const today = new Date();
//const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//const startDate = ref(firstDayOfMonth.toISOString().substring(0, 10));
//const endDate = ref(today.toISOString().substring(0, 10));

// Gunakan format YYYY-MM-DD agar input type="date" bisa membacanya
const today = new Date().toISOString().substring(0, 10);
const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);

//const startDate = ref(firstDayOfMonth); 
//const endDate = ref(today);

const startDate = ref(new Date().toISOString().substring(0, 10));
const endDate = ref(new Date().toISOString().substring(0, 10));


// 2. Fungsi untuk memicu update saat tanggal berubah
const handleDateChange = () => {
  console.log("Tanggal berubah:", startDate.value, endDate.value);
  // Panggil fungsi untuk memuat ulang data ke tabel di sini
  fetchLaporanHistori(); 
};

export default {
  name: 'DatobpajakView',
  data() {
    return {
      search: '',
      loading: false,
      selectedKecamatan: null,
      selectedKelurahan: null,
      selectedTahun: null,
      tableData: [],
      // ... (kecamatanList, kelurahanMapping, tahunList, dll tetap sama di sini)
      
      
      
      kecamatanList: [{ name: '010| TEMON', code: '010' },
          { name: '020| WATES', code: '020' },
          { name: '030| PANJATAN', code: '030' },
          { name: '040| GALUR', code: '040' },
          { name: '050| LENDAH', code: '050' },
          { name: '060| SENTOLO', code: '060' },
          { name: '070| PENGASIH', code: '070' },
          { name: '080| KOKAP', code: '080' },
          { name: '090| NANGGULAN', code: '090' },
          { name: '100| GIRIMULYO', code: '100' },
          { name: '110| SAMIGALUH', code: '110' },
          { name: '120| KALIBAWANG', code: '120' }, ],
      kelurahanMapping: {
          '010': [
            { name: '001| JANGKARAN', code: '001' },
            { name: '002| SINDUTAN', code: '002' },
            { name: '003| PALIHAN', code: '003' },
            { name: '004| GLAGAH', code: '004' },
            { name: '005| KALIDEGEN', code: '005' },
            { name: '006| PLUMBON', code: '006' },
            { name: '007| KEDUNDANG', code: '007' },
            { name: '008| DEMEN', code: '008' },
            { name: '009| KULUR', code: '009' },
            { name: '010| KALIGINTUNG', code: '010' },
            { name: '011| TEMON WETAN', code: '011' },
            { name: '012| TEMON KULON', code: '012' },
            { name: '013| KEBONREJO', code: '013' },
            { name: '014| JANTEN', code: '014' },
            { name: '015| KARANGWULUH', code: '015' },

          ],
          '020': [
            { name: '001| KARANGWUNI', code: '001' },
            { name: '002| SOGAN', code: '002' },
            { name: '003| KULWARU', code: '003' },
            { name: '004| NGESTIHARJO', code: '004' },
            { name: '005| BENDUNGAN', code: '005' },
            { name: '006| TRIHARJO', code: '006' },
            { name: '007| GIRIPENI', code: '007' },
            { name: '008| WATES', code: '008' },
          ],
          '030': [
            { name: '001| GARONGAN', code: '001' },
            { name: '002| PLERET', code: '002' },
            { name: '003| BUGEL', code: '003' },
            { name: '004| KANOMAN', code: '004' },
            { name: '005| DEPOK', code: '005' },
            { name: '006| BOJONG', code: '006' },
            { name: '007| TAYUBAN', code: '007' },
            { name: '008| GOTAKAN', code: '008' },
            { name: '009| PANJATAN', code: '009' },
            { name: '010| CERME', code: '010' },
            { name: '011| KREMBANGAN', code: '011' },
          ],
          '040': [
            { name: '001| KARANGSEWU', code: '001' },
            { name: '002| BANARAN', code: '002' },
            { name: '003| KRANGGAN', code: '003' },
            { name: '004| NOMPOREJO', code: '004' },
            { name: '005| BROSOT', code: '005' },
            { name: '006| PANDOWAN', code: '006' },
            { name: '007| TIRTORAHAYU', code: '007' },
          ],
          '050': [
            { name: '001| WAHYUHARJO', code: '001' },
            { name: '002| BUMIREJO', code: '002' },
            { name: '003| JATIREJO', code: '003' },
            { name: '004| SIDOREJO', code: '004' },
            { name: '005| GULUREJO', code: '005' },
            { name: '006| NGENTAKREJO', code: '006' },
          ],
          '060': [
            { name: '001| DEMANGREJO', code: '001' },
            { name: '002| SRIKAYANGAN', code: '002' },
            { name: '003| TUKSONO', code: '003' },
            { name: '004| SALAMREJO', code: '004' },
            { name: '005| SUKORENO', code: '005' },
            { name: '006| KALIAGUNG', code: '006' },
            { name: '007| SENTOLO', code: '007' },
            { name: '008| BANGUNCIPTO', code: '008' },
          ],
          '070': [
            { name: '001| TAWANGSARI', code: '001' },
            { name: '002| KARANGSARI', code: '002' },
            { name: '003| KEDUNGSARI', code: '003' },
            { name: '004| MARGOSARI', code: '004' },
            { name: '005| PENGASIH', code: '005' },
            { name: '006| SENDANGSARI', code: '006' },
            { name: '007| SIDOMULYO', code: '007' },
          ],
         '080': [
            { name: '001| HARGOMULYO', code: '001' },
            { name: '002| HARGOREJO', code: '002' },
            { name: '003| HARGOWILIS', code: '003' },
            { name: '004| KALIREJO', code: '004' },
            { name: '005| HARGOTIRTO', code: '005' },
          ],
         '090': [
            { name: '001| BANYUROTO', code: '001' },
            { name: '002| DONOMULYO', code: '002' },
            { name: '003| WIJIMULYO', code: '003' },
            { name: '004| TANJUNGHARJO', code: '004' },
            { name: '005| JATISARONO', code: '005' },
            { name: '006| KEMBANG', code: '006' },
          ],
          '100': [
            { name: '001| JATIMULYO', code: '001' },
            { name: '002| GIRIPURWO', code: '002' },
            { name: '003| PENDOWOREJO', code: '003' },
            { name: '004| PURWOSARI', code: '004' },
          ],
          '110': [
            { name: '001| KEBONHARJO', code: '001' },
            { name: '002| BANJARSARI', code: '002' },
            { name: '003| PURWOHARJO', code: '003' },
            { name: '004| SIDOHARJO', code: '004' },
            { name: '005| GERBOSARI', code: '005' },
            { name: '006| NGARGOSARI', code: '006' },
            { name: '007| PAGERHARJO', code: '007' },
          ],
          '120': [
            { name: '001| BANJARARUM', code: '001' },
            { name: '002| BANJARASRI', code: '002' },
            { name: '003| BANJARHARJO', code: '003' },
            { name: '004| BANJAROYO', code: '004' },
          ],

        },
      tahunList: [
        { name: '2014', code: '2014' },
          { name: '2015', code: '2015' },
          { name: '2016', code: '2016' },
          { name: '2017', code: '2017' },
          { name: '2018', code: '2018' },
          { name: '2019', code: '2019' },
          { name: '2020', code: '2020' },
          { name: '2021', code: '2021' },
          { name: '2022', code: '2022' },
          { name: '2023', code: '2023' },
          { name: '2024', code: '2024' },
          { name: '2025', code: '2025' },
          { name: '2026', code: '2026' }],


      headers: [
        { title: 'No', key: 'index', sortable: false },  
        { title: 'NOP', key: 'NOP'},
        { title: 'Nama WP', key: 'NM_WP_SPPT'},
        { title: 'Alamat OP', key: 'ALAMAT'},
        { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
        { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT'},
        { title: 'Tanggal Jatuh Tempo', key: 'TGL_JATUH_TEMPO_SPPT'}
      ],
      snackbar: { show: false, text: '', color: 'success' }
    }
  },
  computed: {
    itemsWithIndex() {
      return this.tableData.map((item, index) => ({
        index: index + 1,
        ...item,
      }));
    }
  },
  methods: {
    formatRupiah(value) {
      const rawValue = String(value).replace(/[^0-9]/g, '');
      const numberValue = Number(rawValue);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(numberValue);
    },
    onKecamatanChange() {
      this.selectedKelurahan = null
      this.tableData = []
      this.kelurahanList = this.kelurahanMapping[this.selectedKecamatan] || []
    },
    async fetchData() {
      if (!this.selectedKecamatan || !this.selectedKelurahan || !this.selectedTahun) return
      this.loading = true
      try {
        const response = await bpajakService.getBpajakData(
          this.selectedKecamatan,
          this.selectedKelurahan,
          this.selectedTahun
        )
        this.tableData = response.data
      } catch (error) {
        this.showSnackbar('Error fetching data', 'error')
      } finally {
        this.loading = false
      }
    },
    exportToExcel() {
      const ws = XLSX.utils.json_to_sheet(this.tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Belum Bayar PBB');
      XLSX.writeFile(wb, 'Data_Belum_Bayar_PBB.xlsx');
    },


   
    /*    
    exportToPDF() {
      const doc = new jsPDF()
      doc.autoTable({
        head: [this.headers.map(h => h.title)],
        body: this.tableData.map(item => this.headers.map(h => item[h.key]))
      })
      doc.save('Data_Belum_Bayar_PBB.pdf')
    },
*/




exportToPDF() {
  const doc = new jsPDF();

  // 1. Judul Dokumen
  doc.setFontSize(16);
  doc.text("Laporan Data Belum Bayar PBB", 14, 15);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  // 2. Menyiapkan Data
  const tableBody = this.tableData.map((item, index) => [
    index + 1,
    item.NOP,
    item.NM_WP_SPPT,
    item.ALAMAT,
    item.THN_PAJAK_SPPT,
    this.formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT),
    item.TGL_JATUH_TEMPO_SPPT
  ]);

  // 3. Panggil autoTable dengan memberikan doc sebagai argumen pertama
  autoTable(doc, {
    startY: 30,
    head: [['No', 'NOP', 'Nama WP', 'Alamat OP', 'Tahun', 'PBB (Rp)', 'Jatuh Tempo']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      5: { halign: 'right' }
    }
  });

  // 4. Simpan File
  doc.save('Data_Belum_Bayar_PBB.pdf');
},


    logout() {
      // Tambahkan logika logout Anda di sini
      this.$router.push('/')
    },
    showSnackbar(text, color = 'success') {
      this.snackbar.text = text
      this.snackbar.color = color
      this.snackbar.show = true
    }
  }
};


const loadAllData = async () => {
  await fetchData(); // Mengambil data PBB dari API
  await fetchLaporanHistori(); // Mengambil data Firebase
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
  
  // --- Ambil Data Warga ---
   //data diambil via firestore
const fetchWargaList = async () => {
  const querySnapshot = await getDocs(collection(db, "pembayaran"), orderBy('createdAt', 'asc'));
  wargaList.value = querySnapshot.docs.map(doc => ({
    nama: doc.data().namaWarga,
    id: doc.data().NOP,
    tagihanTotal: doc.data().jumlah
    
  }));
};


// Di dalam LapPbbQrcodeTgl.vue
//const wargaList = ref([]); // Pastikan ini menampung data master (nama + tagihan)

/* jika pakai data dari json
const fetchWargaList = async () => {
  try {
    const response = await fetch('/pbb_data.json');
    const result = await response.json();
    const data = result[""] || [];
    
    wargaList.value = data.map(item => ({
      id: item.NOP, // NOP sebagai ID unik
      nama: item.NM_WP_SPPT,
      tagihanTotal: Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''))
    }));
  } catch (error) {
    console.error("Gagal memuat JSON:", error);
  }
};
*/



  // --- Ambil Laporan Histori Berdasarkan Interval Tanggal ---
  // --- Perbaikan fetchLaporanHistori agar sinkron ---
// Di dalam methods atau setup
const fetchLaporanHistori = async () => {
  isLoading.value = true;
  try {
    // 1. Ambil data pembayaran dari Firebase
    const q = query(collection(db, "pembayaran"), orderBy('createdAt', 'asc')); 
    const snapshot = await getDocs(q);
    console.log("Jumlah dokumen ditemukan:", snapshot.size); // Cek ini di console
    // 2. Olah data pembayaran
    const rekapMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const nop = data.NOP;
      
      // Ambil tagihan dari API (pastikan wargaList sudah berisi data dari apiauth_blmbyr)
      const infoWarga = wargaList.value.find(w => w.id === nop);
      const tagihanApi = infoWarga ? infoWarga.tagihanTotal : 0;

      if (!rekapMap[nop]) {
        rekapMap[nop] = {
          NOP: nop,
          namaWarga: data.namaWarga,
          tagihanTotal: tagihanApi, // Data dari API
          totalIuran: 0,
          histori: []
        };
      }
      
      rekapMap[nop].totalIuran += Number(data.jumlah || 0);
      rekapMap[nop].histori.push(data);
    });

    // 3. Tambahkan Status Lunas/Belum Lunas
    items.value = Object.values(rekapMap).map(item => ({
      ...item,
      status: item.totalIuran >= item.tagihanTotal ? 'Lunas' : 'Belum Lunas'
    }));
    
  } catch (err) {
    console.error("Error Firebase memproses data:", err);
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
  

//script perubahan 1

const generatePdfLaporanHistori = () => {
  if (rekapHistori.value.length === 0) return;
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
      { header: 'Tagihan', dataKey: 'tagihanTotal' },
      { header: 'Total Penerimaan', dataKey: 'totalIuran' },
      
      { header: 'Verifikasi QR', dataKey: 'qrcode' }

    ];


    

// Di dalam generatePdfLaporanHistori, bagian bodyData:
const bodyData = rekapHistori.value.map((item, index) => {
 // const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';
 const targetTagihan = item.tagihanTotal || 0; 
  const sudahDibayar = item.totalIuran || 0;
  const statusPembayaran = sudahDibayar >= targetTagihan ? 'LUNAS' : 'BELUM LUNAS';  
  // URL untuk verifikasi online
  const qrTextContent = `http://192.168.4.140:5199/verify-kuitansi-pbb?NOP=${item.NOP}&start=${startDate.value}&end=${endDate.value}`;  //untuk localhost

//  const qrTextContent = `https://iuran-warga-five.vercel.app/verify-kuitansi?nop=${item.wargaId}&start=${startDate.value}&end=${endDate.value}`;

  let qrBase64 = null;
  if (window.QRious) {
    const qrInstance = new window.QRious({
      value: qrTextContent,
      size: 200,
      level: 'M',
      padding: 1
    });
    qrBase64 = qrInstance.toDataURL('image/png');
  }

  return {
    no: index + 1,
    namaWarga: item.namaWarga,
    transaksi: `${item.histori.length} kali`,
    status: statusPembayaran,
    jumlah: formatRupiah(item.totalIuran),
    qrcode: qrBase64 // Disimpan untuk digambar di didDrawCell
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
      
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; // Mengosongkan teks mentah Base64 agar tidak bocor di PDF
          data.cell.styles.textColor = data.cell.raw === 'LUNAS' ? [0, 128, 0] : [200, 0, 0];
          data.cell.styles.fontStyle = 'bold';        
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
  
      const validationCode = `RT-VAL-HIST-${item.wargaId}-${startDate.value.replace(/-/g, '')}_${endDate.value.replace(/-/g, '')}`;
  
      // Desain isi ringkasan untuk QR Code Verifikasi
      const rincianSingkat = item.histori.map((h, i) => `${i+1}. ${formatFullDateTime(h.tanggal).split(' ')[0]}: ${formatRupiah(h.jumlah)}`).join('\n');

 // default ini, tapi qrcode sulit dibaca kamera hp
// KODE BARU (Status dinamis berdasarkan batas nominal Rp15.000)
 //   const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';

  

// Mengubah data menjadi URL verifikasi singkat
//const qrTextContent = `https://iuran-warga-five.vercel.app/verify-histori/${item.wargaId}`;

      // Ambil gambar QR tunggal secara lokal
      const qrImageBase64 = generateQrCodeBase64Local(qrTextContent);
  
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