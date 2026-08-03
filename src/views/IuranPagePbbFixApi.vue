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

<v-row>
  <v-col cols="12" md="4">
    <v-select
      v-model="selectedKecamatan"
      :items="kecamatanList"
      item-title="name"
      item-value="code"
      label="Pilih Kapanewon"
      @update:model-value="onFilterChange"
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
                        v-model="selectedTahun"
                        :items="daftarTahun"
                        label="Pilih Tahun PBB"
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


// Ganti bagian impor service
//import { bpajakService } from '@/services/apiauth_blmbyr.js'; // Sesuaikan path-nya
import { bpajakService } from '@/apiauth_blmbyrfix.js'



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

const tableData = ref([]);

// Tambahkan state filter
const selectedKecamatan = ref(null);
const selectedKelurahan = ref(null);
const selectedTahun = ref(new Date().getFullYear());

// Contoh data statis untuk daftar (Sesuaikan dengan data Anda)
const kecamatanList = ref([{ name: '010| TEMON', code: '010' },
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
          { name: '120| KALIBAWANG', code: '120' }, ]);


const kelurahanMapping = {
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

        };

// Computed untuk kelurahan berdasarkan pilihan kecamatan
const kelurahanList = computed(() => {
  return kelurahanMapping[selectedKecamatan.value] || [];
});

// Fungsi pemicu saat filter berubah
const onFilterChange = () => {
  // Jika kecamatan berubah, reset kelurahan
  if (event?.type === 'update:model-value' && !selectedKelurahan.value) {
    selectedKelurahan.value = null;
  }
  
  // Jika semua sudah terisi, panggil fungsi fetch data warga
  if (selectedKecamatan.value && selectedKelurahan.value && selectedTahun.value) {
    fetchWargaFromAPI(selectedKecamatan.value, selectedKelurahan.value, selectedTahun.value);
  }
};


const fetchWargaFromAPI = async (kd_kec, kd_kel, tahun) => {
  try {
    const response = await bpajakService.getBpajakData(kd_kec, kd_kel, tahun);
    const data = response.data || [];
    
    // Update wargaList untuk dropdown v-autocomplete Tambah Iuran
    wargaList.value = data.map(item => ({
      nama: `${item.NM_WP_SPPT} (${item.NOP})`,
      id: item.NOP,
      tagihanTotal: Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''))
    }));
  } catch (err) {
    console.error("Gagal ambil data API:", err);
  }
};



const formatRupiah = (number) => {
  // Jika number adalah NaN, kembalikan 'Rp 0'
  if (isNaN(number) || !number) return "Rp 0";
  
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};


/*
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
*/



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


//data diambil via firestore
const fetchWargaList = async () => {
  const querySnapshot = await getDocs(collection(db, "pembayaran"));
  wargaList.value = querySnapshot.docs.map(doc => ({
    nama: doc.data().namaWarga,
    id: doc.data().NOP
  }));
};


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


const exportToExcel = () => {
      // 1. Ambil data yang sudah terfilter berdasarkan Tanggal (filteredIuran)
      let dataToExport = filteredIuran.value;

      // 2. Filter tambahan berdasarkan teks pencarian (search: NOP atau Nama Warga) jika diisi
      const keyword = search.value ? String(search.value).toLowerCase().trim() : '';
      if (keyword) {
        dataToExport = dataToExport.filter(item => {
          const nop = String(item.NOP || '').toLowerCase();
          const nama = String(item.namaWarga || '').toLowerCase();
          return nop.includes(keyword) || nama.includes(keyword);
        });
      }

      if (dataToExport.length === 0) {
        alert('Tidak ada data yang sesuai dengan filter tanggal atau pencarian untuk diekspor!');
        return;
      }

      // 3. Petakan baris data untuk Excel
      let totalJumlahNum = 0;
      const excelRows = dataToExport.map((item, index) => {
        const jumlahVal = Number(String(item.jumlah || 0).replace(/[^0-9]/g, ''));
        totalJumlahNum += jumlahVal;

        // Format tanggal menggunakan fungsi yang sudah ada
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

      // 4. Tambahkan baris total di bagian bawah Excel
      excelRows.push({
        'No': '',
        'NOP': '',
        'Tahun Pajak': '',
        'Nama Warga': 'TOTAL :',
        'Tanggal': '',
        'Jumlah': totalJumlahNum
      });

      // 5. Buat Worksheet & Workbook menggunakan SheetJS (XLSX)
      const ws = XLSX.utils.json_to_sheet(excelRows);

      // 6. Format kolom Jumlah (Kolom F) agar otomatis menjadi format mata uang Rupiah di Excel
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

      // 7. Unduh file dengan nama dinamis berdasarkan tanggal filter
      const startStr = startDate.value || 'semua';
      const endStr = endDate.value || 'semua';
      const fileName = `Laporan_Angsuran_${startStr}_hingga_${endStr}.xlsx`;
      
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
    wargaList.value.find(w => w.id === item.NOP)?.namaWarga || 'Tidak Diketahui',
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
  doc.text('Laporan Iuran PBB Warga Berdasarkan Tanggal', 14, 16);

  const data = filteredIuran.value.filter(item => {
   const wargaNama = (item.namaWarga || '').toLowerCase();
   return wargaNama.includes(search.value.toLowerCase());
  });

  const tableData = data.map((item, index) => [
    index + 1,
    item.namaWarga || 'Tidak Diketahui', // <--- Gunakan langsung field ini
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
// UBAH BARIS INI: Mengambil langsung dari selectedTahun
    tahun: Number(selectedTahun.value),
    bulan: new Date(newIuran.value.tanggalObj).getMonth() + 1

    //    tahun: tahun, // <-- Tambahkan field ini for input biasa
//    tahun: Number(newIuran.value.tahun), // Mengambil dari input manual
 //   bulan: tanggalObj.getMonth() + 1 // Opsional: Tambahkan bulan (1-12)
};


  try {

    await addDoc(collection(db, "pembayaran"), payload);
    alert("Data iuran tahun " + tahun + " berhasil disimpan!");
        // Pastikan Anda menunggu proses ini selesai
    //    const docRef = await addDoc(collection(db, "pembayaran"), payload);
    //    console.log("Data berhasil masuk dengan ID: ", docRef.id);
    //    alert("Data iuran tahun " + tahun + " berhasil disimpan!");

        // 3. TUTUP DIALOG DI SINI
        dialog.value = false;

        // 4. Reset form agar bersih untuk input selanjutnya
        resetForm();

// 3. TAMBAHKAN INI: Refresh data agar tabel langsung terupdate
    await fetchIuran();

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