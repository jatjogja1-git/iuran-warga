<template>
      <v-container fluid>
        <h1 class="mb-4">Selamat Datang di Aplikasi Iuran Warga</h1>
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title>Statistik Singkat</v-card-title>
              <v-card-text>
                <p>Total Warga: <strong>{{ totalWarga }}</strong></p>
                <p>Total Iuran Hari Ini: <strong>{{ formatRupiah(totalIuranHariIni) }}</strong></p>
                <p>Total Iuran Bulan Ini: <strong>{{ formatRupiah(totalIuranBulanIni) }}</strong></p>
              </v-card-text>
            </v-card>
          </v-col>
          </v-row>
      </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
//import { useRouter } from 'vue-router';
//import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase/config'; // Pastikan db diimpor
import { collection, getDocs, query, where } from 'firebase/firestore';

//const drawer = ref(false);
//const router = useRouter();

// Variabel untuk menyimpan data statistik
const totalWarga = ref(0);
const totalIuranHariIni = ref(0);
const totalIuranBulanIni = ref(0);

// Fungsi untuk mengambil dan menghitung data
const fetchDashboardStats = async () => {
  // 1. Ambil Total Warga
  try {
    const wargaSnapshot = await getDocs(collection(db, 'warga'));
    totalWarga.value = wargaSnapshot.size; // Jumlah dokumen dalam koleksi 'warga'
  } catch (error) {
    console.error("Error fetching total warga:", error);
  }

  // 2. Ambil Total Iuran Hari Ini
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().substring(0, 10);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString().substring(0, 10);

    const qToday = query(
      collection(db, 'iuran'),
      where('tanggal', '>=', startOfToday),
      where('tanggal', '<=', endOfToday)
    );
    const iuranTodaySnapshot = await getDocs(qToday);
    totalIuranHariIni.value = iuranTodaySnapshot.docs.reduce((sum, doc) => sum + (doc.data().jumlah || 0), 0);
  } catch (error) {
    console.error("Error fetching iuran today:", error);
  }


  // 3. Ambil Total Iuran Bulan Ini
  try {
    const currentMonth = new Date().getMonth(); // 0-11
    const currentYear = new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().substring(0, 10);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString().substring(0, 10);

    const qMonth = query(
      collection(db, 'iuran'),
      where('tanggal', '>=', startOfMonth),
      where('tanggal', '<=', endOfMonth)
    );
    const iuranMonthSnapshot = await getDocs(qMonth);
    totalIuranBulanIni.value = iuranMonthSnapshot.docs.reduce((sum, doc) => sum + (doc.data().jumlah || 0), 0);
  } catch (error) {
    console.error("Error fetching iuran this month:", error);
  }
};

// Fungsi Logout
const logout = async () => {
  try {
    await signOut(auth);
    router.push('/');
  } catch (error) {
    console.error('Error logging out:', error.message);
  }
};

// Fungsi untuk format Rupiah (gunakan fungsi yang sama dari IuranPage atau buat di utility file)
const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Panggil fungsi saat komponen dimount
onMounted(() => {
  fetchDashboardStats();
});
</script>