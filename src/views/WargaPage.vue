<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        Daftar Warga
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog('add')" class="mr-2">Tambah Warga</v-btn>
        <v-btn color="success" @click="exportToExcel('warga')">Ekspor Excel</v-btn>
        <v-btn color="red" @click="exportToPdf('warga')" class="ml-2">Ekspor PDF</v-btn>
      </v-card-title>
      <v-card-text>


<v-col cols="12" md="4">
<v-text-field
v-model="search"
label="Cari warga..."
prepend-inner-icon="mdi-magnify"
clearable
/></v-col>

        <v-data-table
          :headers="headers"
          :items="warga"
          :search="search"
          item-key="id"
          class="elevation-1"
        >
        <template v-slot:item.nomor="{ item }">
         {{ item.nomor }}
        </template>
          <template v-slot:item.actions="{ item }">
            <v-icon small class="mr-2" @click="openDialog('edit', item)">
              mdi-pencil
            </v-icon>
            <v-icon small @click="deleteWarga(item.id)">
              mdi-delete
            </v-icon>
          </template>
          <template v-slot:item.status="{ item }">
    <v-chip :color="item.status === 'Aktif' ? 'green' : 'red'" dark>
      {{ item.status }}
    </v-chip>
  </template>

        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ formTitle }} Warga</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-text-field v-model="editedWarga.nama" label="Nama Warga"></v-text-field>
            <v-text-field v-model="editedWarga.alamat" label="Alamat"></v-text-field>
            <v-text-field v-model="editedWarga.noRumah" label="Nomor Rumah"></v-text-field>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeDialog">Batal</v-btn>
          <v-btn color="blue darken-1" text @click="saveWarga">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { db, auth } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
//import { useRouter } from 'vue-router';
//import { signOut } from 'firebase/auth';

// Import library ekspor
import * as XLSX from 'xlsx'; // Untuk Excel
import jsPDF from 'jspdf'; // Untuk PDF
import 'jspdf-autotable'; // Untuk tabel di PDF
import autoTable from 'jspdf-autotable';
// --- IMPOR UNTUK PDF EXPORT ---
import { getPdfDoc } from '../plugins/pdf'; // <<< IMPOR FUNGSI PEMBUAT DOC PDF



console.log("DB instance in WargaPage.vue at script setup load:", db); // Tambahkan ini


//const drawer = ref(false);
//const router = useRouter();

// Variabel pencarian
const search = ref(''); // <<< Pastikan ini dideklarasikan

const warga = ref([]);
const dialog = ref(false);
const dialogMode = ref('add'); // 'add' or 'edit'
const editedWarga = ref({
id: null,
nama: '',
alamat: '',
noRumah: ''
});
// src/views/WargaPage.vue
const defaultWarga = {
// Tidak ada properti 'id' di sini
nama: '',
alamat: '',
noRumah: ''
};

/*
const headers = [
{ title: 'Nama Warga', key: 'nama' },
{ title: 'Alamat', key: 'alamat' },
{ title: 'Nomor Rumah', key: 'noRumah' },
{ title: 'Aksi', key: 'actions', sortable: false }
];
*/

// --- Headers untuk v-data-table ---
const headers = [
{ title: 'No', key: 'nomor', sortable: false },
{ title: 'Nama Warga', key: 'nama', searchable: true }, // <<< Tambahkan ini
{ title: 'Alamat', key: 'alamat', searchable: true },   // <<< Tambahkan ini
{ title: 'Nomor Rumah', key: 'noRumah', searchable: true }, // <<< Tambahkan ini
{ title: 'Aksi', key: 'actions', sortable: false, searchable: false } // <<< Aksi tidak perlu dicari
];


const formTitle = computed(() => (dialogMode.value === 'add' ? 'Tambah' : 'Edit'));

