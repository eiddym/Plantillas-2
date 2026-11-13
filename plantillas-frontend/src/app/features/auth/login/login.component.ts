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
      <!-- Fondo Escultural de Láminas de Óxido de Cobre / Malaquita 3D -->
      <div class="copper-sculpture-bg" aria-hidden="true">
        <svg class="sculpture-svg" viewBox="0 0 760 1000" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid slice">
          <defs>
            <!-- Filtros de sombra y profundidad 3D para estratos de cobre -->
            <filter id="copper-shadow" x="-30%" y="-30%" width="170%" height="170%">
              <feDropShadow dx="-10" dy="18" stdDeviation="16" flood-color="#000d07" flood-opacity="0.85"/>
            </filter>
            <filter id="deep-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="-14" dy="24" stdDeviation="22" flood-color="#000704" flood-opacity="0.92"/>
            </filter>

            <!-- Gradientes de Óxido de Cobre, Pátina y Malaquita -->
            <linearGradient id="blade-rim" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stop-color="#a7f3d0" stop-opacity="0.9"/>
              <stop offset="45%" stop-color="#34d399" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#059669" stop-opacity="0.15"/>
            </linearGradient>

            <linearGradient id="blade-1" x1="0%" y1="10%" x2="95%" y2="85%">
              <stop offset="0%" stop-color="#011e15"/>
              <stop offset="30%" stop-color="#043b2b"/>
              <stop offset="70%" stop-color="#096547"/>
              <stop offset="100%" stop-color="#15805c"/>
            </linearGradient>

            <linearGradient id="blade-2" x1="5%" y1="15%" x2="90%" y2="85%">
              <stop offset="0%" stop-color="#011b13"/>
              <stop offset="25%" stop-color="#054432"/>
              <stop offset="65%" stop-color="#0d7955"/>
              <stop offset="100%" stop-color="#22a879"/>
            </linearGradient>

            <linearGradient id="blade-3" x1="10%" y1="20%" x2="90%" y2="85%">
              <stop offset="0%" stop-color="#011811"/>
              <stop offset="30%" stop-color="#06513b"/>
              <stop offset="70%" stop-color="#10956a"/>
              <stop offset="100%" stop-color="#34d399"/>
            </linearGradient>

            <linearGradient id="blade-4" x1="15%" y1="25%" x2="85%" y2="85%">
              <stop offset="0%" stop-color="#022317"/>
              <stop offset="35%" stop-color="#076147"/>
              <stop offset="75%" stop-color="#129e71"/>
              <stop offset="100%" stop-color="#4ade80"/>
            </linearGradient>

            <linearGradient id="blade-5" x1="10%" y1="30%" x2="80%" y2="90%">
              <stop offset="0%" stop-color="#011a12"/>
              <stop offset="30%" stop-color="#06533c"/>
              <stop offset="70%" stop-color="#0f8d64"/>
              <stop offset="100%" stop-color="#2fc592"/>
            </linearGradient>

            <linearGradient id="blade-6" x1="5%" y1="35%" x2="85%" y2="90%">
              <stop offset="0%" stop-color="#01140e"/>
              <stop offset="35%" stop-color="#044230"/>
              <stop offset="75%" stop-color="#0a6e4e"/>
              <stop offset="100%" stop-color="#1aa577"/>
            </linearGradient>

            <linearGradient id="blade-7" x1="0%" y1="40%" x2="90%" y2="95%">
              <stop offset="0%" stop-color="#00110a"/>
              <stop offset="40%" stop-color="#033324"/>
              <stop offset="80%" stop-color="#07573d"/>
              <stop offset="100%" stop-color="#0f835b"/>
            </linearGradient>

            <linearGradient id="blade-8" x1="0%" y1="50%" x2="95%" y2="100%">
              <stop offset="0%" stop-color="#000e08"/>
              <stop offset="45%" stop-color="#02281c"/>
              <stop offset="85%" stop-color="#054a34"/>
              <stop offset="100%" stop-color="#0c6948"/>
            </linearGradient>

            <linearGradient id="blade-9" x1="0%" y1="55%" x2="95%" y2="100%">
              <stop offset="0%" stop-color="#000b06"/>
              <stop offset="50%" stop-color="#021f16"/>
              <stop offset="85%" stop-color="#043a28"/>
              <stop offset="100%" stop-color="#09553b"/>
            </linearGradient>
          </defs>

          <!-- Resplandores ambientales de malaquita profunda -->
          <circle cx="60" cy="500" r="380" fill="#059669" opacity="0.22"/>
          <circle cx="220" cy="360" r="240" fill="#10b981" opacity="0.16"/>

          <!-- Láminas esculturales curvadas en abanico 3D de óxido de cobre -->
          <!-- Lámina 1 -->
          <path d="M -30 420 C 60 280 140 160 220 80 C 245 55 275 75 260 110 C 220 200 160 360 -30 480 Z" fill="url(#blade-1)" filter="url(#copper-shadow)"/>
          <path d="M 220 80 C 245 55 275 75 260 110 C 220 200 160 360 -30 480" fill="none" stroke="url(#blade-rim)" stroke-width="2.5" opacity="0.85"/>

          <!-- Lámina 2 -->
          <path d="M -20 440 C 90 320 200 220 310 140 C 338 120 365 145 348 180 C 295 285 200 440 -20 540 Z" fill="url(#blade-2)" filter="url(#copper-shadow)"/>
          <path d="M 310 140 C 338 120 365 145 348 180 C 295 285 200 440 -20 540" fill="none" stroke="url(#blade-rim)" stroke-width="2.5" opacity="0.88"/>

          <!-- Lámina 3 -->
          <path d="M -20 460 C 130 360 270 290 395 225 C 425 208 450 235 430 272 C 365 385 240 510 -20 600 Z" fill="url(#blade-3)" filter="url(#copper-shadow)"/>
          <path d="M 395 225 C 425 208 450 235 430 272 C 365 385 240 510 -20 600" fill="none" stroke="url(#blade-rim)" stroke-width="2.6" opacity="0.9"/>

          <!-- Lámina 4 -->
          <path d="M -10 480 C 160 410 320 360 465 320 C 498 310 518 340 495 380 C 420 500 270 600 -10 660 Z" fill="url(#blade-4)" filter="url(#copper-shadow)"/>
          <path d="M 465 320 C 498 310 518 340 495 380 C 420 500 270 600 -10 660" fill="none" stroke="url(#blade-rim)" stroke-width="2.8" opacity="0.95"/>

          <!-- Lámina 5 (Cresta central) -->
          <path d="M -10 500 C 180 470 350 435 500 435 C 532 435 540 470 512 505 C 430 600 280 670 -10 720 Z" fill="url(#blade-5)" filter="url(#deep-shadow)"/>
          <path d="M 500 435 C 532 435 540 470 512 505 C 430 600 280 670 -10 720" fill="none" stroke="url(#blade-rim)" stroke-width="3" opacity="0.95"/>

          <!-- Lámina 6 -->
          <path d="M -10 530 C 180 535 340 535 480 560 C 510 568 515 605 485 635 C 395 710 260 750 -10 780 Z" fill="url(#blade-6)" filter="url(#copper-shadow)"/>
          <path d="M 480 560 C 510 568 515 605 485 635 C 395 710 260 750 -10 780" fill="none" stroke="url(#blade-rim)" stroke-width="2.8" opacity="0.92"/>

          <!-- Lámina 7 -->
          <path d="M -10 560 C 160 600 310 640 430 685 C 458 698 455 735 425 760 C 340 820 220 830 -10 840 Z" fill="url(#blade-7)" filter="url(#copper-shadow)"/>
          <path d="M 430 685 C 458 698 455 735 425 760 C 340 820 220 830 -10 840" fill="none" stroke="url(#blade-rim)" stroke-width="2.6" opacity="0.9"/>

          <!-- Lámina 8 -->
          <path d="M -20 590 C 140 680 260 735 355 795 C 380 812 372 848 340 868 C 265 910 160 905 -20 900 Z" fill="url(#blade-8)" filter="url(#copper-shadow)"/>
          <path d="M 355 795 C 380 812 372 848 340 868 C 265 910 160 905 -20 900" fill="none" stroke="url(#blade-rim)" stroke-width="2.4" opacity="0.85"/>

          <!-- Lámina 9 -->
          <path d="M -20 620 C 110 750 200 830 270 895 C 290 915 278 948 245 962 C 175 990 90 970 -20 955 Z" fill="url(#blade-9)" filter="url(#copper-shadow)"/>
          <path d="M 270 895 C 290 915 278 948 245 962 C 175 990 90 970 -20 955" fill="none" stroke="url(#blade-rim)" stroke-width="2" opacity="0.8"/>
        </svg>
      </div>

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
      background:
        radial-gradient(circle at 12% 50%, rgba(16, 185, 129, 0.16) 0%, transparent 60%),
        radial-gradient(circle at 86% 18%, rgba(5, 150, 105, 0.12) 0%, transparent 50%),
        linear-gradient(135deg, #01140d 0%, #022316 45%, #033221 75%, #01180f 100%);
      background-size: cover;
      font-family: var(--font-ui);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    }

    /* Fondo Escultural Láminas 3D Óxido de Cobre / Malaquita a la izquierda */
    .copper-sculpture-bg {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 58vw;
      max-width: 880px;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      display: flex;
      align-items: center;
      opacity: 0.95;
    }

    .sculpture-svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.7));
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
      }

      .copper-sculpture-bg {
        width: 100vw;
        max-width: none;
        opacity: 0.28;
      }
    }

    @media (max-width: 768px) {
      .login-container {
        padding: 16px 12px;
        justify-content: center;
      }

      .copper-sculpture-bg {
        opacity: 0.18;
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
