import { Injectable, computed, inject, signal } from '@angular/core';
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

  // Modern Angular 17 State Management using Signals
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly currentToken = signal<string | null>(localStorage.getItem('token'));
  readonly currentMenu = signal<MenuItem[]>(this.getStoredMenu());
  readonly currentRoles = signal<UserRole[]>(this.getStoredRoles());

  readonly isAuthenticated = computed(() => !!this.currentToken() && !!this.currentUser());
  readonly isMae = computed(() => !!this.currentUser()?.es_mae);

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/autenticar', credentials).pipe(
      tap((res) => {
        if (res.tipoMensaje === 'EXITO' && res.token) {
          this.setSession(res);
        }
      })
    );
  }

  logout(): void {
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

  hasRole(roleName: string): boolean {
    const roles = this.currentRoles();
    return roles.some((r) => r.rol?.nombre?.toUpperCase() === roleName.toUpperCase());
  }

  private setSession(authRes: AuthResponse): void {
    const { token, datos } = authRes;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(datos.user));
    localStorage.setItem('menu', JSON.stringify(datos.menu || []));
    localStorage.setItem('roles', JSON.stringify(datos.roles || []));

    this.currentToken.set(token);
    this.currentUser.set(datos.user);
    this.currentMenu.set(datos.menu || []);
    this.currentRoles.set(datos.roles || []);
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
      return m ? JSON.parse(m) : [];
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
