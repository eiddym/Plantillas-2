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
      <div class="dialog-header">
        <div class="header-icon-wrapper">
          <mat-icon>sync_alt</mat-icon>
        </div>
        <div>
          <h2 class="dialog-title">Cambio de Usuario</h2>
          <p class="dialog-subtitle">Alternar entre perfiles virtuales asignados y usuario titular</p>
        </div>
        <button mat-icon-button (click)="cerrar()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        @if (cargando()) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Consultando perfiles virtuales asignados...</p>
          </div>
        } @else if (errorMsg()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">person_off</mat-icon>
            <h3>Sin perfiles disponibles</h3>
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
                  <mat-icon>{{ u.virtual ? 'smart_toy' : 'person' }}</mat-icon>
                </div>
                <div class="user-info">
                  <div class="name-row">
                    <span class="user-name">{{ u.nombres }} {{ u.apellidos || '' }}</span>
                    @if (esUsuarioActual(u)) {
                      <span class="current-badge">Sesión Actual</span>
                    }
                  </div>
                  <span class="user-cargo">{{ u.cargo || 'Funcionario Institucional' }}</span>
                  <div class="meta-row">
                    <span class="type-tag" [class.tag-virtual]="u.virtual">
                      {{ u.virtual ? 'Usuario Virtual' : 'Titular Físico' }}
                    </span>
                    @if (u.titular) {
                      <span class="titular-tag">Titular: {{ u.titular.nombres }}</span>
                    }
                  </div>
                </div>
                <div class="action-slot">
                  @if (cambiandoId() === u.id_usuario) {
                    <mat-spinner diameter="24"></mat-spinner>
                  } @else if (!esUsuarioActual(u)) {
                    <button mat-stroked-button class="btn-switch">
                      <span>Cambiar</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="cerrar()" class="btn-cancel">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .virtual-dialog-container {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      color: #fff;
      border-radius: 16px;
      padding: 24px;
      max-width: 580px;
      min-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }

    .header-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(0, 180, 219, 0.3);
    }

    .header-icon-wrapper mat-icon {
      color: #fff;
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #fff;
    }

    .dialog-subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.65);
    }

    .close-btn {
      position: absolute;
      top: 0;
      right: 0;
      color: rgba(255, 255, 255, 0.6);
      &:hover { color: #fff; }
    }

    .dialog-content {
      padding: 20px 0;
      max-height: 420px;
      overflow-y: auto;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      gap: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(255, 255, 255, 0.3);
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover:not(.active-user) {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(0, 180, 219, 0.4);
        transform: translateY(-2px);
      }

      &.active-user {
        border-color: #00b4db;
        background: rgba(0, 180, 219, 0.15);
        cursor: default;
      }
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.85);

      &.avatar-virtual {
        background: linear-gradient(135deg, #11998e, #38ef7d);
        color: #fff;
      }
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-name {
      font-weight: 600;
      font-size: 14.5px;
      color: #fff;
    }

    .current-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #00b4db;
      color: #fff;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .user-cargo {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.7);
    }

    .meta-row {
      display: flex;
      gap: 6px;
      margin-top: 2px;
    }

    .type-tag {
      font-size: 10.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.75);

      &.tag-virtual {
        background: rgba(56, 239, 125, 0.2);
        color: #38ef7d;
        font-weight: 600;
      }
    }

    .titular-tag {
      font-size: 10.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.6);
    }

    .btn-switch {
      color: #00b4db !important;
      border-color: rgba(0, 180, 219, 0.4) !important;
      font-size: 12px !important;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 32px;
      padding: 0 12px !important;

      &:hover {
        background: rgba(0, 180, 219, 0.15) !important;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-cancel {
      color: rgba(255, 255, 255, 0.7) !important;
      &:hover { color: #fff !important; }
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
