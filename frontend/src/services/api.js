import axios from "axios";

export function getApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_URL?.trim();
  const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "";
  return normalizedBaseUrl ? `${normalizedBaseUrl}/api` : "/api";
}

export function getSocketBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_URL?.trim();
  return rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : window.location.origin.replace(/\/+$/, "");
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
