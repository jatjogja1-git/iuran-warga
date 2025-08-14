<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        Catat Iuran Harian
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog('add')">Tambah Iuran</v-btn>
        <v-btn color="success" @click="exportToExcel('iuran')">Ekspor Excel</v-btn>
<!--        <v-btn color="red" @click="exportToPdf('iuran')" class="ml-2">Ekspor Total Iuran ke PDF</v-btn>-->
<!--    <v-btn color="red darken-1" @click="exportFilteredIuranToPdf">Ekspor Iuran per Tanggal PDF</v-btn>-->
        <v-btn color="red darken-3" @click="exportFilteredIuranByWargaToPdf">Ekspor Iuran per Tanggal PDF</v-btn>
      </v-card-title>
      <v-card-text>


<v-row>
  <v-col cols="12" md="4">
    <v-text-field
      v-model="startDate"
      type="date"
      label="Tanggal Mulai"
      clearable
    />
  </v-col>

  <v-col cols="12" md="4">
    <v-text-field
      v-model="endDate"
      type="date"
      label="Tanggal Akhir"
      :error-messages="tanggalError"
      clearable
    />
  </v-col>
</v-row>

<v-col cols="12" md="4">
<v-text-field
v-model="search"
label="Cari iuran warga..."
prepend-inner-icon="mdi-magnify"
clearable
/></v-col>


<v-alert type="info" class="mt-4">
  Total Iuran: {{ totalIuran.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) }}
</v-alert>

        <v-data-table
        :headers="headers"
        :items="filteredIuran"
        :search="search"
        :items-per-page="10"
        item-key="id"
        class="elevation-1"
        show-current-page
        :page.sync="page"
>
<template v-slot:item.no="{ index }">
    {{ (page - 1) * 10 + index + 1 }}
  </template>

          <template v-slot:item.tanggal="{ item }">
          {{ formatDate(item.tanggalObj) }}
          </template>
            
          <template v-slot:item.jumlah="{ item }">
            {{ formatRupiah(item.jumlah) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-icon small @click="deleteIuran(item.id)">
              mdi-delete
            </v-icon>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">Tambah Iuran</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-autocomplete
              v-model="newIuran.wargaId"
              :items="wargaList"
              item-title="nama"
              item-value="id"
              label="Pilih Warga"
              required
            ></v-autocomplete>
            <v-text-field
              label="Jumlah Iuran (Rupiah)"
              type="number"
              v-model.number="newIuran.jumlah"
              required
            ></v-text-field>
            
            <v-menu
  v-model="tanggalMenu"
  :close-on-content-click="false"
  :nudge-right="40"
  transition="scale-transition"
  offset-y
  min-width="auto"
>
  <template v-slot:activator="{ props }">
    <v-text-field
      :model-value="formatDateDisplay(newIuran.tanggalObj)" 
      label="Tanggal Iuran"
      prepend-icon="mdi-calendar"
      readonly
      v-bind="props"
    ></v-text-field>
  </template>
  <v-date-picker
    v-model="newIuran.tanggalObj" 
    no-title
    scrollable
    @update:model-value="tanggalMenu = false"
  ></v-date-picker>
</v-menu>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeDialog">Batal</v-btn>
          <v-btn color="blue darken-1" text @click="saveIuran">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { ref, onMounted } from 'vue';
import { db, auth } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
//import { useRouter } from 'vue-router';
//import { signOut } from 'firebase/auth';

// Import library ekspor
import * as XLSX from 'xlsx'; // Untuk Excel
import jsPDF from 'jspdf'; // Untuk PDF
import 'jspdf-autotable'; // Untuk tabel di PDF
import autoTable from 'jspdf-autotable';
// --- IMPOR UNTUK PDF EXPORT ---
import { getPdfDoc } from '../plugins/pdf'; // <<< IMPOR FUNGSI PEMBUAT DOC PDF

// Variabel pencarian
const search = ref(''); // <<< Pastikan ini dideklarasikan
const page = ref(1);
//const page = ref(1); // Tambahkan ini di script setup

//const totalPages = computed(() => Math.ceil(iuran.value.length / 10));

//const drawer = ref(false);
//const router = useRouter();
const iuran = ref([]);
const wargaList = ref([]); // Untuk dropdown warga
const dialog = ref(false);
const tanggalMenu = ref(false);


const startDate = ref('');
const endDate = ref('');


// Pastikan Anda mengimpor 'query' dan 'orderBy'
// Anggap variabel wargaList sudah dideklarasikan
//const wargaList = ref([]);

const fetchWargaList = async () => {
  try {
    // 1. Buat kueri dengan pengurutan
    // Mengurutkan berdasarkan 'createdAt' secara ascending (dari terlama ke terbaru)
    const q = query(collection(db, 'wargart'), orderBy('createdAt', 'asc'));

    const querySnapshot = await getDocs(q);

    // 2. Petakan hasil kueri ke dalam array wargaList
    wargaList.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      nama: doc.data().nama,
      // ... properti lain jika diperlukan
    }));

    console.log('Daftar warga yang terurut:', wargaList.value);

  } catch (error) {
    console.error("Error fetching sorted warga list:", error);
  }
};

