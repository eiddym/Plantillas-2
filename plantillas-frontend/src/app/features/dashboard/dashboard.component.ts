import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NuevoDocumentoDialogComponent } from '../documentos/nuevo-documento-dialog.component';
import { AuthService } from '../../core/auth/auth.service';
import { Documento, DocumentosService } from '../../core/services/documentos.service';
import { PlantillasService } from '../../core/services/plantillas.service';
import { SeguridadService } from '../../core/services/seguridad.service';

import { HttpClient } from '@angular/common/http';
import { EchartComponent } from '../../shared/components/echart/echart.component';
import * as echarts from 'echarts';

interface DashboardItem {
  label: string;
  url: string;
  icon: string;
  color: string;
  desc: string;
  count: number;
}

interface DashboardSection {
  label: string;
  icon: string;
  colorClass: string;
  items: DashboardItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    EchartComponent
  ],
  template: `
    <div class="home-portal-container">
      <!-- Encabezado de Bienvenida Institucional -->
      <header class="home-welcome-header">
        <div class="welcome-text">
          <h1>{{ saludo() }}, {{ user()?.first_name || user()?.username || 'usuario' }}</h1>
          <p class="subtitle">{{ user()?.cargo || 'Personal institucional' }} — Cooperativa Minera Marabunta R.L.</p>
        </div>
        <div class="welcome-actions">
          <button mat-raised-button class="btn-redactar-doc" (click)="abrirNuevoDocumento()">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Redactar documento</span>
          </button>
        </div>
      </header>

      <!-- Estado de Bandeja Activa -->
      <section class="tray-overview-section" aria-label="Resumen de bandeja activa">
        <div class="tray-overview-strip">
          <a class="tray-metric" routerLink="/documentos">
            <span class="tray-dot dot-petrol"></span>
            <div class="tray-metric-body">
              <span class="tray-label">Documentos activos</span>
              <span class="tray-sub">En redacción y curso</span>
            </div>
            <strong class="tray-value">{{ totalDocs() }}</strong>
          </a>

          <a class="tray-metric" routerLink="/aprobacion">
            <span class="tray-dot dot-warn"></span>
            <div class="tray-metric-body">
              <span class="tray-label">Pendientes de atención</span>
              <span class="tray-sub">Requieren revisión o derivación</span>
            </div>
            <strong class="tray-value value-warn">{{ totalPendientes() }}</strong>
          </a>

          <a class="tray-metric" routerLink="/firmar">
            <span class="tray-dot dot-ok"></span>
            <div class="tray-metric-body">
              <span class="tray-label">Aprobados y validados</span>
              <span class="tray-sub">Listos para archivo oficial</span>
            </div>
            <strong class="tray-value value-ok">{{ totalAprobados() }}</strong>
          </a>
        </div>
      </section>

      <!-- Barra de Acciones Rápidas -->
      <section class="quick-actions-bar">
        <span class="actions-label">Accesos directos:</span>
        <button mat-stroked-button (click)="abrirNuevoDocumento()" class="quick-action-btn">
          <mat-icon>add</mat-icon>
          <span>Nuevo documento</span>
        </button>
        <button mat-stroked-button routerLink="/documentos" class="quick-action-btn">
          <mat-icon>search</mat-icon>
          <span>Buscar documento</span>
        </button>
        <button mat-stroked-button routerLink="/catalogos" class="quick-action-btn">
          <mat-icon>folder_open</mat-icon>
          <span>Catálogos</span>
        </button>
        @if (puedeVerVentanilla()) {
          <button mat-stroked-button routerLink="/ventanilla/externa" class="quick-action-btn highlight-vu-btn">
            <mat-icon>inbox</mat-icon>
            <span>Ventanilla Única</span>
          </button>
        }
      </section>

      <!-- Métricas Operativas -->
      <section class="charts-section">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <mat-icon class="icon-flow">show_chart</mat-icon>
              <span>Flujo de despacho mensual</span>
            </div>
            <span class="chart-tag">Últimos 6 meses</span>
          </div>
          <app-echart [options]="tendenciaOptions()" [loading]="cargandoMetricas()" height="240px"></app-echart>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <mat-icon class="icon-dist">donut_large</mat-icon>
              <span>Distribución operativa</span>
            </div>
            <span class="chart-tag">Estado actual</span>
          </div>
          <app-echart [options]="distribucionOptions()" [loading]="cargandoMetricas()" height="240px"></app-echart>
        </div>
      </section>

      <!-- Mis Documentos Pendientes de Atención -->
      <section class="recent-tramites-section">
        <div class="section-header-line">
          <h2>Documentos pendientes de atención</h2>
          <a routerLink="/aprobacion" class="link-ver-todo">Ver bandeja completa</a>
        </div>

        <div class="table-responsive">
          <table mat-table [dataSource]="recentDocs()" class="w-full recent-table">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>CITE oficial</th>
              <td mat-cell *matCellDef="let d">
                <span class="doc-code cite-code">{{ d.nombre }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="de">
              <th mat-header-cell *matHeaderCellDef>Remitente / Destino</th>
              <td mat-cell *matCellDef="let d">
                <span class="text-de">{{ getParticipanteTexto(d) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="ref">
              <th mat-header-cell *matHeaderCellDef>Asunto o referencia</th>
              <td mat-cell *matCellDef="let d">
                <span class="text-ref">{{ getReferencia(d) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let d">
                <span class="status-indicator" [ngClass]="getStatusClass(d.estado)">
                  {{ d.estado }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="accion">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acción</th>
              <td mat-cell *matCellDef="let d" class="text-right">
                <button mat-button class="btn-revisar" (click)="irAWorkbench(d)">
                  <mat-icon>edit_note</mat-icon>
                  <span>Atender</span>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-table-cell" colspan="5">
                No tiene documentos pendientes de atención en su bandeja.
              </td>
            </tr>
          </table>
        </div>
      </section>

      <!-- Directorio de Módulos del Sistema -->
      <section class="modules-portal-section">
        <div class="section-header-line">
          <h2>Módulos habilitados</h2>
        </div>

        <div class="module-section-box">
          <div class="module-tabs-bar" role="tablist">
            @for (seccion of secciones(); track seccion.label) {
              <button
                type="button"
                role="tab"
                class="module-tab-btn"
                [attr.aria-selected]="seccionActual()?.label === seccion.label"
                [class.is-active]="seccionActual()?.label === seccion.label"
                (click)="seleccionarSeccion(seccion.label)"
              >
                <mat-icon class="module-tab-icon">{{ seccion.icon }}</mat-icon>
                <span class="module-tab-label">{{ formatModuleTitle(seccion.label) }}</span>
              </button>
            }
          </div>

          @if (seccionActual(); as actual) {
            <div class="modules-cards-grid">
              @for (item of actual.items; track item.label) {
                <button type="button" class="module-card" (click)="irARuta(item.url)">
                  <div class="module-icon-box">
                    <mat-icon>{{ item.icon }}</mat-icon>
                  </div>

                  <div class="module-card-body">
                    <div class="module-title-row">
                      <span class="module-name">{{ formatModuleTitle(item.label) }}</span>
                      @if (item.count > 0) {
                        <span class="module-count-badge">{{ item.count }}</span>
                      }
                    </div>
                    <p class="module-desc">{{ item.desc }}</p>
                  </div>

                  <mat-icon class="module-chevron">chevron_right</mat-icon>
                </button>
              }
            </div>
          }
        </div>
      </section>

      <footer class="home-portal-footer">
        <p>Cooperativa Minera Marabunta R.L. — Sistema de Gestión Documental</p>
      </footer>
    </div>
  `,
  styles: [`
    .home-portal-container {
      max-width: 1240px;
      margin: 0 auto;
      width: 100%;
      min-width: 0;
      font-family: var(--font-ui);
    }

    /* ENCABEZADO DE BIENVENIDA */
    .home-welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);

      h1 {
        margin: 0;
        font-family: var(--font-serif);
        font-size: 1.65rem;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: -0.015em;
      }

      .subtitle {
        margin: 4px 0 0 0;
        font-size: 0.88rem;
        color: var(--ink-muted);
      }
    }

    .btn-redactar-doc.mat-mdc-raised-button {
      background-color: var(--petrol);
      color: #ffffff;
      border-radius: 8px;
      padding: 0 20px;
      height: 42px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: none;

      &:hover {
        background-color: var(--petrol-soft);
      }

      mat-icon {
        color: #ead196;
      }
    }

    /* FRANJA OPERATIVA DE BANDEJA ACTIVA */
    .tray-overview-section {
      margin-bottom: 18px;
    }

    .tray-overview-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }

    .tray-metric {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      text-decoration: none;
      color: var(--ink);
      border-right: 1px solid var(--line);
      transition: background-color 0.15s ease;

      &:last-child {
        border-right: none;
      }

      &:hover {
        background: var(--paper-canvas);
      }
    }

    .tray-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-petrol { background: var(--petrol); }
    .dot-warn { background: var(--state-warn); }
    .dot-ok { background: var(--state-ok); }

    .tray-metric-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tray-label {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--ink);
    }

    .tray-sub {
      font-size: 0.76rem;
      color: var(--ink-muted);
    }

    .tray-value {
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--petrol);
    }

    .value-warn { color: var(--state-warn); }
    .value-ok { color: var(--state-ok); }

    /* BARRA DE ACCIONES RÁPIDAS */
    .quick-actions-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }

    .actions-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--ink-muted);
      margin-right: 4px;
    }

    .quick-action-btn.mat-mdc-outlined-button {
      border-radius: 8px;
      border-color: var(--line-strong);
      color: var(--ink);
      background: var(--surface);
      font-weight: 600;
      font-size: 0.82rem;
      height: 36px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--ink-muted); }

      &:hover {
        border-color: var(--gold);
        color: var(--petrol);
      }

      &.highlight-vu-btn {
        border-color: rgba(179, 130, 34, 0.5);
        background: var(--gold-soft);
        color: var(--ink);
        mat-icon { color: var(--gold-hover); }
      }
    }

    /* GRÁFICOS OPERATIVOS */
    .charts-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }

    .chart-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 18px 20px 12px;
      display: flex;
      flex-direction: column;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .chart-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--ink);

      mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
      }
      .icon-flow { color: var(--petrol); }
      .icon-dist { color: var(--gold-hover); }
    }

    .chart-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--ink-muted);
      background: var(--paper-canvas);
      border: 1px solid var(--line);
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* TABLA DE PENDIENTES */
    .recent-tramites-section {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }

    .section-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      h2 {
        margin: 0;
        font-family: var(--font-serif);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--ink);
      }
      .link-ver-todo {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--petrol);
        text-decoration: none;
        border-bottom: 1px solid var(--gold);
        &:hover { color: var(--gold-hover); }
      }
    }

    .recent-table {
      width: 100%;
      th.mat-mdc-header-cell {
        background-color: var(--paper-canvas);
        color: var(--ink-muted);
        border-bottom: 1px solid var(--line-strong);
        font-size: 0.76rem;
        font-weight: 700;
      }
      td.mat-mdc-cell {
        font-size: 0.85rem;
        padding: 11px 14px;
        border-bottom-color: var(--line);
      }
    }

    .empty-table-cell {
      text-align: center;
      padding: 24px;
      color: var(--ink-muted);
      font-size: 0.84rem;
    }

    .doc-code { color: var(--ink); font-weight: 600; }
    .text-de { color: var(--ink); }
    .text-ref {
      color: var(--ink-muted);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .status-indicator {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .status-aprobado { background: var(--state-ok-bg); color: var(--state-ok); }
    .status-revision { background: var(--state-warn-bg); color: var(--state-warn); }
    .status-observado { background: var(--state-err-bg); color: var(--state-err); }
    .status-default { background: var(--paper-canvas); color: var(--ink-muted); }

    .btn-revisar.mat-mdc-button {
      color: var(--petrol);
      font-weight: 600;
      font-size: 0.82rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; color: var(--gold-hover); }
      &:hover { background: var(--paper-canvas); }
    }

    .text-right { text-align: right; }

    /* DIRECTORIO DE MÓDULOS */
    .modules-portal-section {
      margin-bottom: 28px;
    }

    .module-section-box {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 16px 20px 20px;
    }

    .module-tabs-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .module-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: transparent;
      color: var(--ink-muted);
      font-size: 0.84rem;
      font-weight: 600;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      font-family: inherit;
      transition: color 0.15s ease, border-color 0.15s ease;

      .module-tab-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--ink-muted);
      }

      &:hover {
        color: var(--ink);
      }

      &.is-active {
        color: var(--petrol);
        font-weight: 700;
        border-bottom-color: var(--gold);

        .module-tab-icon {
          color: var(--gold-hover);
        }
      }
    }

    .modules-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    @media (max-width: 1100px) {
      .modules-cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .module-card {
      width: 100%;
      text-align: left;
      font-family: inherit;
      background: var(--paper-canvas);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;

      &:hover {
        background: var(--surface);
        border-color: var(--gold);

        .module-chevron {
          color: var(--petrol);
          transform: translateX(2px);
        }
      }
    }

    .module-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--petrol);
      flex-shrink: 0;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .module-card-body {
      flex: 1;
      min-width: 0;
    }

    .module-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .module-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--ink);
    }

    .module-count-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--petrol);
      background: var(--gold-soft);
      padding: 1px 7px;
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
    }

    .module-desc {
      margin: 2px 0 0 0;
      font-size: 0.78rem;
      color: var(--ink-muted);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .module-chevron {
      color: var(--ink-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: transform 0.15s ease, color 0.15s ease;
    }

    /* FOOTER */
    .home-portal-footer {
      margin-top: 20px;
      padding: 16px 0;
      border-top: 1px solid var(--line);
      text-align: center;
      p { margin: 0; font-size: 0.76rem; color: var(--ink-muted); }
    }

    .table-responsive .recent-table {
      min-width: 580px;
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .home-welcome-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 16px;

        h1 { font-size: 1.3rem; }
        .subtitle { font-size: 0.8rem; }
        .welcome-actions { width: 100%; }
        .btn-redactar-doc.mat-mdc-raised-button {
          width: 100%;
          justify-content: center;
          height: 40px;
        }
      }

      .tray-overview-strip {
        grid-template-columns: 1fr;
      }

      .tray-metric {
        border-right: none;
        border-bottom: 1px solid var(--line);
        padding: 12px 14px;

        &:last-child {
          border-bottom: none;
        }
      }

      .tray-value {
        font-size: 1.25rem;
      }

      .quick-actions-bar {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        gap: 8px;
        padding-bottom: 6px;
        margin-bottom: 16px;
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
        .actions-label { display: none; }
        .quick-action-btn.mat-mdc-outlined-button {
          flex: 0 0 auto;
          white-space: nowrap;
          height: 34px;
          font-size: 0.78rem;
          padding: 0 12px;
        }
      }

      .charts-section {
        grid-template-columns: 1fr;
        gap: 14px;
        margin-bottom: 18px;
      }

      .chart-card {
        padding: 14px 12px 8px;
        min-width: 0;
        overflow: hidden;
      }

      .recent-tramites-section,
      .module-section-box {
        padding: 14px 12px;
      }

      .module-tabs-bar {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
      }

      .module-tab-btn {
        flex: 0 0 auto;
        white-space: nowrap;
        padding: 8px 12px;
        font-size: 0.8rem;
      }

      .modules-cards-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly documentosService = inject(DocumentosService);
  private readonly plantillasService = inject(PlantillasService);
  private readonly seguridadService = inject(SeguridadService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly user = this.authService.currentUser;
  private readonly menus = this.authService.currentMenu;
  readonly puedeVerVentanilla = computed(() =>
    this.authService.hasRole('ADMIN') || this.authService.hasRole('CORRESPONDENCIA')
  );

  readonly displayedColumns = ['nombre', 'de', 'ref', 'estado', 'accion'];
  readonly recentDocs = signal<Documento[]>([]);
  readonly totalDocs = signal<number>(0);
  readonly totalPendientes = signal<number>(0);
  readonly totalAprobados = signal<number>(0);

  // Señales de métricas visuales Apache ECharts
  readonly tendenciaOptions = signal<echarts.EChartsOption | null>(null);
  readonly distribucionOptions = signal<echarts.EChartsOption | null>(null);
  readonly cargandoMetricas = signal<boolean>(true);

  // Contadores reales dinámicos
  readonly totalPlantillas = signal<number>(6);
  readonly totalUsuarios = signal<number>(4);
  readonly totalRoles = signal<number>(7);
  readonly totalMenus = signal<number>(21);
  readonly totalUnidades = signal<number>(1);
  readonly totalArchivoGeneral = signal<number>(0);
  readonly totalArchivoUnidad = signal<number>(0);
  readonly totalArchivoInstitucional = signal<number>(0);

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // Metadatos por categoría padre (Cápsulas según Modelo)
  private readonly parentMetaMap: Record<string, { colorClass: string; icon: string }> = {
    'CONFIGURACIÓN': { colorClass: 'pill-purple', icon: 'build' },
    'CONFIGURACION': { colorClass: 'pill-purple', icon: 'build' },
    'ADMINISTRACIÓN': { colorClass: 'pill-green', icon: 'settings' },
    'ADMINISTRACION': { colorClass: 'pill-green', icon: 'settings' },
    'DOCUMENTOS': { colorClass: 'pill-blue', icon: 'description' },
    'CATALOGOS': { colorClass: 'pill-teal', icon: 'folder' },
    'VENTANILLA ÚNICA': { colorClass: 'pill-blue-bright', icon: 'inbox' },
    'VENTANILLA UNICA': { colorClass: 'pill-blue-bright', icon: 'inbox' },
    'ARCHIVO': { colorClass: 'pill-slate', icon: 'inventory_2' }
  };

  // Metadatos por módulo hijo (Icono, Color, Descripción, Conteo)
  private readonly itemMetaMap: Record<string, { icon: string; color: string; desc: string; countSignal?: () => number }> = {
    'plantillas': { icon: 'layers', color: 'teal', desc: 'Formularios y plantillas', countSignal: () => this.totalPlantillas() },
    'contactos': { icon: 'person', color: 'purple', desc: 'Directorio del personal', countSignal: () => 0 },
    'usuario': { icon: 'group', color: 'green', desc: 'Gestión de usuarios', countSignal: () => this.totalUsuarios() },
    'rol': { icon: 'credit_card', color: 'purple', desc: 'Perfiles de permisos y roles', countSignal: () => this.totalRoles() },
    'menu': { icon: 'menu', color: 'orange', desc: 'Administración de menús', countSignal: () => this.totalMenus() },
    'unidad': { icon: 'business', color: 'blue', desc: 'Estructura organizacional', countSignal: () => this.totalUnidades() },
    'admin/firma': { icon: 'verified', color: 'teal', desc: 'Configuración de método de firma', countSignal: () => 0 },
    'documentos': { icon: 'description', color: 'blue', desc: 'Mis documentos redactados', countSignal: () => this.totalDocs() },
    'aprobacion': { icon: 'low_priority', color: 'orange', desc: 'Documentos pendientes en curso y revisión', countSignal: () => this.totalPendientes() },
    'monitoreo': { icon: 'speed', color: 'blue', desc: 'Monitoreo de flujos', countSignal: () => 1 },
    'firmar': { icon: 'edit', color: 'purple', desc: 'Pendientes de firma digital', countSignal: () => 0 },
    'impresion': { icon: 'print', color: 'blue', desc: 'Impresión oficial de documentos', countSignal: () => 0 },
    'en_curso': { icon: 'description', color: 'blue', desc: 'Acceso a EN CURSO', countSignal: () => 0 },
    'aprobar_documento': { icon: 'fingerprint', color: 'purple', desc: 'Aprobación con CD', countSignal: () => 0 },
    'catalogos': { icon: 'folder', color: 'teal', desc: 'Tablas de datos y catálogos', countSignal: () => 0 },
    'compartidos': { icon: 'share', color: 'teal', desc: 'Catálogos compartidos', countSignal: () => 0 },
    'ventanilla/externa': { icon: 'cloud_download', color: 'blue', desc: 'Radicación de correspondencia externa', countSignal: () => 0 },
    'ventanilla/interna': { icon: 'edit_document', color: 'indigo', desc: 'Ventanilla de correspondencia interna', countSignal: () => 0 },
    'ventanilla-unica': { icon: 'inbox', color: 'blue', desc: 'Radicación de correspondencia externa', countSignal: () => 0 },
    'archivo': { icon: 'inventory_2', color: 'orange', desc: 'Archivo digital emitido', countSignal: () => this.totalArchivoInstitucional() + this.totalArchivoGeneral() + this.totalArchivoUnidad() },
    'archivo/general': { icon: 'public', color: 'teal', desc: 'Fondo normativo y resoluciones', countSignal: () => this.totalArchivoGeneral() },
    'archivo/unidad': { icon: 'domain', color: 'blue', desc: 'Fondo documental de la unidad', countSignal: () => this.totalArchivoUnidad() },
    'archivo/institucional': { icon: 'manage_search', color: 'orange', desc: 'Buscador maestro de expedientes', countSignal: () => this.totalArchivoInstitucional() }
  };

  private getItemMeta(url?: string, label?: string) {
    const rawUrl = url || '';
    const cleanUrl = rawUrl.replace(/^\/+/, '').toLowerCase();
    const lbl = (label || '').toUpperCase();

    if (this.itemMetaMap[cleanUrl]) return this.itemMetaMap[cleanUrl];
    if (this.itemMetaMap[rawUrl]) return this.itemMetaMap[rawUrl];
    if (this.itemMetaMap['/' + cleanUrl]) return this.itemMetaMap['/' + cleanUrl];

    if (lbl.includes('INSTITUCIONAL')) {
      return this.itemMetaMap['archivo/institucional'];
    }
    if (lbl.includes('GENERAL') && lbl.includes('ARCHIVO')) {
      return this.itemMetaMap['archivo/general'];
    }
    if (lbl.includes('UNIDAD') && lbl.includes('ARCHIVO')) {
      return this.itemMetaMap['archivo/unidad'];
    }

    return {
      icon: 'arrow_right',
      color: 'blue',
      desc: `Acceso a ${label || 'módulo'}`,
      countSignal: () => 0
    };
  }

  // Cápsula activa seleccionada (por defecto 'DOCUMENTOS' como en el modelo)
  readonly seccionSeleccionada = signal<string>('DOCUMENTOS');

  readonly seccionActual = computed<DashboardSection | null>(() => {
    const list = this.secciones();
    if (!list || list.length === 0) return null;
    const sel = this.seccionSeleccionada();
    const found = list.find(s => s.label.toUpperCase() === sel.toUpperCase());
    return found || list[0];
  });

  seleccionarSeccion(label: string): void {
    this.seccionSeleccionada.set(label);
  }

  readonly secciones = computed<DashboardSection[]>(() => {
    const menuList = this.menus() || [];
    const result: DashboardSection[] = [];

    for (const padre of menuList) {
      const parentLabel = padre.label.toUpperCase();
      const parentMeta = this.parentMetaMap[parentLabel] || {
        colorClass: 'pill-blue',
        icon: padre.icon || 'folder'
      };

      if (padre.submenu && padre.submenu.length > 0) {
        const items: DashboardItem[] = [];
        for (const sub of padre.submenu) {
          const meta = this.getItemMeta(sub.url, sub.label);
          items.push({
            label: sub.label,
            url: sub.url,
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc,
            count: meta.countSignal ? meta.countSignal() : 0
          });
        }
        if (items.length > 0) {
          result.push({
            label: padre.label,
            icon: parentMeta.icon,
            colorClass: parentMeta.colorClass,
            items
          });
        }
      } else {
        const meta = this.getItemMeta(padre.url, padre.label);
        result.push({
          label: padre.label,
          icon: parentMeta.icon,
          colorClass: parentMeta.colorClass,
          items: [{
            label: padre.label,
            url: padre.url || 'archivo',
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc,
            count: meta.countSignal ? meta.countSignal() : 0
          }]
        });
      }
    }

    return result;
  });

  ngOnInit(): void {
    this.cargarDatosDashboard();
    this.cargarMetricasOverview();
  }

  cargarDatosDashboard(): void {
    // 1. Cargar documentos pendientes de atención del usuario actual (recibidos por atender o devueltos para subsanar)
    this.documentosService.getDocumentos(5, 1, 'ENVIADO,DERIVADO,RECHAZADO', '', 'home').subscribe({
      next: (res) => {
        const docs = res?.datos?.resultado || [];
        this.recentDocs.set(docs);
      },
      error: () => {
        this.recentDocs.set([]);
      }
    });

    // 1a. Cargar contador de bandeja de pendientes recibidos
    this.documentosService.getDocumentos(1, 1, 'ENVIADO,DERIVADO', '', 'derivados').subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalPendientes.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 1b. Cargar total de documentos activos propios del usuario
    this.documentosService.getDocumentos(1, 1, 'NUEVO,RECHAZADO,ENVIADO,DERIVADO', '', 'documentos').subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalDocs.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 1c. Cargar total de documentos aprobados/cerrados propios del usuario
    this.documentosService.getDocumentos(1, 1, 'APROBADO,CERRADO', '', 'documentos').subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalAprobados.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 2. Cargar total de plantillas reales
    this.plantillasService.getPlantillas(1, 1).subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalPlantillas.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 3. Cargar total de usuarios reales
    this.seguridadService.getUsuarios().subscribe({
      next: (res) => {
        if (Array.isArray(res.datos)) {
          this.totalUsuarios.set(res.datos.length);
        }
      },
      error: () => {}
    });

    // 4. Cargar total de roles reales
    this.seguridadService.getRoles(1, 1).subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalRoles.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 5. Cargar total de unidades reales
    this.seguridadService.getUnidades(1, 1).subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalUnidades.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 6. Cargar contadores de archivo (Institucional, General, Unidad)
    this.http.get<any>('/api/v1/archivo/institucional').subscribe({
      next: (res) => {
        const total = res.datos?.total !== undefined ? res.datos.total : (res.datos?.resultado?.length || 0);
        this.totalArchivoInstitucional.set(total);
      },
      error: () => {}
    });

    this.http.get<any>('/api/v1/archivo/general').subscribe({
      next: (res) => {
        const total = res.datos?.total_documentos !== undefined ? res.datos.total_documentos : (res.datos?.documentos?.length || 0);
        this.totalArchivoGeneral.set(total);
      },
      error: () => {}
    });

    const user = this.authService.currentUser() as any;
    const unidadId = user?.fid_unidad || 1;
    this.http.get<any>(`/api/v1/archivo/unidad/${unidadId}`).subscribe({
      next: (res) => {
        const total = res.datos?.total_documentos !== undefined ? res.datos.total_documentos : (res.datos?.documentos_propios?.length || 0);
        this.totalArchivoUnidad.set(total);
      },
      error: () => {}
    });
  }

  formatModuleTitle(label: string): string {
    const clean = (label || '').trim();
    if (!clean) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  getParticipanteTexto(d: any): string {
    try {
      const pv = typeof d?.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d?.plantilla_valor;
      const dg = pv?.['datosGenerales-0'] || pv?.datosGenerales || {};
      const formatPersona = (p: any): string => {
        if (!p) return '';
        if (Array.isArray(p) && p.length > 0) return formatPersona(p[0]);
        if (typeof p === 'object') {
          const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.trim();
          return nombre || p.usuario || p.cargo || '';
        }
        return '';
      };
      const deNombre = formatPersona(dg.de);
      const paraNombre = formatPersona(dg.para);
      if (deNombre && paraNombre) return `${deNombre} → ${paraNombre}`;
      if (deNombre) return deNombre;
      if (paraNombre) return paraNombre;
    } catch {
      // Fallback
    }
    return 'Remitente Institucional';
  }

  getReferencia(d: any): string {
    if (d?.ref) return d.ref;
    try {
      const pv = typeof d?.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d?.plantilla_valor;
      const dg = pv?.['datosGenerales-0'] || pv?.datosGenerales || {};
      if (dg?.ref) return dg.ref;
    } catch {
      // Fallback
    }
    return d?.anular ? `Cite: ${d.anular}` : 'Documento pendiente de revisión';
  }

  getStatusClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'status-aprobado';
      case 'ENVIADO':
      case 'DERIVADO':
      case 'EN CURSO': return 'status-revision';
      case 'OBSERVADO': return 'status-observado';
      default: return 'status-default';
    }
  }

  irARuta(url: string): void {
    if (url) {
      this.router.navigate(['/' + url]);
    }
  }

  irAWorkbench(doc: Documento): void {
    if (doc.id_documento) {
      this.router.navigate(['/documentos', doc.id_documento]);
    }
  }

  abrirNuevoDocumento(): void {
    this.dialog.open(NuevoDocumentoDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  cargarMetricasOverview(): void {
    this.cargandoMetricas.set(true);
    this.http.get<any>('/api/v1/admin/metrics/overview').subscribe({
      next: (res) => {
        const datos = res?.datos || {};
        const docs = datos.documentos || {};
        const serieMensual = Array.isArray(datos.serieMensual) ? datos.serieMensual : [];

        // 1. Gráfico de Tendencia Mensual (Smooth Area Chart)
        const mesesLabels = serieMensual.length > 0
          ? serieMensual.map((s: any) => s.mesLabel || s.mes)
          : ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
        const cantidades = serieMensual.length > 0
          ? serieMensual.map((s: any) => s.cantidad || 0)
          : [0, 0, 0, 0, 0, docs.total_general || 0];

        this.tendenciaOptions.set({
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#334155',
            textStyle: { color: '#f8fafc', fontSize: 12 },
            formatter: (params: any) => {
              const p = params[0];
              return `<strong>${p.name}</strong><br/>${p.marker} Documentos procesados: <strong>${p.value}</strong>`;
            }
          },
          grid: {
            top: 25,
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: mesesLabels,
            axisLine: { lineStyle: { color: '#c7cfc2' } },
            axisLabel: { color: '#525e4e', fontSize: 11 }
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#eceee9', type: 'dashed' } },
            axisLabel: { color: '#525e4e', fontSize: 11 }
          },
          series: [
            {
              name: 'Documentos',
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 6,
              itemStyle: { color: '#162c2f' },
              lineStyle: { width: 2.5, color: '#162c2f' },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(179, 130, 34, 0.28)' },
                  { offset: 1, color: 'rgba(179, 130, 34, 0.02)' }
                ])
              },
              data: cantidades
            }
          ]
        });

        // 2. Gráfico de Distribución Operativa (Half-Donut animado)
        const enCurso = docs.en_curso || 0;
        const aprobados = docs.aprobados || 0;
        const cerrados = docs.cerrados || 0;
        const ventanilla = (docs.ventanilla_virtual || 0) + (docs.ventanilla_fisica || 0);

        this.distribucionOptions.set({
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(20, 27, 18, 0.92)',
            borderColor: '#b38222',
            textStyle: { color: '#f4f5f2', fontSize: 12 },
            formatter: '{b}: <strong>{c}</strong> ({d}%)'
          },
          legend: {
            bottom: 0,
            left: 'center',
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: '#525e4e', fontSize: 11 }
          },
          color: ['#162c2f', '#15803d', '#525e4e', '#b38222'],
          series: [
            {
              name: 'Estado de Flujo',
              type: 'pie',
              radius: ['45%', '72%'],
              center: ['50%', '45%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 6,
                borderColor: '#ffffff',
                borderWidth: 2
              },
              label: {
                show: false,
                position: 'center'
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: '#0f172a'
                }
              },
              data: [
                { value: enCurso, name: 'En Curso' },
                { value: aprobados, name: 'Aprobados' },
                { value: cerrados, name: 'Cerrados' },
                { value: ventanilla, name: 'Ventanilla' }
              ]
            }
          ]
        });

        this.cargandoMetricas.set(false);
      },
      error: () => {
        this.cargandoMetricas.set(false);
      }
    });
  }
}
