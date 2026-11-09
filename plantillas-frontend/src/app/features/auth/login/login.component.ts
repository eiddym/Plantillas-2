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
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, rgba(15, 32, 39, 0.92) 0%, rgba(15, 61, 62, 0.88) 100%),
                  url('/assets/images/bg.jpg') no-repeat center center fixed;
      background-size: cover;
      font-family: 'Poppins', Roboto, sans-serif;
      box-sizing: border-box;
    }

    .login-card-horizontal {
      display: flex;
      width: 100%;
      max-width: 860px;
      min-height: 460px;
      background-color: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      overflow: hidden;
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* --- PANEL IZQUIERDO (LOGO OFICIAL Y FONDO PETRÓLEO) --- */
    .panel-izquierdo {
      flex: 1;
      background: linear-gradient(145deg, #0f2027 0%, #15303c 50%, #0f3d3e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 36px;
      position: relative;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-cooperativa {
      width: 100%;
      max-width: 260px;
      height: auto;
      max-height: 220px;
      object-fit: contain;
      filter: drop-shadow(0px 8px 20px rgba(0, 0, 0, 0.35));
      z-index: 2;
      transition: transform 0.3s ease;
      &:hover {
        transform: scale(1.02);
      }
    }

    /* --- PANEL DERECHO (FORMULARIO DOCS) --- */
    .panel-derecho {
      flex: 1.15;
      padding: 38px 46px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: #ffffff;
    }

    .cabecera-sistema {
      text-align: center;
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
      line-height: 1.4;
    }

    .titulo-docs {
      text-align: center;
      font-size: 34px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 22px;
      letter-spacing: 1.2px;
      font-family: 'Poppins', sans-serif;
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
      background-color: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0 44px;
      font-size: 14.5px;
      font-family: 'Poppins', sans-serif;
      color: #0f172a;
      box-sizing: border-box;
      transition: all 0.2s ease;

      &::placeholder {
        color: #94a3b8;
        font-weight: 400;
      }

      &:hover {
        border-color: #94a3b8;
        background-color: #ffffff;
      }

      &:focus {
        outline: none;
        background-color: #ffffff;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }
    }

    .icon-field {
      position: absolute;
      left: 14px;
      color: #64748b;
      font-size: 20px;
      width: 20px;
      height: 20px;
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
      transition: color 0.2s ease;
      &:hover {
        color: #0284c7;
      }
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .field-error {
      color: #dc2626;
      font-size: 11.5px;
      margin-top: -8px;
      margin-left: 4px;
      font-weight: 500;
    }

    /* --- BOTÓN LOGIN PÍLDORA ELEGANTE --- */
    .login-btn {
      width: 100%;
      height: 46px;
      margin-top: 6px;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 100%);
      color: #ffffff;
      border: none;
      border-radius: 23px;
      font-family: 'Poppins', sans-serif;
      font-weight: 700;
      font-size: 13.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(15, 32, 39, 0.25);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #15303c 0%, #2c5364 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(15, 32, 39, 0.35);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    /* --- BOTÓN SSO MARABUNTA ID --- */
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
      color: rgba(15, 32, 39, 0.45);
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &::before,
      &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(15, 32, 39, 0.12);
      }

      span {
        padding: 0 10px;
      }
    }

    .btn-sso {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border-radius: 22px;
      background: linear-gradient(135deg, #1b3842 0%, #0f2027 100%);
      color: #e0f2f1;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);

      &:hover {
        background: linear-gradient(135deg, #244b58 0%, #152c35 100%);
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 32, 39, 0.3);
      }

      .sso-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #80cbc4;
      }
    }

    /* --- ENLACES PÚBLICOS DESTACADOS --- */
    .enlaces-publicos {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    }

    .acceso-publico-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      text-decoration: none;
      color: #0f2027;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 4px rgba(15, 32, 39, 0.04);

      &.card-verificar {
        background: linear-gradient(135deg, #f0fdf9 0%, #e6f4f1 100%);
        border: 1px solid #a7f3d0;
        &:hover {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-color: #10b981;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.16);
          transform: translateY(-1px);
        }
      }

      &.card-ventanilla {
        background: linear-gradient(135deg, #f4fbfb 0%, #e8f5f5 100%);
        border: 1px solid #b2dfdb;
        &:hover {
          background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
          border-color: #00796b;
          box-shadow: 0 4px 14px rgba(0, 121, 107, 0.16);
          transform: translateY(-1px);
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

      mat-icon {
        color: #ffffff;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.icon-petroleo {
        background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
        box-shadow: 0 2px 6px rgba(15, 56, 62, 0.3);
      }

      &.icon-petroleo-secundario {
        background: linear-gradient(135deg, #005c53 0%, #042940 100%);
        box-shadow: 0 2px 6px rgba(4, 41, 64, 0.3);
      }
    }

    .card-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f2027;
    }

    .card-subtitle {
      font-size: 11px;
      color: #475569;
    }

    .card-arrow {
      color: #0d5c63;
      font-size: 18px;
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
    }

    .acceso-publico-card:hover .card-arrow {
      transform: translateX(3px);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      font-size: 0.84rem;
      font-weight: 500;
    }

    .mb-4 {
      margin-bottom: 0.75rem;
    }

    /* =========================================================================
       RESPONSIVE MÓVIL Y TABLET: DISEÑO COMPACTO, ELEGANTE Y SIN ALARGAMIENTOS
       ========================================================================= */
    @media (max-width: 768px) {
      .login-container {
        padding: 16px 12px;
        align-items: center;
      }

      .login-card-horizontal {
        flex-direction: column;
        max-width: 390px;
        min-height: auto;
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
        margin: auto;
      }

      .panel-izquierdo {
        padding: 16px 16px 14px;
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #0f2027 0%, #173842 100%);
      }

      .logo-cooperativa {
        max-width: 95px;
        max-height: 70px;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25));
      }

      .panel-derecho {
        padding: 18px 20px 22px;
        flex: unset;
      }

      .cabecera-sistema {
        font-size: 10px;
        margin-bottom: 2px;
        letter-spacing: 0.3px;
        line-height: 1.3;
      }

      .titulo-docs {
        font-size: 22px;
        margin-bottom: 14px;
        letter-spacing: 0.5px;
      }

      .login-form {
        gap: 11px;
      }

      .input-blanco {
        height: 42px;
        font-size: 13.5px;
        padding: 0 38px;
        border-radius: 8px;
      }

      .icon-field {
        left: 11px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .toggle-password {
        right: 10px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .login-btn {
        height: 42px;
        font-size: 12.5px;
        border-radius: 21px;
        margin-top: 3px;
      }

      .sso-container {
        margin-top: 10px;
        gap: 8px;
      }

      .btn-sso {
        height: 40px;
        font-size: 12px;
        border-radius: 20px;
      }

      .enlaces-publicos {
        margin-top: 14px;
        gap: 8px;
      }

      .acceso-publico-card {
        padding: 8px 12px;
        border-radius: 10px;
        gap: 10px;
      }

      .card-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        mat-icon {
          font-size: 17px;
          width: 17px;
          height: 17px;
        }
      }

      .card-title {
        font-size: 12px;
      }

      .card-subtitle {
        font-size: 10.5px;
      }

      .card-arrow {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    @media (max-width: 380px) {
      .login-container {
        padding: 8px;
      }

      .panel-derecho {
        padding: 14px 14px 18px;
      }

      .titulo-docs {
        font-size: 20px;
        margin-bottom: 10px;
      }

      .logo-cooperativa {
        max-width: 80px;
        max-height: 60px;
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