const filteredIuran = computed(() => {
  // Jika kedua tanggal kosong, tampilkan semua data
  if (!startDate.value && !endDate.value) return iuran.value;

  return iuran.value.filter(item => {
    const itemDate = new Date(item.tanggalObj).setHours(0, 0, 0, 0); // Normalisasi ke tengah malam
    const start = startDate.value ? new Date(startDate.value).setHours(0, 0, 0, 0) : null;
    const end = endDate.value ? new Date(endDate.value).setHours(0, 0, 0, 0) : null;

    if (start && end) return itemDate >= start && itemDate <= end;
    if (start) return itemDate >= start;
    if (end) return itemDate <= end;

    return true;
  });
});


/*
const today = new Date(); // Membuat objek tanggal saat ini
const day = String(today.getDate()).padStart(2, '0'); // Mengambil hari (DD), menambahkan '0' di depan jika < 10
const month = String(today.getMonth() + 1).padStart(2, '0'); // Mengambil bulan (MM), menambahkan 1 karena dimulai dari 0, lalu menambahkan '0' jika < 10
const year = today.getFullYear(); // Mengambil tahun (YYYY)
const formattedDate = `${day}-${month}-${year}`; // Menggabungkan semuanya
console.log(formattedDate);
*/


const newIuran = ref({
wargaId: null,
jumlah: 0,
//tanggal: new Date().toISOString().substring(0, 10) // Format YYYY-MM-DD
tanggalObj: new Date() // Inisialisasi dengan objek Date hari ini
});

const totalIuran = computed(() => {
  return filteredIuran.value.reduce((acc, item) => acc + item.jumlah, 0);
});

/*
// Fungsi helper untuk menampilkan tanggal dari objek Date
const formatDateDisplay = (dateObj) => {
  if (!dateObj) return '';
  // Jika dateObj adalah Timestamp dari Firestore (saat diedit)
  if (dateObj && typeof dateObj.toDate === 'function') {
    dateObj = dateObj.toDate();
  }
  if (dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
//    return `${year}-${month}-${day}`; // Format untuk tampilan YYYY-MM-DD
    return `${day}-${month}-${year}`; // Format untuk tampilan DD-MM-YYYY
}
  return '';
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


const tanggalError = computed(() => {
  if (!startDate.value || !endDate.value) return '';
  if (new Date(endDate.value) < new Date(startDate.value)) {
    return 'Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.';
  }
  return '';
});

// --- Headers untuk v-data-table ---
const headers = [
{ title: 'No', key: 'no', sortable: false },  
{ title: 'Nama Warga', key: 'namaWarga', searchable: true }, // <<< Tambahkan ini
{ title: 'Tanggal', key: 'tanggal', searchable: true },
{ title: 'Jumlah', key: 'jumlah', searchable: true },
{ title: 'Aksi', key: 'actions', sortable: false, searchable: false }
];

/*
const fetchWargaList = async () => {
const querySnapshot = await getDocs(collection(db, 'wargart'));
wargaList.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
*/


// Modifikasi fetchIuran untuk menangani Timestamp
// This part is good
const fetchIuran = async () => {
    const iuranCollection = collection(db, 'iuran');
    const q = query(iuranCollection, orderBy('tanggal', 'desc'));
    const querySnapshot = await getDocs(q);
    const fetchedIuran = [];
    for (const docIuran of querySnapshot.docs) {
        const dataIuran = docIuran.data();
        const wargaData = wargaList.value.find(w => w.id === dataIuran.wargaId);
        fetchedIuran.push({
            id: docIuran.id,
            ...dataIuran,
            tanggal: dataIuran.tanggal, // This remains the Firestore Timestamp
            tanggalObj: dataIuran.tanggal ? dataIuran.tanggal.toDate() : null, // This is the JS Date object
            namaWarga: wargaData ? wargaData.nama : 'Warga Tidak Ditemukan'
        });
    }
    iuran.value = fetchedIuran;
};



