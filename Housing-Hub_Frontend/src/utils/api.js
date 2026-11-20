import { API_BASE_URL } from '../config';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (Array.isArray(body)) {
        message = body.map(item => item.errorMessage || item.message || String(item)).join(' ');
      } else if (body?.message) {
        message = body.message;
      } else if (body?.Message) {
        message = body.Message;
      } else if (body?.errors) {
        message = Object.values(body.errors).flat().join(' ');
      } else if (body?.Errors) {
        message = Object.values(body.Errors).flat().join(' ');
      }
    } catch {
      // Keep the default message when the response body is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const apiGet = (path) => apiRequest(path);

export const apiPost = (path, body) =>
  apiRequest(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = (path, body) =>
  apiRequest(path, {
    method: 'PUT',
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
