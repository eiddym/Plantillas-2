import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard-page">
      <div class="dashboard-header">
        <div>
          <h1>Panel de Control</h1>
          <p class="subtitle">Bienvenido al sistema digital de plantillas y aprobación de documentos</p>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <mat-card class="kpi-card card-blue">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">Mis Documentos</span>
              <span class="kpi-value">--</span>
            </div>
            <div class="kpi-icon-wrap">
              <mat-icon>description</mat-icon>
            </div>
          </div>
          <div class="kpi-footer">
            <a routerLink="/documentos">Ver bandeja de documentos &rarr;</a>
          </div>
        </mat-card>

        <mat-card class="kpi-card card-amber">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">Pendientes Aprobación</span>
              <span class="kpi-value">--</span>
            </div>
            <div class="kpi-icon-wrap">
              <mat-icon>pending_actions</mat-icon>
            </div>
          </div>
          <div class="kpi-footer">
            <a routerLink="/aprobacion">Revisar pendientes &rarr;</a>
          </div>
        </mat-card>

        <mat-card class="kpi-card card-teal">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">Plantillas Formly</span>
              <span class="kpi-value">--</span>
            </div>
            <div class="kpi-icon-wrap">
              <mat-icon>settings</mat-icon>
            </div>
          </div>
          <div class="kpi-footer">
            <a routerLink="/plantillas">Gestionar plantillas &rarr;</a>
          </div>
        </mat-card>

        <mat-card class="kpi-card card-green">
          <div class="kpi-content">
            <div class="kpi-info">
              <span class="kpi-label">Firmados y Validados</span>
              <span class="kpi-value">--</span>
            </div>
            <div class="kpi-icon-wrap">
              <mat-icon>verified</mat-icon>
            </div>
          </div>
          <div class="kpi-footer">
            <a routerLink="/firmar">Ver archivo digital &rarr;</a>
          </div>
        </mat-card>
      </div>

      <!-- Quick Actions and System Status -->
      <div class="section-container">
        <mat-card class="content-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">bolt</mat-icon>
            <mat-card-title>Accesos Rápidos</mat-card-title>
            <mat-card-subtitle>Acciones frecuentes según tu perfil</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="actions-content">
            <button mat-raised-button color="primary" routerLink="/plantillas">
              <mat-icon>add_circle_outline</mat-icon>
              <span>Crear Nuevo Documento</span>
            </button>
            <button mat-stroked-button color="primary" routerLink="/documentos">
              <mat-icon>search</mat-icon>
              <span>Buscar Documentos</span>
            </button>
            <button mat-stroked-button routerLink="/catalogos">
              <mat-icon>folder_open</mat-icon>
              <span>Ver Catálogos</span>
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1200px;
      margin: 0 auto;
    }
    .dashboard-header {
      margin-bottom: 24px;
      h1 {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 700;
        color: #1a237e;
      }
      .subtitle {
        margin: 4px 0 0 0;
        color: #607d8b;
      }
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .kpi-card {
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border-left: 5px solid transparent;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      }
    }
    .card-blue { border-left-color: #1976d2; .kpi-icon-wrap { background: #e3f2fd; color: #1976d2; } }
    .card-amber { border-left-color: #f57c00; .kpi-icon-wrap { background: #fff3e0; color: #f57c00; } }
    .card-teal { border-left-color: #00897b; .kpi-icon-wrap { background: #e0f2f1; color: #00897b; } }
    .card-green { border-left-color: #388e3c; .kpi-icon-wrap { background: #e8f5e9; color: #388e3c; } }

    .kpi-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .kpi-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #78909c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #263238;
      margin-top: 4px;
    }
    .kpi-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .kpi-footer {
      border-top: 1px solid #f0f0f0;
      padding-top: 10px;
      font-size: 0.85rem;
      a {
        color: #3949ab;
        text-decoration: none;
        font-weight: 500;
        &:hover { text-decoration: underline; }
      }
    }
    .section-container {
      margin-bottom: 24px;
    }
    .content-card {
      border-radius: 12px;
      padding: 16px;
    }
    .actions-content {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
      button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 16px;
        height: 42px;
      }
    }
  `]
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  readonly user = this.authService.currentUser;
}
