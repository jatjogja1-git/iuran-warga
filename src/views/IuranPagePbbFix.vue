<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <div>
          Catat Iuran Harian
          <v-chip color="primary" class="ml-4">
            Total Terkumpul: {{ formatRupiah(totalIuranHeader) }}
          </v-chip>
        </div>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog('add')">Tambah Iuran</v-btn>
        <v-btn color="success" @click="exportToExcel('pembayaran')">Ekspor Excel</v-btn>
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
label="Cari iuran pbb warga..."
prepend-inner-icon="mdi-magnify"
clearable
/></v-col>


<v-alert type="info" class="mt-4">
  Total Iuran: {{ formatRupiah(totalIuranHeader) }}
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
            {{ item.tanggal?.toDate().toLocaleDateString('id-ID') }}
          </template>
                    
          <template v-slot:item.jumlah="{ item }">
            {{ formatRupiah(item.jumlah) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-icon small color="red" @click="deleteIuran(item.id)">
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
                      <v-card-text>
  <v-autocomplete
    v-model="newIuran.wargaId"
    :items="wargaList"
    item-title="nama"
    item-value="id"
    label="Pilih Warga"
    @update:model-value="onWargaSelected" 
  ></v-autocomplete>

  <v-alert v-if="selectedWarga" color="info" variant="tonal" class="mt-2">
    <div class="d-flex justify-space-between">
      <span>Total Tagihan:</span>
      <strong>{{ formatRupiah(selectedWarga.tagihanTotal) }}</strong>
    </div>
    <div class="d-flex justify-space-between text-success">
      <span>Sudah Dibayar:</span>
      <strong>{{ formatRupiah(totalSudahDibayar) }}</strong>
    </div>
    <v-divider class="my-2"></v-divider>
    <div class="d-flex justify-space-between" :class="sisaTagihan > 0 ? 'text-red' : 'text-success'">
      <span>Sisa Kewajiban:</span>
      <strong>{{ formatRupiah(sisaTagihan) }}</strong>
    </div>
  </v-alert>
</v-card-text>

                        <v-select
                        v-model="newIuran.tahun"
                        :items="daftarTahun"
                        label="Pilih Tahun Iuran"
                        required
                      ></v-select>       

                      <v-text-field
                        label="Jumlah Iuran (Rupiah)"
                        type="number"
                        v-model.number="newIuran.jumlah"
                        required
                      ></v-text-field>
                      
                      <v-card-text>
                    

                    </v-card-text>

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
import { ref, onMounted, computed, watch } from 'vue';
import { db, auth } from '../firebase/configfix';
import { collection, onSnapshot, getDocs, addDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
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

const iuranList = ref([]); // Variabel utama untuk v-data-table
const iuran = ref([]);
const pembayaran = ref([]);

//const wargaList = ref([]); // Untuk dropdown warga
const dialog = ref(false);
const tanggalMenu = ref(false);

const startDate = ref(new Date().toISOString().substring(0, 10)); // Format YYYY-MM-DD
const endDate = ref(new Date().toISOString().substring(0, 10));




const formatRupiah = (number) => {
  // Jika number adalah NaN, kembalikan 'Rp 0'
  if (isNaN(number) || !number) return "Rp 0";
  
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};


// data diambil via json
const fetchWargaList = async () => {
  try {
    const response = await fetch('/pbb_data.json');
    const result = await response.json();
    
    // DEBUG: Cek struktur JSON
    console.log("Struktur JSON:", result);
    
    // Sesuaikan [''] ini dengan struktur asli JSON Anda. 
    // Jika datanya langsung array, gunakan result saja.
    const data = Array.isArray(result) ? result : (result[""] || []);
    
    wargaList.value = data.map(item => {
      // DEBUG: Lihat isi field tiap item
      console.log("Memproses NOP:", item.NOP, "Nilai Tagihan:", item.PBB_YG_HARUS_DIBAYAR_SPPT);
      
      const rawTagihan = String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0);
      const numericTagihan = Number(rawTagihan.replace(/[^0-9]/g, ''));

      return {
        nama: `${item.NM_WP_SPPT} (${item.NOP})`,
        id: item.NOP,
        tagihanTotal: numericTagihan
      };
    });
    console.log("DEBUG: Data Warga List:", wargaList.value);
  } catch (err) {
    console.error("Gagal load JSON:", err);
  }
};

const selectedWarga = computed(() => {
  const warga = wargaList.value.find(w => w.id === newIuran.value.wargaId);
  console.log("DEBUG: Warga terpilih:", warga); // Lihat apakah ini undefined atau objek lengkap
  return warga;
});

const sisaTagihan = computed(() => {
  if (!selectedWarga.value) return 0;
  return Math.max(0, selectedWarga.value.tagihanTotal - totalSudahDibayar.value);
});

const onWargaSelected = (nop) => {
  fetchRiwayatWarga(nop); // Fungsi yang sudah kita buat sebelumnya
};

/*
//data diambil via firestore
const fetchWargaList = async () => {
  const querySnapshot = await getDocs(collection(db, "pembayaran"));
  wargaList.value = querySnapshot.docs.map(doc => ({
    nama: doc.data().namaWarga,
    id: doc.id // atau doc.data().NOP
  }));
};
*/

/*
const totalIuranHeader = computed(() => {
  // Menggunakan filteredIuran agar angka berubah saat user mengganti tanggal
  return filteredIuran.value.reduce((acc, item) => acc + Number(item.jumlah || 0), 0);
});
*/

const customFilter = (itemTitle, queryText, item) => {
  const nama = item.raw.nama.toLowerCase();
  const nop = item.raw.id.toLowerCase(); // 'id' di sini adalah NOP
  const searchText = queryText.toLowerCase();

  return nama.includes(searchText) || nop.includes(searchText);
};

// Membuat list tahun untuk v-select
const daftarTahun = computed(() => {
  const tahunSekarang = new Date().getFullYear();
  const list = [];
  for (let i = tahunSekarang - 5; i <= tahunSekarang; i++) {
    list.push(i);
  }
  return list;
});


// Tambahkan di bawah variabel ref lainnya
const totalIuranHeader = computed(() => {
  return filteredIuran.value.reduce((acc, item) => {
    return acc + Number(item.jumlah || 0);
  }, 0);
});


const riwayatWarga = ref([]);
const totalSudahDibayar = ref(0);

// Fungsi untuk mengecek riwayat pembayaran warga

/*
const fetchRiwayatWarga = async (NOP) => {
  if (!NOP) return;
  
  // Pastikan koleksi 'pembayaran' memiliki field 'NOP' (kapital)
  // Gunakan 'where' dengan NOP yang sudah di-trim() untuk keamanan
  const q = query(collection(db, "pembayaran"), where("NOP", "==", NOP.trim()));
  
  const querySnapshot = await getDocs(q);
  
  let total = 0;
  // Periksa apakah query menemukan data
  console.log("Jumlah dokumen ditemukan untuk NOP", NOP, ":", querySnapshot.size);
  
  riwayatWarga.value = querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Tambahkan log untuk melihat nilai field 'jumlah' di tiap dokumen
    console.log("Nilai jumlah:", data.jumlah);
    
    total += Number(data.jumlah || 0);
    return data;
  });
  
  totalSudahDibayar.value = total;
};
*/

// Pastikan kode di IuranPagePbb.vue Anda seperti ini:
/*
const fetchRiwayatWarga = async (nop) => {
  // 1. Reset nilai
  totalSudahDibayar.value = 0; 
  if (!nop) return;

  // 2. Query ke koleksi "pembayaran"
  const q = query(collection(db, "pembayaran"), where("NOP", "==", nop));
  const querySnapshot = await getDocs(q);

  // 3. Debug: Berapa jumlah dokumen yang ditemukan dengan NOP tersebut?
  console.log("DEBUG: Query NOP", nop, "menemukan", querySnapshot.size, "dokumen.");

  let total = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // 4. Debug: Apa isi field jumlah di dokumen ini?
    console.log("DEBUG: Nilai jumlah pada dokumen", doc.id, "adalah:", data.jumlah);
    total += Number(data.jumlah || 0);
  });
  
  totalSudahDibayar.value = total;
};
*/


 // --- Ambil Laporan Histori Berdasarkan Interval Tanggal ---
  // --- Perbaikan fetchLaporanHistori agar sinkron ---
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
    
    // Objek sementara untuk mengelompokkan
    const rekapMap = {};

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const nop = data.NOP || data.NOP; // Pastikan key NOP konsisten

// Cari data target tagihan dari wargaList
const infoWarga = wargaList.value.find(w => w.id === nop);

      if (!rekapMap[nop]) {
        rekapMap[nop] = {
          NOP: nop,
          namaWarga: data.namaWarga || 'Warga Tanpa Nama',
          tagihanTotal: infoWarga ? infoWarga.tagihanTotal : Tidak_Ada, // Default 15k jika tidak ketemu
          totalIuran: 0,
          histori: []
        };
      }
      
      rekapMap[nop].totalIuran += Number(data.jumlah || 0);
      rekapMap[nop].histori.push({
        id: doc.id,
        tanggal: data.tanggal,
        jumlah: data.jumlah,
        keterangan: data.keterangan || 'Iuran PBB'
      });
    });

    rekapHistori.value = Object.values(rekapMap);
  } catch (error) {
    showNotification("Gagal memuat data: " + error.message, "error");
  } finally {
    isLoading.value = false;
  }
};

