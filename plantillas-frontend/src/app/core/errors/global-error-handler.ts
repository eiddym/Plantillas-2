import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const errorMsg = error?.message || error?.toString() || '';
    const chunkFailedPattern = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i;

    if (chunkFailedPattern.test(errorMsg)) {
      // Detección de desfase de versión/hash por nuevo despliegue en servidor.
      // Recarga automática y transparente una sola vez para sincronizar los nuevos bundles.
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        sessionStorage.setItem('chunk_reload_ts', now.toString());
        console.warn('[Version Update] Nuevo despliegue detectado. Actualizando bundles de la aplicación...');
        window.location.reload();
        return;
      }
    }

    console.error('[Unhandled Error]', error);
  }
}

