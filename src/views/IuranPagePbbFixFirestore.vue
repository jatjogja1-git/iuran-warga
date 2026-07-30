<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <div>
          Catat Angsuran PBB
          <v-chip color="primary" class="ml-4">
            Total Terkumpul: {{ formatRupiah(totalIuranHeader) }}
          </v-chip>
        </div>


<v-card-text>
  <!-- Tombol Upload JSON Master PBB -->
  <v-row class="mb-4">
    <v-col cols="12" md="6">
      <v-file-input
        v-model="jsonFile"
        label="Upload File JSON Master PBB"
        accept="application/json, .json"
        truncate-length="30"
        density="compact"
        variant="outlined"
        hide-details
      ></v-file-input>
    </v-col>
    <v-col cols="12" md="6">
      <v-btn color="purple" dark @click="uploadJsonToFirestore" :loading="isUploading">
        <v-icon left>mdi-cloud-upload</v-icon> Unggah ke Firestore
      </v-btn>
    </v-col>
  </v-row>
  <v-divider class="mb-4"></v-divider>
  <!-- ... komponen lainnya (Filter Kapanewon, dll) ... -->
</v-card-text>


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

<v-row class="px-4 pt-2">
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
      @update:model-value="onFilterChange"
    ></v-select>
  </v-col>
  <v-col cols="12" md="4">
    <v-select
      v-model="selectedTahun"
      :items="daftarTahun"
      label="Pilih Tahun"
      @update:model-value="onFilterChange"
    ></v-select>
  </v-col>
</v-row>


<v-card-text>
  <v-container>
    <v-autocomplete
      v-model="newIuran.wargaId"
      :items="wargaList"
      item-title="nama"
      item-value="id"
      label="Pilih Warga"
      :disabled="!selectedKelurahan"
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

    <v-text-field
      label="Jumlah Iuran (Rupiah)"
      type="number"
      v-model.number="newIuran.jumlah"
      required
      class="mt-4"
    ></v-text-field>

    <v-menu
      v-model="tanggalMenu"
      :close-on-content-click="false"
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
import { db, auth } from '@/firebase/config';
import { collection, onSnapshot, getDocs, addDoc, deleteDoc, doc, query, orderBy, where, writeBatch } from 'firebase/firestore';
// Import library ekspor
import * as XLSX from 'xlsx'; 
import jsPDF from 'jspdf'; 
import 'jspdf-autotable'; 
import autoTable from 'jspdf-autotable';

const jsonFile = ref(null);
const isUploading = ref(false);

// Variabel pencarian
const search = ref('');
const page = ref(1);

const pembayaran = ref([]);
const dialog = ref(false);
const tanggalMenu = ref(false);

const startDate = ref(new Date().toISOString().substring(0, 10));
const endDate = ref(new Date().toISOString().substring(0, 10));

// State Filter Master & Warga dari Firestore
const rawJsonData = ref([]); // Menyimpan seluruh data master dari koleksi 'pbb_master'
const kecamatanList = ref([]);
const kelurahanList = ref([]);
const wargaList = ref([]);

const selectedKecamatan = ref(null);
const selectedKelurahan = ref(null);
const selectedTahun = ref(new Date().getFullYear());



const uploadJsonToFirestore = async () => {
  if (!jsonFile.value || jsonFile.value.length === 0) {
    alert("Silakan pilih file JSON terlebih dahulu!");
    return;
  }

  const file = Array.isArray(jsonFile.value) ? jsonFile.value[0] : jsonFile.value;

  // 1. Validasi ekstensi file secara ketat
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    alert("Hanya file berformat .json yang diizinkan!");
    jsonFile.value = null;
    return;
  }

  // 2. Validasi ukuran file (misal maksimal 5MB agar browser tidak "hang")
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    alert("Ukuran file terlalu besar! Maksimal 5MB.");
    jsonFile.value = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      isUploading.value = true;
      const content = e.target.result;
      
      let jsonData;
      try {
        // 3. Validasi apakah isi file benar-benar JSON yang valid
        jsonData = JSON.parse(content);
      } catch (parseError) {
        alert("File bukan format JSON yang valid!");
        isUploading.value = false;
        return;
      }

      if (!Array.isArray(jsonData)) {
        alert("Struktur data di dalam JSON harus berupa Array ([...])!");
        isUploading.value = false;
        return;
      }

      // 4. Validasi sampel data di dalam array (Opsional tapi aman)
      // Memastikan setidaknya objek pertama memiliki field wajib seperti 'NOP'
      if (jsonData.length > 0 && !jsonData[0].NOP) {
        alert("Format data di dalam JSON tidak sesuai (tidak ditemukan properti NOP).");
        isUploading.value = false;
        return;
      }

      console.log(`Memulai upload ${jsonData.length} data ke cloud...`);

      // Proses batch upload ke Firestore...
      const batchSize = 400;
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const chunk = jsonData.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const newDocRef = doc(collection(db, "pbb_master"));
          batch.set(newDocRef, item);
        });

        await batch.commit();
      }

      alert("Berhasil mengunggah semua data master PBB ke Firestore!");
      jsonFile.value = null;
      await loadMasterDataFromFirestore();
    } catch (error) {
      console.error("Gagal memproses/mengunggah file JSON:", error);
      alert("Terjadi kesalahan saat mengunggah data.");
    } finally {
      isUploading.value = false;
    }
  };

  reader.readAsText(file);
};


