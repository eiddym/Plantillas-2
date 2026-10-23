import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  titular?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    usuario: string;
  };
}

@Component({
  selector: 'app-elegir',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="elegir-container">
      <div class="elegir-card">
        <div class="elegir-header">
          <div class="header-badge">
            <mat-icon>switch_account</mat-icon>
          </div>
          <h1>Seleccionar Perfil Institucional</h1>
          <p class="subtitle">
            Usted cuenta con múltiples cargos o perfiles asignados. Elija con cuál desea operar en esta sesión de trabajo.
          </p>
        </div>

        @if (cargando()) {
          <div class="loading-box">
            <mat-spinner diameter="44"></mat-spinner>
            <p>Cargando perfiles y cargos asignados...</p>
          </div>
        } @else if (errorMsg()) {
          <div class="error-box">
            <mat-icon>error_outline</mat-icon>
            <p>{{ errorMsg() }}</p>
            <button mat-raised-button class="btn-continuar" (click)="continuarDashboard()">
              Continuar al Dashboard
            </button>
          </div>
        } @else {
          <div class="perfiles-grid">
            @for (u of usuarios(); track u.id_usuario; let idx = $index) {
              <div 
                class="perfil-card" 
                [class.perfil-activo]="esUsuarioActual(u)"
                (click)="seleccionarPerfil(u)"
              >
                <div class="avatar-wrapper" [class.avatar-virtual]="u.virtual">
                  <mat-icon>{{ u.virtual ? 'smart_toy' : 'badge' }}</mat-icon>
                </div>
                <div class="perfil-info">
                  <div class="nombre-row">
                    <span class="nombre">{{ u.nombres }} {{ u.apellidos || '' }}</span>
                    @if (esUsuarioActual(u)) {
                      <span class="badge-actual">Activo</span>
                    }
                  </div>
                  <span class="cargo">{{ u.cargo || 'Funcionario Oficial' }}</span>
                  <div class="tags-row">
                    <span class="tipo-tag" [class.tag-virtual]="u.virtual">
                      {{ u.virtual ? 'Cargo / Perfil Virtual' : 'Usuario Titular' }}
                    </span>
                    @if (u.usuario) {
                      <span class="username-tag">&#64;{{ u.usuario }}</span>
                    }
                  </div>
                </div>

                <div class="card-action">
                  @if (cambiandoId() === u.id_usuario) {
                    <mat-spinner diameter="24"></mat-spinner>
                  } @else {
                    <button mat-stroked-button class="btn-select">
                      <span>{{ esUsuarioActual(u) ? 'Ingresar' : 'Cambiar y Entrar' }}</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <div class="actions-footer">
            <button mat-button class="btn-default" (click)="continuarDashboard()">
              Continuar con Sesión Actual
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .elegir-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      font-family: 'Poppins', Roboto, sans-serif;
      box-sizing: border-box;
    }
    .elegir-card {
      background: #ffffff;
      border-radius: 16px;
      max-width: 680px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .elegir-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .header-badge {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #e0f2f1;
      color: #00838f;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .loading-box, .error-box {
      text-align: center;
      padding: 32px 16px;
      color: #64748b;
      p { margin-top: 12px; font-size: 14px; }
    }
    .perfiles-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .perfil-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: #f1f5f9;
        border-color: #00838f;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 131, 143, 0.12);
      }
      &.perfil-activo {
        border-color: #00838f;
        background: #e0f7fa;
      }
    }
    .avatar-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      &.avatar-virtual {
        background: #ede7f6;
        color: #512da8;
      }
    }
    .perfil-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nombre-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nombre {
      font-size: 14.5px;
      font-weight: 600;
      color: #0f172a;
    }
    .badge-actual {
      background: #00838f;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .cargo {
      font-size: 12px;
      color: #64748b;
    }
    .tags-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .tipo-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
      font-weight: 600;
      &.tag-virtual {
        background: #ede7f6;
        color: #512da8;
      }
    }
    .username-tag {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn-select {
      border-color: #cbd5e1;
      color: #00838f;
      font-weight: 600;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .actions-footer {
      display: flex;
      justify-content: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    .btn-default {
      color: #64748b;
      font-weight: 600;
      &:hover { color: #00838f; }
    }
    .btn-continuar {
      background: #00838f;
      color: #ffffff;
      margin-top: 12px;
    }
  `]
})
export class ElegirComponent implements OnInit {
  private seguridadService = inject(SeguridadService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  usuarios = signal<UsuarioVirtualItem[]>([]);
  cambiandoId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarPerfiles();
  }

  cargarPerfiles(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.seguridadService.getUsuariosVirtuales().subscribe({
      next: (resp) => {
        this.cargando.set(false);
        const lista = resp?.datos?.resultado || (resp?.datos as any) || [];
        if (Array.isArray(lista) && lista.length > 0) {
          this.usuarios.set(lista);
        } else {
          // Si no tiene perfiles adicionales, redirigir directo
          this.continuarDashboard();
        }
      },
      error: () => {
        this.cargando.set(false);
        this.continuarDashboard();
      }
    });
  }

  esUsuarioActual(item: UsuarioVirtualItem): boolean {
    const user = this.authService.currentUser();
    return user ? Number(user.id) === Number(item.id_usuario) : false;
  }

  seleccionarPerfil(item: UsuarioVirtualItem): void {
    if (this.esUsuarioActual(item)) {
      this.continuarDashboard();
      return;
    }

    this.cambiandoId.set(item.id_usuario);
    this.seguridadService.cambiarUsuarioVirtual(item.id_usuario).subscribe({
      next: (resp) => {
        this.cambiandoId.set(null);
        if (resp && resp.datos) {
          this.authService.updateSessionFromVirtual(resp.datos);
          const user = resp.datos.user;
          this.snackBar.open(`Perfil activado: ${user?.cargo || user?.nombres || 'Sesión actualizada'}`, 'Aceptar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        }
        this.continuarDashboard();
      },
      error: (err) => {
        this.cambiandoId.set(null);
        this.snackBar.open(err.error?.mensaje || 'Error al cambiar de perfil', 'Cerrar', {
          duration: 4000
        });
      }
    });
  }

  continuarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
