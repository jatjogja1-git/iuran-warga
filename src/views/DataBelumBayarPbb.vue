<template>
    <v-container>
      <v-card>
        <v-card-title>
          UPDATE DATA KETETAPAN PBB KAB. KULON PROGO
          <v-spacer></v-spacer>
          <v-btn-group>
            <v-btn @click="exportToPDF" color="success" class="ml-2">
              Export PDF
            </v-btn>
              <v-btn @click="exportToExcel" color="success" class="ml-2">
              Export EXCEL
            </v-btn>
           

            <v-btn @click="exportFilteredToExcel" color="indigo" class="ml-2">
              Export Hasil Filter Browser
            </v-btn>

            <v-btn 
              @click="exportByStatusToExcel" 
              color="teal" 
              dark 
              class="ml-2"
              :disabled="tableData.length === 0"
            >
              Export Excel Sesuai Status
            </v-btn>

            <v-btn @click="logout" color="primary" class="ml-2">
              Logout
            </v-btn>
          </v-btn-group>
        </v-card-title>
  
        <v-card-text>
          <v-row>
            <v-col cols="5" md="3">
              <v-select
                v-model="selectedKecamatan"
                :items="kecamatanList"
                item-title="name"
                item-value="code"
                label="Pilih Kapanewon"
                @update:model-value="onKecamatanChange"
              ></v-select>
            </v-col>
  
            <v-col cols="5" md="3">
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
  
            <v-col cols="5" md="3">
              <v-text-field
                v-model="THN_PAJAK_SPPT"
                label="Tahun SPPT"
                outlined
              ></v-text-field>
            </v-col>
  
            <v-col cols="5" md="3">
              <v-select
                v-model="filterStatusGlobal"
                :items="keteranganOptions"
                item-title="name"
                item-value="id"
                label="Filter Status SPPT"
                clearable
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
  
          <v-row>
            <v-col>
              <v-btn-group>
                <v-btn @click="fetchData" color="success" class="ml-2">
                  Tampilkan Data
                </v-btn>
                <v-btn @click="addNewRow" color="primary" class="ml-2">
                  <v-icon left>mdi-plus</v-icon>
                  Tambah Data
                </v-btn>
                <v-btn 
                  v-if="hasUnsavedChanges" 
                  @click="saveAllChanges" 
                  color="orange" 
                  class="ml-2"
                >
                  <v-icon left>mdi-content-save-all</v-icon>
                  Simpan Semua ({{ editingItemsCount }})
                </v-btn>
                <v-btn 
                  v-if="hasUnsavedChanges" 
                  @click="cancelAllChanges" 
                  color="error" 
                  class="ml-2"
                >
                  <v-icon left>mdi-cancel</v-icon>
                  Batal Semua
                </v-btn>
              </v-btn-group>
            </v-col>
          </v-row>
  
          <v-data-table
            v-model="selectedItems"
            show-select  
            :headers="headers"
            :items="filteredTableData"
            :search="search"
            :loading="loading"
            :page.sync="page"
            :items-per-page.sync="itemsPerPage"
            class="elevation-1"
            item-key="id"
          >


          <template v-slot:item.index="{ index }">
          {{ (page - 1) * itemsPerPage + index + 1 }}
          </template>

          
          </v-data-table>
        </v-card-text>
      </v-card>
  
    </v-container>
  </template>
  
  <script>
  import { bpajakService } from '@/apiblmbayarpbb.js'
  import jsPDF from 'jspdf'
  import 'jspdf-autotable'
  import * as XLSX from 'xlsx'
  //import { saveAs } from 'file-saver'

  

  export default {
    name: 'UpdatePajakPbb',


    mounted() {
    // Debug: cek apakah service ter-import dengan benar
    console.log('bpajakService:', bpajakService)
    console.log('Available methods:', Object.keys(bpajakService))
  },

    data() {
      return {
        search: '',
        loading: false,
        deleting: false,
        selectedKecamatan: null,
        selectedKelurahan: null,
        THN_PAJAK_SPPT: null,
        // TAMBAHKAN INI
        filterStatusGlobal: null,
        tableData: [],
        originalData: {},
        deleteDialog: false,
        itemToDelete: null,
        nextId: 1,
        page: 1,
        itemsPerPage: 10,

        // TAMBAHKAN INI
        selectedItems: [],
  
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
          // ... tambahkan mapping lainnya sesuai kebutuhan
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
          { name: '0| BELUM BAYAR', id: '0' },
          { name: '1| SUDAH BAYAR', id: '1' },
          { name: '2| FASUM', id: '2' },
          { name: '5| SIMULASI', id: '5' },
        ],
  
        kelurahanList: [],
  
        headers: [
          { title: 'NOMOR', key: 'index', sortable: false },
          { title: 'NOP', key: 'NOP', sortable: true },
          { title: 'NOP BAYAR', key: 'NOP_BAYAR', sortable: true },
          { title: 'Nama WP', key: 'NM_WP_SPPT', sortable: true },
          { title: 'Alamat OP', key: 'ALAMAT_OBYEK_PAJAK', sortable: true },
          { title: 'Tahun SPPT', key: 'THN_PAJAK_SPPT', sortable: true },
          { title: 'Luas Tanah', key: 'LUAS_BUMI', sortable: true },
          { title: 'Luas Bangunan', key: 'LUAS_BANGUNAN', sortable: true },
          { title: 'Jumlah Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT', sortable: true },
          { title: 'Jumlah Pengurang', key: 'FAKTOR_PENGURANG_SPPT', sortable: true },
          { title: 'Status SPPT', key: 'STATUS_PEMBAYARAN_SPPT', sortable: true },
          { title: 'Status Edit', key: 'editStatus', sortable: false },
          { title: 'Actions', key: 'actions', sortable: false },
      ],

      snackbar: {
        show: false,
        text: '',
        color: 'success'
      },

      autoSaveInterval: null
    }
  },

  computed: {

// Fungsi ini akan otomatis berjalan setiap kali tableData atau filterStatusGlobal berubah
    filteredTableData() {
        if (!this.filterStatusGlobal) {
          // Jika dropdown kosong / "clearable" diklik, kembalikan semua data
          return this.tableData; 
        }
        
        // Saring data berdasarkan STATUS_PEMBAYARAN_SPPT yang cocok dengan id di dropdown
        return this.tableData.filter(item => {
          return item.STATUS_PEMBAYARAN_SPPT === this.filterStatusGlobal;
        });
      },

    hasUnsavedChanges() {
      return this.tableData.some(item => item.isEditing)
    },

    editingItemsCount() {
      return this.tableData.filter(item => item.isEditing).length
    }
  },



  methods: {
    onKecamatanChange() {
      this.selectedKelurahan = null;
      this.tableData = [];
      this.kelurahanList = this.kelurahanMapping[this.selectedKecamatan] || [];
    },


async fetchData() {
        if (!this.selectedKecamatan || !this.selectedKelurahan || !this.THN_PAJAK_SPPT) return
  
        this.loading = true
        try {
          const response = await bpajakService.getBpajakData(
            this.selectedKecamatan,
            this.selectedKelurahan,
            this.THN_PAJAK_SPPT
          )
          this.tableData = response.data
        } catch (error) {
          this.showSnackbar('Error fetching data', 'error')
        } finally {
          this.loading = false
        }
      },





async updateItem(item) {
  // Parse NOP untuk mendapatkan komponen
  const nopParts = item.NOP.split('.')
  const payload = {
    kd_prop: nopParts[0] || '34',
    kd_dati2: nopParts[1] || '01',
    kd_kec: nopParts[2] || this.selectedKecamatan,
    kd_kel: nopParts[3] || this.selectedKelurahan,
    kd_blok: nopParts[4] || '000',
    no_urut: nopParts[5] || '0000',
    kd_jns: nopParts[6] || '0',
    THN_PAJAK_SPPT: item.THN_PAJAK_SPPT,
  //  NM_WP_SPPT: item.NM_WP_SPPT,
  //  ALAMAT_OBYEK_PAJAK: item.ALAMAT_OBYEK_PAJAK,
  //  LUAS_BUMI: item.LUAS_BUMI,
  //  LUAS_BANGUNAN: item.LUAS_BANGUNAN,
    PBB_YG_HARUS_DIBAYAR_SPPT: item.PBB_YG_HARUS_DIBAYAR_SPPT,
    FAKTOR_PENGURANG_SPPT: item.FAKTOR_PENGURANG_SPPT,
    STATUS_PEMBAYARAN_SPPT: item.STATUS_PEMBAYARAN_SPPT
  }

  try {
    const response = await bpajakService.updateBpajakData(payload)
    if (response.data) {
      Object.assign(item, response.data) // Update item dengan data dari API
    }
  } catch (error) {
    this.showSnackbar('Error updating data: ' + error.message, 'error')
    console.error('Error updating item:', error)
    throw error // Re-throw error agar ditangani di saveItem
  }

},
    addNewRow() {
      if (!this.selectedKecamatan || !this.selectedKelurahan || !this.THN_PAJAK_SPPT) {
        this.showSnackbar('Pilih Kecamatan, Kelurahan, dan Tahun SPPT terlebih dahulu', 'warning')
        return
      }

      const newItem = {
        id: this.nextId++,
        NOP: `34.01.${this.selectedKecamatan}.${this.selectedKelurahan}.000.0000.0`,
        NOP_BAYAR: '',
        NM_WP_SPPT: '',
        ALAMAT_OBYEK_PAJAK: '',
        THN_PAJAK_SPPT: this.THN_PAJAK_SPPT,
        LUAS_BUMI: 0,
        LUAS_BANGUNAN: 0,
        PBB_YG_HARUS_DIBAYAR_SPPT: 0,
        FAKTOR_PENGURANG_SPPT: 0,
        STATUS_PEMBAYARAN_SPPT: '0',
        isEditing: true,
        isNew: true,
        isSaving: false
      }
      
      this.tableData.unshift(newItem)
      this.originalData[newItem.id] = { ...newItem }
      this.showSnackbar('Data baru ditambahkan. Silakan isi dan simpan.', 'info')
    },

    editItem(item) {
      // Save original data for cancel functionality
      this.originalData[item.id] = { ...item }
      item.isEditing = true
      this.showSnackbar('Mode edit aktif. Tekan Enter untuk simpan, Esc untuk batal.', 'info')
    },

    cancelEdit(item) {
      if (item.isNew) {
        // Remove new item if cancelled
        const index = this.tableData.findIndex(data => data.id === item.id)
        this.tableData.splice(index, 1)
        this.showSnackbar('Data baru dibatalkan', 'info')
      } else {
        // Restore original data
        const originalItem = this.originalData[item.id]
        Object.assign(item, originalItem)
        item.isEditing = false
        this.showSnackbar('Perubahan dibatalkan', 'info')
      }
      delete this.originalData[item.id]
    },

    async saveItem(item) {
      if (!this.validateItem(item)) {
        return
      }

      item.isSaving = true
      
      try {
        if (item.isNew) {
          await this.createItem(item)
        } else {
          await this.updateItem(item)
        }

        item.isEditing = false
        item.isNew = false
        delete this.originalData[item.id]
        
        this.showSnackbar('Data berhasil disimpan', 'success')
      } catch (error) {
        this.showSnackbar('Error menyimpan data: ' + error.message, 'error')
        console.error('Error saving item:', error)
      } finally {
        item.isSaving = false
      }
    },

    async createItem(item) {
      // Parse NOP untuk mendapatkan komponen
      const nopParts = item.NOP.split('.')
      const payload = {
        kd_prop: nopParts[0] || '34',
        kd_dati2: nopParts[1] || '02',
        kd_kec: nopParts[2] || this.selectedKecamatan,
        kd_kel: nopParts[3] || this.selectedKelurahan,
        kd_blok: nopParts[4] || '000',
        no_urut: nopParts[5] || '000',
        kd_jns: nopParts[6] || '0',
        THN_PAJAK_SPPT: item.THN_PAJAK_SPPT,
        NM_WP_SPPT: item.NM_WP_SPPT,
        ALAMAT_OBYEK_PAJAK: item.ALAMAT_OBYEK_PAJAK,
        LUAS_BUMI: item.LUAS_BUMI,
        LUAS_BANGUNAN: item.LUAS_BANGUNAN,
        PBB_YG_HARUS_DIBAYAR_SPPT: item.PBB_YG_HARUS_DIBAYAR_SPPT,
        FAKTOR_PENGURANG_SPPT: item.FAKTOR_PENGURANG_SPPT,
        STATUS_PEMBAYARAN_SPPT: item.STATUS_PEMBAYARAN_SPPT
      }

      const response = await bpajakService.createBpajakData(payload)
      if (response.data) {
        Object.assign(item, response.data)
      }
    },

  
    deleteItem(item) {
      this.itemToDelete = item
      this.deleteDialog = true
    },

    async confirmDelete() {
      if (!this.itemToDelete) return

      this.deleting = true
      
      try {
        const nopParts = this.itemToDelete.NOP.split('.')
        const payload = {
          kd_prop: nopParts[0] || '34',
          kd_dati2: nopParts[1] || '02',
          kd_kec: nopParts[2] || this.selectedKecamatan,
          kd_kel: nopParts[3] || this.selectedKelurahan,
          kd_blok: nopParts[4] || '000',
          no_urut: nopParts[5] || '000',
          kd_jns: nopParts[6] || '0',
          THN_PAJAK_SPPT: this.itemToDelete.THN_PAJAK_SPPT
        }

        await bpajakService.deleteBpajakData(payload)

        const index = this.tableData.findIndex(item => item.id === this.itemToDelete.id)
        if (index > -1) {
          this.tableData.splice(index, 1)
        }

        this.showSnackbar('Data berhasil dihapus', 'success')
      } catch (error) {
        this.showSnackbar('Error menghapus data: ' + error.message, 'error')
        console.error('Error deleting item:', error)
      } finally {
        this.deleting = false
        this.deleteDialog = false
        this.itemToDelete = null
      }
    },

    validateItem(item) {
      const requiredFields = ['NOP', 'NM_WP_SPPT', 'THN_PAJAK_SPPT']
      
      for (const field of requiredFields) {
        if (!item[field] || item[field].toString().trim() === '') {
          this.showSnackbar(`Field ${field} wajib diisi`, 'error')
          return false
        }
      }

      if (isNaN(item.PBB_YG_HARUS_DIBAYAR_SPPT) || item.PBB_YG_HARUS_DIBAYAR_SPPT < 0) {
        this.showSnackbar('PBB Yang Harus Dibayar harus berupa angka positif', 'error')
        return false
      }

      if (isNaN(item.FAKTOR_PENGURANG_SPPT) || item.FAKTOR_PENGURANG_SPPT < 0) {
        this.showSnackbar('Faktor Pengurang harus berupa angka positif', 'error')
        return false
      }
      return true
    },

    async saveAllChanges() {
      const editingItems = this.tableData.filter(item => item.isEditing)
      
      if (editingItems.length === 0) {
        this.showSnackbar('Tidak ada perubahan untuk disimpan', 'info')
        return
      }

      this.showSnackbar(`Menyimpan ${editingItems.length} data...`, 'info')
      
      let successCount = 0
      let errorCount = 0

      for (const item of editingItems) {
        try {
          await this.saveItem(item)
          successCount++
        } catch (error) {
          errorCount++
          console.error('Error saving item:', error)
        }
      }

      if (successCount > 0) {
        this.showSnackbar(`${successCount} data berhasil disimpan${errorCount > 0 ? `, ${errorCount} gagal` : ''}`, 
          errorCount > 0 ? 'warning' : 'success')
      }
    },

    cancelAllChanges() {
      const editingItems = this.tableData.filter(item => item.isEditing)
      
      if (editingItems.length === 0) {
        this.showSnackbar('Tidak ada perubahan untuk dibatalkan', 'info')
        return
      }

      editingItems.forEach(item => {
        this.cancelEdit(item)
      })

      this.showSnackbar(`${editingItems.length} perubahan dibatalkan`, 'info')
    },

    formatCurrency(value) {
      if (!value) return 'Rp 0'
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    },

    getStatusColor(status) {
      switch (status) {
        case '0': return 'red'
        case '1': return 'green'
        case '5': return 'blue'
        default: return 'grey'
      }
    },

    getStatusText(status) {
      switch (status) {
        case '0': return 'BELUM BAYAR'
        case '1': return 'SUDAH BAYAR'
        case '5': return 'SIMULASI'
        default: return 'UNKNOWN'
      }
    },


//Tambahan method for eksport terpilih

// 1. FUNGSI UTAMA UNTUK PROSES DOWNLOAD EXCEL
downloadExcelRawData(dataToExport, suffixFilename = 'Terpilih') {
    const exportHeaders = this.headers.filter(h => h.key !== 'actions' && h.key !== 'editStatus' && h.key !== 'index')
    
    const data = dataToExport.map((item, idx) => {
      const row = {}
      // Menambahkan nomor urut di excel hasil ekspor
      row['NOMOR'] = idx + 1 
      
      exportHeaders.forEach(h => {
        if (h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT' || h.key === 'FAKTOR_PENGURANG_SPPT') {
          row[h.title] = this.formatCurrency(item[h.key])
        } else if (h.key === 'STATUS_PEMBAYARAN_SPPT') {
          row[h.title] = this.getStatusText(item[h.key])
        } else {
          row[h.title] = item[h.key] || ''
        }
      })
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data PBB')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

    const fileName = `Data_PBB_${suffixFilename}_${this.selectedKecamatan}_${this.selectedKelurahan}_${this.THN_PAJAK_SPPT}.xlsx`
    saveAs(blob, fileName)
  },

  // 2. METHOD UNTUK DATA YANG DIPILIH VIA CHECKBOX
  exportSelectedToExcel() {
    // Tambahkan log ini untuk melihat isi data di browser
  console.log("Data terpilih saat ini:", this.selectedItems);
  console.log("Jumlah data terpilih:", this.selectedItems.length);
    if (this.selectedItems.length === 0) {
      this.showSnackbar('Tidak ada data yang dipilih untuk diekspor', 'warning')
      return
    }
    
    this.downloadExcelRawData(this.selectedItems, 'Terpilih')
    this.showSnackbar(`Berhasil mengekspor ${this.selectedItems.length} data terpilih ke Excel`, 'success')
  },

  // 3. METHOD JIKA MAU EKSPOR BERDASARKAN KRITERIA TERTENTU (Contoh: Hanya yang 'SUDAH BAYAR')
  exportSudahBayarToExcel() {
    // Filter data yang ada di tabel saat ini yang STATUS_PEMBAYARAN_SPPT == '1' (Sudah Bayar)
    const filteredData = this.tableData.filter(item => item.STATUS_PEMBAYARAN_SPPT === '1')
    
    if (filteredData.length === 0) {
      this.showSnackbar('Tidak ada data dengan kriteria "Sudah Bayar"', 'warning')
      return
    }

    this.downloadExcelRawData(filteredData, 'Sudah_Bayar')
    this.showSnackbar(`Berhasil mengekspor ${filteredData.length} data (Sudah Bayar) ke Excel`, 'success')
  },
  
  // Reset pilihan checkbox saat ganti kecamatan/kelurahan agar tidak terbawa
  onKecamatanChange() {
    this.selectedKelurahan = null;
    this.tableData = [];
    this.selectedItems = []; // reset checkbox
    this.kelurahanList = this.kelurahanMapping[this.selectedKecamatan] || [];
  },



  exportFilteredToExcel() {
  // 1. Gunakan 'let' (bukan const) agar nilainya bisa di-filter ulang oleh kotak 'search'
  // Ambil basis data awal dari computed property 'filteredTableData' (yang sudah disaring dropdown status)
  let dataToExport = [...this.filteredTableData]; 

  // 2. Jika user juga mengetikkan sesuatu di kolom search data-table, filter lagi datanya
  if (this.search) {
    const searchRegex = new RegExp(this.search, 'i');
    dataToExport = dataToExport.filter(item => {
      // Cari kecocokan di Nama WP, NOP, atau teks Status
      return (item.NM_WP_SPPT && searchRegex.test(item.NM_WP_SPPT)) || 
             (item.NOP && searchRegex.test(item.NOP)) || 
             searchRegex.test(this.getStatusText(item.STATUS_PEMBAYARAN_SPPT));
    });
  }

  // 3. Validasi jika hasil filter gabungan ternyata kosong
  if (dataToExport.length === 0) {
    this.showSnackbar('Tidak ada data hasil filter yang cocok untuk diekspor', 'warning');
    return;
  }

  // 4. Menentukan suffix nama file berdasarkan status terpilih di dropdown
  let namaFileSuffix = 'Semua_Status';
  if (this.filterStatusGlobal) {
    const statusObj = this.keteranganOptions.find(o => o.id === this.filterStatusGlobal);
    namaFileSuffix = statusObj ? statusObj.name.replace(/[^a-zA-Z0-9]/g, '_') : this.filterStatusGlobal;
  }
  
  // Jika ada tambahan filter dari text search, tambahkan informasi di nama file agar informatif
  if (this.search) {
    namaFileSuffix += `_search_${this.search.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // 5. Eksekusi download dan tampilkan notifikasi
  this.downloadExcelRawData(dataToExport, namaFileSuffix);
  this.showSnackbar(`Berhasil mengekspor ${dataToExport.length} data hasil filter ke Excel`, 'success');
},



 
  //modifikasi karena data sudah terfilter di layar
  exportByStatusToExcel() {
  // Ambil data yang sudah terfilter di layar saat ini
  const dataToExport = this.filteredTableData;

  if (dataToExport.length === 0) {
    this.showSnackbar('Tidak ada data yang tampil untuk diekspor', 'warning');
    return;
  }

  // Menentukan suffix nama file berdasarkan status terpilih
  let namaFileSuffix = 'Semua_Status';
  if (this.filterStatusGlobal) {
    const statusObj = this.keteranganOptions.find(o => o.id === this.filterStatusGlobal);
    namaFileSuffix = statusObj ? statusObj.name.replace(/[^a-zA-Z0-9]/g, '_') : this.filterStatusGlobal;
  }

  // Jalankan fungsi download excel bawaan Anda
  this.downloadExcelRawData(dataToExport, namaFileSuffix);
  this.showSnackbar(`Berhasil mengekspor ${dataToExport.length} data ke Excel`, 'success');
},



  // Fungsi utama pembuat Excel (Gunakan versi terpadu dari solusi sebelumnya)
  downloadExcelRawData(dataToExport, suffixFilename) {
    const exportHeaders = this.headers.filter(h => h.key !== 'actions' && h.key !== 'editStatus' && h.key !== 'index')
    
    // 1. Inisialisasi variabel untuk menampung total nominal (Gunakan tipe data angka/Number)
    let totalBayar = 0;
    let totalPengurang = 0;

    const data = dataToExport.map((item, idx) => {
      const row = {}
      row['NOMOR'] = idx + 1 
      
// Akumulasikan nilai untuk total (pastikan dikonversi ke angka agar tidak digabung sebagai teks)
    const bayarVal = Number(item['PBB_YG_HARUS_DIBAYAR_SPPT']) || 0;
        const pengurangVal = Number(item['FAKTOR_PENGURANG_SPPT']) || 0;
        
        totalBayar += bayarVal;
        totalPengurang += pengurangVal;

        exportHeaders.forEach(h => {
      if (h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT') {
        row[h.title] = bayarVal; // Simpan sebagai angka murni agar bisa diformat/dihitung di Excel
      } else if (h.key === 'FAKTOR_PENGURANG_SPPT') {
        row[h.title] = pengurangVal; // Simpan sebagai angka murni
      } else if (h.key === 'STATUS_PEMBAYARAN_SPPT') {
        row[h.title] = this.getStatusText(item[h.key])
      } else {
        row[h.title] = item[h.key] || ''
      }
    })
    return row
  })

  // 2. BUAT BARIS TOTAL BARU DI PALING BAWAH
  const totalRow = {};
  totalRow['NOMOR'] = 'TOTAL'; // Mengisi kolom nomor dengan teks "TOTAL"

  // Isi kolom lainnya dengan string kosong agar rapi, kecuali kolom Jumlah Bayar & Pengurang
  exportHeaders.forEach(h => {
    if (h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT') {
      totalRow[h.title] = totalBayar;
    } else if (h.key === 'FAKTOR_PENGURANG_SPPT') {
      totalRow[h.title] = totalPengurang;
    } else {
      totalRow[h.title] = ''; // Kosongkan kolom seperti Nama, NOP, dll di baris total
    }
  });

  // Masukkan baris total ke dalam array data utama
  data.push(totalRow);


  // --- BAGIAN CONVERT DAN FORMAT CELL (PENTING) ---
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Cari nama header / title kolom untuk Jumlah Bayar dan Jumlah Pengurang
  const headerBayarObj = exportHeaders.find(h => h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT');
  const headerPengurangObj = exportHeaders.find(h => h.key === 'FAKTOR_PENGURANG_SPPT');
  
  const titleBayar = headerBayarObj ? headerBayarObj.title : null;
  const titlePengurang = headerPengurangObj ? headerPengurangObj.title : null;

  // Lakukan looping pada setiap cell di worksheet untuk memberikan format ribuan (#,##0)
  for (let cellRef in worksheet) {
    if (cellRef[0] === '!') continue; // Skip property metadata worksheet
    
    const cell = worksheet[cellRef];
    
    // Pastikan cell tersebut berisi angka (tipe data 'n' = number)
    if (cell.t === 'n') {
      // Format '#,##0' otomatis menggunakan pemisah ribuan sesuai regional setting komputer (Titik di Indonesia)
      cell.z = '#,##0'; 
    }
  }

   // const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data PBB')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

    const fileName = `Data_PBB_${suffixFilename}_${this.selectedKecamatan}_${this.selectedKelurahan}_${this.THN_PAJAK_SPPT}.xlsx`
    saveAs(blob, fileName)
  },


    exportToPDF() {
      if (this.tableData.length === 0) {
        this.showSnackbar('Tidak ada data untuk diekspor', 'warning')
        return
      }

      const doc = new jsPDF('landscape')
      
      // Add title
      doc.setFontSize(16)
      doc.text('DATA KETETAPAN PBB KAB. KULON PROGO', 14, 15)
      
      // Add filter info
      doc.setFontSize(10)
      doc.text(`Kecamatan: ${this.selectedKecamatan} | Kelurahan: ${this.selectedKelurahan} | Tahun: ${this.THN_PAJAK_SPPT}`, 14, 25)
      
      doc.autoTable({
        startY: 30,
        head: [this.headers.filter(h => h.key !== 'actions' && h.key !== 'editStatus').map(h => h.title)],
        body: this.tableData.map(item =>
          this.headers.filter(h => h.key !== 'actions' && h.key !== 'editStatus').map(h => {
            if (h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT' || h.key === 'FAKTOR_PENGURANG_SPPT') {
              return this.formatCurrency(item[h.key])
            }
            if (h.key === 'STATUS_PEMBAYARAN_SPPT') {
              return this.getStatusText(item[h.key])
            }
            return item[h.key] || ''
          })
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      })
      
      doc.save(`Data_PBB_${this.selectedKecamatan}_${this.selectedKelurahan}_${this.THN_PAJAK_SPPT}.pdf`)
      this.showSnackbar('Data berhasil diekspor ke PDF', 'success')
    },



    exportToExcel() {
  if (this.tableData.length === 0) {
    this.showSnackbar('Tidak ada data untuk diekspor', 'warning')
    return
  }

  // Prepare data
  const exportHeaders = this.headers.filter(h => h.key !== 'actions' && h.key !== 'editStatus')
  const data = this.tableData.map(item => {
    const row = {}
    exportHeaders.forEach(h => {
      if (h.key === 'PBB_YG_HARUS_DIBAYAR_SPPT' || h.key === 'FAKTOR_PENGURANG_SPPT') {
        row[h.title] = this.formatCurrency(item[h.key])
      } else if (h.key === 'STATUS_PEMBAYARAN_SPPT') {
        row[h.title] = this.getStatusText(item[h.key])
      } else {
        row[h.title] = item[h.key] || ''
      }
    })
    return row
  })

  // Create worksheet and workbook
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data PBB')

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

  const fileName = `Data_PBB_${this.selectedKecamatan}_${this.selectedKelurahan}_${this.THN_PAJAK_SPPT}.xlsx`
  saveAs(blob, fileName)

  this.showSnackbar('Data berhasil diekspor ke Excel', 'success')
},


watch: {
  filterStatusGlobal(newStatus) {
    if (newStatus !== null && newStatus !== undefined) {
      // Otomatis memicu kolom search data-table mencari teks status (SUDAH BAYAR / BELUM BAYAR)
      this.search = this.getStatusText(newStatus);
    } else {
      this.search = '';
    }
  }
},


    showSnackbar(text, color = 'success') {
      this.snackbar.text = text
      this.snackbar.color = color
      this.snackbar.show = true
    },

    // Keyboard shortcuts
    handleKeydown(event) {
      // Ctrl+S untuk save all
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        this.saveAllChanges()
      }
      // Escape untuk cancel all
      if (event.key === 'Escape' && this.hasUnsavedChanges) {
        this.cancelAllChanges()
      }
      // Ctrl+N untuk add new
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        this.addNewRow()
      }
    },

    // Utility methods
    generateNOP(kd_blok = '000', no_urut = '000', kd_jns = '0') {
      return `34.02.${this.selectedKecamatan}.${this.selectedKelurahan}.${kd_blok}.${no_urut}.${kd_jns}`
    },

    // Auto-save functionality (optional)
    startAutoSave() {
      this.autoSaveInterval = setInterval(() => {
        if (this.hasUnsavedChanges) {
          this.saveAllChanges()
        }
      }, 300000) // Auto-save every 5 minutes
    },

    stopAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval)
        this.autoSaveInterval = null
      }
    },

    logout() {
      // Clear any unsaved changes warning
      if (this.hasUnsavedChanges) {
        const confirmLogout = confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin logout?')
        if (!confirmLogout) {
          return
        }
      }
      
      // Clear local storage
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // Redirect to login
      this.$router.push('/')
    }
  },

  // Lifecycle hooks
  mounted() {
    // Add keyboard event listeners
    document.addEventListener('keydown', this.handleKeydown)
    
    // Check authentication
    const user = localStorage.getItem('user')
    if (!user) {
      this.$router.push('/')
      return
    }
    
    // Set default year
    this.THN_PAJAK_SPPT = new Date().getFullYear().toString()
    
    // Optional: Start auto-save
    // this.startAutoSave()
  },

  beforeUnmount() {
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.handleKeydown)
    
    // Stop auto-save
    this.stopAutoSave()
  },

  // Watch for route changes
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) {
      const answer = confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?')
      if (answer) {
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  }
}
</script>

<style scoped>

.container {
  max-width: 1200px; /* Sesuaikan dengan lebar maksimum yang Anda inginkan */
  margin: 0 auto; /* Memusatkan komponen secara horizontal */
  padding-left: 10px; /* Tambahkan padding kiri */
  padding-right: 10px; /* Tambahkan padding kanan */
}

.v-data-table {
  margin-top: 16px;
}

.v-data-table :deep() .v-data-table__wrapper {
  overflow-x: auto;
}

/* Custom styling for inline editing */
.v-text-field.v-text-field--enclosed .v-text-field__details {
  display: none;
}

.v-text-field--dense .v-text-field__details {
  min-height: 0;
  padding: 0;
}

.v-select--dense .v-select__details {
  min-height: 0;
  padding: 0;
}

/* Highlight editing rows */
.v-data-table :deep() tbody tr {
  transition: background-color 0.3s ease;
}

.v-data-table :deep() tbody tr:hover {
  background-color: #f5f5f5 !important;
}

/* Style for rows being edited */
.editing-row {
  background-color: #fff3e0 !important;
  border-left: 4px solid #ff9800;
}

/* Style for new rows */
.new-row {
  background-color: #e3f2fd !important;
  border-left: 4px solid #2196f3;
}

/* Status chip styling */
.v-chip.v-size--small {
  height: 24px;
  font-size: 12px;
  font-weight: 500;
}

/* Action buttons styling */
.v-btn.v-btn--icon.v-size--small {
  width: 32px;
  height: 32px;
  margin: 2px;
}

/* Inline form controls styling */
.v-text-field--dense {
  margin-top: 0;
  padding-top: 0;
}

.v-text-field--dense .v-input__control {
  min-height: 36px;
}

.v-select--dense .v-input__control {
  min-height: 36px;
}

/* Loading state */
.v-data-table--loading {
  position: relative;
  opacity: 0.7;
}

/* Responsive design */
@media (max-width: 1200px) {
  .v-data-table :deep() .v-data-table__wrapper {
    font-size: 12px;
  }
  
  .v-text-field--dense,
  .v-select--dense {
    font-size: 12px;
  }
  
  .v-btn.v-btn--icon.v-size--small {
    width: 28px;
    height: 28px;
  }
  
  .v-chip.v-size--small {
    height: 20px;
    font-size: 10px;
  }
}

/* Custom scrollbar */
.v-data-table :deep() .v-data-table__wrapper::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.v-data-table :deep() .v-data-table__wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.v-data-table :deep() .v-data-table__wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.v-data-table :deep() .v-data-table__wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation for saving state */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.v-btn--loading {
  animation: pulse 1.0s infinite;
}

/* Validation error styling */
.v-text-field--error .v-input__control {
  border: 1px solid #f44336;
  border-radius: 4px;
}

/* Success state styling */
.v-text-field--success .v-input__control {
  border: 1px solid #4caf50;
  border-radius: 4px;
}

/* Focus styling for inline editing */
.v-text-field--focused .v-input__control {
  border: 2px solid #1976d2;
  border-radius: 4px;
}

.v-select--focused .v-input__control {
  border: 2px solid #1976d2;
  border-radius: 4px;
}

/* Keyboard shortcut hints */
.keyboard-hint {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 1000;
}

/* Print styles */
@media print {
  .v-btn,
  .v-text-field,
  .v-select {
    display: none !important;
  }
  
  .v-data-table :deep() .v-data-table__wrapper {
    overflow: visible !important;
  }
}

/* Dark theme support */
.theme--dark .editing-row {
  background-color: #3e2723 !important;
}

.theme--dark .new-row {
  background-color: #1a237e !important;
}

/* Accessibility improvements */
.v-btn[aria-label]:focus {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

/* Table cell padding adjustment for inline editing */
.v-data-table :deep() td {
  padding: 8px 16px !important;
}

.v-data-table :deep() td .v-input {
  margin: 0;
}

/* Status indicator positioning */
.status-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.editing {
  background-color: #ff9800;
}

.status-indicator.new {
  background-color: #2196f3;
}

.status-indicator.saved {
  background-color: #4caf50;
}

/* Notification styling */
.v-snackbar {
  z-index: 9999;
}

/* Button group styling */
.v-btn-group {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.v-btn-group .v-btn {
  margin: 0 !important;
}

/* Card styling */
.v-card {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.v-card-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

/* Form controls styling */
.v-text-field,
.v-select {
  margin-bottom: 8px;
}

/* Dialog styling */
.v-dialog .v-card {
  border-radius: 8px;
}

.v-dialog .v-card-title {
  background: #f44336;
  color: white;
}

/* Loading overlay */
.v-overlay--active {
  backdrop-filter: blur(2px);
}

/* Transition effects */
.v-data-table :deep() tbody tr {
  transition: all 0.2s ease;
}

.v-chip {
  transition: all 0.1s ease;
}

.v-btn {
  transition: all 0.1s ease;
}

/* Hover effects */
.v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.v-chip:hover {
  transform: scale(1.05);
}

/* Focus states */
.v-btn:focus {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.v-text-field:focus-within,
.v-select:focus-within {
  transform: scale(1.02);
}
</style>
