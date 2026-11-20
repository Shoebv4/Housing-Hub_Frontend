import { useEffect, useRef, useState } from 'react';
import { openEventStream } from '../utils/sse';

const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const STABLE_AFTER_MS = 10000;

export const useLiveEvents = ({ eventTypes, onEvent, onReconnect, enabled = true }) => {
  const [status, setStatus] = useState('connecting');
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  const typeKey = eventTypes.join('|');

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (!enabled) {
      setStatus('connecting');
      return undefined;
    }

    const allowedTypes = new Set(typeKey ? typeKey.split('|') : []);
    const controller = new AbortController();
    let active = true;
    let hasConnected = false;
    let delay = INITIAL_DELAY;
    let retryTimer;
    let stabilityTimer;

    const scheduleReconnect = () => {
      if (!active) return;

      setStatus('reconnecting');
      const jitter = Math.floor(Math.random() * 250);
      retryTimer = setTimeout(connect, delay + jitter);
      delay = Math.min(delay * 2, MAX_DELAY);
    };

    const connect = async () => {
      if (!active) return;

      setStatus(hasConnected ? 'reconnecting' : 'connecting');

      try {
        const result = await openEventStream({
          signal: controller.signal,
          onOpen: () => {
            if (!active) return;

            setStatus('open');
            if (hasConnected) {
              onReconnectRef.current?.();
            }
            hasConnected = true;

            clearTimeout(stabilityTimer);
            stabilityTimer = setTimeout(() => {
              delay = INITIAL_DELAY;
            }, STABLE_AFTER_MS);
          },
          onEvent: (event) => {
            if (!active || !allowedTypes.has(event.type)) return;
            onEventRef.current?.(event);
          }
        });

        if (!active) return;

        if (result?.status === 'unauthorized') {
          setStatus('unauthorized');
          clearTimeout(stabilityTimer);
          return;
        }

        clearTimeout(stabilityTimer);
        scheduleReconnect();
      } catch (error) {
        if (!active || controller.signal.aborted || error.name === 'AbortError') return;

        clearTimeout(stabilityTimer);
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(retryTimer);
      clearTimeout(stabilityTimer);
    };
    // typeKey captures eventTypes; handlers are kept current through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, typeKey]);

  return status;
};
