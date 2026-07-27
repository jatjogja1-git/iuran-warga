<template>
    <v-container>
      <v-card>
        <v-card-title>
          DATA BELUM BAYAR PBB KAB. KULON PROGO
          <v-spacer></v-spacer>
          <v-btn-group>

            <v-btn @click="exportToExcel" color="success">Export Excel</v-btn>

 <!--           <v-btn @click="exportToExcel" color="success">
              Export Excel
            </v-btn> -->
            <v-btn @click="exportToPDF" color="success" class="ml-2">
              Export PDF
            </v-btn>
 <!--           <v-btn @click="logout" color="error">
            Logout 
          </v-btn>-->
            <v-btn @click="logout" color="primary" class="ml-2">
              Logout
            </v-btn>
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
  
          <v-data-table
            :headers="headers"
            :items="itemsWithIndex" 
            :search="search"
            :loading="loading"
            class="elevation-1"
          >
          <template v-slot:item.index="{ item }">
              {{ item.index }}
                
            </template>
        </v-data-table>
        </v-card-text>
      </v-card>
<!--  
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        timeout="100"
      >
        {{ snackbar.text }}
      </v-snackbar>
-->
    </v-container>
  </template>
  
  <script>
  import { bpajakService } from '@/apiauth_blmbyr.js'
  import jsPDF from 'jspdf'
  import 'jspdf-autotable'


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
        
        kecamatanList: [
          { name: '010| TEMON', code: '010' },
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
     ],
  
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
  
        keteranganOptions: [
        { name: '01| PERUMAHAN', id: '01' },
          { name: '02| PERKANTORAN SWASTA', id: '02' },
          { name: '03| PABRIK', id: '03' },
          { name: '04| TOKO/APOTIK/PASAR/RUKO', id: '04' },
          { name: '05| RUMAH SAKIT/KLINIK', id: '05' },
          { name: '06| OLAH RAGA/REKREASI', id: '06' },
          { name: '07| HOTEL/WISMA', id: '07' },
          { name: '08| BENGKEL/GUDANG', id: '08' },
          { name: '09| GEDUNG PEMERINTAH', id: '09' },
          { name: '10| LAIN-LAIN', id: '10' },
          { name: '11| BANGUNAN TIDAK KENA PAJAK', id: '11' },
          { name: '13| APARTEMEN', id: '13' },
          { name: '18| PERTANIAN', id: '18' },
          { name: '19| PERIKANAN/TAMBAK', id: '19' },
          { name: '22| TANAH KOSONG', id: '22' },
          { name: '24| FASILITAS UMUM', id: '24' },
          { name: '32| SAWAH', id: '32' },
          { name: '33| TEGAL', id: '33' },
          { name: '34| PEKARANGAN', id: '34' },
   ],
  
        kelurahanList: [],
        
        headers: [
        { title: 'No', key: 'index', sortable: false },  
        { title: 'NOP', key: 'NOP'},
        { title: 'Nama WP', key: 'NM_WP_SPPT'},
        { title: 'Alamat OP', key: 'ALAMAT'},
        { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
        { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT'},
        { title: 'Tanggal Jatuh Tempo', key: 'TGL_JATUH_TEMPO_SPPT'}
          ],

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
          { name: '2026', code: '2026' }
             
     ],
          

        snackbar: {
          show: false,
          text: '',
          color: 'success'
        }
      }
    },


    computed: {
  itemsWithIndex() {
    return this.tableData.map((item, index) => {
      return {
        index: index + 1,
        ...item,
      };
    });
  },
},


  
    methods: {
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
          this.tableData = response.data
        } catch (error) {
          this.showSnackbar('Error fetching data', 'error')
        } finally {
          this.loading = false
        }
      },
  

       exportToExcel  ()  
            
       {
    // Create a worksheet from the table data
    const ws = XLSX.utils.json_to_sheet(this.tableData);

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Append the worksheet to the workbook with a name
    XLSX.utils.book_append_sheet(wb, ws, 'Data Belum Bayar PBB');

    // Write the workbook to a file
    XLSX.writeFile(wb, 'Data_Belum_Bayar_PBB.xlsx');
       },        
   
        
        
      exportToPDF() {
        const doc = new jsPDF()
        doc.autoTable({
          head: [this.headers.map(h => h.title)],
          body: this.tableData.map(item => 
            this.headers.map(h => item[h.key])
          )
        })
        doc.save('Data_Belum_Bayar_PBB.pdf')
      },   
  
      showSnackbar(text, color = 'success') {
        this.snackbar.text = text
        this.snackbar.color = color
        this.snackbar.show = true
      }
    }
  }


  import * as XLSX from 'xlsx'; // Import the xlsx library

  </script>
  
  <script setup>
import { ref, onMounted, computed } from 'vue';
  import { useRouter } from 'vue-router'
//  import { AuthService } from '../services/auth.service'
  
  const router = useRouter()
//  const user = ref(AuthService.getCurrentUser())
  
  const logout = () => {
  //  AuthService.logout()
    router.push('/')
  }
  
// Di dalam script setup Anda
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0, // Mengatur jumlah angka di belakang koma
  }).format(value);
};
  
  /*
  onMounted(() => {
    if (!user.value) {
      router.push('/')
    }
  })
  */
  </script>