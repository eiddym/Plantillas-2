import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.currentToken();

  let authReq = req;
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const msg = (err.error?.message || err.error?.mensaje || '').toLowerCase();
      const codigo = err.error?.codigo || '';
      if (
        err.status === 401 ||
        (err.status === 403 && (
          codigo === 'SESION_DUPLICADA' ||
          codigo === 'SESION_CERRADA' ||
          msg.includes('sesion') ||
          msg.includes('sesión') ||
          msg.includes('participando') ||
          req.url.includes('/refrescar')
        ))
      ) {
        authService.logout(false);
      }
      return throwError(() => err);
    })
  );
};
