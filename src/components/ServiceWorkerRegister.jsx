'use client';

import { useEffect } from 'react';

// Service worker'ı yalnızca üretimde kaydeder (geliştirmede önbellek karışmasın).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* kayıt başarısız olursa sessizce geç */
    });
  }, []);
  return null;
}
