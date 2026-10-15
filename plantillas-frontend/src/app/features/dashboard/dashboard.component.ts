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
    MatDialogModule
  ],
  template: `
    <div class="home-portal-container">
      <!-- Encabezado de Bienvenida Institucional -->
      <header class="home-welcome-header">
        <div class="welcome-text">
          <h1>{{ saludo() }}, {{ user()?.first_name || user()?.username || 'system' }}</h1>
          <p class="subtitle">{{ user()?.cargo || 'Default system user' }} &bull; Cooperativa Minera Marabunta R.L.</p>
        </div>
        <div class="welcome-actions">
          <button mat-raised-button class="btn-redactar-doc" (click)="abrirNuevoDocumento()">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Redactar Documento</span>
          </button>
        </div>
      </header>

      <!-- Resumen de Bandeja Activa (KPIs) -->
      <section class="kpi-summary-section">
        <h2 class="section-title">RESUMEN DE BANDEJA ACTIVA</h2>
        <div class="kpi-grid">
          <div class="kpi-card kpi-card-activos" routerLink="/documentos">
            <div class="kpi-big-number">{{ totalDocs() }}</div>
            <div class="kpi-meta">
              <strong class="kpi-title">DOCUMENTOS ACTIVOS</strong>
              <span class="kpi-desc">Trámites en redacción y curso</span>
            </div>
          </div>

          <div class="kpi-card kpi-card-revision" routerLink="/aprobacion">
            <div class="kpi-big-number">{{ totalPendientes() }}</div>
            <div class="kpi-meta">
              <strong class="kpi-title">TRÁMITES DERIVADOS</strong>
              <span class="kpi-desc">Trámites derivados en curso y revisión</span>
            </div>
          </div>

          <div class="kpi-card kpi-card-aprobados" routerLink="/firmar">
            <div class="kpi-big-number">{{ totalAprobados() }}</div>
            <div class="kpi-meta">
              <strong class="kpi-title">APROBADOS Y VALIDADOS</strong>
              <span class="kpi-desc">Certificados para archivo digital</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Barra de Acciones Rápidas -->
      <section class="quick-actions-bar">
        <span class="actions-label">Acciones rápidas:</span>
        <button mat-stroked-button (click)="abrirNuevoDocumento()" class="quick-action-btn">
          <mat-icon>add</mat-icon>
          <span>Nuevo Documento</span>
        </button>
        <button mat-stroked-button routerLink="/documentos" class="quick-action-btn">
          <mat-icon>search</mat-icon>
          <span>Buscar Trámite</span>
        </button>
        <button mat-stroked-button routerLink="/catalogos" class="quick-action-btn">
          <mat-icon>folder_open</mat-icon>
          <span>Catálogos</span>
        </button>
        <button mat-stroked-button routerLink="/ventanilla-unica" class="quick-action-btn highlight-vu-btn">
          <mat-icon>inbox</mat-icon>
          <span>Ventanilla Única</span>
        </button>
      </section>

      <!-- Trámites Recientes en Curso (Tabla Directa) -->
      <section class="recent-tramites-section">
        <div class="section-header-line">
          <h2>Trámites Recientes en Curso</h2>
          <a routerLink="/documentos" class="link-ver-todo">Ver bandeja completa</a>
        </div>

        <div class="table-responsive">
          <table mat-table [dataSource]="recentDocs()" class="w-full recent-table">
            <!-- CITE Column -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>CITE OFICIAL</th>
              <td mat-cell *matCellDef="let d">
                <strong class="doc-code">{{ d.nombre }}</strong>
              </td>
            </ng-container>

            <!-- De / Para Column -->
            <ng-container matColumnDef="de">
              <th mat-header-cell *matHeaderCellDef>REMITENTE / DESTINO</th>
              <td mat-cell *matCellDef="let d">
                <span class="text-de">{{ d.de || d.para || 'Dirección de Área' }}</span>
              </td>
            </ng-container>

            <!-- Asunto Column -->
            <ng-container matColumnDef="ref">
              <th mat-header-cell *matHeaderCellDef>ASUNTO / REFERENCIA</th>
              <td mat-cell *matCellDef="let d">
                <span class="text-ref">{{ d.ref || 'Trámite oficial en proceso' }}</span>
              </td>
            </ng-container>

            <!-- Estado Column -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>ESTADO</th>
              <td mat-cell *matCellDef="let d">
                <span class="status-indicator" [ngClass]="getStatusClass(d.estado)">
                  {{ d.estado }}
                </span>
              </td>
            </ng-container>

            <!-- Acción Column -->
            <ng-container matColumnDef="accion">
              <th mat-header-cell *matHeaderCellDef class="text-right">ACCIÓN</th>
              <td mat-cell *matCellDef="let d" class="text-right">
                <button mat-button class="btn-revisar" (click)="irAWorkbench(d)">
                  <mat-icon>edit_note</mat-icon>
                  <span>Revisar</span>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </section>

      <!-- Módulos del Sistema (Diseño Fiel a Imagen 2) -->
      <section class="modules-portal-section">
        <h2 class="section-title">MÓDULOS DEL SISTEMA</h2>

        <div class="sections-stack">
          @for (seccion of secciones(); track seccion.label) {
            <div class="module-section-box">
              <!-- Pastilla de Encabezado de Sección (Imagen 2) -->
              <div class="section-badge-header">
                <div class="section-pill" [ngClass]="seccion.colorClass">
                  <mat-icon class="pill-icon">{{ seccion.icon }}</mat-icon>
                  <span class="pill-title">{{ seccion.label }}</span>
                </div>
              </div>

              <!-- Grilla de Tarjetas de Módulo (Imagen 2) -->
              <div class="modules-cards-grid">
                @for (item of seccion.items; track item.label) {
                  <div class="module-card" (click)="irARuta(item.url)">
                    <!-- Fila Superior: Icono a la izquierda, Conteo a la derecha -->
                    <div class="card-header-row">
                      <div class="module-icon-box" [ngClass]="'bg-' + item.color">
                        <mat-icon>{{ item.icon }}</mat-icon>
                      </div>
                      <span class="module-count-badge">{{ item.count }}</span>
                    </div>

                    <!-- Cuerpo de la Tarjeta -->
                    <div class="module-card-body">
                      <h4 class="module-name">{{ item.label }}</h4>
                      <p class="module-desc">{{ item.desc }}</p>
                    </div>

                    <!-- Enlace de Acción Inferior: Ir a [MÓDULO] → -->
                    <div class="module-card-link">
                      <span>Ir a {{ item.label }} &rarr;</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Footer Institucional de la Cooperativa -->
      <footer class="home-portal-footer">
        <p>COOPERATIVA MINERA MARABUNTA R.L. &bull; Sistema Digital de Plantillas y Aprobación 2026</p>
      </footer>
    </div>
  `,
  styles: [`
    .home-portal-container {
      max-width: 1280px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    /* ENCABEZADO DE BIENVENIDA */
    .home-welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;

      h1 {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 0.88rem;
      }
    }

    .btn-redactar-doc {
      background-color: #0f2027 !important;
      color: #ffffff !important;
      border-radius: 24px !important;
      padding: 0 22px !important;
      height: 44px !important;
      font-weight: 700 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      box-shadow: 0 4px 14px rgba(15, 32, 39, 0.25) !important;
      transition: all 0.2s ease !important;

      &:hover {
        background-color: #1e293b !important;
        transform: translateY(-1px);
      }

      mat-icon {
        color: #22d3ee;
      }
    }

    .section-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0 0 14px 0;
    }

    /* RESUMEN DE BANDEJA ACTIVA (KPIs) */
    .kpi-summary-section {
      margin-bottom: 24px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15, 32, 39, 0.03);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(15, 32, 39, 0.08);
      }
    }

    .kpi-big-number {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1;
      font-feature-settings: "tnum";
      font-variant-numeric: tabular-nums;
    }

    .kpi-card-activos .kpi-big-number { color: #0284c7; }
    .kpi-card-revision .kpi-big-number { color: #d97706; }
    .kpi-card-aprobados .kpi-big-number { color: #059669; }

    .kpi-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .kpi-title {
      font-size: 0.78rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.4px;
    }

    .kpi-desc {
      font-size: 0.76rem;
      color: #64748b;
    }

    /* BARRA DE ACCIONES RÁPIDAS */
    .quick-actions-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .actions-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #64748b;
      margin-right: 4px;
    }

    .quick-action-btn {
      border-radius: 20px !important;
      border-color: #cbd5e1 !important;
      color: #1e293b !important;
      font-weight: 600 !important;
      font-size: 0.82rem !important;
      height: 36px !important;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #ffffff !important; border-color: #0284c7 !important; color: #0284c7 !important; }

      &.highlight-vu-btn {
        border-color: #00b4db !important;
        color: #0083b0 !important;
        background: #f0fdf4 !important;
        &:hover { background: #e0f2fe !important; border-color: #0284c7 !important; }
      }
    }

    /* TRÁMITES RECIENTES EN CURSO */
    .recent-tramites-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .section-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      h2 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
      .link-ver-todo { font-size: 0.82rem; font-weight: 600; color: #0284c7; text-decoration: none; &:hover { text-decoration: underline; } }
    }

    .recent-table {
      width: 100%;
      th.mat-mdc-header-cell {
        background-color: #0f2027 !important;
        color: #ffffff !important;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.6px;
      }
      td.mat-mdc-cell {
        font-size: 0.85rem;
        padding: 12px 16px;
      }
    }

    .doc-code { color: #0f172a; font-weight: 700; }
    .text-de { color: #334155; }
    .text-ref {
      color: #475569;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .status-indicator {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .status-aprobado { background: #ecfdf5; color: #059669; }
    .status-revision { background: #fffbeb; color: #d97706; }
    .status-observado { background: #fef2f2; color: #dc2626; }
    .status-default { background: #f1f5f9; color: #475569; }

    .btn-revisar {
      color: #0284c7 !important;
      font-weight: 700 !important;
      font-size: 0.82rem !important;
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
      &:hover { background: #f0f9ff !important; }
    }

    .text-right { text-align: right; }

    /* MÓDULOS DEL SISTEMA (DISEÑO FIEL A IMAGEN 2) */
    .modules-portal-section {
      margin-bottom: 32px;
    }

    .sections-stack {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .module-section-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    /* Pastilla de Encabezado (Imagen 2) */
    .section-badge-header {
      margin-bottom: 18px;
    }

    .section-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .pill-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #ffffff;
    }

    /* Colores de las Pastillas según Imagen 2 */
    .pill-purple { background: #7c3aed; } /* CONFIGURACIÓN */
    .pill-green { background: #059669; }  /* ADMINISTRACIÓN */
    .pill-blue { background: #2563eb; }   /* DOCUMENTOS */
    .pill-teal { background: #0d9488; }   /* CATALOGOS */
    .pill-slate { background: #334155; }  /* OTROS */

    /* Grilla de Tarjetas (Imagen 2) */
    .modules-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }

    .module-card {
      background: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(15, 32, 39, 0.08);
        border-color: #cbd5e1;

        .module-card-link {
          color: #1d4ed8;
          text-decoration: underline;
        }
      }
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .module-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: #ffffff;
      }
    }

    /* Colores de iconos de módulos */
    .bg-teal { background: #0d9488; }
    .bg-purple { background: #7c3aed; }
    .bg-green { background: #059669; }
    .bg-orange { background: #ea580c; }
    .bg-blue { background: #2563eb; }
    .bg-indigo { background: #4f46e5; }
    .bg-slate { background: #334155; }

    .module-count-badge {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      font-feature-settings: "tnum";
    }

    .module-card-body {
      flex: 1;
    }

    .module-name {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .module-desc {
      margin: 4px 0 0 0;
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.35;
    }

    .module-card-link {
      font-size: 0.8rem;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 0.2px;
      transition: color 0.15s ease;
    }

    /* FOOTER */
    .home-portal-footer {
      margin-top: 24px;
      padding: 20px 0;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      p { margin: 0; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table-responsive .recent-table {
      min-width: 580px;
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .home-welcome-header {
        flex-direction: column;
        align-items: stretch;
        gap: 14px;
        margin-bottom: 18px;

        h1 { font-size: 1.35rem; }
        .welcome-actions { width: 100%; }
        .btn-redactar-doc { width: 100% !important; justify-content: center !important; }
      }

      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .kpi-card {
        padding: 14px 18px;
      }

      .quick-actions-bar {
        gap: 8px;
        .actions-label { width: 100%; margin-bottom: 4px; }
        .quick-action-btn { flex: 1 1 100%; justify-content: center; }
      }

      .modules-cards-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly documentosService = inject(DocumentosService);
  private readonly plantillasService = inject(PlantillasService);
  private readonly seguridadService = inject(SeguridadService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly user = this.authService.currentUser;
  private readonly menus = this.authService.currentMenu;

  readonly displayedColumns = ['nombre', 'de', 'ref', 'estado', 'accion'];
  readonly recentDocs = signal<Documento[]>([]);
  readonly totalDocs = signal<number>(6);
  readonly totalPendientes = signal<number>(0);
  readonly totalAprobados = signal<number>(1);

  // Contadores reales dinámicos
  readonly totalPlantillas = signal<number>(6);
  readonly totalUsuarios = signal<number>(4);
  readonly totalRoles = signal<number>(7);
  readonly totalMenus = signal<number>(21);
  readonly totalUnidades = signal<number>(1);

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // Metadatos por categoría padre (Imagen 2)
  private readonly parentMetaMap: Record<string, { colorClass: string; icon: string }> = {
    'CONFIGURACIÓN': { colorClass: 'pill-purple', icon: 'build' },
    'ADMINISTRACIÓN': { colorClass: 'pill-green', icon: 'settings' },
    'DOCUMENTOS': { colorClass: 'pill-blue', icon: 'description' },
    'CATALOGOS': { colorClass: 'pill-teal', icon: 'folder' },
    'ARCHIVO': { colorClass: 'pill-slate', icon: 'archive' }
  };

  // Metadatos por módulo hijo (Icono, Color, Descripción, Conteo)
  private readonly itemMetaMap: Record<string, { icon: string; color: string; desc: string; countSignal?: () => number }> = {
    'plantillas': { icon: 'layers', color: 'teal', desc: 'Formularios y plantillas', countSignal: () => this.totalPlantillas() },
    'contactos': { icon: 'person', color: 'purple', desc: 'Directorio del personal', countSignal: () => 0 },
    'usuario': { icon: 'group', color: 'green', desc: 'Gestión de usuarios', countSignal: () => this.totalUsuarios() },
    'rol': { icon: 'credit_card', color: 'purple', desc: 'Perfiles de permisos y roles', countSignal: () => this.totalRoles() },
    'menu': { icon: 'menu', color: 'orange', desc: 'Administración de menús', countSignal: () => this.totalMenus() },
    'unidad': { icon: 'business', color: 'blue', desc: 'Estructura organizacional', countSignal: () => this.totalUnidades() },
    'documentos': { icon: 'description', color: 'blue', desc: 'Mis documentos redactados', countSignal: () => this.totalDocs() },
    'aprobacion': { icon: 'low_priority', color: 'orange', desc: 'Trámites derivados en curso y revisión', countSignal: () => this.totalPendientes() },
    'impresion': { icon: 'print', color: 'blue', desc: 'Impresión oficial de documentos', countSignal: () => 0 },
    'firmar': { icon: 'edit', color: 'purple', desc: 'Pendientes de firma digital', countSignal: () => 0 },
    'aprobar_documento': { icon: 'fingerprint', color: 'indigo', desc: 'Aprobación con CD', countSignal: () => 0 },
    'monitoreo': { icon: 'speed', color: 'blue', desc: 'Monitoreo de flujos', countSignal: () => 1 },
    'archivo': { icon: 'archive', color: 'orange', desc: 'Archivo digital emitido', countSignal: () => 0 },
    'archivo/general': { icon: 'public', color: 'teal', desc: 'Fondo normativo y resoluciones', countSignal: () => 0 },
    'archivo/unidad': { icon: 'domain', color: 'blue', desc: 'Fondo documental de la unidad', countSignal: () => 0 },
    'archivo/institucional': { icon: 'manage_search', color: 'orange', desc: 'Buscador maestro de expedientes', countSignal: () => 0 },
    'ventanilla-unica': { icon: 'inbox', color: 'indigo', desc: 'Radicación de correspondencia externa', countSignal: () => 0 },
    'catalogos': { icon: 'folder', color: 'teal', desc: 'Tablas de datos y catálogos', countSignal: () => 0 },
    'compartidos': { icon: 'share', color: 'teal', desc: 'Catálogos compartidos', countSignal: () => 0 }
  };

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
          const meta = this.itemMetaMap[sub.url] || {
            icon: sub.icon || 'arrow_right',
            color: 'blue',
            desc: `Acceso a ${sub.label}`,
            countSignal: () => 0
          };
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
        const meta = this.itemMetaMap[padre.url] || {
          icon: padre.icon || 'archive',
          color: 'slate',
          desc: `Módulo oficial ${padre.label}`,
          countSignal: () => 0
        };
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
  }

  cargarDatosDashboard(): void {
    // 1. Cargar documentos recientes y totales
    this.documentosService.getDocumentos(5, 1).subscribe({
      next: (res) => {
        const docs = res.datos.resultado || [];
        this.recentDocs.set(docs);
        if (res.datos.total !== undefined) {
          this.totalDocs.set(res.datos.total);
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
  }

  getStatusClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'status-aprobado';
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
}
