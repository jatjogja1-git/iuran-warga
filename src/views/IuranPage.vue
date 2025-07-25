<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        Catat Iuran Harian
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog('add')">Tambah Iuran</v-btn>
        <v-btn color="success" @click="exportToExcel('iuran')">Ekspor Excel</v-btn>
        <v-btn color="red" @click="exportToPdf('iuran')" class="ml-2">Ekspor PDF</v-btn>
      </v-card-title>
      <v-card-text>

<v-col cols="12" md="4">
<v-text-field
v-model="search"
label="Cari iuran warga..."
prepend-inner-icon="mdi-magnify"
clearable
/></v-col>

        <v-data-table
          :headers="headers"
          :items="iuran"
          :search="search"
          item-key="id"
          class="elevation-1"
          
        >
          <template v-slot:item.tanggal="{ item }">
            {{ formatDate(item.tanggal) }}
           <!--{{ formattedDate(item.tanggal) }}-->
            
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
                  v-model="newIuran.tanggal"
                  label="Tanggal Iuran"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="props"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="newIuran.tanggal"
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


//const drawer = ref(false);
//const router = useRouter();
const iuran = ref([]);
const wargaList = ref([]); // Untuk dropdown warga
const dialog = ref(false);
const tanggalMenu = ref(false);

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
tanggal: new Date().toISOString().substring(0, 10) // Format YYYY-MM-DD
});

// --- Headers untuk v-data-table ---
const headers = [
{ title: 'Nama Warga', key: 'namaWarga', searchable: true }, // <<< Tambahkan ini
{ title: 'Tanggal', key: 'tanggal', searchable: true },
{ title: 'Jumlah', key: 'jumlah', searchable: true },
{ title: 'Aksi', key: 'actions', sortable: false, searchable: false }
];

const fetchWargaList = async () => {
const querySnapshot = await getDocs(collection(db, 'warga'));
wargaList.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const fetchIuran = async () => {
const iuranCollection = collection(db, 'iuran');
const q = query(iuranCollection, orderBy('tanggal', 'desc')); // Urutkan berdasarkan tanggal terbaru
const querySnapshot = await getDocs(q);
const fetchedIuran = [];
for (const docIuran of querySnapshot.docs) {
const dataIuran = docIuran.data();
const wargaData = wargaList.value.find(w => w.id === dataIuran.wargaId);
fetchedIuran.push({
  id: docIuran.id,
  ...dataIuran,
  namaWarga: wargaData ? wargaData.nama : 'Warga Tidak Ditemukan'
});
}
iuran.value = fetchedIuran;
};

const openDialog = () => {
dialog.value = true;
newIuran.value = {
wargaId: null,
jumlah: 0,
tanggal: new Date().toISOString().substring(0, 10)
};
};

const closeDialog = () => {
dialog.value = false;
};

const saveIuran = async () => {
await addDoc(collection(db, 'iuran'), {
wargaId: newIuran.value.wargaId,
jumlah: newIuran.value.jumlah,
tanggal: newIuran.value.tanggal
});
closeDialog();
await fetchIuran();
};

const deleteIuran = async (id) => {
if (confirm('Apakah Anda yakin ingin menghapus iuran ini?')) {
await deleteDoc(doc(db, 'iuran', id));
await fetchIuran();
}
};

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

// --- Fungsi Ekspor PDF (Menggunakan getPdfDoc) ---
const exportToPdf = (dataType) => {
const doc = new jsPDF();
let headersPdf = [];
let dataPdf = [];
let title = '';
let fileName = '';

if (dataType === 'iuran') {
title = 'Data Iuran';
fileName = 'data_iuran.pdf';
// Hanya ambil header yang relevan (tanpa 'Aksi') dan petakan ke judul
headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);
// Petakan data sesuai urutan header yang diekspor
dataPdf = iuran.value.map(item =>
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