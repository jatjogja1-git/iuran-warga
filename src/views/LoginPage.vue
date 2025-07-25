<template>
  <v-container fill-height fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Login Aplikasi Iuran Warga</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="login">
              <v-text-field
                label="Email"
                name="email"
                prepend-icon="mdi-email"
                type="text"
                v-model="email"
                required
              ></v-text-field>
              <v-text-field
                label="Password"
                name="password"
                prepend-icon="mdi-lock"
                type="password"
                v-model="password"
                required
              ></v-text-field>
              <v-alert v-if="error" type="error" dense class="mt-3">{{ error }}</v-alert>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="login">Login</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

const email = ref('');
const password = ref('');
const error = ref(null);
const router = useRouter();

const login = async () => {
  error.value = null;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message;
  }
};
</script>