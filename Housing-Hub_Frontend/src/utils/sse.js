import { API_BASE_URL } from '../config';
import { getAccessToken } from './api';

const parseFrame = (frame) => {
  let eventName = 'message';
  const dataLines = [];

  frame.split('\n').forEach(line => {
    if (!line || line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);

    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  });

  if (dataLines.length === 0) return null;

  const raw = dataLines.join('\n');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { message: raw };
  }

  return { ...parsed, type: parsed.type || eventName };
};

export async function openEventStream({ signal, onEvent, onOpen }) {
  const token = getAccessToken();
  if (!token) {
    return { status: 'unauthorized' };
  }

  const response = await fetch(`${API_BASE_URL}/events/stream`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store',
    signal
  });

  if (response.status === 401 || response.status === 403) {
    return { status: 'unauthorized' };
  }

  if (!response.ok || !response.body) {
    throw new Error(`Event stream failed (HTTP ${response.status})`);
  }

  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const event = parseFrame(frame);
        if (event) {
          try {
            onEvent(event);
          } catch (error) {
            console.error('Live event handler failed', error);
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { status: 'closed' };
}
