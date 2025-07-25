<template>
    <v-form @submit.prevent="login">
      <v-text-field v-model="email" label="Email" />
      <v-text-field v-model="password" label="Password" type="password" />
      <v-btn type="submit" color="primary">Login</v-btn>
    </v-form>
  </template>
  
  <script>
  import { signInWithEmailAndPassword } from 'firebase/auth';
  import { auth } from '../firebase/config';



  export default {
    data() {
      return {
        email: '',
        password: ''
      }
    },
    methods: {
      async login() {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password)
          const user = userCredential.user
          this.$router.push('/admin-dashboard')
        } catch (error) {
          alert('Login gagal: ' + error.message)
        }
      }
    }
  }
  </script>