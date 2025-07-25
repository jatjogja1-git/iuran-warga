<template>
    <v-container>
      <v-row>
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Jumlah User</v-card-title>
            <v-card-text>{{ totalUsers }}</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Jumlah Warga</v-card-title>
            <v-card-text>{{ totalWarga }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script>
  import { db, auth } from '../firebase/config'; // Pastikan db diimpor
  import { collection, getDocs, query, where } from 'firebase/firestore';


  export default {
    data() {
      return {
        totalUsers: 0,
        totalWarga: 0
      }
    },
    async mounted() {
      const userSnap = await getDocs(collection(db, 'users'))
      const wargaSnap = await getDocs(collection(db, 'warga'))
      this.totalUsers = userSnap.size
      this.totalWarga = wargaSnap.size
    }
  }
  </script>