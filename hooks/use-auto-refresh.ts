'use client';

import { useEffect, useRef } from 'react';

export function useAutoRefresh(
  callback: () => Promise<void> | void,
  enabled: boolean,
  intervalMs = 5000
) {
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await callbackRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    const timer = setInterval(() => {
      void run();
    }, intervalMs);

    const handleVisibility = () => {
      if (!document.hidden) {
        void run();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, intervalMs]);
}