/*
const openDialog = () => {
dialog.value = true;
newIuran.value = {
wargaId: null,
jumlah: 0,
tanggal: new Date().toISOString().substring(0, 10)
};
};
*/


// Modifikasi openDialog untuk menginisialisasi tanggalObj
const openDialog = (mode, item = null) => {
    dialog.value = true;
    dialogMode.value = mode; // Pastikan dialogMode dideklarasikan (kalau ada)
    if (mode === 'add') {
        newIuran.value = {
            wargaId: null,
            jumlah: 0,
            tanggalObj: new Date() // Objek Date untuk tanggal hari ini
        };
    } else { // Mode edit, jika Anda mengimplementasikannya
        newIuran.value = {
            id: item.id,
            wargaId: item.wargaId,
            jumlah: item.jumlah,
            tanggalObj: item.tanggal ? item.tanggal.toDate() : null // Konversi Timestamp ke Date object
        };
    }
};

const closeDialog = () => {
dialog.value = false;
};

/*
const saveIuran = async () => {
await addDoc(collection(db, 'iuran'), {
wargaId: newIuran.value.wargaId,
jumlah: newIuran.value.jumlah,
tanggal: newIuran.value.tanggal
});
closeDialog();
await fetchIuran();
};
*/

/*
const saveIuran = async () => {
  console.log("Saving Iuran. Data to save:", newIuran.value);
  console.log("Tanggal object to save:", newIuran.value.tanggalObj, "Type:", typeof newIuran.value.tanggalObj);

  await addDoc(collection(db, 'iuran'), {
    wargaId: newIuran.value.wargaId,
    jumlah: newIuran.value.jumlah,
    tanggal: newIuran.value.tanggalObj // Firestore akan otomatis mengkonversi objek Date ini menjadi Timestamp
  });
  closeDialog();
  await fetchIuran();
};
*/


const saveIuran = async () => {
  console.log("Saving Iuran. Data to save:", newIuran.value);
  console.log("Tanggal object to save:", newIuran.value.tanggalObj, "Type:", typeof newIuran.value.tanggalObj);

  // Firestore will automatically convert a JavaScript Date object into a Timestamp.
  // Ensure newIuran.value.tanggalObj is indeed a Date object here.
  if (newIuran.value.tanggalObj instanceof Date) {
    await addDoc(collection(db, 'iuran'), {
      wargaId: newIuran.value.wargaId,
      jumlah: newIuran.value.jumlah,
      tanggal: newIuran.value.tanggalObj // This is correct, Firestore handles it
    });
    closeDialog();
    await fetchIuran(); // Refresh data after saving
  } else {
    console.error("ERROR: newIuran.tanggalObj is not a valid Date object.", newIuran.value.tanggalObj);
    alert("Gagal menyimpan iuran: Tanggal tidak valid.");
  }
};


const deleteIuran = async (id) => {
if (confirm('Apakah Anda yakin ingin menghapus iuran ini?')) {
await deleteDoc(doc(db, 'iuran', id));
await fetchIuran();
}
};

/*
const formatDate = (dateString) => {
if (!dateString) return '';
const date = new Date(dateString);
const options = { year: 'numeric', month: 'long', day: 'numeric' };
const today = new Date(); // Membuat objek tanggal saat ini
const day = String(today.getDate()).padStart(2, '0'); // Mengambil hari (DD), menambahkan '0' di depan jika < 10
const month = String(today.getMonth() + 1).padStart(2, '0'); // Mengambil bulan (MM), menambahkan 1 karena dimulai dari 0, lalu menambahkan '0' jika < 10
const year = today.getFullYear(); // Mengambil tahun (YYYY)
const formattedDate = `${day}-${month}-${year}`; // Menggabungkan semuanya

//return date.toLocaleDateString('id-ID', day, month, year);
return date.toLocaleDateString('id-ID', options);
};
*/

/*
// Saat mengambil data dari Firestore, `tanggal` akan berupa Timestamp
// Anda perlu mengkonversinya ke string untuk ditampilkan di v-data-table
const formatDate = (firestoreTimestamp) => {
  if (!firestoreTimestamp) return '';
  // Pastikan firestoreTimestamp adalah objek Timestamp, lalu konversi ke Date
  const date = firestoreTimestamp.toDate();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
};
*/


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

