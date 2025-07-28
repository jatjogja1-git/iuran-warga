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
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
    // Buat objek Date untuk awal hari (00:00:00)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    // Buat objek Date untuk akhir hari (23:59:59.999)
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log('Querying for Today:', startOfToday.toISOString(), 'to', endOfToday.toISOString()); // Debugging

    const qToday = query(
      collection(db, 'iuran'),
      where('tanggal', '>=', startOfToday), // <<< PERBAIKAN: Gunakan objek Date
      where('tanggal', '<=', endOfToday)   // <<< PERBAIKAN: Gunakan objek Date
    );
    const iuranTodaySnapshot = await getDocs(qToday);
    totalIuranHariIni.value = iuranTodaySnapshot.docs.reduce((sum, doc) => sum + (doc.data().jumlah || 0), 0);
    console.log('Total Iuran Hari Ini:', totalIuranHariIni.value); // Debugging
  } catch (error) {
    console.error("Error fetching iuran today:", error);
  }

  // 3. Ambil Total Iuran Bulan Ini
  try {
    const currentMonth = new Date().getMonth(); // 0-11
    const currentYear = new Date().getFullYear();
    // Buat objek Date untuk awal bulan (hari pertama, jam 00:00:00)
    const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    // Buat objek Date untuk akhir bulan (hari terakhir, jam 23:59:59.999)
    // Trik: new Date(year, month + 1, 0) akan memberikan tanggal terakhir bulan sebelumnya
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    console.log('Querying for Month:', startOfMonth.toISOString(), 'to', endOfMonth.toISOString()); // Debugging

    const qMonth = query(
      collection(db, 'iuran'),
      where('tanggal', '>=', startOfMonth), // <<< PERBAIKAN: Gunakan objek Date
      where('tanggal', '<=', endOfMonth)     // <<< PERBAIKAN: Gunakan objek Date
    );
    const iuranMonthSnapshot = await getDocs(qMonth);
    totalIuranBulanIni.value = iuranMonthSnapshot.docs.reduce((sum, doc) => sum + (doc.data().jumlah || 0), 0);
    console.log('Total Iuran Bulan Ini:', totalIuranBulanIni.value); // Debugging
  } catch (error) {
    console.error("Error fetching iuran this month:", error);
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