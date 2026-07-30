// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue';
//import Login from '../views/Login.vue';
//import AdminDashboard from '../views/AdminDashboard.vue';
import MainLayout from '../layouts/MainLayout.vue'; // Import layout utama
import DashboardPage from '../views/DashboardPage.vue';
import WargaPage from '../views/WargaPage.vue';
import IuranPage from '../views/IuranPage.vue';
import RekapPage from '../views/RekapPage.vue';
import RekapPageTgl from '../views/RekapPageTgl.vue';
//import LapHarianQrcode from '../views/LapHarianQrcode.vue';
import LapHarianQrcodeTgl1 from '../views/LapHarianQrcodeTgl1.vue';
import VerifyKuitansi from '../views/VerifyKuitansi.vue'; // Import halaman baru
import IuranPagePbbFix from '../views/IuranPagePbbFix.vue'; // Import halaman baru
import LapPbbQrcodeTgl from '../views/LapPbbQrcodeTgl.vue'; // Import halaman baru
import VerifyKuitansiPbbFix1 from '../views/VerifyKuitansiPbbFix1.vue'; // Import halaman baru
//import DataBelumBayarPbb from '../views/DataBelumBayarPbb.vue'; // Import halaman baru
import DatblmbayarpbbViewfixAwal from '../views/DatblmbayarpbbViewfixAwal.vue'; // Import halaman baru
import IuranPagePbbFixApi from '../views/IuranPagePbbFixApi.vue'; // Import halaman baru
//import LapPbbQrcodeTglFix3 from '../views/LapPbbQrcodeTglFix3.vue'; // Import halaman baru
import DatblmbayarpbbJsonView from '../views/DatblmbayarpbbJsonView.vue'; // Import halaman baru
import LapHarianQrcodeTglJson from '../views/LapHarianQrcodeTglJson.vue'; // Import halaman baru
import LapHarianQrcodeTglJsonFix from '../views/LapHarianQrcodeTglJsonFix.vue'; // Import halaman baru
import IuranPagePbbFixFirestore from '../views/IuranPagePbbFixFirestore.vue'; // Import halaman baru


//import { auth } from '../firebase/config.js';
import { auth } from '@/firebase/config';


import LapPbbQrcodeTglFix3 from '../views/LapPbbQrcodeTglFix3.vue';
import VerifyKuitansiPbbFix2 from '../views/VerifyKuitansiPbbFix2.vue';
//import VerifyKuitansiPbbFix from '../views/VerifyKuitansiPbbFix.vue';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
//    component: Login,
    meta: { title: 'Login' } // Tambahkan meta title
  },

// TAMBAHKAN RUTE PUBLIK INI DI SINI
{
  path: '/verify-kuitansi',
  name: 'VerifyKuitansi',
  component: VerifyKuitansi,
  meta: { title: 'Verifikasi Kuitansi Digital' } // Tanpa requiresAuth!
},

{
  path: '/verify-kuitansi-pbb',
  name: 'VerifyKuitansiPbbFix2',
  component: VerifyKuitansiPbbFix2,
  meta: { title: 'Verifikasi Kuitansi PBB Digital' } // Tanpa requiresAuth!
},

  {
    path: '/', // Rute induk untuk layout
    component: MainLayout, // Komponen layout utama
    children: [ // Semua rute di dalam layout ini akan menjadi 'children'
      {
        path: 'dashboard', // path akan menjadi /dashboard
        name: 'Dashboard',
        component: DashboardPage,
        meta: { requiresAuth: true, title: 'Dashboard' } // Tambahkan meta title
      },
      {
        path: 'warga', // path akan menjadi /warga
        name: 'Warga',
        component: WargaPage,
        meta: { requiresAuth: true, title: 'Data Warga' } // Tambahkan meta title
      },
      {
        path: 'iuran', // path akan menjadi /iuran
        name: 'Iuran',
        component: IuranPage,
        meta: { requiresAuth: true, title: 'Iuran Harian' } // Tambahkan meta title
      },
      {
        path: 'rekaptgl', // path akan menjadi /rekap
        name: 'Rekaptgl',
        component: RekapPageTgl,
        meta: { requiresAuth: true, title: 'Rekap Per Tanggal' } // Tambahkan meta title
      },

      {
        path: 'rekap', // path akan menjadi /rekap
        name: 'Rekap',
        component: RekapPage,
        meta: { requiresAuth: true, title: 'Rekap Bulanan' } // Tambahkan meta title
      },
      
      {
        path: 'lapharqrtgl', // path akan menjadi /rekap
        name: 'LapHarQrTgl',
        component: LapHarianQrcodeTgl1,
        meta: { requiresAuth: true, title: 'Laporan Iuran Warga Qrcode Periode' } // Tambahkan meta title
      },


      {
        path: 'iuranpbbfix', // path akan menjadi /rekap
        name: 'IuranPbbFix',
        component: IuranPagePbbFix,
        meta: { requiresAuth: true, title: 'Iuran PBB Warga' } // Tambahkan meta title
      },

      {
        path: 'iuranpbbfixapi', // path akan menjadi /rekap
        name: 'IuranPagePbbFixApi',
        component: IuranPagePbbFixApi,
        meta: { requiresAuth: true, title: 'Iuran PBB Warga Via Api' } // Tambahkan meta title
      },

      {
        path: 'iuranpagepbbfixfirestore', // path akan menjadi /rekap
        name: 'IuranPagePbbFixFirestore',
        component: IuranPagePbbFixFirestore,
        meta: { requiresAuth: true, title: 'Iuran PBB Warga Cloud' } // Tambahkan meta title
      },

      {
        path: 'lappbbtgl', // path akan menjadi /rekap
        name: 'LapPbbTgl',
        component: LapPbbQrcodeTgl,
        meta: { requiresAuth: true, title: 'Laporan Iuran PBB Warga' } // Tambahkan meta title
      },      
  
{
        path: 'lapHarianqrcodetgljsonfix', // path akan menjadi /rekap
        name: 'LapHarianQrcodeTglJsonFix',
        component: LapHarianQrcodeTglJsonFix,
        meta: { requiresAuth: true, title: 'Laporan Iuran PBB Warga' } // Tambahkan meta title
      },   


  {
        path: 'lappbbtglfix', // path akan menjadi /rekap
        name: 'LapPbbQrcodeTglFix3',
        component: LapPbbQrcodeTglFix3,
        meta: { requiresAuth: true, title: 'Laporan Iuran PBB Warga' } // Tambahkan meta title
      },  
      
      {
        path: 'datblmbayarpbbjsonview', // path akan menjadi /rekap
        name: 'DatblmbayarpbbJsonView',
        component: DatblmbayarpbbJsonView,
        meta: { requiresAuth: true, title: 'Rekon Iuran PBB Warga' } // Tambahkan meta title
      },
      
      {
        path: 'datblmbayarpbbview', // path akan menjadi /rekap
        name: 'DatblmbayarpbbView',
        component: DatblmbayarpbbViewfixAwal,
        meta: { requiresAuth: true, title: 'Data Belum Bayar PBB Warga' } // Tambahkan meta title
      }



    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard untuk otentikasi (tetap sama)
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const currentUser = auth.currentUser;

  if (requiresAuth && !currentUser) {
    next('/');
  } else if (!requiresAuth && currentUser && to.name === 'Login') {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;