<script setup>
import { ref, computed } from 'vue';
import { collection, getDocs, query, where, and } from 'firebase/firestore';
import { db } from '../firebasefix/configfix';
import { bpajakService } from '@/apiauth_blmbyrfix.js';
import { Timestamp } from 'firebase/firestore';


//const startDate = ref(''); // Pastikan ini terdefinisi
//const endDate = ref('');   // Pastikan ini terdefinisi
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
const startDate = ref(firstDayOfMonth.toISOString().substring(0, 10));
const endDate = ref(today.toISOString().substring(0, 10));



// --- State ---
const tableData = ref([]); // Data gabungan untuk tabel
const isLoading = ref(false);
const search = ref(''); // Pastikan ini diinisialisasi

// Filter
const selectedKecamatan = ref(null);
const selectedKelurahan = ref(null);
const selectedTahun = ref(null);
const kelurahanList = ref([]);



// --- Fungsi Utama Integrasi ---
const fetchAndCompareData = async () => {
// Ubah input string (YYYY-MM-DD) menjadi objek Date, lalu ke Timestamp
  const startTimestamp = Timestamp.fromDate(new Date(startDate.value + 'T00:00:00'));
  const endTimestamp = Timestamp.fromDate(new Date(endDate.value + 'T23:59:59'));
console.log("Filter:", selectedTahun.value, startDate.value, endDate.value);
  //if (!selectedKecamatan.value || !selectedKelurahan.value || !selectedTahun.value) return;
  
  if (!selectedKecamatan.value || !selectedKelurahan.value || !selectedTahun.value || !startDate.value || !endDate.value) {
    console.log("Filter belum lengkap, data tidak dimuat.");
    return; 
  }

  isLoading.value = true;
  try {
    // 1. Ambil data tagihan dari API
    const apiResponse = await bpajakService.getBpajakData(
      selectedKecamatan.value, 
      selectedKelurahan.value, 
      selectedTahun.value
    );

    // 2. Ambil data pembayaran dari Firestore
    // 2. Query Firestore dengan Filter Tahun DAN Rentang Tanggal
    // Menggunakan 'and()' untuk menggabungkan kondisi

/*    
    const q = query(
      collection(db, "pembayaran"),
      and(
        where("tahun", "==", String(selectedTahun.value)),
        where("tanggal", ">=", startDate.value),
        where("tanggal", "<=", endDate.value)
      )
    );
*/

/*
const q = query(
    collection(db, "pembayaran"),
    where("tahun", "==", String(selectedTahun.value)),
    where("tanggal_bayar", ">=", startTimestamp),
    where("tanggal_bayar", "<=", endTimestamp)
  );
*/

 const start = new Date(startDate.value);
      start.setHours(0, 0, 0, 0);
  
      const end = new Date(endDate.value);
      end.setHours(23, 59, 59, 999);
  
      const q = query(
        collection(db, 'pembayaran'),
        where('tanggal', '>=', start),
        where('tanggal', '<=', end)
      );


   // const snapshot = await getDocs(q);
   // const historiPembayaran = snapshot.docs.map(doc => doc.data());


const querySnapshot = await getDocs(q);
/*
      const historiPembayaran = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        };
      });
*/


/*
const historiPembayaran = querySnapshot.docs.map(doc => {
  const data = doc.data();
  
  // 1. Inisialisasi tanggal default
  let tglString = "2026-07-01"; 

  // 2. Pastikan field tanggal_bayar ada dan memiliki fungsi toDate()
  if (data.tanggal && typeof data.tanggal.toDate === 'function') {
    try {
      tglString = data.tanggal.toDate().toISOString().substring(0, 10);
    } catch (err) {
      console.warn("Dokumen dengan ID", doc.id, "memiliki format tanggal yang salah");
      console.warn("Format tanggal salah di dokumen:", doc.id);
    }
  }
  return { 
    ...data, 
    tanggal_bayar_str: tglString 
  };
});
*/

const historiPembayaran = querySnapshot.docs.map(doc => {
  const data = doc.data();
  // Konversi Timestamp 'tanggal' ke string
  const tglString = data.tanggal?.toDate().toISOString().substring(0, 10) || "2026-07-01";
  return { 
    ...data, 
    tanggal_bayar_str: tglString // Pastikan nama ini digunakan
  };
});



    // 3. Integrasi: Map data API dan bandingkan dengan Firestore
    tableData.value = apiResponse.data.map(item => {
      // Bersihkan format Rupiah API menjadi angka (Number)
      const tagihan = Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));
      
      // 2. Filter Firestore berdasarkan NOP DAN Tahun
  const totalTerbayar = historiPembayaran
    .filter(h => 
      h.NOP === item.NOP && 
      String(h.tahun) === String(item.THN_PAJAK_SPPT) && // Pastikan tahun disamakan formatnya
      // TAMBAHKAN FILTER RENTANG TANGGAL DI SINI
    h.tanggal_bayar_str >= startDate.value && 
    h.tanggal_bayar_str <= endDate.value
    )
    .reduce((sum, h) => sum + Number(h.jumlah || 0), 0);

      // Tentukan status
      const isLunas = totalTerbayar >= tagihan;

      return {
        ...item,
        tagihanAngka: tagihan,
        totalTerbayar,
        status: isLunas ? 'LUNAS' : 'BELUM LUNAS'
        //isLunas
      };
    });
  } catch (error) {
    console.error("Gagal sinkronisasi data:", error);
  } finally {
    isLoading.value = false;
  }
};


