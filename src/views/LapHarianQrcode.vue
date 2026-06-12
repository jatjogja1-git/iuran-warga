<template>
    <v-container fluid>
      <v-card class="elevation-2 rounded-lg">
        <v-card-title class="d-flex align-center pe-2">
          <v-icon icon="mdi-file-document-check" class="me-2" color="primary"></v-icon>
          Laporan Harian & Kuitansi QR Code Warga
        </v-card-title>
        <v-card-subtitle>Kelola iuran harian, cetak rekapitulasi harian, atau buat Kuitansi QR Code instan per warga.</v-card-subtitle>
  
        <v-divider class="my-3"></v-divider>
  
        <v-card-text>
          <v-row align="center">
            <!-- Filter Tanggal Harian -->
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="targetDate"
                label="Pilih Tanggal Laporan"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar"
                hide-details
                @change="fetchLaporanHarian"
              ></v-text-field>
            </v-col>
  
            <!-- Tombol Ekspor Rekap Harian -->
            <v-col cols="12" sm="6" md="8" class="d-flex justify-sm-end">
              <v-btn
                color="primary"
                prepend-icon="mdi-file-pdf-box"
                :disabled="rekapHarian.length === 0 || isLoading"
                @click="generatePdfLaporanHarian"
                class="text-white"
              >
                Ekspor Rekap PDF
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
  
        <!-- Tabel Pratinjau di Layar -->
        <v-data-table
          :headers="headers"
          :items="rekapHarian"
          class="elevation-1"
          :loading="isLoading"
          loading-text="Sedang memuat data iuran harian..."
          no-data-text="Tidak ada transaksi iuran pada tanggal ini"
        >
          <!-- Format Kolom No -->
          <template v-slot:item.nomor="{ index }">
            {{ index + 1 }}
          </template>
  
          <!-- Format Kolom Status Pembayaran -->
          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.totalIuran > 0 ? 'success' : 'grey'"
              size="small"
              class="text-uppercase font-weight-bold"
            >
              {{ item.totalIuran > 0 ? 'LUNAS' : 'BELUM BAYAR' }}
            </v-chip>
          </template>
  
          <!-- Format Kolom Rupiah -->
          <template v-slot:item.totalIuran="{ item }">
            {{ formatRupiah(item.totalIuran) }}
          </template>
  
          <!-- Kolom Aksi Cetak Kuitansi QR Tunggal -->
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="success"
              size="small"
              density="comfortable"
              prepend-icon="mdi-qrcode"
              :disabled="!isQrLibraryLoaded"
              @click="generateSingleKuitansiPdf(item)"
            >
              Kuitansi
            </v-btn>
          </template>
        </v-data-table>
  
        <v-card-text class="text-right mt-4 bg-grey-lighten-4 rounded-b-lg">
          <strong class="text-h6 text-primary">Total Iuran Hari Ini: {{ formatRupiah(totalHarian) }}</strong>
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
  import { db } from '../firebase/config';
  import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
  
  // Library ekspor PDF
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';
  
  // --- State Variables ---
  const isLoading = ref(false);
  const isQrLibraryLoaded = ref(false);
  const rekapHarian = ref([]);
  const wargaList = ref([]);
  const snackbar = ref({ show: false, text: '', color: '' });
  
  // Tanggal target default ke hari ini (Format: YYYY-MM-DD)
  const targetDate = ref(new Date().toISOString().substring(0, 10));
  
  const headers = [
    { title: 'No', key: 'nomor', width: '70px', sortable: false },
    { title: 'Nama Warga', key: 'namaWarga' },
    { title: 'Status', key: 'status', width: '150px' },
    { title: 'Jumlah Iuran', key: 'totalIuran', align: 'end', width: '200px' },
    { title: 'Aksi Kuitansi', key: 'actions', sortable: false, align: 'center', width: '150px' }
  ];
  
  // --- Computed ---
  const totalHarian = computed(() => {
    return rekapHarian.value.reduce((sum, item) => sum + item.totalIuran, 0);
  });
  
  // --- Helper UI Snackbar ---
  const showNotification = (text, color = 'success') => {
    snackbar.value = { show: true, text, color };
  };
  
  // Format Rupiah
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };
  
  // Format Tanggal Indonesia (DD-MM-YYYY)
  const formatTanggalIndo = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${bulanIndo[parseInt(month) - 1]} ${year}`;
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
  
  // --- Ambil Laporan Harian ---
  const fetchLaporanHarian = async () => {
    isLoading.value = true;
    try {
      const start = new Date(targetDate.value);
      start.setHours(0, 0, 0, 0);
  
      const end = new Date(targetDate.value);
      end.setHours(23, 59, 59, 999);
  
      const q = query(
        collection(db, 'iuran'),
        where('tanggal', '>=', start),
        where('tanggal', '<=', end)
      );
  
      const querySnapshot = await getDocs(q);
      const iuranHariIni = querySnapshot.docs.map(doc => doc.data());
  
      // Inisialisasi daftar rekap dengan semua warga
      const rekap = {};
      wargaList.value.forEach(wargart => {
        rekap[wargart.id] = {
          wargaId: wargart.id,
          namaWarga: wargart.nama,
          totalIuran: 0
        };
      });
  
      // Akumulasi iuran masuk
      iuranHariIni.forEach(item => {
        if (rekap[item.wargaId]) {
          rekap[item.wargaId].totalIuran += item.jumlah;
        }
      });
  
      rekapHarian.value = Object.values(rekap);
    } catch (error) {
      console.error("Gagal memuat laporan harian:", error);
      showNotification("Gagal memuat laporan harian", "error");
    } finally {
      isLoading.value = false;
    }
  };
  
  // --- Generator QR Code Lokal -> Instan Tanpa Request Internet ---
  const generateQrCodeBase64Local = (text) => {
    if (!window.QRious) return null;
    
    const qr = new window.QRious({
      value: text,
      size: 200, // Ukuran QR Code lebih besar untuk lembar kuitansi tunggal
      level: 'H'  // Koreksi kesalahan tinggi (High) agar mudah di-scan
    });
    
    return qr.toDataURL('image/png');
  };
  
  // --- 1. CETAK REKAP LAPORAN HARIAN (Bersih, Tanpa QR Code Bertumpuk) ---
  const generatePdfLaporanHarian = () => {
    if (rekapHarian.value.length === 0) return;
  
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Desain Aksen Atas
      doc.setFillColor(30, 41, 59); // Slate Dark
      doc.rect(0, 0, 210, 8, 'F');
  
      // Header Utama
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("LAPORAN BULANAN / HARIAN IURAN RT", 14, 20);
  
      // Informasi tanggal
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Periode Tanggal : ${formatTanggalIndo(targetDate.value)}`, 14, 27);
      doc.text(`Tanggal Cetak   : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, 14, 32);
  
      doc.setLineWidth(0.3);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, 36, 196, 36);
  
      // Siapkan data tabel tanpa QR Code (Sangat Ringan dan Bersih!)
      const columns = [
        { header: 'No', dataKey: 'no' },
        { header: 'Nama Lengkap Warga', dataKey: 'namaWarga' },
        { header: 'Status Pembayaran', dataKey: 'status' },
        { header: 'Jumlah Penerimaan', dataKey: 'jumlah' }
      ];
  
      const bodyData = rekapHarian.value.map((item, index) => ({
        no: index + 1,
        namaWarga: item.namaWarga,
        status: item.totalIuran > 0 ? "LUNAS (TERVERIFIKASI)" : "BELUM BAYAR / NIHIL",
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
          status: { halign: 'center', cellWidth: 50 },
          jumlah: { halign: 'right', cellWidth: 40 }
        },
        foot: [
          [
            { content: 'Total Keseluruhan Penerimaan', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: formatRupiah(totalHarian.value), styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }
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
        
        doc.setDrawColor(148, 163, 184);
        doc.line(140, finalY + 25, 185, finalY + 25);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Sistem Keuangan RT Digital", 140, finalY + 29);
      }
  
      doc.save(`Rekap_Iuran_RT_${targetDate.value}.pdf`);
      showNotification("Rekap Laporan PDF berhasil diunduh.");
    } catch (error) {
      console.error("Gagal mencetak laporan:", error);
      showNotification("Gagal mencetak rekap laporan", "error");
    }
  };
  
  // --- 2. CETAK KUITANSI TUNGGAL (Satu Warga = Satu QR Code Resmi) ---
  const generateSingleKuitansiPdf = async (item) => {
    if (!window.QRious) {
      showNotification("Engine QR Code belum siap. Coba muat ulang halaman.", "error");
      return;
    }
  
    try {
      // Membuat PDF ukuran A5 lanskap (Layout kuitansi standar yang sangat rapi)
      const doc = new jsPDF('l', 'mm', 'a5');
      const width = 210; // Lebar kertas A5 lanskap
      const height = 148; // Tinggi kertas A5 lanskap
  
      const statusText = item.totalIuran > 0 ? "LUNAS (TERVERIFIKASI)" : "BELUM BAYAR / NIHIL";
      const validationCode = `RT-VAL-${item.wargaId}-${targetDate.value.replace(/-/g, '')}`;
  
      // Desain Teks QR Code
      const qrTextContent = `[BUKTI DIGITAL IURAN RT]
  No Validasi: ${validationCode}
  Nama Warga: ${item.namaWarga}
  Tanggal: ${formatTanggalIndo(targetDate.value)}
  Nominal Pembayaran: ${formatRupiah(item.totalIuran)}
  Status Pembayaran: ${statusText}`;
  
      // Dapatkan data gambar QR tunggal secara lokal
      const qrImageBase64 = generateQrCodeBase64Local(qrTextContent);
  
      // --- DEKORASI BINGKAI KUITANSI ---
      doc.setLineWidth(0.5);
      doc.setDrawColor(30, 41, 59); // Slate Dark
      doc.rect(5, 5, width - 10, height - 10); // Bingkai Luar
  
      doc.setLineWidth(0.2);
      doc.setDrawColor(203, 213, 225);
      doc.rect(7, 7, width - 14, height - 14); // Bingkai Dalam
  
      // HEADER KUITANSI
      doc.setFillColor(30, 58, 138); // Deep Navy
      doc.rect(7, 7, width - 14, 18, 'F');
  
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("KUITANSI BUKTI PEMBAYARAN IURAN WARGA", 12, 19);
  
      // BODY DETAIL (KIRI)
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      
      let currentY = 40;
      const drawDetailRow = (label, value, isBold = false) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, 14, currentY);
        doc.text(":", 52, currentY);
        
        if (isBold) {
          doc.setFont("helvetica", "bold");
        }
        doc.text(value, 56, currentY);
        currentY += 9;
      };
  
      drawDetailRow("No. Validasi", validationCode);
      drawDetailRow("Nama Lengkap Warga", item.namaWarga, true);
      drawDetailRow("Tanggal Pembayaran", formatTanggalIndo(targetDate.value));
      
      // Kotak Jumlah Nominal Khusus
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY - 5, 110, 12, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Jumlah Setoran :  ${formatRupiah(item.totalIuran)}`, 18, currentY + 2);
  
      // Kotak Status Pembayaran
      doc.setFontSize(10);
      const statusColor = item.totalIuran > 0 ? [21, 128, 61] : [220, 38, 38]; // Hijau vs Merah
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`Status Pembayaran :  ${statusText}`, 14, currentY + 16);
  
      // QR CODE AREA (KANAN)
      if (qrImageBase64) {
        // Gambar background halus di area QR Code
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(144, 32, 52, 52, 2, 2, 'F');
        
        // Letakkan QR Code besar tunggal (44mm x 44mm) tepat di dalam kuitansi
        doc.addImage(qrImageBase64, 'PNG', 148, 36, 44, 44);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Scan untuk verifikasi validasi digital", 143, 89);
      }
  
      // TANDA TANGAN (BAWAH KANAN)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Penerima,", 152, 102);
      
      doc.setDrawColor(203, 213, 225);
      doc.line(140, 124, 196, 124); // Garis TTD
      doc.setFont("helvetica", "bold");
      doc.text("Bendahara RT", 150, 129);
  
      // SIMPAN FILE SPESIFIK WARGA
      const cleanFileName = item.namaWarga.replace(/\s+/g, '_');
      doc.save(`Kuitansi_${cleanFileName}_${targetDate.value}.pdf`);
      showNotification(`Kuitansi ${item.namaWarga} berhasil dibuat!`);
  
    } catch (error) {
      console.error("Gagal membuat kuitansi:", error);
      showNotification("Gagal mencetak kuitansi warga", "error");
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
    await fetchLaporanHarian();
  });
  </script>