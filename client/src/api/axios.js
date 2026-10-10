// src/api/axios.js
import axios from 'axios';
import toast from 'react-hot-toast';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for large file uploads
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed later
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const data = error.response?.data;
    const message = data?.message || data?.errors?.[0]?.message || 'Something went wrong';

    // A possible duplicate is a question for the user, asked by the form itself.
    // Don't show toast for 404 errors in search.
    if (error.response?.status !== 404 && data?.code !== 'POSSIBLE_DUPLICATE') {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;