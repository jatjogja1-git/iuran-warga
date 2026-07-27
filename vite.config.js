import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' //defautlnya tidak ada

/*
// ini default nya
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
})
*/


// untuk localhost
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '192.168.4.140',
    port: 5199,
    strictPort: true, 
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
