// lib/api.js
import axios from 'axios';

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:8000';

// Base axios instance without auth headers
export const api = axios.create({
  baseURL: BACKEND_API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// For server-side usage (Server Components, Route Handlers, Server Actions)
export const serverApi = axios.create({
  baseURL: BACKEND_API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});