import axios from 'axios';

// Satu "pintu" untuk semua request ke backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // default: lewat proxy /api
  withCredentials: true, // WAJIB: supaya cookie httpOnly (token) ikut terkirim
});

// Ambil pesan error yang ramah dari response backend
export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    (error.request ? 'Tidak dapat terhubung ke server. Coba lagi.' : 'Terjadi kesalahan.')
  );
}

export default api;
