<template>
  <v-container fluid>
    <v-card>
      <v-card-title>Rekap Iuran Bulanan</v-card-title>
      <v-btn color="success" @click="exportToExcel('rekap')">Ekspor Excel</v-btn>
      <v-btn color="red" @click="exportToPdf('rekap')" class="ml-2">Ekspor PDF</v-btn>

      <v-card-text>
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedMonth"
              :items="months"
              item-title="text"
              item-value="value"
              label="Pilih Bulan"
              @update:model-value="fetchRekap"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedYear"
              :items="years"
              label="Pilih Tahun"
              @update:model-value="fetchRekap"
            ></v-select>
          </v-col>
<v-col cols="8" md="4">
<v-text-field
v-model="search"
label="Cari warga..."
prepend-inner-icon="mdi-magnify"
clearable
/></v-col>


        </v-row>

        <v-data-table
          :headers="headers"
          :items="rekapData"
          :search="search"
          item-key="namaWarga"
          class="elevation-1"
        >
        <template v-slot:item.nomor="{ item }">
         {{ item.nomor }}
        </template>

          <template v-slot:item.totalIuran="{ item }">
            {{ formatRupiah(item.totalIuran) }}
          </template>
        </v-data-table>
        <v-card-text class="text-right mt-4">
            <strong>Total Iuran Bulan Ini: {{ formatRupiah(totalIuranBulanan) }}</strong>
        </v-card-text>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { db, auth } from '../firebase/config';
import { collection, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

import { useRouter } from 'vue-router';
import { signOut } from 'firebase/auth';

// Import library ekspor
import * as XLSX from 'xlsx'; // Untuk Excel
import jsPDF from 'jspdf'; // Untuk PDF
import 'jspdf-autotable'; // Untuk tabel di PDF
import autoTable from 'jspdf-autotable';
// --- IMPOR UNTUK PDF EXPORT ---
import { getPdfDoc } from '../plugins/pdf'; // <<< IMPOR FUNGSI PEMBUAT DOC PDF
// Variabel pencarian
const search = ref(''); // <<< Pastikan ini dideklarasikan


const drawer = ref(false);
const router = useRouter();
const rekapData = ref([]);
const wargaList = ref([]);
const selectedMonth = ref(new Date().getMonth() + 1); // Bulan saat ini (1-12)
const selectedYear = ref(new Date().getFullYear());

const months = [
{ text: 'Januari', value: 1 },
{ text: 'Februari', value: 2 },
{ text: 'Maret', value: 3 },
{ text: 'April', value: 4 },
{ text: 'Mei', value: 5 },
{ text: 'Juni', value: 6 },
{ text: 'Juli', value: 7 },
{ text: 'Agustus', value: 8 },
{ text: 'September', value: 9 },
{ text: 'Oktober', value: 10 },
{ text: 'November', value: 11 },
{ text: 'Desember', value: 12 }
];

const years = computed(() => {
const currentYear = new Date().getFullYear();
const yearsArray = [];
for (let i = currentYear ; i <= currentYear + 5; i++) { // 0 tahun ke belakang, 5 tahun ke depan
yearsArray.push(i);
}
return yearsArray;
});

const headers = [
{ title: 'No', key: 'nomor', sortable: false },
{ title: 'Nama Warga', key: 'namaWarga' },
{ title: 'Total Iuran', key: 'totalIuran' }
];

const totalIuranBulanan = computed(() => {
return rekapData.value.reduce((sum, item) => sum + item.totalIuran, 0);
});

/* ini sudah jalan
const fetchWargaList = async () => {
const querySnapshot = await getDocs(collection(db, 'wargart'));
wargaList.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
*/


const fetchWargaList = async () => {
    try {
        // Buat kueri yang mengurutkan berdasarkan 'createdAt' secara ascending
        const q = query(collection(db, 'wargart'), orderBy('createdAt', 'asc'));

        const querySnapshot = await getDocs(q);

        // Petakan data ke dalam array wargaList.value
        wargaList.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('Warga list sorted by createdAt:', wargaList.value);
    } catch (error) {
        console.error("Error fetching sorted warga list:", error);
    }
};

const fetchRekap = async () => {
  // Membuat objek Date JavaScript untuk awal dan akhir bulan
  const startOfMonth = new Date(selectedYear.value, selectedMonth.value - 1, 1);
  // Untuk akhir bulan, pastikan hingga detik terakhir hari terakhir bulan
  const endOfMonth = new Date(selectedYear.value, selectedMonth.value, 0, 23, 59, 59, 999);

  console.log('Filtering from:', startOfMonth.toISOString(), 'to:', endOfMonth.toISOString()); // Untuk debugging

  const q = query(
    collection(db, 'iuran'),
    // --- PERBAIKAN PENTING DI SINI ---
    where('tanggal', '>=', startOfMonth), // Gunakan objek Date JavaScript
    where('tanggal', '<=', endOfMonth)     // Gunakan objek Date JavaScript
  );

  const querySnapshot = await getDocs(q);
  // Pastikan Anda memproses tanggal dari Timestamp yang diambil, meskipun tidak langsung untuk filter
  const iuranBulanIni = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // data.tanggal sekarang adalah Firestore Timestamp, Anda mungkin tidak perlu mengkonversinya langsung
      // di sini kecuali untuk debugging atau tampilan awal.
      return data;
  });

  console.log('Iuran ditemukan untuk bulan ini:', iuranBulanIni); // Untuk debugging

