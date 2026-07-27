<script setup>
import { ref, computed, onMounted } from 'vue';

const semuaData = ref([]);
const angsuranCount = ref({});
const searchQuery = ref(''); // Variabel untuk menampung input pencarian
const currentPage = ref(1);
const perPage = 10;

// Filter data berdasarkan searchQuery
const filteredData = computed(() => {
  return semuaData.value.filter(wp => {
    const nama = wp.NM_WP_SPPT.toLowerCase();
    const nop = wp.NOP.toLowerCase();
    const query = searchQuery.value.toLowerCase();
    return nama.includes(query) || nop.includes(query);
  });
});

// Data yang tampil per halaman (berdasarkan hasil filter)
const dataTampil = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  const end = start + perPage;
  return filteredData.value.slice(start, end);
});

const totalPages = computed(() => Math.ceil(filteredData.value.length / perPage));

// Reset halaman ke 1 jika user mengetik di pencarian
const handleSearch = () => {
  currentPage.value = 1;
};
// 1. Pindahkan fungsi ini ke luar onMounted agar bisa dipanggil oleh template
const tambahData = () => {
  if (!semuaData.value.length) return;
  const nextData = semuaData.value.slice(index, index + limit);
  dataTampil.value.push(...nextData);
  index += limit;
};

const hitungPerBulan = (total, bulan) => {
  return Math.round(total / (bulan || 1)).toLocaleString('id-ID');
};

onMounted(async () => {
  try {
    const response = await fetch('/pbb_data.json');
    const result = await response.json();
    const data = result[""] || [];
    
    semuaData.value = data;

    // Inisialisasi angsuranCount
    data.forEach(wp => {
      angsuranCount.value[wp.NOP] = 3;
    });

    tambahData(); // Panggil fungsi di sini untuk data awal
  } catch (error) {
    console.error("Gagal memuat data:", error);
  }
});
</script>

<template>

<div class="search-box">
    <input 
      type="text" 
      v-model="searchQuery" 
      @input="handleSearch" 
      placeholder="Cari berdasarkan Nama atau NOP..."
    />
  </div>


  <table v-if="dataTampil.length > 0" border="1">
    <thead>
      <tr>
        <th>Nama</th>
        <th>NOP</th>
        <th>Total Tagihan (Rp)</th>
        <th>Pilih Angsuran</th>
        <th>Bayar Per Bulan</th>
      </tr>
    </thead>
    <table border="1" v-if="dataTampil.length > 0"></table>
    <tbody>
      <tr v-for="wp in dataTampil" :key="wp.NOP">
        <td>{{ wp.NM_WP_SPPT }}</td>
        <td>{{ wp.NOP }}</td>
        <td>{{ wp.PBB_YG_HARUS_DIBAYAR_SPPT?.toLocaleString('id-ID') }}</td>
        <td>
          <select v-if="angsuranCount[wp.NOP]" v-model="angsuranCount[wp.NOP]">
            <option :value="3">3 Bulan</option>
            <option :value="6">6 Bulan</option>
          </select>
        </td>
        <td>{{ hitungPerBulan(wp.PBB_YG_HARUS_DIBAYAR_SPPT, angsuranCount[wp.NOP]) }}</td>
      </tr>
    </tbody>
  </table>
  <div v-else>
    Data tidak ditemukan.
  </div>

  <div class="pagination">
    <button :disabled="currentPage === 1" @click="currentPage--">Sebelumnya</button>
    <span>Halaman {{ currentPage }} dari {{ totalPages || 1 }}</span>
    <button :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
  </div>
  
  
  <button @click="tambahData" v-if="index < semuaData.length">
    Muat Lebih Banyak
  </button>
</template>