/*
const uploadJsonToFirestore = async () => {
  if (!jsonFile.value || jsonFile.value.length === 0) {
    alert("Silakan pilih file JSON terlebih dahulu!");
    return;
  }

  const file = Array.isArray(jsonFile.value) ? jsonFile.value[0] : jsonFile.value;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      isUploading.value = true;
      const content = e.target.result;
      const jsonData = JSON.parse(content);

      if (!Array.isArray(jsonData)) {
        alert("Format JSON harus berupa array of objects ([{...}, {...}])!");
        isUploading.value = false;
        return;
      }

      console.log(`Memulai upload ${jsonData.length} data ke pbb_master...`);

      // Firestore membatasi batch write maksimal 500 operasi dalam satu waktu
      const batchSize = 400;
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const chunk = jsonData.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          // Membuat referensi dokumen baru di koleksi 'pbb_master' secara otomatis
          const newDocRef = doc(collection(db, "pbb_master"));
          batch.set(newDocRef, item);
        });

        await batch.commit();
      }

      alert("Berhasil mengunggah semua data master PBB ke Firestore!");
      jsonFile.value = null;
      
      // Muat ulang data master setelah berhasil diupload
      await loadMasterDataFromFirestore();
    } catch (error) {
      console.error("Gagal memproses/mengunggah file JSON:", error);
      alert("Terjadi kesalahan saat mengunggah data. Pastikan format JSON valid.");
    } finally {
      isUploading.value = false;
    }
  };

  reader.readAsText(file);
};
*/

// --- 1. AMBIL DATA MASTER DARI FIRESTORE ('pbb_master') ---
// --- 1. AMBIL DATA & EKSTRAK KODE KEC/KEL LANGSUNG DARI NOP ---
const loadMasterDataFromFirestore = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "pbb_master"));
    const loadedData = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ekstraksi otomatis KD_KEC dan KD_KEL dari NOP jika belum ada
      if (data.NOP) {
        const cleanNop = String(data.NOP).trim();
        data.KD_KEC = cleanNop.substring(0, 10); // Contoh: "34.01.060"
        data.KD_KEL = cleanNop.substring(0, 14); // Contoh: "34.01.060.004"
      }
      loadedData.push(data);
    });
    
    rawJsonData.value = loadedData;

    // Ekstrak daftar Kapanewon unik berdasarkan KD_KEC yang dipotong dari NOP
    const uniqueKec = {};
    rawJsonData.value.forEach(item => {
      if (item.KD_KEC) {
        uniqueKec[item.KD_KEC] = `Kapanewon ${item.KD_KEC}`;
      }
    });

    kecamatanList.value = Object.keys(uniqueKec).map(code => ({
      code: code,
      name: uniqueKec[code]
    }));

    console.log("Kecamatan berhasil dimuat dari NOP:", kecamatanList.value);
  } catch (err) {
    console.error("Gagal memuat master data dari Firestore:", err);
  }
};

// --- 2. HANDLE KETIKA KECAMATAN DIPILIH ---
const onKecamatanChange = (kdKec) => {
  selectedKelurahan.value = null;
  kelurahanList.value = [];
  wargaList.value = [];

  if (!kdKec) return;

  const uniqueKel = {};
  rawJsonData.value
    .filter(item => item.KD_KEC === kdKec)
    .forEach(item => {
      if (item.KD_KEL) {
        uniqueKel[item.KD_KEL] = `Kalurahan ${item.KD_KEL}`;
      }
    });

  kelurahanList.value = Object.keys(uniqueKel).map(code => ({
    code: code,
    name: uniqueKel[code]
  }));
};

// --- 3. HANDLE KETIKA KELURAHAN / TAHUN BERUBAH ---
const onFilterChange = () => {
  if (!selectedKecamatan.value || !selectedKelurahan.value || !selectedTahun.value) return;

  const filteredWarga = rawJsonData.value.filter(item => 
    item.KD_KEC === selectedKecamatan.value &&
    item.KD_KEL === selectedKelurahan.value &&
    String(item.THN_PAJAK_SPPT || '') === String(selectedTahun.value)
  );

  wargaList.value = filteredWarga.map(item => {
    const rawTagihan = String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0);
    const numericTagihan = Number(rawTagihan.replace(/[^0-9]/g, ''));

    return {
      nama: `${item.NM_WP_SPPT || 'Tanpa Nama'} (${item.NOP})`,
      id: item.NOP,
      tagihanTotal: numericTagihan
    };
  });
};



