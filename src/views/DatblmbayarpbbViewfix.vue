<template>
  <v-container>
    <v-card>
      <v-card-title>
        DATA BELUM BAYAR PBB KAB. KULON PROGO
        <v-spacer></v-spacer>
        <v-btn-group>
          <v-btn @click="exportToExcel" color="success">Export Excel</v-btn>
          <v-btn @click="exportToPDF" color="success" class="ml-2">Export PDF</v-btn>
          <v-btn @click="exportDataBelumBayar" color="success" class="ml-2">Export Json</v-btn>
          <v-btn @click="logout" color="primary" class="ml-2">Logout</v-btn>
        </v-btn-group>
      </v-card-title>

<v-card class="mb-4 pa-4" elevation="2">
  <v-card-title>
    <v-icon color="primary" class="mr-2">mdi-database-import</v-icon>
    Rekonsiliasi Data (Upload JSON)
  </v-card-title>
  <v-card-text>
    <v-file-input
      label="Pilih File JSON Hasil Export"
      prepend-icon="mdi-file-code"
      variant="outlined"
      density="compact"
      accept=".json"
      @change="handleFileUpload"
      clearable
    ></v-file-input>
    <small class="text-grey">
      *Upload file JSON tagihan untuk membandingkan status pembayaran dengan data Firestore berdasarkan rentang tanggal yang dipilih di atas.
    </small>
  </v-card-text>
</v-card>

<v-row>
  <v-col cols="12" md="3">
    <v-text-field v-model="startDate" label="Tanggal Awal" type="date" variant="outlined"></v-text-field>
  </v-col>
  <v-col cols="12" md="3">
    <v-text-field v-model="endDate" label="Tanggal Akhir" type="date" variant="outlined"></v-text-field>
  </v-col>
</v-row>


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

        <template v-slot:item.status="{ item }">
          <v-chip :color="item.status === 'LUNAS' ? 'success' : 'error'" size="small">
            {{ item.status }}
          </v-chip>
        </template>

        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>


<script>
import { bpajakService } from '@/apiauth_blmbyr.js'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx'


