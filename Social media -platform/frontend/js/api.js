// api.js — one place for all HTTP calls to the backend
// If the frontend is opened with Live Server, talk to the backend on port 5000.
const API_URL = location.port === '5000' || location.protocol === 'https:' ? '/api' : 'http://localhost:5000/api';

const Api = {
  async request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('ch_token');
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error('Cannot reach the server. Check your connection and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Expired/invalid session on a protected call -> send user to login
      if (res.status === 401 && token && !path.startsWith('/auth/login')) Auth.logout();
      throw new Error(data.message || 'Something went wrong. Please try again.');
    }
    return data;
  },
};
