<template>
  <v-container>
    <v-card class="elevation-1">
      <v-card-title class="d-flex align-center">
        REKONSILIASI DATA PBB (UPLOAD JSON)
        <v-spacer></v-spacer>
        <v-btn-group>
          <v-btn @click="exportToExcel" color="success">Export Excel</v-btn>
          <v-btn @click="exportToPDF" color="success" class="ml-2">Export PDF</v-btn>
          <v-btn @click="exportDataHasil" color="success" class="ml-2">Export Json</v-btn>
          <v-btn @click="logout" color="primary" class="ml-2">Logout</v-btn>
        </v-btn-group>
      </v-card-title>

      <!-- Bagian Upload File JSON -->
      <v-card class="mb-4 pa-4" elevation="2">
        <v-card-title class="text-subtitle-1">
          <v-icon color="primary" class="mr-2">mdi-database-import</v-icon>
          Upload File JSON Tagihan
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
            *Upload file JSON untuk langsung membandingkan status pembayaran dengan data Firestore berdasarkan rentang tanggal di bawah.
          </small>
        </v-card-text>
      </v-card>

      <!-- Filter Rentang Tanggal (Otomatis Memicu Rekonsiliasi) -->
      <v-row class="px-4">
        <v-col cols="12" md="3">
          <v-text-field v-model="startDate" label="Tanggal Awal" type="date" variant="outlined" density="compact"></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="endDate" label="Tanggal Akhir" type="date" variant="outlined" density="compact"></v-text-field>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            label="Cari Data (NOP / Nama WP / Alamat)"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
          ></v-text-field>
        </v-col>
      </v-row>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="itemsWithIndex" 
          :search="search"
          :loading="loading"
          class="elevation-1"
        >


        <template v-slot:item.tanggal_bayar="{ item }">
            <v-chip
                v-if="item.tanggal_bayar !== '-'"
                color="success"
                size="small"
                variant="outlined"
                link
                @click="showDetail(item)"
            >
                <v-icon start icon="mdi-calendar-check" size="small"></v-icon>
                {{ item.tanggal_bayar }}
            </v-chip>
            <span v-else class="text-grey">-</span>
            </template>

          <!-- Format Kolom Rupiah PBB -->
          <template v-slot:item.PBB_YG_HARUS_DIBAYAR_SPPT="{ item }">
            {{ formatRupiah(item.PBB_YG_HARUS_DIBAYAR_SPPT) }}
          </template>

          <!-- Format Kolom Status Pembayaran -->
          <template v-slot:item.status="{ item }">
            <v-chip :color="item.status === 'LUNAS' ? 'success' : 'error'" size="small">
              {{ item.status }}
            </v-chip>
          </template>

            <template v-slot:item.kurangBayar="{ item }">
            <span :class="item.rawKurangBayar > 0 ? 'text-error font-weight-bold' : 'text-success'">
                {{ item.kurangBayar }}
            </span>
            </template>

        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Snackbar Notifikasi -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
    <!-- Tambahkan di bagian bawah template sebelum penutup v-container -->
<v-dialog v-model="dialogDetail" max-width="500px">
  <v-card>
    <v-card-title class="bg-primary text-white">Detail Pembayaran PBB</v-card-title>
    <v-card-text class="mt-4">
      <v-list density="compact">
        <v-list-item title="NOP" :subtitle="selectedItem.NOP"></v-list-item>
        <v-list-item title="Nama Wajib Pajak" :subtitle="selectedItem.NM_WP_SPPT"></v-list-item>
        <v-list-item title="Tahun Pajak" :subtitle="selectedItem.THN_PAJAK_SPPT"></v-list-item>
        <v-list-item title="Total Terbayar" :subtitle="selectedItem.totalTerbayar"></v-list-item>
        <v-list-item title="Tanggal & Waktu Bayar" :subtitle="selectedItem.rawTanggalBayar"></v-list-item>
      </v-list>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" text @click="dialogDetail = false">Tutup</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>
  </v-container>
</template>

<script>
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../firebase/config'; // Sesuaikan jalur file konfigurasi Firebase Anda

