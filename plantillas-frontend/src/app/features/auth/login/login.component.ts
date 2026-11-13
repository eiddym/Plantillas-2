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

        <!-- Panel Derecho: Acceso al Sistema -->
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

          <!-- Formulario de acceso local (comentado a requerimiento para habilitar acceso único SSO)
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
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

            <button
              type="submit"
              class="login-btn"
              [disabled]="loginForm.invalid || loading()"
            >
              {{ loading() ? 'Ingresando al sistema...' : 'Ingresar al sistema' }}
            </button>
          </form>
          -->

          <!-- Acceso SSO Marabunta ID Principal -->
          <div class="sso-primary-wrap">
            <a href="/api/v1/auth/oidc/login" class="btn-sso-primary">
              <mat-icon class="sso-icon">vpn_key</mat-icon>
              <span>Acceder con Marabunta ID</span>
            </a>
            <p class="sso-hint">Acceso seguro corporativo</p>
          </div>

          <!-- Enlaces Públicos Compactos en Píldoras -->
          <div class="enlaces-publicos-pills">
            <a routerLink="/verificar" class="pill-publico pill-verificar" matTooltip="Cotejo de autenticidad y fe pública digital">
              <mat-icon>verified_user</mat-icon>
              <span>Verificar documento</span>
            </a>
            <a routerLink="/ventanilla-virtual" class="pill-publico pill-ventanilla" matTooltip="Radicar notas externas o consultar documento">
              <mat-icon>mark_email_read</mat-icon>
              <span>Ventanilla Virtual</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Footer institucional con fecha dinámica -->
      <footer class="login-footer">
        <span>Desarrollado por <strong>Armotech</strong> &copy; {{ anioActual }}</span>
      </footer>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 40px 9vw 40px 40px;
      background-color: #01140e;
      background-image:
        linear-gradient(to right, rgba(1, 20, 14, 0.12) 0%, rgba(1, 20, 14, 0.38) 45%, rgba(1, 20, 14, 0.72) 100%),
        url('/assets/images/login-bg.jpg');
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
      max-width: 760px;
      min-height: 380px;
      background-color: #ffffff;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 32px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.15);
      overflow: hidden;
      position: relative;
      z-index: 2;
    }

    /* --- PANEL IZQUIERDO --- */
    .panel-izquierdo {
      flex: 0.9;
      background:
        radial-gradient(circle at 20% 85%, rgba(52, 211, 153, 0.32) 0%, transparent 60%),
        linear-gradient(160deg, #011a12 0%, #032b1e 55%, #064e3b 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 36px 28px;
      position: relative;
      border-right: 1px solid rgba(52, 211, 153, 0.18);
    }

    .logo-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .logo-cooperativa {
      position: relative;
      width: 100%;
      max-width: 235px;
      height: auto;
      max-height: 210px;
      object-fit: contain;
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
      transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.42s ease;

      &:hover {
        transform: scale(1.10);
        filter: drop-shadow(0 18px 34px rgba(16, 185, 129, 0.5));
      }
    }

    .folio-caption {
      margin: 0;
      font-family: var(--font-ui);
      font-size: 0.84rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      letter-spacing: 0.02em;
    }

    /* --- PANEL DERECHO --- */
    .panel-derecho {
      flex: 1.15;
      padding: 40px 38px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: #ffffff;
    }

    .header-centrado {
      text-align: center;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cabecera-sistema {
      text-align: center;
      font-size: 0.72rem;
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
      font-size: 2.1rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.025em;
    }

    /* --- ACCESO PRINCIPAL SSO --- */
    .sso-primary-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .btn-sso-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.94rem;
      text-decoration: none;
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.32);
      border: 1px solid rgba(52, 211, 153, 0.3);
      transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(5, 150, 105, 0.42);
        filter: brightness(1.06);
      }

      .sso-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .sso-hint {
      margin: 0;
      font-size: 0.76rem;
      color: #64748b;
      text-align: center;
    }

    /* --- ENLACES PÚBLICOS EN PÍLDORAS COMPACTAS --- */
    .enlaces-publicos-pills {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
    }

    .pill-publico {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 10px 12px;
      border-radius: 11px;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
      white-space: nowrap;

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }

      &.pill-verificar {
        background: #f0fdf4;
        color: #065f46;
        border: 1px solid #bbf7d0;

        &:hover {
          background: #dcfce7;
          border-color: #86efac;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6, 95, 70, 0.08);
        }
      }

      &.pill-ventanilla {
        background: #f8fafc;
        color: #334155;
        border: 1px solid #e2e8f0;

        &:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(51, 65, 85, 0.08);
        }
      }
    }

    /* --- FOOTER DESARROLLADO POR ARMOTECH --- */
    .login-footer {
      position: absolute;
      bottom: 16px;
      right: 9vw;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.74rem;
      color: rgba(255, 255, 255, 0.70);
      letter-spacing: 0.03em;
      z-index: 3;
      user-select: none;

      strong {
        color: #6ee7b7;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
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

    @media (max-width: 900px) {
      .login-container {
        justify-content: center;
        padding: 30px 20px;
      }

      .login-footer {
        right: auto;
        left: 50%;
        transform: translateX(-50%);
        bottom: 12px;
        white-space: nowrap;
      }
    }

    @media (max-width: 680px) {
      .login-container {
        padding: 24px 16px 20px;
        justify-content: center;
        background-position: center center;
        background-image:
          linear-gradient(rgba(1, 20, 14, 0.45), rgba(1, 20, 14, 0.45)),
          url('/assets/images/login-bg.jpg');
      }

      .login-card-horizontal {
        flex-direction: column;
        max-width: 360px;
        width: 100%;
        min-height: auto;
        border-radius: 22px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
      }

      .panel-izquierdo {
        padding: 22px 18px 14px;
        gap: 8px;
        border-right: none;
        border-bottom: 1px solid rgba(52, 211, 153, 0.22);
      }

      .logo-cooperativa {
        max-width: 98px;
        max-height: 76px;
      }

      .folio-caption {
        font-size: 0.78rem;
      }

      .panel-derecho {
        padding: 20px 18px 22px;
      }

      .header-centrado {
        margin-bottom: 16px;
      }

      .cabecera-sistema {
        font-size: 0.67rem;
        margin-bottom: 3px;
      }

      .titulo-docs {
        font-size: 1.6rem;
      }

      .btn-sso-primary {
        height: 46px;
        font-size: 0.90rem;
      }

      .enlaces-publicos-pills {
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 18px;
        padding-top: 14px;
      }

      .pill-publico {
        padding: 9px 12px;
        font-size: 0.76rem;
      }

      .login-footer {
        position: relative;
        left: auto;
        bottom: auto;
        transform: none;
        margin-top: 18px;
        text-align: center;
        justify-content: center;
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.65);
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  readonly anioActual = new Date().getFullYear();
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