/*
// src/views/WargaPage.vue - dalam fungsi fetchWarga
const fetchWarga = async () => {
const querySnapshot = await getDocs(collection(db, 'warga'));
warga.value = querySnapshot.docs.map(doc => ({
// PASTIKAN BARIS INI BENAR DAN TIDAK DIUBAH:
id: doc.id, // Ini adalah properti krusial yang harus ada
...doc.data()
}));
};
*/

const fetchWarga = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'warga'));
    const fetchedWarga = [];
    let counter = 1; // Inisialisasi counter

    querySnapshot.docs.forEach(doc => {
      fetchedWarga.push({
        id: doc.id,
        ...doc.data(),
        nomor: counter++ // Tambahkan nomor urut
      });
    });
    warga.value = fetchedWarga;
    console.log('Data Warga dengan nomor urut:', warga.value); // Untuk debugging
  } catch (error) {
    console.error('Error fetching warga:', error);
  }
};

// src/views/WargaPage.vue - dalam fungsi openDialog
const openDialog = (mode, item = {}) => {
dialogMode.value = mode;
if (mode === 'add') {
editedWarga.value = { ...defaultWarga };
} else {
// Lakukan deep copy untuk memastikan semua properti disalin dengan benar
// Termasuk 'id' dari dokumen Firestore
editedWarga.value = JSON.parse(JSON.stringify(item));
}
dialog.value = true;
};


const closeDialog = () => {
dialog.value = false;
editedWarga.value = { ...defaultWarga };
};



/*
// src/views/WargaPage.vue - dalam fungsi saveWarga
const saveWarga = async () => {
if (dialogMode.value === 'edit') {
// Tambahkan log atau validasi ini
console.log("Saving in edit mode. editedWarga.value:", editedWarga.value);
if (!editedWarga.value.id) {
  console.error("Error: ID Warga tidak ditemukan untuk operasi edit!");
  alert("Terjadi kesalahan: ID warga tidak dapat ditemukan untuk diedit. Harap coba lagi.");
  return; // Hentikan eksekusi jika ID tidak ada
}

const wargaRef = doc(db, 'warga', editedWarga.value.id);
await updateDoc(wargaRef, editedWarga.value);
} else { // 'add' mode
await addDoc(collection(db, 'warga'), editedWarga.value);
}
closeDialog();
await fetchWarga(); // Refresh data
};
*/

// src/views/WargaPage.vue - dalam fungsi saveWarga
const saveWarga = async () => {
if (dialogMode.value === 'add') {
console.log("Attempting to add warga. DB object:", db); // Tambahkan ini
// editedWarga.value hanya berisi nama, alamat, noRumah
await addDoc(collection(db, 'warga'), editedWarga.value);
} else {
console.log("Saving changes for warga with ID:", editedWarga.value.id);
console.log("Updated data:", editedWarga.value);

if (!editedWarga.value.id) {
  console.error("Error: ID warga tidak ditemukan untuk disimpan.");
  alert("Gagal menyimpan: ID warga tidak valid.");
  return; // Hentikan eksekusi jika ID tidak ada
}

try {
  // Pastikan editedWarga.value.id digunakan sebagai argumen ketiga
  const wargaRef = doc(db, 'warga', editedWarga.value.id);
  // Pastikan Anda mengirim objek data yang benar untuk diupdate
  await updateDoc(wargaRef, editedWarga.value);
  console.log("Warga berhasil diperbarui!");
} catch (error) {
  console.error("Gagal memperbarui warga:", error.message);
  alert("Gagal menyimpan perubahan: " + error.message);
}

// ... (kode untuk edit)
//    await addDoc(collection(db, 'warga'), editedWarga.value);
}
closeDialog();
await fetchWarga(); // Refresh data
};


const deleteWarga = async (id) => {
if (confirm('Apakah Anda yakin ingin menghapus warga ini?')) {
await deleteDoc(doc(db, 'warga', id));
//await deleteDoc(doc(db, 'warga'));
await fetchWarga(); // Refresh data
}
};



const logout = async () => {
try {
await signOut(auth);
router.push('/');
} catch (error) {
console.error('Error logging out:', error.message);
}
};