const rekap = {};
wargaList.value.forEach(wargart => {
rekap[wargart.id] = {
  namaWarga: wargart.nama,
  totalIuran: 0
};
});

iuranBulanIni.forEach(iuranItem => {
if (rekap[iuranItem.wargaId]) {
  rekap[iuranItem.wargaId].totalIuran += iuranItem.jumlah;
}
});

// --- PERBAIKAN PENTING DI SINI ---
const finalRekapData = Object.values(rekap);
  let counter = 1; // Inisialisasi counter

  // Tambahkan nomor urut ke setiap item rekap
  rekapData.value = finalRekapData.map(item => ({
    ...item,
    nomor: counter++
  }));
  // --- AKHIR PERBAIKAN ---

//rekapData.value = Object.values(rekap);
console.log('Final Rekap Data dengan nomor urut:', rekapData.value); // Untuk debugging

};

const formatRupiah = (amount) => {
return new Intl.NumberFormat('id-ID', {
style: 'currency',
currency: 'IDR',
minimumFractionDigits: 0
}).format(amount);
};


// --- Fungsi Ekspor ---
const exportToExcel = (dataType) => {
let dataToExport = [];
let fileName = '';

if (dataType === 'rekap') {
dataToExport = rekapData.value.map(item => ({
  'Nomor': item.nomor,
  'Nama Warga': item.namaWarga,
  'Total Iuran': item.totalIuran // Biarkan angka untuk perhitungan di Excel
}));
fileName = `rekap_iuran_${months.find(m => m.value === selectedMonth.value)?.text}_${selectedYear.value}.xlsx`;
}

if (dataToExport.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

const ws = XLSX.utils.json_to_sheet(dataToExport);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, dataType);
XLSX.writeFile(wb, fileName);
};


//eksport to pdf

const exportToPdf = (dataType) => {
const doc = new jsPDF();
let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

if (dataType === 'rekap') {
title = `Rekap Iuran Bulanan (${months.find(m => m.value === selectedMonth.value)?.text} ${selectedYear.value})`;
fileName = `rekap_iuran_${months.find(m => m.value === selectedMonth.value)?.text}_${selectedYear.value}.pdf`;
/*
headersPdf = ['No', 'Nama Warga', 'Total Iuran'];
dataPdf = rekapData.value.map(item => [
  item.namaWarga,
  formatRupiah(item.totalIuran)
]);
}

if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}
*/
// Hanya ambil header yang relevan (tanpa 'Aksi') dan petakan ke judul
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);
// Petakan data sesuai urutan header yang diekspor

/*
dataPdf = rekapData.value.map(item =>
  headers.filter(h => h.key !== 'actions').map(h => item[h.key])
);
} 
else {
alert("Tipe data tidak dikenal untuk ekspor PDF.");
return;
}
*/

dataPdf = rekapData.value.map(item => {
      // Buat array untuk baris data ini
      const rowData = [];
      headers.filter(h => h.key !== 'actions').forEach(header => {
        let value = item[header.key]; // Ambil nilai mentah

        // Jika header adalah 'tanggal', format ulang
        if (header.key === 'tanggal') { // Asumsi ada header dengan key 'tanggal'
          value = formatTanggalUntukPdf(value); // Gunakan fungsi pemformatan khusus PDF
        };
        // Tambahan: Jika ada kolom lain yang perlu diformat (misal: mata uang)
         if (header.key === 'totalIuran') {
           value = formatRupiah(value); // Gunakan fungsi format Rupiah jika ada
         }

        rowData.push(value);
      });
      return rowData;
    });
    // --- AKHIR PERBAIKAN ---

  } else {
    alert("Tipe data tidak dikenal untuk ekspor PDF.");
    return;
  }

if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}
doc.text(title, 14, 16);

autoTable(doc, {
head: [headersPdf],
body: dataPdf,
startY: 20,
foot: [
  ['', `Total Iuran Bulan Ini: ${formatRupiah(totalIuranBulanan.value)}`]
]
});

doc.save(fileName);
};
// --- Akhir Fungsi Ekspor ---


const logout = async () => {
try {
await signOut(auth);
router.push('/');
} catch (error) {
console.error('Error logging out:', error.message);
}
};

onMounted(async () => {
await fetchWargaList();
await fetchRekap();
});
</script>