import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

// Use the API_BASE_URL from .env file
const BASE_URL = ENV_API_BASE_URL || 'https://smartbusfullstack.onrender.com/';
// Add 'api' suffix if not already present
export const API_BASE_URL = BASE_URL.endsWith('/') ? `${BASE_URL}api` : `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL.replace('/api', '').replace(/\/$/, '');

console.log('🌐 API Configuration:');
console.log('📡 API Base URL:', API_BASE_URL);
console.log('🔌 Socket URL:', SOCKET_URL);
console.log('🛠️ Development Mode:', __DEV__);

// Axios client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export default apiClient;
