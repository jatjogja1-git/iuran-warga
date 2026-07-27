<template>
  <v-container>
    <!-- Contoh Banner Status -->
    <v-alert :color="dataWarga.status === 'LUNAS' ? 'success' : 'warning'">
      STATUS: {{ dataWarga.status }}
    </v-alert>

    <!-- Contoh Tampil NOP dan Nominal -->
    <p><strong>NOP:</strong> {{ dataWarga.nop }}</p>
    <p><strong>Sudah Dibayar:</strong> {{ formatRupiah(dataWarga.bayar) }}</p>
    <p><strong>Target Tagihan:</strong> {{ formatRupiah(dataWarga.target) }}</p>
    <p><strong>Periode:</strong> {{ dataWarga.startDate }} s.d. {{ dataWarga.endDate }}</p>
  </v-container>
</template>
  




  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { db } from '../firebase/config';
  import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
  
  const isLoading = ref(true);
  const dataWarga = ref({
    nop: '',
    startDate: '',
    endDate: '',
    status: 'BELUM LUNAS',
    bayar: 0,
    target: 0
  });

  // 1. DEKLARASIKAN VARIABEL PENAMPUNG DATA DI SINI
const listDataWarga = ref([]); 
const dataDitemukan = ref(null);

const cleanNop = (NOP) => (NOP ? String(NOP).replace(/[^\d]/g, '') : '');


  const route = useRoute();
//  const isLoading = ref(true);
  const wargaData = ref(null);
  const historiList = ref([]);
  const totalIuran = ref(0);



// Definisikan variabel penampung data di bagian atas
const nop = ref('');
const statusPembayaran = ref('');
const totalBayar = ref(0);
const targetTagihan = ref(0); // <-- Perhatikan nama variabel ini

