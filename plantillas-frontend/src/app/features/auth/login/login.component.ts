import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="login-container">
      <div class="login-card-horizontal">
        <!-- Panel Izquierdo: Identidad Oficial Cooperativa Marabunta R.L. -->
        <div class="panel-izquierdo">
          <img
            [src]="logoUrl()"
            (error)="onLogoError()"
            alt="Logo Cooperativa Minera Marabunta R.L."
            class="logo-cooperativa"
          />
        </div>

        <!-- Panel Derecho: Formulario DOCS -->
        <div class="panel-derecho">
          <div class="cabecera-sistema">
            Sistema de documentos digitales de la cooperativa minera Marabunta R.L.
          </div>
          <div class="titulo-docs">DOCS</div>

          @if (loading()) {
            <mat-progress-bar mode="indeterminate" class="mb-4"></mat-progress-bar>
          }

          @if (errorMessage()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <!-- Campo Usuario -->
            <div class="input-group">
              <mat-icon class="icon-field">person</mat-icon>
              <input
                type="text"
                formControlName="username"
                class="input-blanco"
                placeholder="Nombre de usuario"
                autocomplete="username"
                required
              />
            </div>
            @if (loginForm.get('username')?.touched && loginForm.get('username')?.hasError('required')) {
              <div class="field-error">El nombre de usuario es obligatorio</div>
            }

            <!-- Campo Contraseña -->
            <div class="input-group">
              <mat-icon class="icon-field">lock</mat-icon>
              <input
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                class="input-blanco"
                placeholder="Contraseña"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="toggle-password"
                (click)="hidePassword.set(!hidePassword())"
                matTooltip="Mostrar u ocultar contraseña"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.hasError('required')) {
              <div class="field-error">La contraseña es obligatoria</div>
            }

            <!-- Botón Login Píldora Oscuro -->
            <button
              type="submit"
              class="login-btn"
              [disabled]="loginForm.invalid || loading()"
            >
              {{ loading() ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN' }}
            </button>
          </form>

          <!-- Enlaces Públicos Destacados Institucionales -->
          <div class="enlaces-publicos">
            <!-- 1. Verifica tu documento (Arriba) -->
            <a routerLink="/verificar" class="acceso-publico-card card-verificar">
              <div class="card-icon-wrap icon-petroleo">
                <mat-icon>verified_user</mat-icon>
              </div>
              <div class="card-text">
                <strong class="card-title">Verifica tu documento aquí</strong>
                <span class="card-subtitle">Cotejo de autenticidad y fe pública digital</span>
              </div>
              <mat-icon class="card-arrow">arrow_forward</mat-icon>
            </a>

            <!-- 2. Ventanilla Única Virtual (Abajo) -->
            <a routerLink="/ventanilla-virtual" class="acceso-publico-card card-ventanilla">
              <div class="card-icon-wrap icon-petroleo-secundario">
                <mat-icon>mark_email_read</mat-icon>
              </div>
              <div class="card-text">
                <strong class="card-title">Ventanilla Única Virtual</strong>
                <span class="card-subtitle">Radicar notas externas o consultar trámite</span>
              </div>
              <mat-icon class="card-arrow">arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, rgba(15, 32, 39, 0.92) 0%, rgba(15, 61, 62, 0.88) 100%),
                  url('/assets/images/bg.jpg') no-repeat center center fixed;
      background-size: cover;
      font-family: 'Poppins', Roboto, sans-serif;
    }

    .login-card-horizontal {
      display: flex;
      width: 100%;
      max-width: 920px;
      min-height: 500px;
      background-color: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* --- PANEL IZQUIERDO (LOGO OFICIAL Y FONDO PETRÓLEO) --- */
    .panel-izquierdo {
      flex: 1;
      background: linear-gradient(145deg, #0f2027 0%, #15303c 50%, #0f3d3e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      position: relative;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-cooperativa {
      width: 100%;
      max-width: 320px;
      height: auto;
      filter: drop-shadow(0px 10px 24px rgba(0, 0, 0, 0.35));
      z-index: 2;
      transition: transform 0.3s ease;
      &:hover {
        transform: scale(1.02);
      }
    }

    /* --- PANEL DERECHO (FORMULARIO DOCS) --- */
    .panel-derecho {
      flex: 1.1;
      padding: 45px 55px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: #ffffff;
    }

    .cabecera-sistema {
      text-align: center;
      font-size: 12.5px;
      font-weight: 600;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.6px;
      line-height: 1.4;
    }

    .titulo-docs {
      text-align: center;
      font-size: 42px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 30px;
      letter-spacing: 1.5px;
      font-family: 'Poppins', sans-serif;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .input-group {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    .input-blanco {
      width: 100%;
      height: 50px;
      background-color: #ffffff;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      padding: 0 45px;
      font-size: 15px;
      font-family: 'Poppins', sans-serif;
      color: #0f172a;
      box-sizing: border-box;
      transition: all 0.25s ease;

      &::placeholder {
        color: #64748b;
        font-weight: 400;
      }

      &:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
    }

    .icon-field {
      position: absolute;
      left: 12px;
      color: #0f172a;
      font-size: 22px;
      width: 22px;
      height: 22px;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-password {
      position: absolute;
      right: 12px;
      background: transparent;
      border: none;
      color: #0284c7;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .field-error {
      color: #dc2626;
      font-size: 12px;
      margin-top: -10px;
      margin-left: 4px;
      font-weight: 500;
    }

    /* --- BOTÓN LOGIN PÍLDORA AZUL OSCURO --- */
    .login-btn {
      width: 100%;
      padding: 14px;
      margin-top: 10px;
      background-color: #1e293b;
      color: #ffffff;
      border: none;
      border-radius: 25px;
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 12px rgba(30, 41, 59, 0.25);

      &:hover:not(:disabled) {
        background-color: #0f172a;
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.35);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* --- ENLACES PÚBLICOS DESTACADOS --- */
    .enlaces-publicos {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 22px;
    }

    .acceso-publico-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: 14px;
      text-decoration: none;
      color: #0f2027;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);

      &.card-verificar {
        background: linear-gradient(135deg, #f0fdf9 0%, #e6f4f1 100%);
        border: 1px solid #a7f3d0;
        &:hover {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-color: #10b981;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.18);
          transform: translateY(-2px);
        }
      }

      &.card-ventanilla {
        background: linear-gradient(135deg, #f4fbfb 0%, #e8f5f5 100%);
        border: 1px solid #b2dfdb;
        &:hover {
          background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
          border-color: #00796b;
          box-shadow: 0 8px 20px rgba(0, 121, 107, 0.18);
          transform: translateY(-2px);
        }
      }
    }

    .card-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: #ffffff;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      &.icon-petroleo {
        background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
        box-shadow: 0 3px 8px rgba(15, 56, 62, 0.35);
      }

      &.icon-petroleo-secundario {
        background: linear-gradient(135deg, #005c53 0%, #042940 100%);
        box-shadow: 0 3px 8px rgba(4, 41, 64, 0.35);
      }
    }

    .card-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f2027;
    }

    .card-subtitle {
      font-size: 11.5px;
      color: #475569;
    }

    .card-arrow {
      color: #0d5c63;
      font-size: 20px;
      width: 20px;
      height: 20px;
      transition: transform 0.2s ease;
    }

    .acceso-publico-card:hover .card-arrow {
      transform: translateX(4px);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.88rem;
      font-weight: 500;
    }

    .mb-4 {
      margin-bottom: 1rem;
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .login-card-horizontal {
        flex-direction: column;
        max-width: 440px;
      }
      .panel-izquierdo {
        padding: 35px 20px;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
      .panel-derecho {
        padding: 35px 25px;
      }
      .logo-cooperativa {
        max-width: 220px;
      }
      .titulo-docs {
        font-size: 34px;
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Logo institucional de la cooperativa: carga local primero y fallback a URL remota de alta resolución
  readonly logoUrl = signal<string>('/assets/images/logo_cooperativa.png');
  private fallbackTried = false;

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onLogoError(): void {
    if (!this.fallbackTried) {
      this.fallbackTried = true;
      // Cargar desde URL remota oficial si el asset local fallara
      this.logoUrl.set('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=375,fit=crop/1EdidoQhwln867gG/disea--o-sin-tatulo-VuRHqfOszoZxhEbq.png');
    } else {
      this.logoUrl.set('/assets/images/logo.png');
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.tipoMensaje === 'EXITO') {
          const roles = res.datos?.roles;
          if (roles && roles.length > 1) {
            this.router.navigate(['/elegir']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } else {
          this.errorMessage.set(res.mensaje || 'Error al iniciar sesión');
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.mensaje || err.error?.message || 'Error de conexión con el backend';
        this.errorMessage.set(msg);
      }
    });
  }
}
