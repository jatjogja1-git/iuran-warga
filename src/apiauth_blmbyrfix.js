import axios from 'axios'

const api = axios.create({
  //baseURL: 'http://192.168.4.7:5000/api',
  //baseURL: 'http://192.168.4.140:5000/api',
  baseURL: 'https://api-pbb-digital.loca.lt/api',  
//  baseURL: 'http://192.168.47.168:5500/api',
  headers: {
//    'Content-Type': 'application/json',
   'x-api-key': 'NBdf^A+ZiWT9YF3s*np&?ubSsn7Rn3yMB3CR&t)J^*k]E}GxBDa=G(gEry%E',  // Replace with your actual API key
   //'ngrok-skip-browser-warning': 'true'
   'bypass-tunnel-reminder': 'true' // Penting untuk LocalTunnel
  }
})


export const bpajakService = {
  getBpajakData(kd_kec, kd_kel, tahun) {
    return api.get(`/belumbayarpbb?kd_kec=${kd_kec}&kd_kel=${kd_kel}&tahun=${tahun}`)
  }
}

  //updateKeterangan(data) {
  //  return api.post('/updatedatobpajak', data)
 // }
 // }
//}
