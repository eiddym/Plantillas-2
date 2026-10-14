import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="login-wrapper">
      <div class="login-card-container">
        <mat-card class="login-card">
          <div class="login-header">
            <div class="brand-badge">
              <mat-icon>description</mat-icon>
            </div>
            <h2>Plantillas y Aprobación</h2>
            <p class="subtitle">Sistema de Gestión y Aprobación Documental</p>
          </div>

          <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

          <mat-card-content>
            <div *ngIf="errorMessage()" class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Usuario o Correo</mat-label>
                <input matInput formControlName="username" placeholder="Ej. sys_default" autocomplete="username">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error *ngIf="loginForm.get('username')?.hasError('required')">
                  El usuario es obligatorio
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Contraseña</mat-label>
                <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" autocomplete="current-password">
                <mat-icon matPrefix>lock</mat-icon>
                <button type="button" mat-icon-button matSuffix (click)="hidePassword.set(!hidePassword())">
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                  La contraseña es obligatoria
                </mat-error>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="submit-btn" [disabled]="loginForm.invalid || loading()">
                <mat-icon>login</mat-icon>
                <span>Ingresar al Sistema</span>
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 1rem;
    }
    .login-card-container {
      width: 100%;
      max-width: 440px;
    }
    .login-card {
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
      padding: 1.5rem 1rem;
      background: #ffffff;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3f51b5, #2196f3);
      color: #fff;
      margin-bottom: 0.75rem;
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    .login-header h2 {
      margin: 0;
      color: #1a237e;
      font-weight: 700;
      font-size: 1.5rem;
    }
    .subtitle {
      color: #607d8b;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    .w-full { width: 100%; margin-bottom: 0.5rem; }
    .submit-btn {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      border-radius: 8px;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #ffebee;
      color: #c62828;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.router.navigate(['/dashboard']);
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
