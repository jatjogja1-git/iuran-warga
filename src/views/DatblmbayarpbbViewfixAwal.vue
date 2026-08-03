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
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { bpajakService } from '@/apiauth_blmbyrfix.js'
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
      kelurahanList: [],
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
      

tahunList: Array.from({ length: 6 }, (_, i) => {
        const year = String(new Date().getFullYear() - i);
        return { name: year, code: year };
      }),

      headers: [
        { title: 'No', key: 'index', sortable: false },  
        { title: 'NOP', key: 'NOP'},
        { title: 'Nama WP', key: 'NM_WP_SPPT'},
        { title: 'Alamat OP', key: 'ALAMAT'},
        { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
        { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT'},
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
  methods: {
    getFilteredExportData() {
      if (!this.search) return this.tableData;
      const keyword = this.search.toLowerCase().trim();
      return this.tableData.filter(item => {
        const nop = String(item.NOP || '').toLowerCase();
        const nama = String(item.NM_WP_SPPT || '').toLowerCase();
        const alamat = String(item.ALAMAT || '').toLowerCase();
        return nop.includes(keyword) || nama.includes(keyword) || alamat.includes(keyword);
      });
    },

    exportDataBelumBayar() {
      const dataToExport = this.getFilteredExportData();

      if (dataToExport.length === 0) {
        this.showSnackbar('Data tidak tersedia untuk diekspor', 'error');
        return;
      }

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Data_Belum_Bayar_PBB_${this.selectedTahun || 'PBB'}_${this.selectedKecamatan || 'PBB'}_${this.selectedKelurahan || 'PBB'}.json`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showSnackbar('Data berhasil diekspor ke JSON', 'success');
    },

    exportToExcel() {
      const dataToExport = this.getFilteredExportData();

      if (dataToExport.length === 0) {
        this.showSnackbar('Data tidak tersedia untuk diekspor', 'error');
        return;
      }

      let totalPbbNum = 0;
      const excelRows = dataToExport.map((item, index) => {
        const pbbVal = Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));
        totalPbbNum += pbbVal;

        return {
          'No': index + 1,
          'NOP': item.NOP || '',
          'Nama WP': item.NM_WP_SPPT || '',
          'Alamat OP': item.ALAMAT || '',
          'Tahun Pajak': item.THN_PAJAK_SPPT || '',
          'PBB Harus Bayar': pbbVal,
          'Tanggal Jatuh Tempo': item.TGL_JATUH_TEMPO_SPPT || ''
        };
      });

      excelRows.push({
        'No': '',
        'NOP': '',
        'Nama WP': '',
        'Alamat OP': 'JUMLAH TOTAL :',
        'Tahun Pajak': '',
        'PBB Harus Bayar': totalPbbNum,
        'Tanggal Jatuh Tempo': ''
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ c: 5, r: R });
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '"Rp "#,##0';
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Belum Bayar PBB');
      XLSX.writeFile(wb, 'Data_Belum_Bayar_PBB.xlsx');
      this.showSnackbar('Data berhasil diekspor ke Excel', 'success');
    },

    exportToPDF() {
      const dataToExport = this.getFilteredExportData();

      if (dataToExport.length === 0) {
        this.showSnackbar('Data tidak tersedia untuk diekspor', 'error');
        return;
      }

      const doc = new jsPDF('landscape');

      doc.setFontSize(16);
      doc.text("Laporan Data Belum Bayar PBB", 14, 15);
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

      // Gunakan data bersih murni tanpa baris subtotal buatan
      const tableBody = dataToExport.map((item, index) => [
        index + 1,
        item.NOP,
        item.NM_WP_SPPT,
        item.ALAMAT,
        item.THN_PAJAK_SPPT,
        this.formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT),
        item.TGL_JATUH_TEMPO_SPPT
      ]);

      const grandTotal = dataToExport.reduce((sum, item) => {
        return sum + Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));
      }, 0);

      const totalPagesExp = '{total_pages_count_string}';
      
      // Variabel untuk menyimpan akumulasi subtotal per halaman secara otomatis
      let currentPage = 1;
      let pageSubTotal = 0;
      const pageSubTotals = {};

      // Hitung subtotal tiap halaman berdasarkan jatah tampil autotable (~18-20 baris per halaman landscape)
      const itemsPerPage = 19; 
      dataToExport.forEach((item, index) => {
        const pbbVal = Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));
        const pageNum = Math.floor(index / itemsPerPage) + 1;
        if (!pageSubTotals[pageNum]) pageSubTotals[pageNum] = 0;
        pageSubTotals[pageNum] += pbbVal;
      });

      autoTable(doc, {
        startY: 28,
        head: [['No', 'NOP', 'Nama WP', 'Alamat OP', 'Tahun', 'PBB Harus Bayar', 'Jatuh Tempo']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          5: { halign: 'right' }
        },
        foot: [['', '', '', 'JUMLAH TOTAL KESELURUHAN :', '', this.formatRupiah(grandTotal), '']],
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        
        didDrawPage: (data) => {
          currentPage = data.pageNumber;
          
          // Cetak Subtotal Halaman di bagian bawah tabel pada halaman tersebut
          const subTotalVal = pageSubTotals[currentPage] || 0;
          const finalY = data.cursor.y; // Titik akhir tabel pada halaman ini
          
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          
          // Kotak ringkas subtotal halaman di bagian bawah
          doc.setFillColor(240, 240, 240);
          doc.rect(14, finalY + 2, 269, 6, 'F'); // Lebar menyesuaikan lanskap
          
          doc.text("SUBTOTAL HALAMAN INI :", 115, finalY + 6);
          doc.text(this.formatRupiah(subTotalVal), 260, finalY + 6, { align: 'right' });

          // Nomor halaman dinamis
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          const pageStr = `Halaman ${currentPage} dari ${totalPagesExp}`;
          doc.text(
            pageStr,
            doc.internal.pageSize.getWidth() - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        }
      });

      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(totalPagesExp);
      }

      doc.save('Data_Belum_Bayar_PBB.pdf');
      this.showSnackbar('Data berhasil diekspor ke PDF', 'success');
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
      this.selectedKelurahan = null;
      this.tableData = [];
      this.kelurahanList = this.kelurahanMapping[this.selectedKecamatan] || [];
    },

    async fetchData() {
      if (!this.selectedKecamatan || !this.selectedKelurahan || !this.selectedTahun) return;
      this.loading = true;
      try {
        const response = await bpajakService.getBpajakData(
          this.selectedKecamatan,
          this.selectedKelurahan,
          this.selectedTahun
        );
        this.tableData = response.data;
      } catch (error) {
        this.showSnackbar('Error fetching data', 'error');
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.$router.push('/');
    },

    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    }
  }
}
</script>