const formatRupiah = (amount) => {
return new Intl.NumberFormat('id-ID', {
style: 'currency',
currency: 'IDR',
minimumFractionDigits: 0
}).format(amount);
};


/*
// --- Fungsi Ekspor ---
const exportToExcel = (dataType) => {
let dataToExport = [];
let fileName = '';

if (dataType === 'iuran') {
dataToExport = iuran.value.map(({ id, ...rest }) => rest); // Hapus properti 'id'
fileName = 'data_iuran.xlsx';
}
// Tambahkan kondisi untuk dataType lain jika Anda membuat fungsi ini generik
// else if (dataType === 'iuran') { ... }

if (dataToExport.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

const ws = XLSX.utils.json_to_sheet(dataToExport);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, dataType);
XLSX.writeFile(wb, fileName);
};



// Import library ekspor

// ... (kode lainnya, pastikan Anda punya fungsi formatTanggalUntukPdf atau serupa)

// Fungsi yang sama dengan yang kita buat untuk PDF, atau fungsi lain yang memformat ke DD-MM-YYYY
// Pastikan fungsi ini tersedia dalam scope script Anda.
const formatTanggalUntukExcel = (dateValue) => {
  if (!dateValue) return '';

  let dateToFormat;
  if (typeof dateValue.toDate === 'function') { // Jika Firestore Timestamp
    dateToFormat = dateValue.toDate();
  } else if (dateValue instanceof Date) { // Jika sudah objek Date JS
    dateToFormat = dateValue;
  } else if (typeof dateValue === 'string') { // Jika masih string (misal YYYY-MM-DD)
    dateToFormat = new Date(dateValue);
    if (isNaN(dateToFormat.getTime())) {
      console.warn("Invalid date string for Excel export:", dateValue);
      return dateValue; // Kembalikan string asli jika tidak valid
    }
  } else {
    return dateValue;
  }

  // Format ke DD-MM-YYYY
  const day = String(dateToFormat.getDate()).padStart(2, '0');
  const month = String(dateToFormat.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
  const year = dateToFormat.getFullYear();

  return `${day}-${month}-${year}`;
};
*/



/*
// --- Fungsi Ekspor ---
const exportToExcel = (dataType) => {
  let dataToExport = [];
  let fileName = '';

  if (dataType === 'iuran') {
    // Ambil semua data iuran, lalu petakan
    dataToExport = iuran.value.map(item => {
      // Buat objek baru agar tidak memodifikasi data asli
      const newItem = { ...item };

      // Hapus properti 'id' jika tidak ingin diekspor
      delete newItem.id;

      // --- PERBAIKAN PENTING DI SINI ---
      // Format properti 'tanggal'
      if (newItem.tanggal) {
        newItem.tanggal = formatTanggalUntukExcel(newItem.tanggal);
      }
      // --- AKHIR PERBAIKAN ---

      // Jika ada properti lain yang perlu diformat (misalnya 'jumlah' ke Rupiah string)
      // if (newItem.jumlah) {
      //   newItem.jumlah = formatRupiah(newItem.jumlah); // Jika Anda ingin angka di Excel tetap angka, jangan format ini
      // }

      return newItem;
    });
    fileName = 'data_iuran.xlsx';
  }
  // Tambahkan kondisi untuk dataType lain jika Anda membuat fungsi ini generik
  // else if (dataType === 'rekap') {
  //   // Contoh jika Anda punya exportToExcel untuk rekap data:
  //   dataToExport = rekapData.value.map(item => ({
  //     'Nama Warga': item.namaWarga,
  //     'Total Iuran': item.totalIuran // Biarkan angka untuk perhitungan di Excel
  //   }));
  //   fileName = `rekap_iuran_${months.find(m => m.value === selectedMonth.value)?.text}_${selectedYear.value}.xlsx`;
  // }


  if (dataToExport.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // Tambahan: Mengatur lebar kolom otomatis atau format header agar lebih bagus
  // Ini adalah fitur lanjutan dari library XLSX, mungkin tidak perlu untuk kasus dasar.
  // const ws = XLSX.utils.json_to_sheet(dataToExport, { cellDates: false }); // cellDates: false penting jika sudah diformat ke string
  // const wb = XLSX.utils.book_new();
  // XLSX.utils.book_append_sheet(wb, ws, dataType);
  // XLSX.writeFile(wb, fileName);

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, dataType);
  XLSX.writeFile(wb, fileName);
};
*/



