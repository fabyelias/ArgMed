import { useEffect } from 'react';

/**
 * Hook para detectar nuevas versiones de la app y recargar automáticamente
 * Verifica cada 3 minutos si hay una nueva versión disponible
 */
export function useVersionCheck() {
  useEffect(() => {
    // Versión de la app (actualizada con cada build)
    const APP_VERSION = import.meta.env.VITE_APP_VERSION || Date.now().toString();
    const STORAGE_KEY = 'app_version';

    const checkForUpdates = async () => {
      try {
        // Limpiar cualquier service worker que pueda estar interfiriendo
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          });
        }

        // Verificar versión guardada en localStorage
        const savedVersion = localStorage.getItem(STORAGE_KEY);

        // Hacer request al index.html con cache bypass usando timestamp
        const timestamp = new Date().getTime();
        const response = await fetch(`/index.html?v=${timestamp}`, {
          method: 'HEAD',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        const currentEtag = response.headers.get('etag') || response.headers.get('last-modified') || timestamp.toString();

        if (savedVersion && savedVersion !== currentEtag) {
          // Hay una nueva versión disponible
          console.log('🔄 Nueva versión detectada, actualizando...');

          // Limpiar todo el caché
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }

          // Limpiar localStorage de datos temporales (mantener auth)
          const authData = localStorage.getItem('supabase.auth.token');
          localStorage.clear();
          if (authData) {
            localStorage.setItem('supabase.auth.token', authData);
          }
          localStorage.setItem(STORAGE_KEY, currentEtag);

          // Forzar recarga completa sin caché
          window.location.href = window.location.href.split('?')[0] + '?v=' + timestamp;
        } else if (!savedVersion) {
          // Primera carga, guardar versión actual
          localStorage.setItem(STORAGE_KEY, currentEtag);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Verificar cada 3 minutos (180000ms)
    const interval = setInterval(checkForUpdates, 3 * 60 * 1000);

    // Verificar inmediatamente al montar
    checkForUpdates();

    // Cleanup
    return () => clearInterval(interval);
  }, []);
}
