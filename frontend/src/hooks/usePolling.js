import { useEffect, useRef } from 'react';

export default function usePolling(callback, interval = 30000, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let inFlight = false;
    const poll = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await callbackRef.current();
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), interval);
    window.addEventListener('focus', poll);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', poll);
    };
  }, [enabled, interval]);
}
