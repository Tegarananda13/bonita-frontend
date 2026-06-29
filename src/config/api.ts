import axios from 'axios';

// Konfigurasi dasar Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menyematkan token (jika ada)
api.interceptors.request.use(
  (config) => {
    // Nanti akan diambil dari zustand / localStorage
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk penanganan error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (misal: redirect ke login / hapus sesi)
      console.error('Sesi berakhir atau tidak valid');
    }
    return Promise.reject(error);
  }
);

export default api;