export default {
  name: 'DatobpajakView',
  data() {
    return {
      search: '',
      loading: false,
      selectedKecamatan: null,
      selectedKelurahan: null,
      selectedTahun: null,
      tableData: [],
      originalData: [], // Tambahkan ini untuk menyimpan data mentah dari API
      startDate: new Date().toISOString().substring(0, 10), // Berikan nilai default
    endDate: new Date().toISOString().substring(0, 10),
      // ... (kecamatanList, kelurahanMapping, tahunList, dll tetap sama di sini)
      
      
      
      kecamatanList: [{ name: '010| TEMON', code: '010' },
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
          { name: '120| KALIBAWANG', code: '120' }, ],
      kelurahanMapping: {
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

        },
      tahunList: [
        { name: '2014', code: '2014' },
          { name: '2015', code: '2015' },
          { name: '2016', code: '2016' },
          { name: '2017', code: '2017' },
          { name: '2018', code: '2018' },
          { name: '2019', code: '2019' },
          { name: '2020', code: '2020' },
          { name: '2021', code: '2021' },
          { name: '2022', code: '2022' },
          { name: '2023', code: '2023' },
          { name: '2024', code: '2024' },
          { name: '2025', code: '2025' },
          { name: '2026', code: '2026' }],
      headers: [
        { title: 'No', key: 'index', sortable: false },  
        { title: 'NOP', key: 'NOP'},
        { title: 'Nama WP', key: 'NM_WP_SPPT'},
        { title: 'Alamat OP', key: 'ALAMAT'},
        { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
        { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT'},
        { title: 'Status', key: 'status' },
        { title: 'Tanggal Jatuh Tempo', key: 'TGL_JATUH_TEMPO_SPPT'}
      ],
      snackbar: { show: false, text: '', color: 'success' }
    }
  },
  computed: {
    itemsWithIndex() {
      return this.tableData.map((item, index) => ({
        index: index + 1,
        ...item,
      }));
    }
  },

watch: {
  startDate() { this.reconcileData(); },
  endDate() { this.reconcileData(); }
},


  methods: {




  async reconcileData() {
    // Hanya jalan jika sudah ada data asli
    if (this.originalData.length === 0) return;

    this.loading = true;
    try {
      const pembayaranSnapshot = await this.getPembayaranFromFirestore();
      const mapPembayaran = new Map();
      pembayaranSnapshot.forEach(doc => {
        const d = doc.data();
        mapPembayaran.set(`${d.NOP}_${d.tahun}`, d);
      });

      // Proses Merge berdasarkan originalData
      this.tableData = this.originalData.map(item => {
        const key = `${item.NOP}_${item.THN_PAJAK_SPPT}`;
        const dataBayar = mapPembayaran.get(key);
        return {
          ...item,
          status: dataBayar ? 'LUNAS' : 'BELUM LUNAS',
          totalTerbayar: dataBayar ? this.formatRupiah(dataBayar.jumlah) : 'Rp 0'
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  },



// ... di dalam bagian methods: { ... }
    exportDataBelumBayar() {
      // 1. Pastikan data ada
      if (this.tableData.length === 0) {
        this.showSnackbar('Data tidak tersedia untuk diekspor', 'error');
        return;
      }

      // 2. Konversi data ke JSON string
      const jsonString = JSON.stringify(this.tableData, null, 2);

      // 3. Buat file blob
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // 4. Picu download otomatis
      const link = document.createElement('a');
 //     link.href = url;
//      link.download = `Data_Belum_Bayar_${this.selectedTahun || 'PBB'}.json`;
      link.download = `Data_Belum_Bayar_PBB_${this.selectedTahun || 'PBB'}_${this.selectedKecamatan || 'PBB'}_${this.selectedKelurahan || 'PBB'}.json`;

      document.body.appendChild(link);
      link.click();

      // 5. Bersihkan
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showSnackbar('Data berhasil diekspor ke JSON', 'success');
    },
// ...


methods: {
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.loading = true;
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // 1. Parse JSON dari file
        const dataJson = JSON.parse(e.target.result);

        // 2. Ambil data Firestore dalam rentang tanggal yang dipilih
        // (Pastikan fungsi ini mengambil data berdasarkan rentang yang sudah Anda buat sebelumnya)
        const pembayaranSnapshot = await this.getPembayaranFromFirestore(); 

        const mapPembayaran = new Map();
        pembayaranSnapshot.forEach(doc => {
          const d = doc.data();
          // Gunakan kunci unik NOP + Tahun
          mapPembayaran.set(`${d.NOP}_${d.tahun}`, d);
        });

        // 3. Gabungkan (Merge)
        this.tableData = dataJson.map(item => {
          const key = `${item.NOP}_${item.THN_PAJAK_SPPT}`;
          const dataBayar = mapPembayaran.get(key);

          return {
            ...item,
            // Pastikan key ini sama dengan 'key' di headers
            totalTerbayar: dataBayar ? this.formatRupiah(dataBayar.jumlah) : 'Rp 0',
            status: dataBayar ? 'LUNAS' : 'BELUM LUNAS',
            //totalTerbayar: dataBayar ? dataBayar.jumlah : 0,
            tanggal_bayar: dataBayar ? dataBayar.tanggal : '-'
           // status: dataBayar ? 'LUNAS' : 'BELUM LUNAS'
          };
        });

        this.showSnackbar('Data berhasil direkonsiliasi!', 'success');
      } catch (err) {
        this.showSnackbar('Gagal memproses file JSON', 'error');
        console.error(err);
      } finally {
        this.loading = false;
      }
    };
    reader.readAsText(file);
  },

 /* 
  async getPembayaranFromFirestore() {
    // Fungsi pembantu untuk mengambil data dari Firestore sesuai range
    // Pastikan Anda menggunakan query yang sama dengan rentang tanggal
    const q = query(
      collection(db, "pembayaran"),
      where("tanggal", ">=", this.startDate), // Pastikan format Date sesuai
      where("tanggal", "<=", this.endDate)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs;
  }
 */ 

 // Di dalam methods
async getPembayaranFromFirestore() {
  if (!this.startDate || !this.endDate) {
    this.showSnackbar('Pilih rentang tanggal terlebih dahulu!', 'warning');
    return [];
  }
  
  // Konversi string tanggal ke Timestamp/Date object Firestore
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  end.setHours(23, 59, 59);

  const q = query(
    collection(db, "pembayaran"),
    where("tanggal", ">=", start),
    where("tanggal", "<=", end)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs;
}


},


    formatRupiah(value) {
      const rawValue = String(value).replace(/[^0-9]/g, '');
      const numberValue = Number(rawValue);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(numberValue);
    },
    onKecamatanChange() {
      this.selectedKelurahan = null
      this.tableData = []
      this.kelurahanList = this.kelurahanMapping[this.selectedKecamatan] || []
    },
    async fetchData() {
      if (!this.selectedKecamatan || !this.selectedKelurahan || !this.selectedTahun) return
      this.loading = true
      try {
        const response = await bpajakService.getBpajakData(
          this.selectedKecamatan,
          this.selectedKelurahan,
          this.selectedTahun
        )
        this.originalData = response.data // Simpan data asli
        this.tableData = response.data
      } catch (error) {
        this.showSnackbar('Error fetching data', 'error')
      } finally {
        this.loading = false
      }
    },
    exportToExcel() {
      const ws = XLSX.utils.json_to_sheet(this.tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Belum Bayar PBB');
      XLSX.writeFile(wb, 'Data_Belum_Bayar_PBB.xlsx');
    },


    /*    
    exportToPDF() {
      const doc = new jsPDF()
      doc.autoTable({
        head: [this.headers.map(h => h.title)],
        body: this.tableData.map(item => this.headers.map(h => item[h.key]))
      })
      doc.save('Data_Belum_Bayar_PBB.pdf')
    },
*/





exportToPDF() {
  const doc = new jsPDF();

  // 1. Judul Dokumen
  doc.setFontSize(16);
  doc.text("Laporan Data Belum Bayar PBB", 14, 15);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  // 2. Menyiapkan Data
  const tableBody = this.tableData.map((item, index) => [
    index + 1,
    item.NOP,
    item.NM_WP_SPPT,
    item.ALAMAT,
    item.THN_PAJAK_SPPT,
    this.formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT),
    item.TGL_JATUH_TEMPO_SPPT
  ]);

  // 3. Panggil autoTable dengan memberikan doc sebagai argumen pertama
  autoTable(doc, {
    startY: 30,
    head: [['No', 'NOP', 'Nama WP', 'Alamat OP', 'Tahun', 'PBB (Rp)', 'Jatuh Tempo']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      5: { halign: 'right' }
    }
  });

  // 4. Simpan File
  doc.save('Data_Belum_Bayar_PBB.pdf');
},


    logout() {
      // Tambahkan logika logout Anda di sini
      this.$router.push('/')
    },
    showSnackbar(text, color = 'success') {
      this.snackbar.text = text
      this.snackbar.color = color
      this.snackbar.show = true
    }
  }
}
</script>