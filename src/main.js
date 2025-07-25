// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Akan dibuat nanti
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Import Material Design Icons
//import vuetify from './plugins/vuetify'; // Asumsi Anda punya file ini untuk konfigurasi Vuetify
//import { loadFonts } from './plugins/webfontloader';

// --- TAMBAHKAN BARIS INI ---
//import jsPDF from 'jspdf';
//import 'jspdf-autotable';
//window.jsPDF = jsPDF; // Ini membuat jsPDF tersedia secara global
// -------------------------

//loadFonts();

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    iconfont: 'mdi',
  },
})

createApp(App)
  .use(router)
  .use(vuetify)
  .mount('#app')