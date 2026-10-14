import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-verificar-documento',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="verificar-wrapper">
      <div class="verificar-container">
        <mat-card class="verificar-card">
          <div class="verificar-header">
            <div class="header-icon">
              <mat-icon>verified</mat-icon>
            </div>
            <h2>Verificación Pública de Documentos</h2>
            <p class="subtitle">Validación de autenticidad e integridad de documentos digitales</p>
          </div>

          <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

          <mat-card-content>
            <form [formGroup]="verifyForm" (ngSubmit)="consultar()">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>CITE del Documento</mat-label>
                <input matInput formControlName="cite" placeholder="Ej. AGETIC-INF-001/2026">
                <mat-icon matPrefix>tag</mat-icon>
                <mat-error *ngIf="verifyForm.get('cite')?.hasError('required')">El CITE es obligatorio</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Código de Seguridad</mat-label>
                <input matInput formControlName="codigo" placeholder="Ej. A1B2C3D4">
                <mat-icon matPrefix>security</mat-icon>
                <mat-error *ngIf="verifyForm.get('codigo')?.hasError('required')">El código es obligatorio</mat-error>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="submit-btn" [disabled]="verifyForm.invalid || loading()">
                <mat-icon>search</mat-icon>
                <span>Verificar Documento</span>
              </button>
            </form>

            <!-- Results display -->
            <div *ngIf="documentoValido()" class="result-box result-success">
              <div class="result-header">
                <mat-icon>check_circle</mat-icon>
                <h3>Documento Auténtico y Válido</h3>
              </div>
              <div class="result-details">
                <p><strong>CITE:</strong> {{ resultado()?.cite || resultado()?.nombre }}</p>
                <p><strong>Referencia:</strong> {{ resultado()?.ref || 'Sin referencia' }}</p>
                <p><strong>Estado:</strong> {{ resultado()?.estado }}</p>
                <p><strong>Fecha de Creación:</strong> {{ resultado()?.fecha_creacion || resultado()?._fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
            </div>

            <div *ngIf="errorMensaje()" class="result-box result-error">
              <mat-icon>cancel</mat-icon>
              <span>{{ errorMensaje() }}</span>
            </div>
          </mat-card-content>

          <mat-card-actions class="actions-center">
            <a routerLink="/auth/login" mat-button color="primary">
              <mat-icon>login</mat-icon>
              <span>Ir al inicio de sesión institucional</span>
            </a>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .verificar-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%);
      padding: 1.5rem;
    }
    .verificar-container {
      width: 100%;
      max-width: 520px;
    }
    .verificar-card {
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    }
    .verificar-header {
      text-align: center;
      margin-bottom: 1.5rem;
      .header-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 0.75rem auto;
        border-radius: 50%;
        background: #e8f5e9;
        color: #2e7d32;
        display: flex;
        align-items: center;
        justify-content: center;
        mat-icon { font-size: 36px; width: 36px; height: 36px; }
      }
      h2 { margin: 0; color: #1a237e; font-size: 1.4rem; font-weight: 700; }
      .subtitle { color: #607d8b; font-size: 0.85rem; margin-top: 4px; }
    }
    .w-full { width: 100%; margin-bottom: 0.5rem; }
    .submit-btn {
      width: 100%;
      height: 48px;
      border-radius: 8px;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 1rem;
    }
    .result-box {
      margin-top: 1.5rem;
      border-radius: 8px;
      padding: 16px;
    }
    .result-success {
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      color: #1b5e20;
      .result-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        h3 { margin: 0; font-size: 1.1rem; }
      }
      .result-details p {
        margin: 4px 0;
        font-size: 0.9rem;
      }
    }
    .result-error {
      background: #ffebee;
      border: 1px solid #ffcdd2;
      color: #c62828;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }
  `]
})
export class VerificarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly verifyForm: FormGroup = this.fb.group({
    cite: ['', [Validators.required]],
    codigo: ['', [Validators.required]]
  });

  readonly loading = signal(false);
  readonly documentoValido = signal(false);
  readonly resultado = signal<any>(null);
  readonly errorMensaje = signal<string | null>(null);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['cite'] || qp['codigo']) {
      this.verifyForm.patchValue({
        cite: qp['cite'] || '',
        codigo: qp['codigo'] || ''
      });
      if (qp['cite'] && qp['codigo']) {
        this.consultar();
      }
    }
  }

  consultar(): void {
    if (this.verifyForm.invalid) return;

    this.loading.set(true);
    this.documentoValido.set(false);
    this.resultado.set(null);
    this.errorMensaje.set(null);

    const payload = {
      cite: this.verifyForm.value.cite.trim(),
      codigo: this.verifyForm.value.codigo.trim().toUpperCase()
    };

    this.http.post<any>('/api/v1/seguridad/verificar', payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.documentoValido.set(true);
          this.resultado.set(res.datos);
        } else {
          this.errorMensaje.set(res.mensaje || 'Documento no encontrado o código inválido');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMensaje.set(err.error?.mensaje || 'El documento no pudo ser validado');
      }
    });
  }
}
