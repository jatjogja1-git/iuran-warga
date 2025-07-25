// src/plugins/vuetify.js
import 'vuetify/styles'; // Import gaya Vuetify
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'; // Pastikan ini juga ada

const vuetify = createVuetify({
  components,
  directives,
  // Tambahkan konfigurasi Vuetify lainnya di sini jika diperlukan
});

export default vuetify;