const formatRupiah = (number) => {
  if (isNaN(number) || !number) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

const selectedWarga = computed(() => {
  return wargaList.value.find(w => w.id === newIuran.value.wargaId);
});

const sisaTagihan = computed(() => {
  if (!selectedWarga.value) return 0;
  return Math.max(0, selectedWarga.value.tagihanTotal - totalSudahDibayar.value);
});

const onWargaSelected = (nop) => {
  fetchRiwayatWarga(nop); 
};

// Membuat list tahun dinamis berdasarkan data Firestore atau 5 tahun ke belakang
const daftarTahun = computed(() => {
  if (rawJsonData.value.length > 0) {
    const years = [...new Set(rawJsonData.value.map(item => item.THN_PAJAK_SPPT))];
    return years.sort((a, b) => b - a);
  }
  const tahunSekarang = new Date().getFullYear();
  const list = [];
  for (let i = tahunSekarang - 5; i <= tahunSekarang; i++) {
    list.push(i);
  }
  return list;
});

const totalIuranHeader = computed(() => {
  return filteredIuran.value.reduce((acc, item) => {
    return acc + Number(item.jumlah || 0);
  }, 0);
});

const riwayatWarga = ref([]);
const totalSudahDibayar = ref(0);

const fetchRiwayatWarga = async (nop) => {
  totalSudahDibayar.value = 0; 
  if (!nop) return;

  const q = query(collection(db, "pembayaran"), where("NOP", "==", nop));
  const querySnapshot = await getDocs(q);

  let tempTotal = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    tempTotal += Number(data.jumlah || 0);
  });

  totalSudahDibayar.value = tempTotal;
};

