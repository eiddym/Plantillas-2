import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NuevoDocumentoDialogComponent } from '../documentos/nuevo-documento-dialog.component';
import { AuthService } from '../../core/auth/auth.service';
import { Documento, DocumentosService } from '../../core/services/documentos.service';

interface DashboardItem {
  label: string;
  url: string;
  icon: string;
  color: string;
  desc: string;
}

interface DashboardSection {
  label: string;
  icon: string;
  color: string;
  items: DashboardItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule
  ],
  template: `
    <div class="home-shell-container">
      <!-- Encabezado de Bienvenida Institucional -->
      <header class="home-welcome-header">
        <div class="welcome-text">
          <h1>{{ saludo() }}, {{ user()?.first_name || user()?.username }}</h1>
          <p class="subtitle">{{ user()?.cargo || 'Funcionario Oficial' }} &bull; Cooperativa Minera Marabunta R.L.</p>
        </div>
        <div class="welcome-actions">
          <button mat-raised-button class="btn-nuevo-doc" (click)="abrirNuevoDocumento()">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Redactar Documento</span>
          </button>
        </div>
      </header>

      <!-- Resumen de Bandeja Activa (Contadores con tipografía de precisión) -->
      <section class="kpi-precision-container">
        <h2 class="section-title">Resumen de Bandeja Activa</h2>
        <div class="kpi-precision-grid">
          <div class="kpi-panel panel-tramite" routerLink="/documentos">
            <div class="kpi-number">{{ totalDocs() }}</div>
            <div class="kpi-info">
              <strong class="kpi-title">DOCUMENTOS ACTIVOS</strong>
              <span class="kpi-desc">Trámites en redacción y curso</span>
            </div>
          </div>

          <div class="kpi-panel panel-observado" routerLink="/aprobacion">
            <div class="kpi-number">{{ totalPendientes() }}</div>
            <div class="kpi-info">
              <strong class="kpi-title">EN REVISIÓN / OBSERVADOS</strong>
              <span class="kpi-desc">Requieren visto bueno o ajuste</span>
            </div>
          </div>

          <div class="kpi-panel panel-aprobado" routerLink="/firmar">
            <div class="kpi-number">{{ totalAprobados() }}</div>
            <div class="kpi-info">
              <strong class="kpi-title">APROBADOS Y VALIDADOS</strong>
              <span class="kpi-desc">Certificados para archivo digital</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Acciones Rápidas -->
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
          <span>Catálogos Institucionales</span>
        </button>
      </section>

      <!-- Trámites Recientes en Curso (Tabla Directa con Hoja de Trabajo) -->
      <section class="recent-tramites-card">
        <div class="card-header-line">
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

      <!-- Módulos del Sistema Derivados de Base de Datos -->
      <section class="home-dynamic-sections">
        <h2 class="section-title">Módulos del Sistema</h2>
        @for (seccion of secciones(); track seccion.label) {
          <div class="section-panel">
            <div class="section-header">
              <span class="dot" [ngClass]="'bg-' + seccion.color">
                <mat-icon>{{ seccion.icon }}</mat-icon>
              </span>
              <h3>{{ seccion.label }}</h3>
            </div>

            <div class="grid">
              @for (item of seccion.items; track item.label) {
                <div class="card" (click)="irARuta(item.url)">
                  <div class="card-top">
                    <span class="icon-badge" [ngClass]="'bg-' + item.color">
                      <mat-icon>{{ item.icon }}</mat-icon>
                    </span>
                  </div>
                  <div class="card-body">
                    <p class="card-title">{{ item.label }}</p>
                    <p class="card-sub">{{ item.desc }}</p>
                  </div>
                  <div class="card-footer-action">
                    <span>Acceder</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </section>

      <!-- Footer Institucional de la Cooperativa -->
      <footer class="home-shell-footer">
        <p>COOPERATIVA MINERA MARABUNTA R.L. &bull; Sistema Digital de Plantillas y Aprobación 2026</p>
      </footer>
    </div>
  `,
  styles: [`
    .home-shell-container {
      max-width: 1240px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

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
        color: var(--color-ink);
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: var(--color-ink-muted);
        font-size: 0.88rem;
      }
    }

    .btn-nuevo-doc {
      background-color: var(--color-primary) !important;
      color: #ffffff !important;
      border-radius: 24px !important;
      padding: 0 20px !important;
      height: 44px !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-weight: 600 !important;
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
        color: var(--color-cyan);
      }
    }

    .section-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--color-ink);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 14px 0;
    }

    /* Resumen de Bandeja Activa (Contadores con tipografía de precisión) */
    .kpi-precision-container {
      margin-bottom: 24px;
    }

    .kpi-precision-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .kpi-panel {
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

    .kpi-number {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: 'Plus Jakarta Sans', sans-serif;
      line-height: 1;
      font-feature-settings: "tnum";
      font-variant-numeric: tabular-nums;
    }

    .panel-tramite .kpi-number { color: var(--color-brand); }
    .panel-observado .kpi-number { color: var(--color-status-revision); }
    .panel-aprobado .kpi-number { color: var(--color-status-aprobado); }

    .kpi-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .kpi-title {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--color-ink);
      letter-spacing: 0.4px;
    }

    .kpi-desc {
      font-size: 0.76rem;
      color: var(--color-ink-muted);
    }

    /* Barra de Acciones Rápidas */
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
      color: var(--color-ink-muted);
      margin-right: 4px;
    }

    .quick-action-btn {
      border-radius: 20px !important;
      border-color: #cbd5e1 !important;
      color: var(--color-ink) !important;
      font-weight: 600 !important;
      font-size: 0.82rem !important;
      height: 36px !important;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #ffffff !important; border-color: var(--color-brand) !important; color: var(--color-brand) !important; }
    }

    /* Tarjeta de Trámites Recientes */
    .recent-tramites-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .card-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      h2 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--color-ink); }
      .link-ver-todo { font-size: 0.82rem; font-weight: 600; color: var(--color-brand); text-decoration: none; &:hover { text-decoration: underline; } }
    }

    .recent-table {
      width: 100%;
      th.mat-mdc-header-cell {
        background-color: var(--color-primary) !important;
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

    .doc-code {
      color: var(--color-ink);
      font-weight: 700;
    }

    .text-de {
      color: #334155;
    }

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

    .status-aprobado { background: #ecfdf5; color: var(--color-status-aprobado); }
    .status-revision { background: #fffbeb; color: var(--color-status-revision); }
    .status-observado { background: #fef2f2; color: var(--color-status-observado); }
    .status-default { background: #f1f5f9; color: #475569; }

    .btn-revisar {
      color: var(--color-brand) !important;
      font-weight: 700 !important;
      font-size: 0.82rem !important;
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
      &:hover { background: #f0f9ff !important; }
    }

    .text-right { text-align: right; }

    /* Módulos Dinámicos */
    .home-dynamic-sections {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(15, 32, 39, 0.03);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .dot {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        mat-icon { font-size: 16px; width: 16px; height: 16px; color: #ffffff; }
      }

      h3 {
        font-size: 0.88rem;
        font-weight: 800;
        margin: 0;
        color: var(--color-ink);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1px;
      background: #e2e8f0;
    }

    .card {
      background: #ffffff;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      transition: background 0.18s ease;

      &:hover {
        background: #f8fafc;
        .card-footer-action { color: var(--color-brand); }
      }
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #ffffff; }
    }

    .bg-blue { background: #0284c7; }
    .bg-teal { background: #0d9488; }
    .bg-green { background: #059669; }
    .bg-slate { background: #1e293b; }
    .bg-purple { background: #7c3aed; }
    .bg-orange { background: #ea580c; }
    .bg-indigo { background: #4f46e5; }

    .card-body { flex: 1; }
    .card-title { font-size: 0.88rem; font-weight: 700; margin: 0; color: var(--color-ink); }
    .card-sub { font-size: 0.78rem; color: var(--color-ink-muted); margin: 3px 0 0 0; line-height: 1.35; }
    .card-footer-action { font-size: 0.78rem; font-weight: 600; color: var(--color-ink-muted); }

    .home-shell-footer {
      margin-top: 36px;
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

    @media (max-width: 768px) {
      .home-welcome-header {
        flex-direction: column;
        align-items: stretch;
        gap: 14px;
        margin-bottom: 18px;

        h1 { font-size: 1.4rem; }
        .welcome-actions { width: 100%; }
        .btn-nuevo-doc { width: 100% !important; justify-content: center !important; }
      }

      .kpi-precision-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .kpi-panel {
        padding: 14px 18px;
      }

      .quick-actions-bar {
        gap: 8px;
        .actions-label { width: 100%; margin-bottom: 4px; }
        .quick-action-btn { flex: 1 1 100%; justify-content: center; }
      }

      .recent-tramites-card {
        padding: 14px 10px;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly documentosService = inject(DocumentosService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly user = this.authService.currentUser;
  private readonly menus = this.authService.currentMenu;

  readonly displayedColumns = ['nombre', 'de', 'ref', 'estado', 'accion'];
  readonly recentDocs = signal<Documento[]>([]);
  readonly totalDocs = signal<number>(12);
  readonly totalPendientes = signal<number>(4);
  readonly totalAprobados = signal<number>(38);

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  private readonly parentMetaMap: Record<string, { color: string; icon: string }> = {
    'DOCUMENTOS': { color: 'blue', icon: 'description' },
    'CATALOGOS': { color: 'teal', icon: 'folder' },
    'ADMINISTRACIÓN': { color: 'green', icon: 'settings' },
    'CONFIGURACIÓN': { color: 'purple', icon: 'build' },
    'ARCHIVO': { color: 'slate', icon: 'archive' }
  };

  private readonly itemMetaMap: Record<string, { icon: string; color: string; desc: string }> = {
    'documentos': { icon: 'description', color: 'blue', desc: 'Mis documentos redactados y en trámite' },
    'aprobacion': { icon: 'access_time', color: 'orange', desc: 'Bandeja de revisión y derivación de documentos' },
    'firmar': { icon: 'edit', color: 'purple', desc: 'Documentos pendientes de firma digital' },
    'aprobar_documento': { icon: 'fingerprint', color: 'indigo', desc: 'Aprobación y certificación digital' },
    'impresion': { icon: 'print', color: 'blue', desc: 'Impresión oficial de documentos' },
    'archivo': { icon: 'archive', color: 'slate', desc: 'Archivo digital emitido' },
    'catalogos': { icon: 'folder', color: 'teal', desc: 'Tablas de datos y catálogos institucionales' },
    'compartidos': { icon: 'share', color: 'teal', desc: 'Catálogos compartidos de la entidad' },
    'usuario': { icon: 'group', color: 'green', desc: 'Gestión y permisos de usuarios' },
    'rol': { icon: 'security', color: 'purple', desc: 'Perfiles de seguridad y roles' },
    'menu': { icon: 'menu', color: 'orange', desc: 'Administración de accesos y menús' },
    'unidad': { icon: 'business', color: 'blue', desc: 'Estructura y organigrama institucional' },
    'plantillas': { icon: 'layers', color: 'teal', desc: 'Diseñador de formularios y plantillas' },
    'contactos': { icon: 'person', color: 'indigo', desc: 'Directorio del personal institucional' }
  };

  readonly secciones = computed<DashboardSection[]>(() => {
    const menuList = this.menus() || [];
    const result: DashboardSection[] = [];

    for (const padre of menuList) {
      if (padre.submenu && padre.submenu.length > 0) {
        const items: DashboardItem[] = [];
        for (const sub of padre.submenu) {
          const meta = this.itemMetaMap[sub.url] || {
            icon: sub.icon || 'arrow_right',
            color: 'blue',
            desc: `Acceso a ${sub.label}`
          };
          items.push({
            label: sub.label,
            url: sub.url,
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc
          });
        }
        if (items.length > 0) {
          const parentMeta = this.parentMetaMap[padre.label.toUpperCase()] || {
            color: 'blue',
            icon: padre.icon || 'folder'
          };
          result.push({
            label: padre.label,
            icon: parentMeta.icon,
            color: parentMeta.color,
            items
          });
        }
      } else {
        const meta = this.itemMetaMap[padre.url] || {
          icon: padre.icon || 'archive',
          color: 'slate',
          desc: `Módulo oficial ${padre.label}`
        };
        const parentMeta = this.parentMetaMap[padre.label.toUpperCase()] || {
          color: meta.color,
          icon: meta.icon
        };
        result.push({
          label: padre.label,
          icon: parentMeta.icon,
          color: parentMeta.color,
          items: [{
            label: padre.label,
            url: padre.url || 'archivo',
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc
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
    this.documentosService.getDocumentos(5, 1).subscribe({
      next: (res) => {
        const docs = res.datos.resultado || [];
        this.recentDocs.set(docs);
        if (res.datos.total) {
          this.totalDocs.set(res.datos.total);
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
