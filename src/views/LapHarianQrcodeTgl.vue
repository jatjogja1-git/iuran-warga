<template>
    <v-container fluid>
      <v-card class="elevation-2 rounded-lg">
        <v-card-title class="d-flex align-center pe-2">
          <v-icon icon="mdi-history" class="me-2" color="primary"></v-icon>
          Laporan Histori & Kuitansi QR Code Warga
        </v-card-title>
        <v-card-subtitle>Kelola iuran dalam rentang waktu tertentu, pantau histori pembayaran, dan cetak kuitansi ber-QR Code per warga.</v-card-subtitle>
  
        <v-divider class="my-3"></v-divider>
  
        <v-card-text>
          <v-row align="center">
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
  
            <!-- Input Pencarian Warga -->
            <v-col cols="12" sm="6" md="3">
              <v-text-field
                v-model="search"
                label="Cari nama warga..."
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
  
            <!-- Tombol Ekspor Rekap Rentang -->
            <v-col cols="12" sm="6" md="3" class="d-flex justify-sm-end">
              <v-btn
                color="primary"
                prepend-icon="mdi-file-pdf-box"
                :disabled="rekapHistori.length === 0 || isLoading"
                @click="generatePdfLaporanHistori"
                class="text-white w-full"
              >
                Ekspor Rekap PDF
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
  
        <!-- Tabel Pratinjau di Layar -->
        <v-data-table
          :headers="headers"
          :items="rekapHistori"
          :search="search"
          class="elevation-1"
          :loading="isLoading"
          loading-text="Sedang memuat data histori iuran..."
          no-data-text="Tidak ada transaksi iuran dalam rentang tanggal ini"
        >
          <!-- Format Kolom No -->
          <template v-slot:item.nomor="{ index }">
            {{ index + 1 }}
          </template>
  
          <!-- Format Kolom Histori Transaksi Sederhana di Layar -->
          <template v-slot:item.historiSummary="{ item }">
            <div v-if="item.histori.length > 0">
              <v-chip
                size="x-small"
                color="info"
                class="ma-1"
                v-for="(h, idx) in item.histori.slice(0, 2)"
                :key="idx"
              >
                {{ formatTanggalIndoSederhana(h.tanggal) }}: {{ formatRupiahSederhana(h.jumlah) }}
              </v-chip>
              <span v-if="item.histori.length > 2" class="text-caption text-grey">
                +{{ item.histori.length - 2 }} lainnya
              </span>
            </div>
            <span v-else class="text-caption text-grey-lighten-1">Tidak ada transaksi</span>
          </template>
  
          <!-- Format Kolom Status Pembayaran -->
          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.totalIuran >= 15000 ? 'success' : 'grey'"
              size="small"
              class="text-uppercase font-weight-bold"
            >
              {{ item.totalIuran > 15000 ? 'LUNAS' : 'BELUM LUNAS' }}
            </v-chip>
          </template>
  
          <!-- Format Kolom Rupiah -->
          <template v-slot:item.totalIuran="{ item }">
            <span class="font-weight-bold">{{ formatRupiah(item.totalIuran) }}</span>
          </template>
  
          <!-- Kolom Aksi Cetak Kuitansi QR Histori -->
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="success"
              size="small"
              density="comfortable"
              prepend-icon="mdi-qrcode"
              :disabled="!isQrLibraryLoaded || item.totalIuran === 0"
              @click="generateSingleKuitansiHistoriPdf(item)"
            >
              Kuitansi
            </v-btn>
          </template>
        </v-data-table>
  
        <v-card-text class="text-right mt-4 bg-grey-lighten-4 rounded-b-lg">
          <strong class="text-h6 text-primary">Total Penerimaan Rentang Ini: {{ formatRupiah(totalPenerimaanRentang) }}</strong>
        </v-card-text>
      </v-card>
  
      <!-- UI Notifikasi Sederhana pengganti alert() -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
        {{ snackbar.text }}
        <template v-slot:actions>
          <v-btn color="white" variant="text" @click="snackbar.show = false">Tutup</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '../firebase/configfix.js';
  import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
  
  // Library ekspor PDF
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';
  
  // --- State Variables ---
  const isLoading = ref(false);
  const isQrLibraryLoaded = ref(false);
  const rekapHistori = ref([]);
  const wargaList = ref([]);
  const search = ref('');
  const snackbar = ref({ show: false, text: '', color: '' });
  
  // Rentang tanggal default (Awal bulan s.d Hari ini)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const startDate = ref(firstDayOfMonth.toISOString().substring(0, 10));
  const endDate = ref(today.toISOString().substring(0, 10));
  
  const headers = [
    { title: 'No', key: 'nomor', width: '60px', sortable: false },
    { title: 'Nama Warga', key: 'namaWarga' },
    { title: 'Histori Singkat', key: 'historiSummary', sortable: false },
    { title: 'Status', key: 'status', width: '130px' },
    { title: 'Total Iuran', key: 'totalIuran', align: 'end', width: '160px' },
    { title: 'Cetak Bukti', key: 'actions', sortable: false, align: 'center', width: '130px' }
  ];
  
  // --- Computed ---
  const totalPenerimaanRentang = computed(() => {
    return rekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);
  });
  
  // --- Helper UI Snackbar ---
  const showNotification = (text, color = 'success') => {
    snackbar.value = { show: true, text, color };
  };
  
  // Format Rupiah Lengkap
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };
  
  // Format Rupiah Sederhana untuk Chip tabel layar
  const formatRupiahSederhana = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}k`;
    }
    return amount.toString();
  };
  
  // Format Tanggal Indonesia Sederhana (DD/MM)
  const formatTanggalIndoSederhana = (dateValue) => {
    if (!dateValue) return '';
    let dateObj = dateValue;
    if (typeof dateValue.toDate === 'function') {
      dateObj = dateValue.toDate();
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    }
    return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
  };
  
  // Format Tanggal Indonesia Lengkap (DD-MM-YYYY)
  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${bulanIndo[parseInt(month) - 1]} ${year}`;
  };
  
  // Format Objek Date/Firestore Timestamp ke DD-MM-YYYY HH:mm
  const formatFullDateTime = (dateValue) => {
    if (!dateValue) return '';
    let d = dateValue;
    if (typeof dateValue.toDate === 'function') {
      d = dateValue.toDate();
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      d = new Date(dateValue);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };
  
  // --- Memuat Library QR Generator Lokal (QRious) via CDN ---
  const loadQrLibrary = () => {
    return new Promise((resolve, reject) => {
      if (window.QRious) {
        isQrLibraryLoaded.value = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
      script.onload = () => {
        isQrLibraryLoaded.value = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Gagal memuat library QR Generator lokal.'));
      document.head.appendChild(script);
    });
  };
  
  // --- Ambil Data Warga ---
  const fetchWargaList = async () => {
    try {
      const q = query(collection(db, 'wargart'), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      wargaList.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Gagal memuat daftar warga:", error);
      showNotification("Gagal memuat daftar warga", "error");
    }
  };
  
  // --- Ambil Laporan Histori Berdasarkan Interval Tanggal ---
  const fetchLaporanHistori = async () => {
    isLoading.value = true;
    try {
      const start = new Date(startDate.value);
      start.setHours(0, 0, 0, 0);
  
      const end = new Date(endDate.value);
      end.setHours(23, 59, 59, 999);
  
      const q = query(
        collection(db, 'iuran'),
        where('tanggal', '>=', start),
        where('tanggal', '<=', end)
      );
  
      const querySnapshot = await getDocs(q);
      const iuranDalamRentang = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        };
      });
  
      // Inisialisasi daftar rekap dengan data warga
      const rekap = {};
      wargaList.value.forEach(wargart => {
        rekap[wargart.id] = {
          wargaId: wargart.id,
          namaWarga: wargart.nama,
          totalIuran: 0,
          histori: [] // Menyimpan riwayat iuran warga tersebut di interval ini
        };
      });
  
      // Masukkan data transaksi iuran dan kelompokkan per warga
      iuranDalamRentang.forEach(item => {
        if (rekap[item.wargaId]) {
          rekap[item.wargaId].totalIuran += item.jumlah;
          rekap[item.wargaId].histori.push({
            id: item.id,
            tanggal: item.tanggal,
            jumlah: item.jumlah,
            keterangan: item.keterangan || 'Iuran Jimpitan'
          });
        }
      });
  
      // Urutkan histori transaksi masing-masing warga berdasarkan tanggal terlama ke terbaru
      Object.keys(rekap).forEach(key => {
        rekap[key].histori.sort((a, b) => {
          const tA = a.tanggal.toDate ? a.tanggal.toDate() : new Date(a.tanggal);
          const tB = b.tanggal.toDate ? b.tanggal.toDate() : new Date(b.tanggal);
          return tA - tB;
        });
      });
  
      rekapHistori.value = Object.values(rekap);
    } catch (error) {
      console.error("Gagal memuat laporan histori:", error);
      showNotification("Gagal memuat laporan histori", "error");
    } finally {
      isLoading.value = false;
    }
  };
  
  /*
  // --- Generator QR Code Lokal -> Instan Tanpa Request Internet --- awalnya ini
  const generateQrCodeBase64Local = (text) => {
    if (!window.QRious) return null;
    
    const qr = new window.QRious({
      value: text,
      size: 200,
      level: 'M'
    });
    
    return qr.toDataURL('image/png');
  };
*/

//perbaikan dari atas sbb
const generateQrCodeBase64Local = (text) => {
  if (!window.QRious) return null;
  
  const qr = new window.QRious({
    value: text,
    size: 300,       // Naikkan resolusi dasar canvas agar gambar tajam di PDF
    level: 'H',      // Naikkan ke High (Toleransi kerusakan/distorsi hingga 30%)
    padding: 4       // Berikan margin/quiet zone pembatas di sekeliling QR Code
  });
  
  return qr.toDataURL('image/png');
};
  /*script default sdh jalan
  // --- 1. CETAK REKAP LAPORAN RENTANG TANGGAL (Bersih, Rapi & Elegan) ---
  const generatePdfLaporanHistori = () => {
    if (rekapHistori.value.length === 0) return;
  
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Desain Aksen Atas Slate Dark
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 8, 'F');
  
      // Header Utama
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("LAPORAN REKAPITULASI IURAN WARGA RT 06 KLEBAKAN SALAMREJO", 14, 20);
  
      // Informasi Rentang Tanggal
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
      doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, 32);
  
      doc.setLineWidth(0.3);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, 36, 196, 36);
  
      // Siapkan data tabel tanpa QR Code
      const columns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
        { header: 'Jumlah Transaksi', dataKey: 'transaksi' },
        { header: 'Status Pembayaran', dataKey: 'status' },
        { header: 'Total Penerimaan', dataKey: 'jumlah' }
      ];
  
      const bodyData = rekapHistori.value.map((item, index) => ({
        no: index + 1,
        namaWarga: item.namaWarga,
        transaksi: `${item.histori.length} kali bayar`,
        status: item.totalIuran >= 15000 ? "AKTIF / LUNAS" : "BELUM LUNAS",
        jumlah: formatRupiah(item.totalIuran)
      }));
  
      autoTable(doc, {
        columns: columns,
        body: bodyData,
        startY: 40,
        theme: 'striped',
        styles: {
          valign: 'middle',
          fontSize: 9,
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          no: { halign: 'center', cellWidth: 15 },
          namaWarga: { fontStyle: 'bold' },
          transaksi: { halign: 'center', cellWidth: 35 },
          status: { halign: 'center', cellWidth: 45 },
          jumlah: { halign: 'right', cellWidth: 35 }
        },
        // --- PERBAIKI BAGIAN FOOT INI ---
  foot: [
    [
      { 
        content: 'Total Penerimaan Rentang Ini', 
        colSpan: 4, 
        styles: { halign: 'right', fontStyle: 'bold'} 
      },
      { 
        content: formatRupiah(totalPenerimaanRentang.value), 
        styles: { halign: 'right', fontStyle: 'bold'} 
      }
    ]
  ], // Pastikan diakhiri koma untuk properti selanjutnya, bukan titik (.)
        margin: { left: 14, right: 14 }
      });
  
      // Bagian Tanda Tangan
      const finalY = doc.lastAutoTable.finalY + 15;
      if (finalY < 240) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text("Mengetahui,", 140, finalY);
        doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
        
        doc.setDrawColor(148, 163, 184);
        doc.line(140, finalY + 25, 185, finalY + 25);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
      }
  
      doc.save(`Rekap_Iuran_RT_${startDate.value}_sd_${endDate.value}.pdf`);
      showNotification("Rekap Laporan PDF berhasil diunduh.");
    } catch (error) {
      console.error("Gagal mencetak laporan rekap:", error);
      showNotification("Gagal mencetak rekap laporan", "error");
    }
  };
*/
//script perubahan

const generatePdfLaporanHistori = () => {
  if (rekapHistori.value.length === 0) return;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const totalPenerimaanLangsung = rekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);

    // Desain Atas Slate Dark
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 8, 'F');

    // Header Utama
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN REKAPITULASI IURAN WARGA RT", 14, 20);

    // Informasi Periode
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
    doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, 32);

    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 36, 196, 36);

    const columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
      { header: 'Jumlah Transaksi', dataKey: 'transaksi' },
      { header: 'Status Pembayaran', dataKey: 'status' },
      { header: 'Total Penerimaan', dataKey: 'jumlah' },
      { header: 'Verifikasi QR', dataKey: 'qrcode' }
    ];

    const bodyData = rekapHistori.value.map((item, index) => {
      const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';
      const validationCode = `RT-VAL-HIST-${item.wargaId}-${startDate.value.replace(/-/g, '')}`;

      const qrTextContent = `BUKTI DIGITAL HISTORI IURAN RT
ID: ${validationCode}
Nama Warga: ${item.namaWarga}
Periode: ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}
Total Pembayaran: ${formatRupiah(item.totalIuran)}
Status: ${statusPembayaran}`;

      let qrBase64 = null;
      if (window.QRious) {
        const qrInstance = new window.QRious({
          value: qrTextContent,
          size: 300,  // PERBAIKAN: Naikkan resolusi dasar agar kotak QR tajam di PDF
          level: 'H', // PERBAIKAN: Ubah ke High (toleransi distorsi kamera s.d 30%)
          padding: 4  // PERBAIKAN: Beri batas aman/quiet zone agar sensor HP fokus
        });
        qrBase64 = qrInstance.toDataURL('image/png');
      }

      return {
        no: index + 1,
        namaWarga: item.namaWarga,
        transaksi: `${item.histori.length} kali bayar`,
        status: statusPembayaran,
        jumlah: formatRupiah(item.totalIuran),
        qrcode: qrBase64
      };
    });

    autoTable(doc, {
      columns: columns,
      body: bodyData,
      startY: 40,
      theme: 'striped',
      
      // --- PERBAIKAN 1: Terapkan minCellHeight secara GLOBAL di sini ---
      styles: {
        valign: 'middle',     // Mengatur posisi teks semua kolom tegak lurus di tengah
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        minCellHeight: 22     // Memaksa seluruh baris (No, Nama, dll) ikut meninggi 22mm
      },
      
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        minCellHeight: 8      // Khusus baris judul tabel, tingginya dibuat normal saja
      },
      
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        namaWarga: { fontStyle: 'bold', cellWidth: 45 },
        transaksi: { halign: 'center', cellWidth: 30 },
        status: { halign: 'center', cellWidth: 32 },
        jumlah: { halign: 'right', cellWidth: 35 },
        qrcode: { halign: 'center', cellWidth: 30 } // Menghapus minCellHeight dari sini
      },
      
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; 
        }
      },

      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          const base64Img = data.cell.raw; 
          if (base64Img) {
            const qrSize = 15; // Ukuran cetak QR disesuaikan sedikit ke 15mm
            
            // Rumus penempatan titik tengah vertikal & horizontal
            const posX = data.cell.x + (data.cell.width / 2) - (qrSize / 2);
            const posY = data.cell.y + (data.cell.height / 2) - (qrSize / 2);
            
            doc.addImage(base64Img, 'PNG', posX, posY, qrSize, qrSize);
          }
        }
      },

      foot: [
        [
          { content: 'Total Penerimaan Rentang Ini', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', minCellHeight: 10 } },
          { content: formatRupiah(totalPenerimaanLangsung), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], minCellHeight: 10 } }
        ]
      ],
      margin: { left: 14, right: 14 }
    });

    // Bagian Tanda Tangan
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text("Mengetahui,", 140, finalY);
      doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(148, 163, 184);
      doc.line(140, finalY + 25, 185, finalY + 25);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
    }

    doc.save(`Rekap_Iuran_RT_${startDate.value}_sd_${endDate.value}.pdf`);
    showNotification("Rekap Laporan PDF berhasil diunduh.");
  } catch (error) {
    console.error("Gagal mencetak laporan rekap:", error);
    showNotification("Gagal mencetak rekap laporan", "error");
  }
};