const filteredIuran = computed(() => {
  if (!startDate.value && !endDate.value) return pembayaran.value;

  return pembayaran.value.filter(item => {
    const itemDate = new Date(item.tanggalObj).setHours(0, 0, 0, 0);
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
  tanggalObj: new Date(),
  tahun: new Date().getFullYear()
});

const formatDateDisplay = (dateObj) => {
  if (!dateObj) return '';
  if (dateObj && typeof dateObj.toDate === 'function') {
    dateObj = dateObj.toDate(); 
  }
  if (dateObj instanceof Date) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
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

const headers = [
  { title: 'No', key: 'no', sortable: false },  
  { title: 'NOP', key: 'NOP', searchable: true },
  { title: 'Tahun Pajak', key: 'tahun', searchable: true },
  { title: 'Nama Warga', key: 'namaWarga', searchable: true },
  { title: 'Tanggal', key: 'tanggal', searchable: true },
  { title: 'Jumlah', key: 'jumlah', searchable: true },
  { title: 'Aksi', key: 'actions', sortable: false, searchable: false }
];

const fetchIuran = async () => {
    const iuranCollection = collection(db, 'pembayaran');
    const q = query(iuranCollection, orderBy('tanggal', 'desc'));
    const querySnapshot = await getDocs(q);
    const fetchedIuran = [];
    
    for (const docIuran of querySnapshot.docs) {
        const dataIuran = docIuran.data();
        fetchedIuran.push({
            id: docIuran.id,
            ...dataIuran,
            tanggal: dataIuran.tanggal,
            tanggalObj: dataIuran.tanggal ? dataIuran.tanggal.toDate() : null,
            namaWarga: dataIuran.namaWarga || 'Warga Tidak Ditemukan'
        });
    }
    pembayaran.value = fetchedIuran;
};

/*
const openDialog = (mode, item = null) => {
    dialog.value = true;
    if (mode === 'add') {
        newIuran.value = {
            wargaId: null,
            jumlah: 0,
            tanggalObj: new Date()
        };
    }
};
*/

const openDialog = async (mode, item = null) => {
    dialog.value = true;
    
    // Pastikan data master ditarik jika list kecamatan masih kosong
    if (kecamatanList.value.length === 0) {
        await loadMasterDataFromFirestore();
    }

    if (mode === 'add') {
        newIuran.value = {
            wargaId: null,
            jumlah: 0,
            tanggalObj: new Date()
        };
    }
};

const closeDialog = () => {
  dialog.value = false;
};

const deleteIuran = async (id) => {
  if (!confirm("Apakah Anda yakin ingin menghapus data pembayaran ini?")) return;

  try {
    const iuranDocRef = doc(db, "pembayaran", id);
    await deleteDoc(iuranDocRef);
    alert("Data berhasil dihapus!");
  } catch (error) {
    console.error("Gagal menghapus data: ", error);
    alert("Terjadi kesalahan saat menghapus data.");
  }
};

const exportToExcel = () => {
      let dataToExport = filteredIuran.value;
      const keyword = search.value ? String(search.value).toLowerCase().trim() : '';
      if (keyword) {
        dataToExport = dataToExport.filter(item => {
          const nop = String(item.NOP || '').toLowerCase();
          const nama = String(item.namaWarga || '').toLowerCase();
          return nop.includes(keyword) || nama.includes(keyword);
        });
      }

      if (dataToExport.length === 0) {
        alert('Tidak ada data yang sesuai dengan filter!');
        return;
      }

      let totalJumlahNum = 0;
      const excelRows = dataToExport.map((item, index) => {
        const jumlahVal = Number(String(item.jumlah || 0).replace(/[^0-9]/g, ''));
        totalJumlahNum += jumlahVal;
        const tanggalFormatted = formatTanggalUntukExcel(item.tanggalObj || item.tanggal);

        return {
          'No': index + 1,
          'NOP': item.NOP || '',
          'Tahun Pajak': item.tahun || '',
          'Nama Warga': item.namaWarga || '',
          'Tanggal': tanggalFormatted,
          'Jumlah': jumlahVal
        };
      });

      excelRows.push({
        'No': '', 'NOP': '', 'Tahun Pajak': '', 'Nama Warga': 'TOTAL :', 'Tanggal': '', 'Jumlah': totalJumlahNum
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = { c: XLSX.utils.decode_col('F'), r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '"Rp "#,##0'; 
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Angsuran PBB');
      XLSX.writeFile(wb, `Laporan_Angsuran.xlsx`);
};

const formatTanggalUntukExcel = (dateValue) => {
  if (!dateValue) return '';
  let dateToFormat = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(dateToFormat.getTime())) return dateValue;
  const day = String(dateToFormat.getDate()).padStart(2, '0');
  const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
  const year = dateToFormat.getFullYear();
  return `${day}-${month}-${year}`;
};

const exportFilteredIuranByWargaToPdf = () => {
  const doc = new jsPDF();
  doc.text('Laporan Iuran PBB Warga Berdasarkan Tanggal', 14, 16);

  const data = filteredIuran.value.filter(item => {
   const wargaNama = (item.namaWarga || '').toLowerCase();
   return wargaNama.includes(search.value.toLowerCase());
  });

  const tableData = data.map((item, index) => [
    index + 1,
    item.namaWarga || 'Tidak Diketahui',
    formatDateDisplay(item.tanggalObj),
    formatRupiah(item.jumlah),
  ]);

  const totalIuran = data.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);

  autoTable(doc, {
    head: [['No', 'Nama Warga', 'Tanggal', 'Jumlah']],
    body: tableData,
    startY: 20,
    foot: [['', `Total Iuran: ${formatRupiah(totalIuran)}`]]
  });

  doc.save(`iuran_pbb.pdf`);
};

onMounted(async () => {
  await loadMasterDataFromFirestore(); // Memuat data master dari Firestore
  await fetchIuran();                  // Memuat riwayat pembayaran dari Firestore
});

// Menggunakan onSnapshot agar tabel pembayaran realtime otomatis terupdate
onMounted(() => {
  const q = query(collection(db, "pembayaran"), orderBy("tanggal", "desc"));
  onSnapshot(q, (snapshot) => {
    pembayaran.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
});

const saveIuran = async () => {
  if (!newIuran.value.wargaId) {
    alert("Silakan pilih warga terlebih dahulu!");
    return;
  }

  const wargaTerpilih = wargaList.value.find(w => w.id === newIuran.value.wargaId);
  const tanggalObj = new Date(newIuran.value.tanggalObj);
  const tahun = Number(selectedTahun.value);

  const payload = {
    NOP: newIuran.value.wargaId,
    namaWarga: wargaTerpilih ? wargaTerpilih.nama : 'Warga Tanpa Nama',
    jumlah: Number(newIuran.value.jumlah),
    tanggal: tanggalObj,
    tahun: tahun,
    bulan: tanggalObj.getMonth() + 1
  };

  try {
    await addDoc(collection(db, "pembayaran"), payload);
    alert("Data iuran tahun " + tahun + " berhasil disimpan!");
    dialog.value = false;
    resetForm();
    await fetchIuran();
  } catch (e) {
    console.error("Error saat menyimpan: ", e);
    alert("Gagal menyimpan data.");
  }
};

const resetForm = () => {
  newIuran.value = {
    wargaId: null,
    jumlah: 0,
    tanggalObj: new Date(),
    tahun: new Date().getFullYear()
  };
};
</script>