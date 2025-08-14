<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        Daftar Warga
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog('add')" class="mr-2">Tambah Warga</v-btn>
        <v-btn color="success" @click="exportToExcel('wargart')">Ekspor Excel</v-btn>
        <v-btn color="red" @click="exportToPdf('wargart')" class="ml-2">Ekspor PDF</v-btn>
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
          :items="wargart"
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
// Menggunakan FieldValue.serverTimestamp() dari Firestore
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, FieldValue, query, orderBy, serverTimestamp } from 'firebase/firestore';
//serverTimestamp // <-- Impor serverTimestamp secara langsung
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

const wargart = ref([]);
const dialog = ref(false);
const dialogMode = ref('add'); // 'add' or 'edit'
const editedWarga = ref({
id: null,
nama: '',
alamat: '',
noRumah: '',
nomor: null,
});
// src/views/WargaPage.vue
const defaultWarga = {
// Tidak ada properti 'id' di sini
nama: '',
alamat: '',
noRumah: ''
};


// --- Headers untuk v-data-table ---
const headers = [
{ title: 'No', key: 'nomor', sortable: false },
{ title: 'Nama Warga', key: 'nama', searchable: true }, // <<< Tambahkan ini
{ title: 'Alamat', key: 'alamat', searchable: true },   // <<< Tambahkan ini
{ title: 'Nomor Rumah', key: 'noRumah', searchable: true }, // <<< Tambahkan ini
{ title: 'Aksi', key: 'actions', sortable: false, searchable: false } // <<< Aksi tidak perlu dicari
];

const formTitle = computed(() => (dialogMode.value === 'add' ? 'Tambah' : 'Edit'));


//modifikasi fetchwarga
//import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const fetchWarga = async () => {
  console.log("DB instance inside fetchWarga:", db); // Tambahkan ini
  try {
    // Buat kueri dengan pengurutan berdasarkan 'createdAt' secara ascending
    const q = query(collection(db, 'wargart'), orderBy('createdAt', 'asc'));

    const querySnapshot = await getDocs(q);
    const fetchedWarga = [];
    let counter = 1;

    querySnapshot.docs.forEach(doc => {
      fetchedWarga.push({
        id: doc.id,
        ...doc.data(),
        nomor: counter++
      });
    });
    wargart.value = fetchedWarga;
    console.log('Data yang dimuat ke wargart:', wargart.value); // Tambahkan ini
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


//ini modifikasi
const saveWarga = async () => {
  try {
    // 1. Get the current length of the wargart array
    const nextNoRumah = wargart.value.length + 1;

    // 2. Create the new data object
    const newWarga = {
      nama: editedWarga.value.nama,
      alamat: editedWarga.value.alamat,
      noRumah: nextNoRumah.toString(),
      // Tambahkan properti timestamp
      //createdAt: FieldValue.serverTimestamp()
      // Gunakan serverTimestamp() sebagai fungsi
      createdAt: serverTimestamp() 
    };

    // 3. Save to Firestore
    const docRef = await addDoc(collection(db, 'wargart'), newWarga);

    // 4. Update the Firestore document with its own ID (optional but recommended)
    await updateDoc(docRef, { id: docRef.id });

    // 5. Update the local data array
    wargart.value.push({
      id: docRef.id,
      ...newWarga,
      nomor: nextNoRumah // Ensure 'nomor' is also set correctly
    });

    console.log("Warga berhasil ditambahkan:", newWarga);
    closeDialog();
    // No need to call fetchWarga() here if you update the local array
  } catch (error) {
    console.error("Gagal menambahkan warga:", error.message);
    alert("Terjadi kesalahan saat menyimpan data.");
  }
};

const deleteWarga = async (id) => {
if (confirm('Apakah Anda yakin ingin menghapus warga ini?')) {
await deleteDoc(doc(db, 'wargart', id));
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


//perbaikan 
// --- Fungsi Ekspor ---
const exportToExcel = (dataType) => {
  let dataToExport = [];
  let fileName = '';

  if (dataType === 'wargart') {
    // Tentukan kolom-kolom yang ingin Anda ekspor secara spesifik
    const selectedKeys = ['nomor', 'nama', 'alamat'];

    // Map data wargart.value untuk hanya mengambil properti yang dipilih
    dataToExport = wargart.value.map(item => {
      const selectedData = {};
      selectedKeys.forEach(key => {
        // Gunakan title dari headers sebagai kunci baru untuk header Excel
        const headerTitle = headers.find(h => h.key === key)?.title;
        if (headerTitle) {
          selectedData[headerTitle] = item[key];
        }
      });
      return selectedData;
    });

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
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Warga"); // Ganti nama sheet
  XLSX.writeFile(wb, fileName);
};


// --- Fungsi Ekspor PDF ---
const exportToPdf = (dataType) => {
  const doc = new jsPDF();
  let headersPdf = [];
  let dataPdf = [];
  let title = '';
  let fileName = '';

  if (dataType === 'wargart') {
    title = 'Data Warga';
    fileName = 'data_warga.pdf';
    
    // Tentukan kolom yang ingin Anda ekspor
    const selectedKeys = ['nomor', 'nama', 'alamat'];
    
    // Ambil judul (title) dari headers yang sesuai dengan selectedKeys
    headersPdf = headers
      .filter(h => selectedKeys.includes(h.key))
      .map(h => h.title);
      
    // Petakan data dari wargart.value untuk hanya mengambil data dari key yang dipilih
    dataPdf = wargart.value.map(item =>
      selectedKeys.map(key => item[key])
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