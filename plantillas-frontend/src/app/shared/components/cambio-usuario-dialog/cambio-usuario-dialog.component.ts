import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SeguridadService } from '../../../core/services/seguridad.service';
import { AuthService } from '../../../core/auth/auth.service';

interface UsuarioVirtualItem {
  id_usuario: number;
  nombres: string;
  apellidos?: string;
  cargo?: string;
  usuario?: string;
  virtual?: boolean;
  activo?: boolean;
  libre?: boolean;
  titular?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    usuario: string;
  };
}

@Component({
  selector: 'app-cambio-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="virtual-dialog-container">
      <button type="button" (click)="cerrar()" class="close-circle-btn" title="Cerrar">
        <mat-icon>close</mat-icon>
      </button>

      <div class="dialog-header">
        <h2 class="dialog-title">Cuentas Disponibles</h2>
        <p class="dialog-subtitle">
          Encontramos perfiles vinculados a tu cuenta institucional. Puedes continuar con uno de ellos o mantener tu sesión actual.
        </p>
      </div>

      <div class="dialog-content">
        @if (cargando()) {
          <div class="loading-state">
            <mat-spinner diameter="38"></mat-spinner>
            <p>Consultando perfiles asignados...</p>
          </div>
        } @else if (errorMsg()) {
          <div class="empty-state">
            <div class="empty-icon-circle">
              <mat-icon>person_off</mat-icon>
            </div>
            <h3>Sin perfiles adicionales</h3>
            <p>{{ errorMsg() }}</p>
          </div>
        } @else {
          <div class="users-list">
            @for (u of usuarios(); track u.id_usuario) {
              <div 
                class="user-card" 
                [class.active-user]="esUsuarioActual(u)"
                (click)="seleccionarUsuario(u)"
              >
                <div class="user-avatar" [class.avatar-virtual]="u.virtual">
                  @if (!u.virtual) {
                    <span class="avatar-initials">{{ getIniciales(u) }}</span>
                  } @else {
                    <mat-icon>person_outline</mat-icon>
                  }
                </div>
                <div class="user-info">
                  <div class="name-row">
                    <span class="user-name">{{ u.nombres }} {{ u.apellidos || '' }}</span>
                    @if (esUsuarioActual(u)) {
                      <span class="current-badge">Sesión actual</span>
                    }
                  </div>
                  <span class="user-cargo">{{ u.cargo || (u.virtual ? 'Perfil Virtual Institucional' : 'Titular Físico') }}</span>
                </div>
                <div class="action-slot">
                  @if (cambiandoId() === u.id_usuario) {
                    <mat-spinner diameter="22"></mat-spinner>
                  } @else {
                    <mat-icon class="card-chevron">chevron_right</mat-icon>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="or-divider">
        <span>O</span>
      </div>

      <div class="dialog-actions">
        <button type="button" (click)="cerrar()" class="btn-pill-dark">
          Mantener cuenta actual
        </button>
      </div>
    </div>
  `,
  styles: [`
    .virtual-dialog-container {
      position: relative;
      background: #ffffff;
      color: #0f172a;
      border-radius: 24px;
      padding: 32px 28px 26px;
      max-width: 520px;
      width: 100%;
      box-sizing: border-box;
      font-family: var(--font-ui, system-ui, -apple-system, sans-serif);
    }

    .close-circle-btn {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: #f1f5f9;
      color: #475569;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    }

    .dialog-header {
      text-align: center;
      padding: 4px 12px 18px;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #0f172a;
    }

    .dialog-subtitle {
      margin: 8px auto 0;
      max-width: 380px;
      font-size: 0.88rem;
      line-height: 1.45;
      color: #64748b;
    }

    .dialog-content {
      padding: 6px 0;
      max-height: 360px;
      overflow-y: auto;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 16px;
      text-align: center;
      gap: 10px;
      color: #64748b;

      h3 {
        margin: 4px 0 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
      }

      p {
        margin: 0;
        font-size: 0.85rem;
      }
    }

    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;

      &:hover:not(.active-user) {
        border-color: #10b981;
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.08);
        transform: translateY(-1px);
      }

      &.active-user {
        border-color: #a7f3d0;
        background: #f8fafc;
        cursor: default;
      }
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #064e3b;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .avatar-initials {
        font-size: 0.98rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      &.avatar-virtual {
        background: #059669;
        color: #ffffff;
      }
    }

    .user-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .user-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: #0f172a;
    }

    .current-badge {
      font-size: 0.70rem;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-weight: 700;
    }

    .user-cargo {
      font-size: 0.82rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-chevron {
      color: #94a3b8;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .or-divider {
      position: relative;
      text-align: center;
      margin: 18px 0 16px;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #f1f5f9;
      }

      span {
        position: relative;
        background: #ffffff;
        padding: 0 12px;
        font-size: 0.72rem;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.06em;
      }
    }

    .dialog-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-pill-dark {
      width: 100%;
      height: 46px;
      border-radius: 9999px;
      border: none;
      background: #111827;
      color: #ffffff;
      font-size: 0.90rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;

      &:hover {
        background: #1f2937;
        transform: translateY(-1px);
      }
    }
  `]
})
export class CambioUsuarioDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CambioUsuarioDialogComponent>);
  private readonly seguridadService = inject(SeguridadService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly cargando = signal<boolean>(true);
  readonly cambiandoId = signal<number | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly usuarios = signal<UsuarioVirtualItem[]>([]);

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    // Consulta usuarios virtuales asignados al usuario actual
    this.seguridadService.getUsuariosVirtuales().subscribe({
      next: (res) => {
        this.cargando.set(false);
        const lista = res.datos?.resultado || [];
        if (lista.length > 0) {
          this.usuarios.set(lista);
        } else {
          // Si no tiene asignados directamente, verificar si es admin para mostrar todos los virtuales
          if (this.authService.hasRole('ADMIN')) {
            this.cargarTodosVirtuales();
          } else {
            this.errorMsg.set('No tiene perfiles virtuales asignados actualmente a su cuenta.');
          }
        }
      },
      error: () => {
        if (this.authService.hasRole('ADMIN')) {
          this.cargarTodosVirtuales();
        } else {
          this.cargando.set(false);
          this.errorMsg.set('No se encontraron perfiles de usuario virtual autorizados.');
        }
      }
    });
  }

  private cargarTodosVirtuales(): void {
    this.seguridadService.getTodosUsuariosVirtuales().subscribe({
      next: (res) => {
        this.cargando.set(false);
        const lista = res.datos?.resultado || [];
        if (lista.length > 0) {
          this.usuarios.set(lista);
        } else {
          this.errorMsg.set('No hay perfiles virtuales registrados en la institución.');
        }
      },
      error: () => {
        this.cargando.set(false);
        this.errorMsg.set('Error al consultar el listado de usuarios virtuales.');
      }
    });
  }

  getIniciales(u: UsuarioVirtualItem): string {
    const n = (u.nombres || '').trim();
    const a = (u.apellidos || '').trim();
    const i1 = n ? n[0].toUpperCase() : '';
    const i2 = a ? a[0].toUpperCase() : (n.length > 1 ? n[1].toUpperCase() : '');
    return (i1 + i2) || 'US';
  }

  esUsuarioActual(u: UsuarioVirtualItem): boolean {
    const cur = this.authService.currentUser();
    return !!cur && cur.id === u.id_usuario;
  }

  seleccionarUsuario(u: UsuarioVirtualItem): void {
    if (this.esUsuarioActual(u) || this.cambiandoId()) return;

    this.cambiandoId.set(u.id_usuario);
    this.seguridadService.cambiarUsuarioVirtual(u.id_usuario).subscribe({
      next: (res) => {
        this.cambiandoId.set(null);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.snackBar.open(`Sesión cambiada exitosamente a ${u.nombres}`, 'Aceptar', { duration: 3500 });
          this.authService.updateSessionFromVirtual(res.datos);
          this.dialogRef.close(true);
          // Redirigir a dashboard y recargar para reflejar menús y permisos de inmediato
          this.router.navigate(['/dashboard']).then(() => {
            window.location.reload();
          });
        } else {
          this.snackBar.open(res.mensaje || 'No se pudo realizar el cambio de usuario', 'Cerrar', { duration: 3500 });
        }
      },
      error: (err) => {
        this.cambiandoId.set(null);
        const msg = err.error?.mensaje || 'Error al conectar con el servicio de cambio de perfil virtual';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