//perubahan fetchRiwayatWarga sbb:
const fetchRiwayatWarga = async (nop) => {
  totalSudahDibayar.value = 0; // Reset
  if (!nop) return;

  const q = query(collection(db, "pembayaran"), where("NOP", "==", nop));
  const querySnapshot = await getDocs(q);

  let tempTotal = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Gunakan Number() untuk memastikan penjumlahan angka
    tempTotal += Number(data.jumlah || 0);
  });

  // UPDATE NILAI DI SINI
  totalSudahDibayar.value = tempTotal;
  console.log("Total Akhir yang dihitung:", totalSudahDibayar.value);
};

const fetchDebug = async () => {
  // Coba ambil semua data tanpa filter NOP
  const q = collection(db, "pembayaran"); 
  const querySnapshot = await getDocs(q);
  
  // Ambil 5 dokumen pertama untuk melihat isi field-nya
  querySnapshot.docs.slice(0, 5).forEach(doc => {
    console.log("Data NOP yang ada di DB:", doc.data().NOP);
  });
};



const filteredIuran = computed(() => {
  // Jika kedua tanggal kosong, tampilkan semua data
  if (!startDate.value && !endDate.value) return pembayaran.value;

  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  // Set waktu agar filter mencakup seluruh hari (00:00:00 s.d 23:59:59)
  end.setHours(23, 59, 59, 999);

  return pembayaran.value.filter(item => {
    const itemDate = new Date(item.tanggalObj).setHours(0, 0, 0, 0); // Normalisasi ke tengah malam
    const start = startDate.value ? new Date(startDate.value).setHours(0, 0, 0, 0) : null;
    const end = endDate.value ? new Date(endDate.value).setHours(0, 0, 0, 0) : null;
    

    if (start && end) return itemDate >= start && itemDate <= end;
    if (start) return itemDate >= start;
    if (end) return itemDate <= end;

    return true;
  });
});




