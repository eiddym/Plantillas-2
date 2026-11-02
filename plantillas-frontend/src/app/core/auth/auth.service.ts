import { Injectable, computed, inject, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, MenuItem, User, UserRole } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  // Modern Angular 17 State Management using Signals
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly currentToken = signal<string | null>(localStorage.getItem('token'));
  readonly currentMenu = signal<MenuItem[]>(this.getStoredMenu());
  readonly currentRoles = signal<UserRole[]>(this.getStoredRoles());

  readonly isAuthenticated = computed(() => !!this.currentToken() && !!this.currentUser());
  readonly isMae = computed(() => !!this.currentUser()?.es_mae);

  private ultimaActividad = Date.now();
  private ultimoRefresh = Date.now();
  private intervalCheckId: any = null;
  private removerListeners: Array<() => void> = [];
  private readonly INACTIVIDAD_MAXIMA_MS = 15 * 60 * 1000; // 15 minutos (definido en .env y backend)
  private readonly INTERVALO_REFRESCO_MS = 15 * 1000; // Verificar/refrescar cada 15s para detectar sesión única inmediatamente

  constructor() {
    if (this.isAuthenticated()) {
      this.iniciarMonitoreoActividad();
    }
  }

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/autenticar', credentials).pipe(
      tap((res) => {
        if (res.tipoMensaje === 'EXITO' && res.token) {
          this.setSession(res);
          this.iniciarMonitoreoActividad();
        }
      })
    );
  }

  logout(notificarServidor = true): void {
    const tokenActual = this.currentToken();
    this.detenerMonitoreoActividad();

    if (notificarServidor && tokenActual) {
      this.http.post('/api/v1/cerrar_sesion', {}).subscribe({ error: () => {} });
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('menu');
    localStorage.removeItem('roles');

    this.currentUser.set(null);
    this.currentToken.set(null);
    this.currentMenu.set([]);
    this.currentRoles.set([]);

    this.router.navigate(['/auth/login']);
  }

  refrescarSesion(): Observable<any> {
    return this.http.get<{ tipoMensaje: string; token: string }>('/api/v1/refrescar').pipe(
      tap((res) => {
        if (res.tipoMensaje === 'EXITO' && res.token) {
          localStorage.setItem('token', res.token);
          this.currentToken.set(res.token);
          this.ultimoRefresh = Date.now();
          const menuActualizado = this.normalizarMenus(this.currentMenu(), this.currentRoles());
          this.currentMenu.set(menuActualizado);
        }
      })
    );
  }

  iniciarMonitoreoActividad(): void {
    if (this.intervalCheckId) return; // Ya activo

    this.ultimaActividad = Date.now();
    this.ultimoRefresh = Date.now();

    // Escuchar eventos de teclado y ratón fuera de NgZone para no degradar el rendimiento
    this.ngZone.runOutsideAngular(() => {
      const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      let lastRecorded = 0;

      const handler = () => {
        const now = Date.now();
        // Limitar actualización de timestamp a una vez cada 2 segundos
        if (now - lastRecorded > 2000) {
          this.ultimaActividad = now;
          lastRecorded = now;
        }
      };

      eventos.forEach((ev) => {
        window.addEventListener(ev, handler, { passive: true });
        this.removerListeners.push(() => window.removeEventListener(ev, handler));
      });

      const storageHandler = (ev: StorageEvent) => {
        if (ev.key === 'token') {
          this.ngZone.run(() => {
            if (!ev.newValue) {
              this.logout(false);
            } else {
              this.currentToken.set(ev.newValue);
            }
          });
        }
      };
      window.addEventListener('storage', storageHandler);
      this.removerListeners.push(() => window.removeEventListener('storage', storageHandler));

      // Chequeo periódico cada 15 segundos para validar sesión única e inactividad
      this.intervalCheckId = setInterval(() => {
        if (!this.currentToken()) {
          this.detenerMonitoreoActividad();
          return;
        }

        const ahora = Date.now();
        const inactivoMs = ahora - this.ultimaActividad;

        // Si excedió los 15 minutos sin ninguna actividad en teclado/ratón
        if (inactivoMs >= this.INACTIVIDAD_MAXIMA_MS) {
          this.ngZone.run(() => {
            this.logout(true);
          });
          return;
        }

        // Validar que la sesión siga siendo la única activa en el servidor
        if ((ahora - this.ultimoRefresh) >= this.INTERVALO_REFRESCO_MS) {
          this.ultimoRefresh = ahora;
          this.ngZone.run(() => {
            this.refrescarSesion().subscribe({
              error: (err) => {
                // Solo cerrar sesión si el servidor responde 401 o 403 (otra sesión abierta o token expirado)
                if (err?.status === 401 || err?.status === 403) {
                  this.logout(false);
                }
              }
            });
          });
        }
      }, 15000);
    });
  }

  detenerMonitoreoActividad(): void {
    if (this.intervalCheckId) {
      clearInterval(this.intervalCheckId);
      this.intervalCheckId = null;
    }
    this.removerListeners.forEach((cleanup) => cleanup());
    this.removerListeners = [];
  }

  hasRole(roleName: string): boolean {
    const roles = this.currentRoles();
    const target = (roleName || '').trim().toUpperCase();
    return roles.some((r: any) => {
      const n = (r?.rol?.nombre || r?.nombre || '').trim().toUpperCase();
      return n === target;
    });
  }

  updateSessionFromVirtual(datos: { token: string; user: any; menu: any; roles: any }): void {
    const token = datos.token;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(datos.user));
    localStorage.setItem('roles', JSON.stringify(datos.roles || []));
    const rawMenu = datos.menu?.menu || (Array.isArray(datos.menu) ? datos.menu : []);
    const menuList = this.normalizarMenus(rawMenu, datos.roles || []);
    localStorage.setItem('menu', JSON.stringify(menuList));

    this.currentToken.set(token);
    this.currentUser.set(datos.user);
    this.currentRoles.set(datos.roles || []);
    this.currentMenu.set(menuList);
    this.iniciarMonitoreoActividad();
  }

  private setSession(authRes: AuthResponse): void {
    const { token, datos } = authRes;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(datos.user));
    localStorage.setItem('roles', JSON.stringify(datos.roles || []));
    const menuNormalizado = this.normalizarMenus(datos.menu || [], datos.roles || []);
    localStorage.setItem('menu', JSON.stringify(menuNormalizado));

    this.currentToken.set(token);
    this.currentUser.set(datos.user);
    this.currentRoles.set(datos.roles || []);
    this.currentMenu.set(menuNormalizado);
  }

  private normalizarMenus(menus: MenuItem[], rolesParam?: UserRole[]): MenuItem[] {
    if (!Array.isArray(menus)) return [];
    const roles = rolesParam ?? this.getStoredRoles();
    const puedeVerVentanilla = roles.some((r: any) => {
      const nombreRol = (r?.rol?.nombre || r?.nombre || '').toUpperCase();
      return nombreRol === 'ADMIN' || nombreRol === 'CORRESPONDENCIA';
    });

    const esMenuVentanilla = (item: any) =>
      item?.id_menu === 26 ||
      item?.id_menu === 27 ||
      item?.id_menu === 28 ||
      item?.label?.toUpperCase().includes('VENTANILLA') ||
      item?.url?.toLowerCase().startsWith('ventanilla');

    return menus
      .filter((m) => puedeVerVentanilla || !esMenuVentanilla(m))
      .map((m) => ({
        ...m,
        label: (m.url === 'aprobacion' || m.label?.toUpperCase() === 'DERIVADOS') ? 'PENDIENTES' : m.label,
        submenu: Array.isArray(m.submenu)
          ? m.submenu
              .filter((s) => puedeVerVentanilla || !esMenuVentanilla(s))
              .map((s) => ({
                ...s,
                label: (s.url === 'aprobacion' || s.label?.toUpperCase() === 'DERIVADOS') ? 'PENDIENTES' : s.label
              }))
          : m.submenu
      }));
  }

  private getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  private getStoredMenu(): MenuItem[] {
    try {
      const m = localStorage.getItem('menu');
      return m ? this.normalizarMenus(JSON.parse(m)) : [];
    } catch {
      return [];
    }
  }

  private getStoredRoles(): UserRole[] {
    try {
      const r = localStorage.getItem('roles');
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  }
}
