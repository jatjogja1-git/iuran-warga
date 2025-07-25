// src/plugins/pdf.js

// Impor jsPDF
import jsPDF from 'jspdf';
// Impor jspdf-autotable. Ini akan secara otomatis mencoba melampirkan dirinya
// ke prototype jsPDF yang sudah diimpor.
import 'jspdf-autotable';

// Fungsi helper untuk mendapatkan instance jsPDF yang sudah siap pakai
export function getPdfDoc() {
  return new jsPDF();
}

// Anda juga bisa mengekspor jsPDF jika ingin menggunakannya langsung
export { jsPDF };