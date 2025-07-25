<template>
  <v-data-table :headers="headers" :items="users" item-key="id">
    <template v-slot:top>
      <v-btn color="primary" @click="openDialog">Tambah User</v-btn>
    </template>
  </v-data-table>

  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>Tambah User</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Nama" />
        <v-text-field v-model="form.email" label="Email" />
        <v-select v-model="form.role" :items="['admin', 'user']" label="Role" />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="saveUser">Simpan</v-btn>
        <v-btn text @click="dialog = false">Batal</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db, auth } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default {
  data() {
    return {
      users: [],
      dialog: false,
      form: { name: '', email: '', role: 'user' },
      headers: [
        { title: 'Nama', key: 'name' },
        { title: 'Email', key: 'email' },
        { title: 'Role', key: 'role' }
      ]
    }
  },
  async mounted() {
    await this.fetchUsers()
  },
  methods: {
    async fetchUsers() {
      const snap = await getDocs(collection(db, 'users'))
      this.users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    },
    async saveUser() {
      await addDoc(collection(db, 'users'), this.form)
      this.dialog = false
      this.form = { name: '', email: '', role: 'user' }
      await this.fetchUsers()
    },
    openDialog() {
      this.dialog = true
    }
  }
}
</script>