const newIuran = ref({
wargaId: null,
jumlah: 0,
//tanggal: new Date().toISOString().substring(0, 10) // Format YYYY-MM-DD
tanggalObj: new Date(), // Inisialisasi dengan objek Date hari ini
tahun: new Date().getFullYear() // Default tahun sekarang
});

const totalIuran = computed(() => {
  return filteredIuran.value.reduce((acc, item) => acc + item.jumlah, 0);
});



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
{ title: 'NOP', key: 'NOP', searchable: true }, // <<< Tambahkan ini
{ title: 'Tahun Pajak', key: 'tahun', searchable: true }, // <<< Tambahkan ini
{ title: 'Nama Warga', key: 'namaWarga', searchable: true }, // <<< Tambahkan ini
{ title: 'Tanggal', key: 'tanggal', searchable: true },
{ title: 'Jumlah', key: 'jumlah', searchable: true },
{ title: 'Aksi', key: 'actions', sortable: false, searchable: false }
];




// Modifikasi fetchIuran untuk menangani Timestamp
// This part is good
const fetchIuran = async () => {
    const iuranCollection = collection(db, 'pembayaran');
    const q = query(iuranCollection, orderBy('tanggal', 'desc'));
    const querySnapshot = await getDocs(q);
    const fetchedIuran = [];
    for (const docIuran of querySnapshot.docs) {
        const dataIuran = docIuran.data();
        const wargaData = wargaList.value.find(w => w.id === dataIuran.NOP);
        fetchedIuran.push({
            id: docIuran.id,
            ...dataIuran,
            tanggal: dataIuran.tanggal, // This remains the Firestore Timestamp
            tanggalObj: dataIuran.tanggal ? dataIuran.tanggal.toDate() : null, // This is the JS Date object
            namaWarga: wargaData ? wargaData.nama : 'Warga Tidak Ditemukan'
        });
    }
    pembayaran.value = fetchedIuran;
};