// --- Data Statis ---
const kecamatanList = [{ name: '010| TEMON', code: '010' },
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
          { name: '120| KALIBAWANG', code: '120' }, 
  // ... (tambahkan list lainnya)
];

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

const tahunList = Array.from({ length: 13 }, (_, i) => ({
  name: String(2014 + i),
  code: String(2014 + i)
}));


const headers = [
  { title: 'No', key: 'index', sortable: false },
  { title: 'NOP', key: 'NOP' },
  { title: 'Nama WP', key: 'NM_WP_SPPT' },
  { title: 'Alamat OP', key: 'ALAMAT' },
  { title: 'Tahun', key: 'THN_PAJAK_SPPT' },
  { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT' },
  { title: 'Jatuh Tempo', key: 'TGL_JATUH_TEMPO_SPPT' },
  { title: 'Status', key: 'status' } // <-- PASTIKAN INI ADA
];


// --- Computed ---
const itemsWithIndex = computed(() => {
  return tableData.value.map((item, index) => ({
    ...item,
    index: index + 1
  }));
});

// --- Methods (Ganti dari methods: {} ke const function) ---
const formatRupiah = (value) => {
  const rawValue = String(value).replace(/[^0-9]/g, '');
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(rawValue));
};

const onKecamatanChange = () => {
  selectedKelurahan.value = null;
  tableData.value = [];
  kelurahanList.value = kelurahanMapping[selectedKecamatan.value] || [];
};

</script>

<template>
  <!-- Bagian Filter -->
  <div class="filters">
    <!-- Tambahkan v-select untuk Kecamatan, Kelurahan, Tahun dengan @update:model-value="fetchAndCompareData" -->
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
              @update:model-value="fetchAndCompareData"
            ></v-select>
          </v-col>



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
              label="Search"
              append-icon="mdi-magnify"
              clearable
            ></v-text-field>
          </v-col>
        </v-row>
  </div>

  <!-- Tabel Data -->
<v-data-table
  :headers="headers"
  :items="tableData"
  :search="search"
>
  <!-- Slot untuk kolom No -->
  <template v-slot:item.index="{ index }">
    {{ index + 1 }}
  </template>
    <!-- Kolom Status -->
    <template v-slot:item.status="{ item }">
      <v-chip :color="item.isLunas ? 'success' : 'error'">
        {{ item.status }}
      </v-chip>
    </template>
    
    <!-- Kolom Aksi -->
    <template v-slot:item.actions="{ item }">
      <v-btn v-if="item.isLunas" color="primary">Cetak Kuitansi</v-btn>
    </template>
  </v-data-table>
</template>