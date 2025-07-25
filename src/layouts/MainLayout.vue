<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ currentRouteName }}</v-toolbar-title> <v-spacer></v-spacer>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" app>
      <v-list dense>
        <v-list-item link to="/dashboard">
          <template v-slot:prepend>
            <v-icon>mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/warga">
          <template v-slot:prepend>
            <v-icon>mdi-account-group</v-icon>
          </template>
          <v-list-item-title>Data Warga</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/iuran">
          <template v-slot:prepend>
            <v-icon>mdi-cash-multiple</v-icon>
          </template>
          <v-list-item-title>Iuran Harian</v-list-item-title>
        </v-list-item>
        <v-list-item link to="/rekap">
          <template v-slot:prepend>
            <v-icon>mdi-chart-bar</v-icon>
          </template>
          <v-list-item-title>Rekap Bulanan</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view /> </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router'; // Import useRoute
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config'; // Pastikan path ini benar

const drawer = ref(false);
const router = useRouter();
const route = useRoute(); // Inisialisasi useRoute

// Computed property untuk mendapatkan nama rute saat ini sebagai judul toolbar
const currentRouteName = computed(() => {
  if (route.meta && route.meta.title) {
    return route.meta.title;
  }
  return route.name || 'Aplikasi Iuran Warga'; // Fallback jika tidak ada meta title
});

const logout = async () => {
  try {
    await signOut(auth);
    router.push('/');
  } catch (error) {
    console.error('Error logging out:', error.message);
  }
};
</script>