// Modifikasi openDialog untuk menginisialisasi tanggalObj

const dialogMode = ref('add'); // Tambahkan ini

const openDialog = (mode, item = null) => {
    dialog.value = true;
    dialogMode.value = mode;

    if (mode === 'add') {
        // 'item' di sini adalah data warga dari pbb_data.json
        newIuran.value = {
            wargaId: item ? item.NOP : null, // Mengambil NOP sebagai ID warga
            namaWarga: item ? item.NM_WP_SPPT : '', // Mengambil nama warga
            jumlah: 0,
            tanggalObj: new Date()
        };
    } else {
        // Mode edit (untuk transaksi yang sudah ada di Firebase)
        newIuran.value = {
            id: item.id,
            wargaId: item.NOP,
            namaWarga: item.namaWarga,
            jumlah: item.jumlah,
            tanggalObj: item.tanggal ? item.tanggal.toDate() : new Date()
        };
    }
};

const closeDialog = () => {
dialog.value = false;
};


const deleteIuran = async (id) => {
  // 1. Konfirmasi kepada pengguna sebelum menghapus
  if (!confirm("Apakah Anda yakin ingin menghapus data pembayaran ini?")) {
    return;
  }

  try {
    // 2. Tentukan referensi dokumen berdasarkan ID
    const iuranDocRef = doc(db, "pembayaran", id);
    
    // 3. Hapus dokumen dari Firestore
    await deleteDoc(iuranDocRef);
    
    // 4. Beri feedback
    alert("Data berhasil dihapus!");
  } catch (error) {
    console.error("Gagal menghapus data: ", error);
    alert("Terjadi kesalahan saat menghapus data.");
  }
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

/*
const formatRupiah = (amount) => {
return new Intl.NumberFormat('id-ID', {
style: 'currency',
currency: 'IDR',
minimumFractionDigits: 0
}).format(amount);
};
*/



// --- Fungsi Ekspor --- sdh jalan ok
const exportToExcel = (dataType) => {
  let dataToExport = [];
  let fileName = '';

  if (dataType === 'pembayaran') {
    dataToExport = pembayaran.value.map(item => {
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
    fileName = 'data_pembayaran.xlsx';
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

  if (dataType === 'pembayaran') {
    title = 'Data Iuran';
    fileName = 'data_pembayaran_warga.pdf';
    // Hanya ambil header yang relevan (tanpa 'Aksi') dan petakan ke judul
    headersPdf = headers.filter(h => h.key !== 'actions').map(h => h.title);

    // --- PERBAIKAN PENTING DI SINI ---
    dataPdf = pembayaran.value.map(item => {
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

  

autoTable(doc, {
  head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
  startY: 20,
  body: pembayaran.value.map((item, index) => [
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

// Di dalam onMounted, pastikan wargaList diisi seperti ini:
const wargaList = ref([]);

onMounted(async () => {
  const response = await fetch('/pbb_data.json');
  const result = await response.json();
  const data = result[""] || [];
  
  // Mapping data dari JSON ke format yang dimengerti v-autocomplete
  wargaList.value = data.map(item => ({
   // nama: item.NM_WP_SPPT,
   nama: `${item.NM_WP_SPPT} (${item.NOP})`,
    id: item.NOP, // Kita gunakan NOP sebagai ID unik
  // TAMBAHKAN BARIS INI:
  tagihanTotal: Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''))
  }));
});

onMounted(() => {
  // Gunakan onSnapshot agar tabel otomatis terupdate jika ada data baru di Firebase
  const q = query(collection(db, "pembayaran"), orderBy("tanggal", "desc"));
  
  onSnapshot(q, (snapshot) => {
    iuranList.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
});


const debugData = async () => {
    const querySnapshot = await getDocs(collection(db, "pembayaran"));
    querySnapshot.docs.forEach((doc) => {
        const d = doc.data();
        // Cek apakah ada field NOP di setiap dokumen
        if (!d.NOP) {
            console.warn("Dokumen ini tidak punya field NOP:", doc.id);
        }
    });
};

const saveIuran = async () => {
  // Tambahkan data tambahan (seperti nama) agar nanti mudah ditampilkan di tabel
  const wargaTerpilih = wargaList.value.find(w => w.id === newIuran.value.wargaId);
  // Ambil tahun dari tanggal yang dipilih
  const tanggalObj = new Date(newIuran.value.tanggalObj);
    const tahun = tanggalObj.getFullYear(); // Mendapatkan tahun (contoh: 2026)

  const payload = {
    NOP: newIuran.value.wargaId,
    namaWarga: wargaTerpilih.nama,
    jumlah: Number(newIuran.value.jumlah), // Pastikan Number
    tanggal: new Date(newIuran.value.tanggalObj), // Pastikan Date object
//    tahun: tahun, // <-- Tambahkan field ini
    tahun: Number(newIuran.value.tahun), // Mengambil dari input manual
    bulan: new Date(newIuran.value.tanggalObj).getMonth() + 1
 //   bulan: tanggalObj.getMonth() + 1 // Opsional: Tambahkan bulan (1-12)
};


  try {
        // Pastikan Anda menunggu proses ini selesai
        const docRef = await addDoc(collection(db, "pembayaran"), payload);
        console.log("Data berhasil masuk dengan ID: ", docRef.id);
        alert("Data iuran tahun " + tahun + " berhasil disimpan!");

        // 3. TUTUP DIALOG DI SINI
        dialog.value = false;

        // 4. Reset form agar bersih untuk input selanjutnya
        resetForm();

    } catch (e) {
        console.error("Error saat menyimpan: ", e); // <--- CEK CONSOLE INI
    }
  // Kirim ke Firebase...
  // await addDoc(collection(db, "pembayaran"), payload);
};

// Fungsi pembantu untuk membersihkan form
const resetForm = () => {
  newIuran.value = {
    wargaId: null,
    jumlah: 0,
    tanggalObj: new Date(),
    tahun: new Date().getFullYear()
  }
  };

  /*
  watch(() => newIuran.value.wargaId, (newVal) => {
    if (newVal) {
      console.log("Warga terpilih, mengambil data riwayat...");
      fetchRiwayatWarga(newVal); // Memanggil fungsi untuk ambil data dari Firestore
    } else {
      totalSudahDibayar.value = 0; // Reset jika pilihan dihapus
    }
  });
*/
</script>