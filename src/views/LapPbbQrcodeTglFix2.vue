<template>
  <v-container>
    <v-card>
      <v-card-title>
        DATA BELUM BAYAR PBB KAB. KULON PROGO
        <v-spacer></v-spacer>
        <v-btn-group>
          <v-btn @click="exportToExcel" color="success">Export Excel</v-btn>
          <v-btn @click="exportToPDF" color="success" class="ml-2">Export PDF</v-btn>
          <v-btn @click="logout" color="primary" class="ml-2">Logout</v-btn>
        </v-btn-group>
      </v-card-title>

      <v-card-text>
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
              @update:model-value="fetchData"
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              label="Search"
              append-icon="mdi-magnify"
              clearable
            ></v-text-field>
          </v-col>
        </v-row>

<!-- Filter Rentang Tanggal awal -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="startDate"
                label="Tanggal Awal"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-range"
                hide-details
                @change="fetchLaporanHistori"
              ></v-text-field>
            </v-col>
  
            <!-- Filter Rentang Tanggal akhir -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="endDate"
                label="Tanggal Akhir"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-range"
                hide-details
                @change="fetchLaporanHistori"
              ></v-text-field>
            </v-col>
          
      


        <v-data-table
          :headers="headers"
          :items="itemsWithIndex" 
          :search="search"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.PBB_YG_HARUS_DIBAYAR_SPPT="{ item }">
            {{ formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT) }}
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { bpajakService } from '@/apiauth_blmbyr.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- State Variables (Ganti dari data() ke ref()) ---
const router = useRouter();
const search = ref('');
const loading = ref(false);
const selectedKecamatan = ref(null);
const selectedKelurahan = ref(null);
const selectedTahun = ref(null);
const tableData = ref([]);
const kelurahanList = ref([]);
const snackbar = ref({ show: false, text: '', color: 'success' });

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
  { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
  { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT' },
  { title: 'Tanggal Jatuh Tempo', key: 'TGL_JATUH_TEMPO_SPPT' }
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

const fetchData = async () => {
  if (!selectedKecamatan.value || !selectedKelurahan.value || !selectedTahun.value) return;
  loading.value = true;
  try {
    const response = await bpajakService.getBpajakData(
      selectedKecamatan.value,
      selectedKelurahan.value,
      selectedTahun.value
    );
    tableData.value = response.data;
  } catch (error) {
    showSnackbar('Error fetching data', 'error');
  } finally {
    loading.value = false;
  }
};

const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(tableData.value);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Belum Bayar PBB');
  XLSX.writeFile(wb, 'Data_Belum_Bayar_PBB.xlsx');
};

const exportToPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Laporan Data Belum Bayar PBB", 14, 15);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  const tableBody = tableData.value.map((item, index) => [
    index + 1,
    item.NOP,
    item.NM_WP_SPPT,
    item.ALAMAT,
    item.THN_PAJAK_SPPT,
    formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT),
    item.TGL_JATUH_TEMPO_SPPT
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['No', 'NOP', 'Nama WP', 'Alamat OP', 'Tahun', 'PBB (Rp)', 'Jatuh Tempo']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 5: { halign: 'right' } }
  });

  doc.save('Data_Belum_Bayar_PBB.pdf');
};

const logout = () => {
  router.push('/');
};

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};
</script>