/*
onMounted(() => {
console.log("Firestore DB object:", db); // Tambahkan baris ini
fetchWarga();
});
*/

// --- Fungsi Ekspor ---
const exportToExcel = (dataType) => {
let dataToExport = [];
let fileName = '';

if (dataType === 'warga') {
dataToExport = warga.value.map(({ id, ...rest }) => rest); // Hapus properti 'id'
fileName = 'data_warga.xlsx';
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


/*
const exportToPdf = (dataType) => {
const doc = new jsPDF();
console.log("jsPDF instance:", doc); // LIHAT APAKAH INI OBJEK jsPDF YANG VALID
console.log("doc.autoTable property:", doc.autoTable); // <<< INI YANG PALING PENTING!

let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

if (dataType === 'warga') {
title = 'Data Warga';
fileName = 'data_warga.pdf';
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title); // Ambil hanya judul header yang relevan
dataPdf = warga.value.map(item =>
  headers.filter(h => h.key !== 'actions').map(h => item[h.key]) // Ambil nilai sesuai header
);
}
// Tambahkan kondisi untuk dataType lain jika Anda membuat fungsi ini generik
// else if (dataType === 'iuran') { ... }

if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

doc.text(title, 14, 16); // Judul dokumen
doc.autoTable({
head: [headersPdf],
body: dataPdf,
startY: 20
});
doc.save(fileName);
};
// --- Akhir Fungsi Ekspor ---
*/


/*
// --- Fungsi Ekspor ---
const exportToPdf = (dataType) => {
const doc = new jsPDF();

// Ini adalah bagian KRUSIAL: Memastikan jspdf-autotable terpasang
// Cara paling aman adalah memanggil fungsi autoTable secara langsung
// yang seharusnya terdaftar ke jsPDF.
// Untuk memastikan, kita bisa import sekali lagi, atau pastikan plugin terdaftar
// Coba tambahkan ini:

//if (typeof doc.autoTable === 'undefined') {

// Ini menunjukkan plugin belum terpasang.
// Biasanya ini sudah otomatis kalau import 'jspdf-autotable' ada.
// Namun, jika masih error, kita bisa coba panggil fungsi registrasinya lagi.
// Pada jspdf-autotable versi terbaru (>=3.x), ini seharusnya tidak diperlukan
// karena import 'jspdf-autotable' sudah otomatis.

// ************* PENTING: Jika langkah di atas (menghapus import 'jspdf-autotable') TIDAK bekerja,
// ************* kembalikan import 'jspdf-autotable' dan coba paksa init-nya lagi
// ************* ATAU pastikan jsPDF adalah objek global saat autotable dimuat.
// console.error("Warning: jspdf-autotable is not attached. This might indicate an import order or bundler issue.");
// alert("Terjadi masalah saat menyiapkan ekspor PDF. Coba refresh halaman.");
// return;

//}

/*
doc.autoTable({ // Baris ini seharusnya sekarang bisa diakses
head: [headersPdf],
body: dataPdf,
startY: 20
});
doc.save(fileName);
//};


let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

// ... (kode Anda untuk menentukan headersPdf, dataPdf, title, fileName berdasarkan dataType) ...
if (dataType === 'warga') {
title = 'Data Warga';
fileName = 'data_warga.pdf';
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);
dataPdf = warga.value.map(item =>
  headers.filter(h => h.key !== 'actions').map(h => item[h.key])
);
}

if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

doc.text(title, 14, 16);
// Panggil autoTable
doc.autoTable({ // <<< Baris ini yang memicu error
head: [headersPdf],
body: dataPdf,
startY: 20
});
doc.save(fileName);
};
// --- Akhir Fungsi Ekspor ---
*/


// src/views/WargaPage.vue (atau IuranPage.vue, RekapPage.vue - bagian fungsi exportToPdf)

/*
const exportToPdf = (dataType) => {
//  const doc = new jsPDF();
// const doc = getPdfDoc(); // <<< GUNAKAN FUNGSI INI UNTUK MEMBUAT DOC PDF
const doc = new jsPDF();
let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

if (dataType === 'warga') {
title = 'Data Warga';
fileName = 'data_warga.pdf';
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);
dataPdf = warga.value.map(item =>
  headers.filter(h => h.key !== 'actions').map(h => item[h.key])
);
} else if (dataType === 'iuran') { // Pastikan ini ada jika Anda memanggil dari IuranPage
title = 'Data Iuran Harian';
fileName = 'data_iuran_harian.pdf';
headersPdf = ['Nama Warga', 'Tanggal', 'Jumlah'];
dataPdf = iuran.value.map(item => [
  item.namaWarga,
  formatDate(item.tanggal),
  formatRupiah(item.jumlah)
]);
} else if (dataType === 'rekap') { // Pastikan ini ada jika Anda memanggil dari RekapPage
title = `Rekap Iuran Bulanan (${months.find(m => m.value === selectedMonth.value)?.text} ${selectedYear.value})`;
fileName = `rekap_iuran_${months.find(m => m.value === selectedMonth.value)?.text}_${selectedYear.value}.pdf`;
headersPdf = ['Nama Warga', 'Total Iuran'];
dataPdf = rekapData.value.map(item => [
  item.namaWarga,
  formatRupiah(item.totalIuran)
]);
} else {
// KONDISI DEFAULT JIKA dataType TIDAK DIKENAL
console.error("Unknown dataType for PDF export:", dataType);
alert("Tipe data tidak dikenal untuk ekspor PDF.");
return; // Hentikan fungsi jika dataType tidak valid
}

// Baris-baris ini akan dieksekusi HANYA JIKA salah satu kondisi di atas terpenuhi
if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

doc.text(title, 14, 16);
doc.autoTable({
head: [headersPdf],
body: dataPdf,
startY: 20
// Tambahkan footer untuk rekap jika diperlukan
// foot: dataType === 'rekap' ? [['', `Total Iuran Bulan Ini: ${formatRupiah(totalIuranBulanan.value)}`]] : []
});
doc.save(fileName);
};
*/


/*========contoh berhasil ke pdf======
const exportToPdf = (dataType) => {
//  const doc = new jsPDF();
// const doc = getPdfDoc(); // <<< GUNAKAN FUNGSI INI UNTUK MEMBUAT DOC PDF
const doc = new jsPDF();
autoTable(doc, {
head: [['Nama', 'Alamat']],
body: [['Budi', 'Magelang'], ['Siti', 'Yogyakarta']]
});
doc.save('data.pdf');
};
*/

// --- Fungsi Ekspor PDF (Menggunakan getPdfDoc) ---
const exportToPdf = (dataType) => {
const doc = new jsPDF();
let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

if (dataType === 'warga') {
title = 'Data Warga';
fileName = 'data_warga.pdf';
// Hanya ambil header yang relevan (tanpa 'Aksi') dan petakan ke judul
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);
// Petakan data sesuai urutan header yang diekspor
dataPdf = warga.value.map(item =>
  headers.filter(h => h.key !== 'actions').map(h => item[h.key])
);
} else {
alert("Tipe data tidak dikenal untuk ekspor PDF.");
return;
}

if (dataPdf.length === 0) {
alert("Tidak ada data untuk diekspor.");
return;
}

doc.text(title, 14, 16); // Judul dokumen

autoTable(doc, {
head: [headersPdf],
body: dataPdf,
startY: 20
});

doc.save(fileName);
};
// --- Akhir Fungsi Ekspor ---

onMounted(async () => {
console.log("DB instance in WargaPage.vue inside onMounted:", db); // Tambahkan ini juga
await fetchWarga();
});

</script>

<style scoped>
/* Tambahkan atau sesuaikan gaya jika diperlukan */
.mb-4 {
margin-bottom: 16px;
}
</style>