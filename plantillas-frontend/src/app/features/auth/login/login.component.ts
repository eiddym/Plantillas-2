import { Component, OnInit, inject, signal } from '@angular/core';
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
          <div class="logo-wrapper">
            <img
              [src]="logoUrl()"
              (error)="onLogoError()"
              alt="Logo Cooperativa Minera Marabunta R.L."
              class="logo-cooperativa"
            />
          </div>
          <p class="folio-caption">Cooperativa Minera Marabunta R.L.</p>
        </div>

        <!-- Panel Derecho: Formulario DOCS -->
        <div class="panel-derecho">
          <div class="header-centrado">
            <div class="cabecera-sistema">
              Sistema de Gestión Documental y Correspondencia
            </div>
            <h1 class="titulo-docs">DOCS</h1>
          </div>

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

            <!-- Botón Login -->
            <button
              type="submit"
              class="login-btn"
              [disabled]="loginForm.invalid || loading()"
            >
              {{ loading() ? 'Ingresando al sistema...' : 'Ingresar al sistema' }}
            </button>
          </form>

          <!-- Acceso SSO Marabunta ID -->
          <div class="sso-container">
            <div class="sso-separator">
              <span>o accede directamente</span>
            </div>
            <a href="/api/v1/auth/oidc/login" class="btn-sso">
              <mat-icon class="sso-icon">vpn_key</mat-icon>
              <span>Acceder con Marabunta ID (SSO)</span>
            </a>
          </div>

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
                <span class="card-subtitle">Radicar notas externas o consultar documento</span>
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
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 32px 7vw 32px 32px;
      background-color: #022016;
      background-image: url('/assets/images/login-bg.jpg');
      background-repeat: no-repeat;
      background-position: center left;
      background-size: cover;
      font-family: var(--font-ui);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    }

    .login-card-horizontal {
      display: flex;
      width: 100%;
      max-width: 860px;
      min-height: 480px;
      background-color: #ffffff;
      border-radius: 26px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 32px 64px rgba(1, 20, 14, 0.65), 0 0 0 1px rgba(16, 185, 129, 0.18);
      overflow: hidden;
      position: relative;
      z-index: 2;
    }

    /* --- PANEL IZQUIERDO --- */
    .panel-izquierdo {
      flex: 0.92;
      background:
        radial-gradient(circle at 18% 88%, rgba(52, 211, 153, 0.35) 0%, transparent 58%),
        linear-gradient(160deg, #011c13 0%, #032f20 55%, #064e3b 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 36px 28px;
      position: relative;
      border-right: 1px solid rgba(52, 211, 153, 0.18);

      &::before {
        content: '';
        position: absolute;
        width: 240px;
        height: 240px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%);
        pointer-events: none;
      }
    }

    .logo-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }

    .logo-cooperativa {
      position: relative;
      width: 100%;
      max-width: 220px;
      height: auto;
      max-height: 200px;
      object-fit: contain;
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35));
      transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.42s ease;

      &:hover {
        transform: scale(1.12);
        filter: drop-shadow(0 18px 36px rgba(16, 185, 129, 0.45)) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
      }
    }

    .folio-caption {
      position: relative;
      margin: 0;
      font-family: var(--font-ui);
      font-size: 0.88rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.88);
      text-align: center;
      letter-spacing: 0.02em;
    }

    /* --- PANEL DERECHO --- */
    .panel-derecho {
      flex: 1.2;
      padding: 38px 44px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: #ffffff;
    }

    .header-centrado {
      text-align: center;
      margin-bottom: 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cabecera-sistema {
      text-align: center;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #059669;
      margin-bottom: 6px;
      line-height: 1.35;
    }

    .titulo-docs {
      text-align: center;
      font-family: var(--font-ui);
      font-size: 2.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .input-group {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    .input-blanco {
      width: 100%;
      height: 46px;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0 42px;
      font-size: 0.92rem;
      font-family: var(--font-ui);
      color: #0f172a;
      transition: border-color 0.16s ease, box-shadow 0.16s ease;

      &::placeholder {
        color: #94a3b8;
        font-weight: 400;
      }

      &:hover {
        border-color: #cbd5e1;
      }

      &:focus {
        outline: none;
        background-color: #ffffff;
        border-color: #059669;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.14);
      }
    }

    .icon-field {
      position: absolute;
      left: 13px;
      color: #64748b;
      font-size: 19px;
      width: 19px;
      height: 19px;
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
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      &:hover {
        color: #0f172a;
      }
      mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
      }
    }

    .field-error {
      color: var(--state-err);
      font-size: 0.76rem;
      margin-top: -8px;
      margin-left: 2px;
      font-weight: 500;
    }

    /* Botón Login Píldora Carbón (Captura 3) */
    .login-btn {
      width: 100%;
      height: 46px;
      margin-top: 4px;
      background: #111827;
      color: #ffffff;
      border: none;
      border-radius: 9999px;
      font-family: var(--font-ui);
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(17, 24, 39, 0.22);
      transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;

      &:hover:not(:disabled) {
        background: #1f2937;
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(17, 24, 39, 0.30);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    /* --- BOTÓN SSO MARABUNTA ID (Caja limpia estilo Captura 3) --- */
    .sso-container {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sso-separator {
      display: flex;
      align-items: center;
      text-align: center;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &::before,
      &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid #f1f5f9;
      }

      span {
        padding: 0 10px;
      }
    }

    .btn-sso {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 46px;
      border-radius: 14px;
      background: #ffffff;
      color: #0f172a;
      font-weight: 700;
      font-size: 0.88rem;
      text-decoration: none;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;

      &:hover {
        transform: translateY(-1px);
        border-color: #10b981;
        background: #f8fafc;
      }

      .sso-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
        color: #059669;
      }
    }

    /* --- ENLACES PÚBLICOS --- */
    .enlaces-publicos {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
    }

    .acceso-publico-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      text-decoration: none;
      color: var(--ink);
      border: 1px solid var(--line);
      transition: transform 0.16s ease, border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;

      &.card-verificar {
        background: #f0f9ff;
        border-color: #bae6fd;

        &:hover {
          background: #e0f2fe;
          border-color: #0284c7;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.14);
        }
      }

      &.card-ventanilla {
        background: #ecfdf5;
        border-color: #a7f3d0;

        &:hover {
          background: #d1fae5;
          border-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.14);
        }
      }
    }

    .card-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: linear-gradient(135deg, #0284c7 0%, #0e7490 100%);
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);

      mat-icon {
        color: #ffffff;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.icon-petroleo-secundario {
        background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
        box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);

        mat-icon {
          color: #ffffff;
        }
      }
    }

    .card-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .card-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--ink);
    }

    .card-subtitle {
      font-size: 0.74rem;
      color: var(--ink-muted);
    }

    .card-arrow {
      color: var(--ink-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      background: var(--state-err-bg);
      color: var(--state-err);
      border: 1px solid rgba(185, 28, 28, 0.25);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      font-size: 0.84rem;
      font-weight: 500;
    }

    .mb-4 {
      margin-bottom: 0.75rem;
    }

    @media (max-width: 1024px) {
      .login-container {
        justify-content: center;
        padding: 24px;
        background-position: center center;
      }
    }

    @media (max-width: 768px) {
      .login-container {
        padding: 16px 12px;
        justify-content: center;
      }

      .login-card-horizontal {
        flex-direction: column;
        max-width: 420px;
        min-height: auto;
        border-radius: 18px;
      }

      .panel-izquierdo {
        padding: 22px 18px 16px;
        gap: 8px;
        border-right: none;
        border-bottom: 1px solid rgba(52, 211, 153, 0.22);
      }

      .folio-caption {
        display: block;
        font-size: 0.78rem;
      }

      .logo-cooperativa {
        max-width: 96px;
        max-height: 76px;
      }

      .panel-derecho {
        padding: 22px 20px 24px;
        flex: unset;
      }

      .titulo-docs {
        font-size: 1.65rem;
        margin-bottom: 14px;
      }

      .input-blanco {
        height: 42px;
        font-size: 0.88rem;
        padding: 0 38px;
      }

      .login-btn,
      .btn-sso {
        height: 42px;
      }
    }

    @media (max-width: 380px) {
      .login-container {
        padding: 8px;
      }

      .panel-derecho {
        padding: 16px 14px 18px;
      }

      .logo-cooperativa {
        max-width: 76px;
        max-height: 58px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
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

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    const ssoError = params.get('error');

    if (ssoError) {
      this.errorMessage.set('Error en la autenticación SSO. Inicie sesión con sus credenciales.');
      window.history.replaceState({}, document.title, '/auth/login');
      return;
    }

    if (ssoToken) {
      this.loading.set(true);
      this.errorMessage.set(null);
      localStorage.setItem('token', ssoToken);
      localStorage.setItem('auth_method', 'sso');
      this.authService.currentToken.set(ssoToken);
      window.history.replaceState({}, document.title, '/auth/login');

      this.authService.refrescarSesion().subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.tipoMensaje === 'EXITO') {
            this.authService.iniciarMonitoreoActividad();
            const roles = this.authService.currentRoles();
            if (roles && roles.length > 1) {
              this.router.navigate(['/elegir']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.errorMessage.set(res.mensaje || 'Error al validar sesión SSO');
          }
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('No se pudo verificar la sesión SSO.');
        }
      });
    }
  }

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
