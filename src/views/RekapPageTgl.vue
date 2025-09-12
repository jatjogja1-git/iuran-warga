<template>
  <v-container fluid>
    <v-card>
      <v-card-title>Rekap Iuran Per Tanggal
        <v-spacer></v-spacer>
      <v-btn color="success" @click="exportToExcel('rekap')">Ekspor Excel</v-btn>
      <v-btn color="red" @click="exportToPdf('rekap')" class="ml-2">Ekspor PDF</v-btn>
    </v-card-title>
      <v-card-text>

<v-row>
<v-col cols="12" md="4">
  <v-text-field
    v-model="startDate"
    label="Tanggal Awal"
    type="date"
    @change="fetchRekap"
  ></v-text-field>
</v-col>
<v-col cols="12" md="4">
  <v-text-field
    v-model="endDate"
    label="Tanggal Akhir"
    type="date"
    @change="fetchRekap"
  ></v-text-field>
</v-col>
</v-row>
    <v-col cols="8" md="4">
          <v-text-field
          v-model="search"
          label="Cari warga..."
          prepend-inner-icon="mdi-magnify"
          clearable
          /></v-col>


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
// import { getPdfDoc } from '../plugins/pdf'; // <<< IMPOR FUNGSI PEMBUAT DOC PDF
// Variabel pencarian
const search = ref(''); // <<< Pastikan ini dideklarasikan


const drawer = ref(false);
const router = useRouter();
const rekapData = ref([]);
const wargaList = ref([]);
const selectedMonth = ref(new Date().getMonth() + 1); // Bulan saat ini (1-12)
const selectedYear = ref(new Date().getFullYear());


const startDate = ref(new Date().toISOString().substring(0, 10)); // Format YYYY-MM-DD
const endDate = ref(new Date().toISOString().substring(0, 10));

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


// Fungsi helper untuk menampilkan tanggal dari objek Date (YYYY-MM-DD atau DD-MM-YYYY)
const formatDateDisplay = (dateObj) => {
  if (!dateObj) return '';
  // If dateObj is a Firestore Timestamp (e.g., when editing an existing item)
  if (dateObj && typeof dateObj.toDate === 'function') {
    dateObj = dateObj.toDate(); // Convert to JS Date object
  }
  if (dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`; // Display in DD-MM-YYYY format
  }
  return '';
};



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
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  end.setHours(23, 59, 59, 999); // Pastikan akhir hari

  console.log('Filtering from:', start.toISOString(), 'to:', end.toISOString());

  const q = query(
    collection(db, 'iuran'),
    where('tanggal', '>=', start),
    where('tanggal', '<=', end)
  );

  const querySnapshot = await getDocs(q);
  const iuranDalamRentang = querySnapshot.docs.map(doc => doc.data());

  const rekap = {};
  wargaList.value.forEach(wargart => {
    rekap[wargart.id] = {
      namaWarga: wargart.nama,
      totalIuran: 0
    };
  });

  iuranDalamRentang.forEach(iuranItem => {
    if (rekap[iuranItem.wargaId]) {
      rekap[iuranItem.wargaId].totalIuran += iuranItem.jumlah;
    }
  });

  let counter = 1;
  rekapData.value = Object.values(rekap).map(item => ({
    ...item,
    nomor: counter++
  }));

  console.log('Final Rekap Data:', rekapData.value);
};




const formatDate = (dateValue) => {
  // console.log('DEBUG: formatDate dipanggil dengan:', dateValue); // Keep for debugging if needed
  if (!dateValue) {
    // console.log('DEBUG: dateValue kosong, mengembalikan string kosong.');
    return '';
  }
  try {
    let dateToFormat;
    // If it's a Firestore Timestamp, convert it to a Date object
    if (typeof dateValue.toDate === 'function') {
      dateToFormat = dateValue.toDate();
    }
    // If it's already a native JavaScript Date object
    else if (dateValue instanceof Date) {
      dateToFormat = dateValue;
    }
    // If it's a string (e.g., from v-date-picker initial value in YYYY-MM-DD)
    else if (typeof dateValue === 'string') {
      dateToFormat = new Date(dateValue);
      // Validate if the string parsed into a valid date
      if (isNaN(dateToFormat.getTime())) {
        console.error('ERROR: String tanggal tidak valid untuk parsing:', dateValue);
        return 'Tanggal Tidak Valid';
      }
    }
    // Fallback for any other unexpected type
    else {
      console.error('ERROR: Tipe data tanggal tidak dikenal:', dateValue);
      return 'Tanggal Tidak Valid';
    }

    // console.log('DEBUG: Tanggal yang akan diformat:', dateToFormat);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = dateToFormat.toLocaleDateString('id-ID', options);
    // console.log('DEBUG: Tanggal terformat:', formatted);
    return formatted;
  } catch (e) {
    console.error('ERROR: Masalah umum di formatDate:', dateValue, e);
    return 'Tanggal Tidak Valid';
  }
};



// --- Fungsi Pemformatan Tanggal Khusus untuk PDF ---
// Pastikan fungsi ini ada di dalam <script setup> atau diimpor
const formatTanggalUntukPdf = (dateValue) => {
  if (!dateValue) return '';

  let dateToFormat;
  // Jika ini adalah Firestore Timestamp
  if (typeof dateValue.toDate === 'function') {
    dateToFormat = dateValue.toDate();
  }
  // Jika sudah berupa objek Date JS
  else if (dateValue instanceof Date) {
    dateToFormat = dateValue;
  }
  // Jika masih berupa string (misal: "YYYY-MM-DD")
  else if (typeof dateValue === 'string') {
    dateToFormat = new Date(dateValue);
    // Validasi apakah string tanggal bisa di-parse dengan benar
    if (isNaN(dateToFormat.getTime())) {
      console.warn("Invalid date string for PDF export:", dateValue);
      return dateValue; // Kembalikan string asli jika tidak valid
    }
  }
  else {
    return dateValue; // Kembalikan nilai asli jika tipe tidak dikenal
  }

  // Format ke DD-MM-YYYY
  const day = String(dateToFormat.getDate()).padStart(2, '0');
  const month = String(dateToFormat.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
  const year = dateToFormat.getFullYear();

  return `${day}-${month}-${year}`;
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
fileName = `Rekap_Iuran_Tanggal_${formatTanggalUntukPdf(startDate.value)}_to_${formatTanggalUntukPdf(endDate.value)}.xlsx`;
//fileName = `rekap_iuran_${months.find(m => m.value === selectedMonth.value)?.text}_${selectedYear.value}.xlsx`;

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
// Ganti format tanggal di judul
  title = `Rekap Iuran Range Tanggal (${formatTanggalUntukPdf(startDate.value)} s.d. ${formatTanggalUntukPdf(endDate.value)})`;
  // Ganti format tanggal di nama file
  fileName = `Rekap_Iuran_Tanggal_${formatTanggalUntukPdf(startDate.value)}_to_${formatTanggalUntukPdf(endDate.value)}.pdf`;
  
  // Perbaiki array headersPdf
  headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);

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