/*
// --- 1. CETAK REKAP LAPORAN RENTANG TANGGAL DENGAN KOLOM QR CODE ---
const generatePdfLaporanHistori = () => {
  if (rekapHistori.value.length === 0) return;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Kalkulasi total langsung agar aman dari bug reaktivitas Vue
    const totalPenerimaanLangsung = rekapHistori.value.reduce((sum, item) => sum + item.totalIuran, 0);

    // Desain Aksen Atas Slate Dark
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 8, 'F');

    // Header Utama
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN REKAPITULASI IURAN WARGA RT", 14, 20);

    // Informasi Rentang Tanggal
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode Rentang  : ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`, 14, 27);
    doc.text(`Tanggal Cetak    : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, 32);

    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 36, 196, 36);

    // --- Tambahkan "Verifikasi" ke struktur Kolom Baru ---
    const columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
      { header: 'Jumlah Transaksi', dataKey: 'transaksi' },
      { header: 'Status Pembayaran', dataKey: 'status' },
      { header: 'Total Penerimaan', dataKey: 'jumlah' },
      { header: 'Verifikasi QR', dataKey: 'qrcode' } // Kolom Baru
    ];

    // Map data rekap dan buat QR Code instant per warga
    const bodyData = rekapHistori.value.map((item, index) => {
      const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';
      const validationCode = `RT-VAL-HIST-${item.wargaId}-${startDate.value.replace(/-/g, '')}`;

      // Format teks sesuai permintaan Anda
      const qrTextContent = `BUKTI DIGITAL HISTORI IURAN RT
ID: ${validationCode}
Nama Warga: ${item.namaWarga}
Periode: ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}
Total Pembayaran: ${formatRupiah(item.totalIuran)}
Status: ${statusPembayaran}`;

      // Generate Base64 Gambar via QRious secara sinkron
      let qrBase64 = null;
      if (window.QRious) {
        const qrInstance = new window.QRious({
          value: qrTextContent,
          size: 150, // Resolusi gambar canvas pas untuk tabel kecil
          level: 'M', // Menggunakan level M agar kotak tidak terlalu renik di ruang sempit
          padding: 2 // Beri sedikit batas agar deteksi kamera aman
        });
        qrBase64 = qrInstance.toDataURL('image/png');
      }

      return {
        no: index + 1,
        namaWarga: item.namaWarga,
        transaksi: `${item.histori.length} kali bayar`,
        status: statusPembayaran,
        jumlah: formatRupiah(item.totalIuran),
        qrcode: qrBase64 // Simpan data gambar base64 di properti ini
      };
    });

    // Jalankan Autotable dengan integrasi hook gambar
    autoTable(doc, {
      columns: columns,
      body: bodyData,
      startY: 40,
      theme: 'striped',
      styles: {
        valign: 'middle',
        fontSize: 9,
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        no: { halign: 'center', cellWidth: 10 },
        namaWarga: { fontStyle: 'bold', cellWidth: 45 },
        transaksi: { halign: 'center', cellWidth: 30 },
        status: { halign: 'center', cellWidth: 32 },
        jumlah: { halign: 'right', cellWidth: 35 },
       // qrcode: { halign: 'center', cellWidth: 30 } // Atur lebar kolom QR Code (30mm)
     // --- PERUBAHAN DI SINI: Atur tinggi minimal sel ---
     qrcode: { 
          halign: 'center', 
          cellWidth: 30,
          minCellHeight: 20 // Memaksa tinggi baris minimal 20mm (QR Code Anda ukurannya 14mm)
        }
      },
      
      // Mengosongkan teks mentah agar string base64 tidak bocor berupa tulisan di PDF
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          data.cell.text = ['']; 
        }
      },

      // Menggambar gambar QR Code tepat di tengah-tengah kotak sel tabel
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'qrcode') {
          const base64Img = data.cell.raw; // Mengambil string base64 asli
          if (base64Img) {
            const qrSize = 14; // Ukuran QR Code 14mm x 14mm di dalam sel tabel
            const posX = data.cell.x + (data.cell.width / 2) - (qrSize / 2);
            const posY = data.cell.y + (data.cell.height / 2) - (qrSize / 2);
            doc.addImage(base64Img, 'PNG', posX, posY, qrSize, qrSize);
          }
        }
      },

      foot: [
        [
          { content: 'Total Penerimaan Rentang Ini', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          // Colspan diubah menjadi 2 agar menutup kolom Jumlah + kolom QR Baru
          { content: formatRupiah(totalPenerimaanLangsung), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }
        ]
      ],
      margin: { left: 14, right: 14 }
    });

    // Bagian Tanda Tangan
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < 240) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text("Mengetahui,", 140, finalY);
      doc.text("Ketua RT / Bendahara,", 140, finalY + 5);
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(148, 163, 184);
      doc.line(140, finalY + 25, 185, finalY + 25);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
    }

    doc.save(`Rekap_Iuran_RT_${startDate.value}_sd_${endDate.value}.pdf`);
    showNotification("Rekap Laporan PDF berhasil diunduh.");
  } catch (error) {
    console.error("Gagal mencetak laporan rekap:", error);
    showNotification("Gagal mencetak rekap laporan", "error");
  }
};
*/
  
  // --- 2. CETAK KUITANSI HISTORI TUNGGAL (Detail Riwayat & Satu QR Code Terpusat) ---
  const generateSingleKuitansiHistoriPdf = async (item) => {
    if (!window.QRious) {
      showNotification("Engine QR Code belum siap. Coba muat ulang halaman.", "error");
      return;
    }
  
    try {
      // Membuat PDF ukuran A4 potret untuk menyajikan riwayat histori secara lengkap
      const doc = new jsPDF('p', 'mm', 'a4');
      const width = 210;
      const height = 297;
  
      const validationCode = `RT-VAL-HIST-${item.wargaId}-${startDate.value.replace(/-/g, '')}_${endDate.value.replace(/-/g, '')}`;
  
      // Desain isi ringkasan untuk QR Code Verifikasi
      const rincianSingkat = item.histori.map((h, i) => `${i+1}. ${formatFullDateTime(h.tanggal).split(' ')[0]}: ${formatRupiah(h.jumlah)}`).join('\n');

 // default ini, tapi qrcode sulit dibaca kamera hp
// KODE BARU (Status dinamis berdasarkan batas nominal Rp15.000)
    const statusPembayaran = item.totalIuran >= 15000 ? 'LUNAS' : 'BELUM LUNAS';

    /* script ini sudah jalan baik
     const qrTextContent = `BUKTI DIGITAL HISTORI IURAN RT
  ID: ${validationCode}
  Nama Warga: ${item.namaWarga}
  Periode: ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}
  Total Pembayaran: ${formatRupiah(item.totalIuran)}
  Status: ${statusPembayaran}`;
*/

//coba cara baru
// ISI QR CODE DIGANTI MENJADI LINK PENDEK (Sangat Mudah Dibaca Kamera)
const qrTextContent = `https://iuran-warga-five.vercel.app/verify-kuitansi?wargaId=${item.wargaId}&start=${startDate.value}&end=${endDate.value}`;

let qrBase64 = null;
if (window.QRious) {
  const qrInstance = new window.QRious({
    value: qrTextContent,
    size: 200,   // Cukup 200 karena teksnya pendek
    level: 'M',  // Cukup level M agar polanya bersih dan renggang
    padding: 0
  });
  qrBase64 = qrInstance.toDataURL('image/png');
}

//  wargaId=${item.wargaId}&start=${startDate.value}&end=${endDate.value}&status=${statusPembayaran}

/* default dari const qrTextContent di atas
  ID: ${validationCode}
  Warga: ${item.namaWarga}
  Periode: ${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}
  Pembayaran: ${formatRupiah(item.totalIuran)}
  Rincian Transaksi:
  ${rincianSingkat}`;
*/

// Mengubah data menjadi URL verifikasi singkat
//const qrTextContent = `https://iuran-warga-five.vercel.app/verify-histori/${item.wargaId}`;

      // Ambil gambar QR tunggal secara lokal
      const qrImageBase64 = generateQrCodeBase64Local(qrTextContent);
  
      // --- DEKORASI BINGKAI KUITANSI ---
      doc.setLineWidth(0.4);
      doc.setDrawColor(30, 41, 59);
      doc.rect(8, 8, width - 16, height - 16); // Bingkai Luar
  
      doc.setLineWidth(0.15);
      doc.setDrawColor(203, 213, 225);
      doc.rect(10, 10, width - 20, height - 20); // Bingkai Dalam
  
      // HEADER KUITANSI PREMIUM (DEEP NAVY)
      doc.setFillColor(30, 58, 138);
      doc.rect(10, 10, width - 20, 24, 'F');
  
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("KWITANSI & BUKTI PEMBAYARAN JIMPITAN WARGA RT.06 KLEBAKAN", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(226, 232, 240);
      doc.text("Sistem Keuangan RT Modern, Transparan, & Akuntabel", 16, 28);
  
      // INFORMASI UTAMA KUITANSI (KIRI)
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
  
      let currentY = 46;
      const drawMetaRow = (label, value, isBold = false) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, 14, currentY);
        doc.text(":", 54, currentY);
        if (isBold) {
          doc.setFont("helvetica", "bold");
        }
        doc.text(value, 58, currentY);
        currentY += 8;
      };
  
      drawMetaRow("No. Validasi Sistem", validationCode);
      drawMetaRow("Nama Lengkap Warga", item.namaWarga, true);
      drawMetaRow("Periode Histori", `${formatTanggalIndo(startDate.value)} s.d. ${formatTanggalIndo(endDate.value)}`);
      drawMetaRow("Total Akumulasi Iuran", formatRupiah(item.totalIuran), true);
  
      // TABEL HISTORI TRANSAKSI DI DALAM KUITANSI
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Rincian Setoran Pembayaran Jimpitan:", 14, currentY + 3);
  
      const historiColumns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Tanggal Pembayaran', dataKey: 'tanggal' },
        { header: 'Keterangan/Alokasi', dataKey: 'keterangan' },
        { header: 'Nominal Setoran', dataKey: 'jumlah' }
      ];
  
      const historiBody = item.histori.map((h, i) => ({
        no: i + 1,
        tanggal: formatFullDateTime(h.tanggal),
        keterangan: h.keterangan,
        jumlah: formatRupiah(h.jumlah)
      }));
  
      autoTable(doc, {
        columns: historiColumns,
        body: historiBody,
        startY: currentY + 7,
        theme: 'grid',
        styles: {
          valign: 'middle',
          fontSize: 9,
          cellPadding: 2.5
        },
        headStyles: {
          fillColor: [71, 85, 105], // Slate gray
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          no: { halign: 'center', cellWidth: 12 },
          tanggal: { halign: 'center', cellWidth: 45 },
          keterangan: { cellWidth: 'auto' },
          jumlah: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: 14, right: 14 }
      });
  
      let nextY = doc.lastAutoTable.finalY + 12;
  
      // JIKA TRANSAKSI TERLALU BANYAK, HINDARI OVERFLOW KE BINGKAI BAWAH
      if (nextY > 210) {
        doc.addPage();
        // Bingkai halaman kedua
        doc.setLineWidth(0.4);
        doc.setDrawColor(30, 41, 59);
        doc.rect(8, 8, width - 16, height - 16);
        doc.setLineWidth(0.15);
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, 10, width - 20, height - 20);
        nextY = 25;
      }
  
      // QR CODE VERIFIKASI (BAGIAN KIRI BAWAH)
      if (qrImageBase64) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, nextY, 115, 52, 2, 2, 'F');
  
        doc.addImage(qrImageBase64, 'PNG', 18, nextY + 4, 44, 44);
  
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("QR CODE VERIFIKASI RESMI", 68, nextY + 14);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Aplikasi validasi iuran digital RT.", 68, nextY + 20);
        doc.text("Pindai QR ini menggunakan kamera ponsel", 68, nextY + 25);
        doc.text("untuk melihat bukti rekam transaksi langsung", 68, nextY + 30);
        doc.text("secara digital.", 68, nextY + 35);
      }
  
      // AREA TANDA TANGAN (BAGIAN KANAN BAWAH)
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Mengetahui & Mengesahkan,", 142, nextY + 10);
      doc.text("Bendahara RT,", 142, nextY + 15);
  
      doc.setDrawColor(148, 163, 184);
      doc.line(140, nextY + 38, 192, nextY + 38); // Garis tanda tangan
      doc.setFont("helvetica", "bold");
      doc.text("Sistem RT Digital", 142, nextY + 43);
  
      // SIMPAN PDF INDIVIDU WARGA
      const cleanFileName = item.namaWarga.replace(/\s+/g, '_');
      doc.save(`Kwitansi_Jimpitan_${cleanFileName}.pdf`);
      showNotification(`Kuitansi histori untuk ${item.namaWarga} berhasil dibuat!`);
  
    } catch (error) {
      console.error("Gagal membuat kuitansi histori:", error);
      showNotification("Gagal mencetak kuitansi histori warga", "error");
    }
  };
  
  // --- Lifecycle Hook ---
  onMounted(async () => {
    try {
      await loadQrLibrary();
    } catch (error) {
      console.error(error);
      showNotification("Gagal memuat pustaka QR Code. Menggunakan fallback API...", "warning");
    }
    await fetchWargaList();
    await fetchLaporanHistori();
  });
  </script>