// --- Fungsi Ekspor --- sdh jalan ok
const exportToExcel = (dataType) => {
  let dataToExport = [];
  let fileName = '';

  if (dataType === 'iuran') {
    dataToExport = iuran.value.map(item => {
      // Buat salinan objek untuk menghindari modifikasi data asli
      const newItem = { ...item };

      // Hapus properti yang tidak diinginkan dari hasil ekspor
      delete newItem.id;
      // --- PERBAIKAN PENTING DI SINI ---
      delete newItem.tanggalObj; // Hapus properti tanggalObj agar tidak ikut diekspor
      delete newItem.wargaId;
      // --- AKHIR PERBAIKAN ---

      // Format properti 'tanggal' ke format DD-MM-YYYY untuk tampilan di Excel
      if (newItem.tanggal) {
        newItem.tanggal = formatTanggalUntukExcel(newItem.tanggal);
      };

      if (newItem.jumlah) {
//        newItem.jumlah = formatRupiah(newItem.jumlah); //hilangkan ini jika ingin di kolom excel di Sum
        newItem.jumlah = (newItem.jumlah); //hilangkan ini jika ingin di kolom excel di Sum

      };

      // Anda juga bisa mengganti nama properti jika diperlukan untuk header Excel yang lebih baik
      // Misalnya: newItem['Nama Warga'] = newItem.namaWarga; delete newItem.namaWarga;

      return newItem;
    });
    fileName = 'data_iuran.xlsx';
  }
  // ... (kode untuk dataType lain seperti 'rekap' jika ada)

  if (dataToExport.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, dataType);
  XLSX.writeFile(wb, fileName);
};

// Pastikan fungsi formatTanggalUntukExcel tersedia di sini
const formatTanggalUntukExcel = (dateValue) => {
  if (!dateValue) return '';

  let dateToFormat;
  if (typeof dateValue.toDate === 'function') {
    dateToFormat = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    dateToFormat = dateValue;
  } else if (typeof dateValue === 'string') {
    dateToFormat = new Date(dateValue);
    if (isNaN(dateToFormat.getTime())) {
      console.warn("Invalid date string for Excel export:", dateValue);
      return dateValue;
    }
  } else {
    return dateValue;
  }

  const day = String(dateToFormat.getDate()).padStart(2, '0');
  const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
  const year = dateToFormat.getFullYear();

  return `${day}-${month}-${year}`;
};



