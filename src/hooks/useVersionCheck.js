import { useEffect } from 'react';

/**
 * Hook para detectar nuevas versiones de la app y recargar automáticamente
 * Verifica cada 5 minutos si hay una nueva versión disponible
 */
export function useVersionCheck() {
  useEffect(() => {
    // Guardar el hash inicial del index.html
    let lastEtag = null;

    const checkForUpdates = async () => {
      try {
        // Hacer request al index.html con cache bypass
        const response = await fetch('/index.html', {
          method: 'HEAD',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        const currentEtag = response.headers.get('etag') || response.headers.get('last-modified');

        if (lastEtag === null) {
          // Primera vez, guardar el etag actual
          lastEtag = currentEtag;
        } else if (currentEtag && currentEtag !== lastEtag) {
          // Hay una nueva versión disponible
          console.log('Nueva versión detectada, recargando app...');

          // Limpiar caché del navegador (solo si está soportado)
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }

          // Recargar la página sin caché
          window.location.reload(true);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Verificar cada 5 minutos (300000ms)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Verificar inmediatamente al montar
    checkForUpdates();

    // Cleanup
    return () => clearInterval(interval);
  }, []);
}
