// Zentrale API-Konfiguration
const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

console.log('🔌 API Base URL:', API_BASE_URL);

export const API_URL = `${API_BASE_URL}/api`;

export default API_URL;