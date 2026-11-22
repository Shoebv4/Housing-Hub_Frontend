// src/config.js
// Backend API base URL for HousingHubBackend
// Requests use a relative path so the dev and preview servers can proxy them
// (see vite.config.js). Set VITE_API_BASE_URL at build time when the deployed
// frontend and the API live on different origins.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';