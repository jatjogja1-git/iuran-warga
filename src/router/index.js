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
import { auth } from '../firebase/config';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
//    component: Login,
    meta: { title: 'Login' } // Tambahkan meta title
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
        path: 'rekap', // path akan menjadi /rekap
        name: 'Rekap',
        component: RekapPage,
        meta: { requiresAuth: true, title: 'Rekap Bulanan' } // Tambahkan meta title
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