// --- Fungsi Ekspor PDF (Menggunakan getPdfDoc) ---
const exportToPdf = (dataType) => {
  const doc = new jsPDF();
  let headersPdf = [];
  let dataPdf = [];
  let title = '';
  let fileName = '';

  if (dataType === 'iuran') {
    title = 'Data Iuran';
    fileName = 'data_iuran_warga.pdf';
    // Hanya ambil header yang relevan (tanpa 'Aksi') dan petakan ke judul
    headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);

    // --- PERBAIKAN PENTING DI SINI ---
    dataPdf = iuran.value.map(item => {
      // Buat array untuk baris data ini
      const rowData = [];
      headers.filter(h => h.key !== 'actions').forEach(header => {
        let value = item[header.key]; // Ambil nilai mentah

        // Jika header adalah 'tanggal', format ulang
        if (header.key === 'tanggal') { // Asumsi ada header dengan key 'tanggal'
          value = formatTanggalUntukPdf(value); // Gunakan fungsi pemformatan khusus PDF
        };
        // Tambahan: Jika ada kolom lain yang perlu diformat (misal: mata uang)
         if (header.key === 'jumlah') {
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

  doc.text(title, 14, 16); // Judul dokumen

  /*
  autoTable(doc, {
    head: [headersPdf],
    body: dataPdf,
    startY: 20
  });
*/

autoTable(doc, {
  head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
  startY: 20,
  body: iuran.value.map((item, index) => [
    index + 1, // Nomor urut
    item.namaWarga,
    formatDate(item.tanggalObj),
    formatRupiah(item.jumlah)
  ]),
  didDrawPage: function (data) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

    doc.setFontSize(10);
    doc.text(
      `Halaman ${doc.internal.getCurrentPageInfo().pageNumber} dari ${pageCount}`,
      data.settings.margin.left,
      pageHeight - 10
    );
  }
});

  doc.save(fileName);
};



// Ekspor pdf rentang tanggal

const exportFilteredIuranToPdf = () => {
  const doc = new jsPDF();
  doc.text('Laporan Iuran Berdasarkan Tanggal', 14, 16);

  const tableData = filteredIuran.value.map((item, index) => [
    index + 1,
    wargaList.value.find(w => w.id === item.wargaId)?.nama || 'Tidak Diketahui',
    formatDate(item.tanggalObj),
    formatRupiah(item.jumlah),
  ]);

  autoTable(doc, {
    head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
    body: tableData,
    startY: 20,
  });

  const start = startDate.value || 'awal';
  const end = endDate.value || 'akhir';
  doc.save(`iuran_${start}_to_${end}.pdf`);
};



//--Eksport pd rentang tanggal dan warga
/*
const exportFilteredIuranByWargaToPdf = () => {
  const doc = new jsPDF();
  doc.text('Laporan Iuran Warga Berdasarkan Filter', 14, 16);

  // Ambil data yang lolos filter tanggal & nama warga
  const data = filteredIuran.value.filter(item => {
    const wargaNama = wargaList.value.find(w => w.id === item.wargaId)?.nama.toLowerCase() || '';
    return wargaNama.includes(search.value.toLowerCase());
  });

  const tableData = data.map((item, index) => [
    index + 1,
    wargaList.value.find(w => w.id === item.wargaId)?.nama || 'Tidak Diketahui',
    formatDate(item.tanggalObj),
    formatRupiah(item.jumlah),
  ]);

  autoTable(doc, {
    head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
    body: tableData,
    startY: 20,
  });

  const start = startDate.value || 'awal';
  const end = endDate.value || 'akhir';
  const searchKeyword = search.value || 'semua_warga';
  doc.save(`iuran_${searchKeyword}_${start}_to_${end}.pdf`);
};
*/

const exportFilteredIuranByWargaToPdf = () => {
  const doc = new jsPDF();
  doc.text('Laporan Iuran Warga Berdasarkan Filter', 14, 16);

  const data = filteredIuran.value.filter(item => {
    const wargaNama = wargaList.value.find(w => w.id === item.wargaId)?.nama.toLowerCase() || '';
    return wargaNama.includes(search.value.toLowerCase());
  });

  const tableData = data.map((item, index) => [
    index + 1,
    wargaList.value.find(w => w.id === item.wargaId)?.nama || 'Tidak Diketahui',
    formatDate(item.tanggalObj),
    formatRupiah(item.jumlah),
  ]);


  // Hitung total iuran yang sudah difilter
  const totalIuran = data.reduce((sum, item) => sum + item.jumlah, 0);


  autoTable(doc, {
    head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
    body: tableData,
    startY: 20,
    foot: [
//  ['', `Total Iuran Bulan Ini: ${formatRupiah(totalIuran)}`]
  ['', `Total Iuran: ${formatDate(startDate.value)} s.d ${formatDate(endDate.value)}: ${formatRupiah(totalIuran)}`]
]
  });


 
// Buat teks footer di bawah tabel

const footerY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);

  /*
  doc.text(
    `Total Iuran (${formatDate(startDate.value)} s.d ${formatDate(endDate.value)}): ${formatRupiah(totalIuran)}`,
    14,
    footerY
  );
*/

// Set warna latar (misalnya abu-abu terang)
//doc.setFillColor(230, 230, 230); // RGB
//doc.rect(10, footerY - 5, 190, 10, 'F'); // X, Y, Width, Height, 'F' = fill


//doc.setTextColor(60, 60, 60); // warna teks abu tua
/*
doc.text(
  `Total Iuran (${formatDate(startDate.value)} s.d ${formatDate(endDate.value)}): ${formatRupiah(totalIuran)}`,
  14,
  footerY
);
*/

  // Buat nama file berdasarkan tanggal dan pencarian
  const start = startDate.value ? formatDate(startDate.value).replaceAll('/', '-') : 'awal';
  const end = endDate.value ? formatDate(endDate.value).replaceAll('/', '-') : 'akhir';
  const keyword = search.value?.toLowerCase().replaceAll(' ', '_') || 'semua_warga';

  doc.save(`iuran_${keyword}_${start}_to_${end}_total_${totalIuran}.pdf`);
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

// Pastikan fungsi formatRupiah juga tersedia jika digunakan untuk ekspor lain
// const formatRupiah = (amount) => { ... };


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
await fetchIuran();
});
</script>