// --- Helper Formatter (Sama dengan kuitansi Anda) ---
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };
  
  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${day} ${bulanIndo[parseInt(month) - 1]} ${year}`;
  };
  
  const formatFullDateTime = (dateValue) => {
    if (!dateValue) return '';
    let d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };


  // Pastikan ini ada di script setup Anda
const isLunas = computed(() => {
  // Anggap lunas jika total bayar >= target tagihan
  return totalIuran.value >= targetTagihan.value;
});

  // Tambahkan di <script setup>
const sisaBayar = computed(() => {
  return Math.max(0, targetTagihan.value - totalIuran.value);
});




// Tambahkan status lunas/kurang
//const isLunas = computed(() => totalIuran.value >= targetTagihan.value);

/*  
onMounted(() => {
  
  // Tangkap parameter dari URL browser
  const urlParams = new URLSearchParams(window.location.search);
  const nop = urlParams.get('NOP');

  // SIMULASI: Pastikan status loading selalu dimatikan di akhir blok
    isLoading.value = false;
  //nop.value = urlParams.get('NOP') || '';
  //statusPembayaran.value = urlParams.get('status') || 'BELUM LUNAS';
  totalBayar.value = Number(urlParams.get('bayar')) || 0;
  
  // Pastikan variabel target dideklarasikan dengan benar sesuai parameter URL (?target=...)
  targetTagihan.value = Number(urlParams.get('target')) || 0; 
  
  // Jika Anda telanjur menulis 'targetUrl' di baris 152, ubah menjadi 'targetTagihan'
  console.log("Target Tagihan:", targetTagihan.value);
});
*/
//console.log("Cari NOP:", nopParam);
//console.log("Daftar data yang tersedia di halaman verifikasi:", listDataWarga.value);


/*
onMounted(async () => {
  try {
  const urlParams = new URLSearchParams(window.location.search);
  const nopParam = urlParams.get('NOP');
  const startParam = urlParams.get('start');
  const endParam = urlParams.get('end');
//  const nop = urlParams.get('NOP');
  


//console.log("Cari NOP:", nopParam);
//console.log("Daftar data yang tersedia di halaman verifikasi:", listDataWarga.value);

//const dataDitemukan = ref(null);
const errorMessage = ref('');



  console.log("Parameter diterima dari QR:", { nopParam, startParam, endParam });
    
    // Contoh jika Anda mengambil data dari Firebase / API
    // const response = await fetch(...);
    
    // SIMULASI: Pastikan status loading selalu dimatikan di akhir blok
    //isLoading.value = false; 
    
  } catch (error) {
    console.error("Gagal memuat data:", error);
    errorMessage.value = "Terjadi kesalahan saat memuat data.";
    isLoading.value = false; // <-- WAJIB: Matikan loading agar animasi berhenti walau error
  }
});
*/

/*
onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const nopParam = urlParams.get('NOP');
    
    // 2. AMBIL/ISI DATA KE DALAM listDataWarga 
    // (Sesuaikan dengan darimana Anda mengambil data, contoh dari file JSON publik atau API)
    //const response = await fetch('/path-to-data-warga.json'); // atau sumber data Anda
    const response = await fetch('/data/pbb_data.json');

// Cek apakah server mengembalikan error (misal 404 / 500)
    if (!response.ok) {
      throw new Error(`Gagal mengambil data, server merespon dengan status: ${response.status}`);
    }

    // Pastikan konten tipe nya benar-benar JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Respon server bukan berformat JSON yang valid (kemungkinan salah path file).");
    }

    listDataWarga.value = await response.json();

    // 3. LAKUKAN PENCOCOKAN SETELAH DATA TERISI
    if (nopParam && listDataWarga.value.length > 0) {
      dataDitemukan.value = listDataWarga.value.find(item => {
        return cleanNop(item.NOP) === cleanNop(nopParam);
      });
    }

    isLoading.value = false;
  } catch (error) {
    console.error("Gagal memuat data:", error);
    isLoading.value = false;
  }
});
*/

onMounted(() => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Ambil semua data langsung dari parameter URL yang dikirim lewat QR Code
    dataWarga.value = {
      nop: urlParams.get('NOP') || '',
      startDate: urlParams.get('start') || '',
      endDate: urlParams.get('end') || '',
      status: urlParams.get('status') || 'BELUM LUNAS',
      bayar: Number(urlParams.get('bayar')) || 0,
      target: Number(urlParams.get('target')) || 0
    };

    isLoading.value = false;
  } catch (error) {
    console.error("Gagal membaca parameter:", error);
    isLoading.value = false;
  }
});

const fetchTargetTagihan = async (nop) => {
  try {
    const response = await fetch('/pbb_data.json');
    const data = await response.json();
    // Sesuaikan key dengan struktur JSON Anda
    const warga = data[""].find(item => item.NOP === nop);
    if (warga) {
      // Pastikan konversi ke Number agar bisa dikurangi
      targetTagihan.value = Number(warga.PBB_YG_HARUS_DIBAYAR_SPPT || 0);
    }
  } catch (error) {
    console.error("Gagal mengambil data PBB:", error);
  }
};


  // Menangkap query params dari URL (?wargaId=xxx&start=xxx&end=xxx)
  // 1. Pastikan menangkap 'NOP' dari URL (Case sensitive!)
const NOP = route.query.NOP; 
//const startDate = route.query.start;
//const endDate = route.query.end;
  
  const fetchVerificationData = async () => {
  if (!NOP || !startDate || !endDate) {
    console.error("Parameter URL tidak lengkap:", { NOP, startDate, endDate });
    console.log("Mencari NOP:", NOP);
    console.log("Rentang:", startDate, "s.d.", endDate);
    isLoading.value = false;
    return;
  }

  try {
  
    /*
    // 1. Ambil Data Profil Warga (Pastikan nama koleksi 'wargart' sudah sesuai)
    const wargaDoc = await getDoc(doc(db, 'pembayaran', NOP));
    
    // PERBAIKAN 1: Mengubah wargadoc menjadi wargaDoc (D Kapital)
    if (wargaDoc.exists()) {
      wargaData.value = wargaDoc.data();
    } else {
      console.log("Warga tidak ditemukan di database!");
      isLoading.value = false;
      return;
    }
*/
    // 2. Format Tanggal Rentang
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

   // Di dalam fetchVerificationData
// PERBAIKAN: Gunakan koleksi yang benar ('pembayaran')
const q = query(
  collection(db, 'pembayaran'), 
  where('NOP', '==', NOP), // Sesuaikan: Apakah NOP atau wargaId? 
  where('tanggal', '>=', start),
  where('tanggal', '<=', end)
);


    // Ambil data dokumen dari Firestore
    const querySnapshot = await getDocs(q);
    
    // PERBAIKAN 2: Pastikan console.log berada TEPAT DI SINI (Di dalam blok try)
    console.log("Jumlah Histori Iuran ditemukan:", querySnapshot.size);
    
    if (querySnapshot.empty) {
       console.log("Tidak ada data ditemukan untuk NOP:", NOP);
       isLoading.value = false;
       return;
    }

    let tempTotal = 0;
    const tempHistori = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      //tempTotal += data.jumlah;
      tempTotal += Number(data.jumlah || 0);
      tempHistori.push(data);

      // AMBIL NAMA WARGA DARI TRANSAKSI PERTAMA JIKA wargart TIDAK ADA
  /*
      if (!wargaData.value) {
    wargaData.value = { nama: data.namaWarga || "Warga Tanpa Nama" };
  }
  */

  if (!wargaData.value && data.namaWarga) {
        wargaData.value = { nama: data.namaWarga };
      }
    });

    // Urutkan transaksi dari terlama ke terbaru
    tempHistori.sort((a, b) => {
      const tA = a.tanggal.toDate ? a.tanggal.toDate() : new Date(a.tanggal);
      const tB = b.tanggal.toDate ? b.tanggal.toDate() : new Date(b.tanggal);
      return tA - tB;
    });

    historiList.value = tempHistori;
    totalIuran.value = tempTotal;

  } catch (error) {
    // Menangkap jika ada error index Firestore yang tadi sempat muncul
    console.error("Gagal melakukan verifikasi QR:", error);
  } finally {
    isLoading.value = false;
  }
  // Di dalam fetchVerificationData, setelah berhasil mendapatkan NOP dari URL
await fetchTargetTagihan(NOP);
};


  
/*  
  onMounted(() => {
    console.log("Route Query:", route.query); // Lihat apa yang diterima halaman verifikasi
    fetchVerificationData();
  });
*/


  // Tambahkan fungsi untuk mengambil data warga dari JSON jika di Firestore tidak ada
/*
const fetchWargaFallback = async (nop) => {
  try {
    const response = await fetch('/pbb_data.json');
    const result = await response.json();
    const data = result[""] || [];
    return data.find(w => w.NOP === nop);
  } catch (e) {
    return null;
  }
};
*/
  </script>