<template>
  <v-container>
    <v-card>
      <v-card-title>Daftar Warga Belum Bayar PBB</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="wargaList"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.status="{ item }">
            <v-chip color="red" small>Belum Bayar</v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getBelumBayarPbb } from '@/services/api';
const wargaList = ref([]);
const loading = ref(false);

const headers = [
  { title: 'No', key: 'no' },
  { title: 'Nama Warga', key: 'NM_WP_SPPT' },
  { title: 'NOP', key: 'NOP' }
];

const loadData = async () => {
  loading.value = true;
  try {
    // Sesuaikan parameter sesuai kebutuhan
    wargaList.value = await getWargaBelumBayar('060', '005', '2026');
  } catch (err) {
    alert("Gagal memuat data");
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>