export default {
  name: 'DatobpajakUploadView',
  data() {
    return {
      dialogDetail: false,
      selectedItem: {},
      search: '',
      loading: false,
      tableData: [],
      originalData: [], // Menyimpan data mentah dari file JSON yang di-upload
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date().toISOString().substring(0, 10),
      headers: [
        { title: 'No', key: 'index', sortable: false },  
        { title: 'NOP', key: 'NOP'},
        { title: 'Nama WP', key: 'NM_WP_SPPT'},
        { title: 'Alamat OP', key: 'ALAMAT'},
        { title: 'Tahun Pajak', key: 'THN_PAJAK_SPPT' },
        { title: 'PBB Harus Bayar', key: 'PBB_YG_HARUS_DIBAYAR_SPPT'},
        { title: 'Total Terbayar', key: 'totalTerbayar' },
        { title: 'Kurang Bayar', key: 'kurangBayar' }, // <-- Kolom baru
        { title: 'Tanggal Bayar', key: 'tanggal_bayar' },
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
    // Jika tanggal diubah, otomatis lakukan rekonsiliasi ulang dengan data JSON yang sudah ada
    startDate() { this.reconcileData(); },
    endDate() { this.reconcileData(); }
  },
  
  methods: {

// Fungsi untuk menampilkan pop-up detail saat tanggal diklik
showDetail(item) {
  this.selectedItem = item;
  this.dialogDetail = true;
},

// Perbarui fungsi format tanggal agar lebih interaktif/lengkap
formatFirestoreDate(timestamp) {
  if (!timestamp) return '-';
  let date;
  if (timestamp && typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return '-';

  // Format tanggal cantik
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
},

// Konversi Timestamp Firestore ke Format Tanggal Indonesia (DD-MM-YYYY / Readable)
formatFirestoreDate(timestamp) {
  if (!timestamp) return '-';
  
  // Cek jika itu adalah objek Timestamp dari Firestore (memiliki properti seconds)
  let date;
  if (timestamp && typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // Jika bentuknya string biasa
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return '-';

  // Format tanggal menjadi DD/MM/YYYY atau sesuai keinginan
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
},

    // Fungsi untuk membaca file JSON yang di-upload
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.loading = true;
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const parsedData = JSON.parse(e.target.result);
          if (!Array.isArray(parsedData)) {
            throw new Error("Format JSON harus berupa array of objects.");
          }
          
          this.originalData = parsedData; // Simpan ke data mentah
          await this.reconcileData();     // Proses pencocokan dengan Firestore
          this.showSnackbar('File JSON berhasil dimuat dan direkonsiliasi!', 'success');
        } catch (err) {
          console.error(err);
          this.showSnackbar('Gagal memproses file JSON. Pastikan format benar.', 'error');
          this.loading = false;
        }
      };
      reader.readAsText(file);
    },

    // Mengambil data pembayaran dari Firestore berdasarkan rentang tanggal
    async getPembayaranFromFirestore() {
      if (!this.startDate || !this.endDate) return [];
      
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59);

      try {
        const q = query(
          collection(db, "pembayaran"),
          where("tanggal", ">=", start),
          where("tanggal", "<=", end)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs;
      } catch (err) {
        console.error("Error mengambil data Firestore:", err);
        return [];
      }
    },

    // Inti proses penggabungan data JSON dan Firestore
    async reconcileData() {
      if (this.originalData.length === 0) return;

      this.loading = true;
      try {
        const pembayaranSnapshot = await this.getPembayaranFromFirestore();
        const mapPembayaran = new Map();

        pembayaranSnapshot.forEach(doc => {
          const d = doc.data();

          // PERHATIKAN DI SINI: 
            // Firestore menggunakan field 'd.tahun', sedangkan JSON menggunakan 'THN_PAJAK_SPPT'
            // Pastikan kedua sumber menggunakan acuan nama field yang sama untuk kuncinya.
            //const nop = d.NOP;
            //const tahunFirestore = d.tahun; // Sesuai nama field di Firestore Anda           
            //const key = `${nop}_${tahunFirestore}`;
            
          // Membuat kunci unik berdasarkan NOP dan Tahun Pajak
          //mapPembayaran.set(`${d.NOP}_${d.tahun}`, d); awalnya ini
         // const key = `${d.NOP}_${d.tahun}`; awalnya ini
            const key = `${String(d.NOP).trim()}_${String(d.tahun).trim()}`;

            // Konversi tanggal Firestore ke objek Date untuk perbandingan
                let tanggalBaru = null;
                if (d.tanggal && typeof d.tanggal.seconds === 'number') {
                    tanggalBaru = new Date(d.tanggal.seconds * 1000);
                } else if (d.tanggal instanceof Date) {
                    tanggalBaru = d.tanggal;
                } else if (d.tanggal) {
                    tanggalBaru = new Date(d.tanggal);
                }

            // Jika NOP dan Tahun sudah ada, akumulasikan jumlahnya (untuk sistem angsuran)
            if (mapPembayaran.has(key)) {
                const existing = mapPembayaran.get(key);
                existing.jumlah += Number(d.jumlah || 0);

            // 2. Bandingkan tanggal: Ambil yang paling baru (akhir)
            let tanggalExisting = existing.tanggalObj || new Date(0);
            if (tanggalBaru && tanggalBaru > tanggalExisting) {
            existing.tanggal = d.tanggal; // Update ke tanggal transaksi terakhir
            existing.tanggalObj = tanggalBaru;
            }

            } else {
                mapPembayaran.set(key, { ...d, jumlah: Number(d.jumlah || 0), tanggalObj: tanggalBaru });
            }
        });

        // Mapping ulang data JSON dengan status dari Firestore
        this.tableData = this.originalData.map(item => {
//          const key = `${item.NOP}_${item.THN_PAJAK_SPPT}`;
          const key = `${String(item.NOP).trim()}_${String(item.THN_PAJAK_SPPT).trim()}`;
          const dataBayar = mapPembayaran.get(key);
            // 1. Ambil nilai tagihan yang harus dibayar dari JSON (bersihkan karakter selain angka)
            const pbbHarusBayar = Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));

            // 2. Ambil total yang sudah dibayar dari akumulasi Firestore
            const totalTerbayarVal = dataBayar ? Number(dataBayar.jumlah || 0) : 0;

            // Hitung sisa kurang bayar (jika minus/lebih bayar, jadikan 0)
            const sisaKurang = pbbHarusBayar - totalTerbayarVal;
            const kurangBayarVal = sisaKurang > 0 ? sisaKurang : 0;

            // 3. Tentukan status berdasarkan perbandingan nominal uang
            let statusBayar = 'BELUM LUNAS';
            if (dataBayar) {
            if (totalTerbayarVal >= pbbHarusBayar) {
                statusBayar = 'LUNAS';
            } else {
                statusBayar = 'KURANG BAYAR'; // Atau 'CICILAN' / 'SEBAGIAN'
            }
            }

            return {
            ...item,
                status: statusBayar,
                totalTerbayar: this.formatRupiah(totalTerbayarVal),
                kurangBayar: this.formatRupiah(kurangBayarVal), // Simpan format rupiah kurang bayar
                rawKurangBayar: kurangBayarVal, // Disimpan bentuk angka untuk styling kondisi jika perlu
                tanggal_bayar: dataBayar ? this.formatFirestoreDate(dataBayar.tanggal) : '-',
                rawTanggalBayar: dataBayar ? (dataBayar.tanggal?.seconds ? new Date(dataBayar.tanggal.seconds * 1000).toLocaleString('id-ID') : dataBayar.tanggal) : '-'
            };

        });
      } catch (err) {
        console.error(err);
        this.showSnackbar('Terjadi kesalahan saat rekonsiliasi', 'error');
      } finally {
        this.loading = false;
      }
    },

    formatRupiah(value) {
      if (!value) return 'Rp 0';
      const rawValue = String(value).replace(/[^0-9]/g, '');
      const numberValue = Number(rawValue);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(numberValue);
    },

    exportDataHasil() {
      if (this.tableData.length === 0) {
        this.showSnackbar('Tidak ada data untuk diekspor', 'warning');
        return;
      }
      const jsonString = JSON.stringify(this.tableData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Hasil_Rekonsiliasi_PBB_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showSnackbar('Data berhasil diekspor ke JSON', 'success');
    },

    exportToExcel() {
      if (this.tableData.length === 0) {
        this.showSnackbar('Tidak ada data untuk diekspor', 'warning');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(this.tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekonsiliasi PBB');
      XLSX.writeFile(wb, 'Hasil_Rekonsiliasi_PBB.xlsx');
    },

 exportToPDF() {
  if (this.tableData.length === 0) {
    this.showSnackbar('Tidak ada data untuk diekspor', 'warning');
    return;
  }
  
  const doc = new jsPDF('l', 'mm', 'a4');

  // 1. Judul Dokumen
  doc.setFontSize(16);
  doc.text("Laporan Rekonsiliasi Pembayaran PBB", 14, 15);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  // 2. Hitung Total Akumulasi (Sum) untuk kolom nominal
  let totalPbbNum = 0;
  let totalBayarNum = 0;
  let totalKurangNum = 0;

  const tableBody = this.tableData.map((item, index) => {
    const pbbVal = Number(String(item.PBB_YG_HARUS_DIBAYAR_SPPT || 0).replace(/[^0-9]/g, ''));
    const bayarVal = Number(String(item.totalTerbayar || 0).replace(/[^0-9]/g, ''));
    const kurangVal = Number(String(item.rawKurangBayar || 0));

    totalPbbNum += pbbVal;
    totalBayarNum += bayarVal;
    totalKurangNum += kurangVal;

    return [
      index + 1,
      item.NOP,
      item.NM_WP_SPPT,
      item.THN_PAJAK_SPPT,
      this.formatRupiah(pbbVal),
      this.formatRupiah(bayarVal),
      this.formatRupiah(kurangVal),
      item.status
    ];
  });

  // 3. Tambahkan Baris Total di bagian akhir tabel
  tableBody.push([
    '', '', '', 'TOTAL :', 
    this.formatRupiah(totalPbbNum), 
    this.formatRupiah(totalBayarNum), 
    this.formatRupiah(totalKurangNum), 
    ''
  ]);

  // 4. Generate Tabel menggunakan autoTable
  autoTable(doc, {
    startY: 30,
    head: [['No', 'NOP', 'Nama WP', 'Tahun', 'PBB Harus Bayar', 'Total Terbayar', 'Kurang Bayar', 'Status']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  // 5. PERBAIKAN UTAMA: Looping halaman di akhir untuk mencetak nomor halaman yang valid
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i); // Pindah ke halaman ke-i
    doc.setFontSize(9);
    doc.setTextColor(100);
    
    const pageString = `halaman ${i} dari ${pageCount} halaman`;
    
    // Cetak teks nomor halaman di pojok kanan bawah setiap halaman
    doc.text(pageString, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  // 6. Simpan File PDF
  doc.save('Hasil_Rekonsiliasi_PBB.pdf');
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