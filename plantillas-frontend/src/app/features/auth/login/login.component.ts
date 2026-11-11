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
          <div class="folio-badge">Gestión documental</div>
          <img
            [src]="logoUrl()"
            (error)="onLogoError()"
            alt="Logo Cooperativa Minera Marabunta R.L."
            class="logo-cooperativa"
          />
          <p class="folio-caption">Cooperativa Minera Marabunta R.L.</p>
        </div>

        <!-- Panel Derecho: Formulario DOCS -->
        <div class="panel-derecho">
          <div class="cabecera-sistema">
            Archivo y correspondencia oficial
          </div>
          <h1 class="titulo-docs">DOCS</h1>

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
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 20% 25%, rgba(14, 116, 144, 0.34), transparent 52%),
        radial-gradient(circle at 82% 78%, rgba(214, 168, 79, 0.22), transparent 48%),
        linear-gradient(145deg, rgba(10, 26, 30, 0.88), rgba(14, 48, 56, 0.9)),
        url('/assets/images/bg.jpg') no-repeat center center fixed;
      background-size: cover;
      font-family: var(--font-ui);
      box-sizing: border-box;
    }

    .login-card-horizontal {
      display: flex;
      width: 100%;
      max-width: 850px;
      min-height: 470px;
      background-color: var(--surface);
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 28px 60px rgba(8, 22, 26, 0.5);
      overflow: hidden;
    }

    /* --- PANEL IZQUIERDO --- */
    .panel-izquierdo {
      flex: 0.95;
      background: linear-gradient(155deg, #0b242a 0%, #13444e 55%, #0e6b78 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      padding: 36px 28px;
      position: relative;
      border-right: 3px solid var(--gold);

      &::before {
        content: '';
        position: absolute;
        width: 240px;
        height: 240px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(214, 168, 79, 0.2) 0%, transparent 70%);
        pointer-events: none;
      }
    }

    .folio-badge {
      position: relative;
      font-size: 0.75rem;
      font-weight: 700;
      color: #f5dfaa;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 14px;
      border: 1px solid rgba(214, 168, 79, 0.45);
      border-radius: 999px;
      background: rgba(214, 168, 79, 0.14);
      backdrop-filter: blur(8px);
    }

    .logo-cooperativa {
      position: relative;
      width: 100%;
      max-width: 220px;
      height: auto;
      max-height: 200px;
      object-fit: contain;
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35));
    }

    .folio-caption {
      position: relative;
      margin: 0;
      font-family: var(--font-ui);
      font-size: 0.88rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.88);
      text-align: center;
    }

    /* --- PANEL DERECHO --- */
    .panel-derecho {
      flex: 1.2;
      padding: 38px 44px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: var(--surface);
    }

    .cabecera-sistema {
      text-align: left;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--petrol-bright);
      margin-bottom: 4px;
    }

    .titulo-docs {
      text-align: left;
      font-family: var(--font-ui);
      font-size: 2.1rem;
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 22px 0;
      letter-spacing: -0.02em;
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
      height: 45px;
      background-color: var(--surface-tinted);
      border: 1.5px solid var(--line-strong);
      border-radius: 11px;
      padding: 0 42px;
      font-size: 0.92rem;
      font-family: var(--font-ui);
      color: var(--ink);
      transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;

      &::placeholder {
        color: #94a3b8;
        font-weight: 400;
      }

      &:hover {
        border-color: #94a3b8;
        background-color: var(--surface);
      }

      &:focus {
        outline: none;
        background-color: var(--surface);
        border-color: var(--petrol-bright);
        box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.16);
      }
    }

    .icon-field {
      position: absolute;
      left: 13px;
      color: var(--ink-muted);
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
      color: var(--ink-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      &:hover {
        color: var(--ink);
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

    .login-btn {
      width: 100%;
      height: 46px;
      margin-top: 4px;
      background: linear-gradient(135deg, #0f3a42 0%, #0e7490 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-family: var(--font-ui);
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(14, 116, 144, 0.28);
      transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(14, 116, 144, 0.36);
        filter: brightness(1.06);
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
      color: var(--ink-muted);
      font-size: 0.74rem;
      font-weight: 600;

      &::before,
      &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--line);
      }

      span {
        padding: 0 10px;
      }
    }

    .btn-sso {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      font-weight: 700;
      font-size: 0.88rem;
      text-decoration: none;
      border: 1px solid rgba(214, 168, 79, 0.45);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
      transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;

      &:hover {
        transform: translateY(-1px);
        border-color: var(--gold);
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
      }

      .sso-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
        color: var(--gold);
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

    @media (max-width: 768px) {
      .login-container {
        padding: 16px 12px;
      }

      .login-card-horizontal {
        flex-direction: column;
        max-width: 400px;
        min-height: auto;
        border-radius: 12px;
      }

      .panel-izquierdo {
        padding: 18px 16px 16px;
        gap: 8px;
        border-right: none;
        border-bottom: 2px solid var(--gold);
      }

      .folio-badge,
      .folio-caption {
        display: none;
      }

      .logo-cooperativa {
        max-width: 88px;
        max-height: 68px;
      }

      .panel-derecho {
        padding: 20px 20px 22px;
        flex: unset;
      }

      .titulo-docs {
        font-size: 1.5rem;
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
