import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';

export interface UsuarioEstadoDoc {
  _usuario_creacion: number;
  nombres: string;
  apellidos: string;
  CREADO: number | null;
  ENVIADO: number | null;
  DERIVADO: number | null;
  APROBADO: number | null;
  RECHAZADO: number | null;
  CERRADO: number | null;
  ELIMINADO: number | null;
  total?: number;
}

@Component({
  selector: 'app-monitoreo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  template: `
    <div class="monitoreo-shell">
      <!-- Encabezado de Monitoreo -->
      <div class="monitoreo-header">
        <div class="header-titles">
          <div class="title-row">
            <mat-icon class="title-icon">speed</mat-icon>
            <h1>Monitoreo de Flujos y Trámites</h1>
          </div>
          <p class="subtitle">Monitoreo y trazabilidad del estado de documentos por funcionario</p>
        </div>

        <div class="scope-badges">
          <span class="scope-badge" [class.scope-admin]="esAdminOMae()">
            <mat-icon>{{ esAdminOMae() ? 'public' : 'apartment' }}</mat-icon>
            <span>{{ esAdminOMae() ? 'Vista Global (MAE / Admin)' : 'Vista de Unidad' }}</span>
          </span>
        </div>
      </div>

      <!-- KPIs de Resumen Global de Flujo -->
      <div class="kpi-row">
        <div class="kpi-stat-card card-enviados">
          <div class="kpi-icon-box bg-orange">
            <mat-icon>send</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalEnviados() }}</span>
            <span class="kpi-label">EN TRÁMITE / ENVIADOS</span>
          </div>
        </div>

        <div class="kpi-stat-card card-derivados">
          <div class="kpi-icon-box bg-blue">
            <mat-icon>low_priority</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalDerivados() }}</span>
            <span class="kpi-label">DERIVADOS</span>
          </div>
        </div>

        <div class="kpi-stat-card card-aprobados">
          <div class="kpi-icon-box bg-teal">
            <mat-icon>verified</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalAprobados() }}</span>
            <span class="kpi-label">APROBADOS</span>
          </div>
        </div>

        <div class="kpi-stat-card card-cerrados">
          <div class="kpi-icon-box bg-green">
            <mat-icon>lock</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-num">{{ totalCerrados() }}</span>
            <span class="kpi-label">CERRADOS / SELLADOS</span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros y Rango de Fechas -->
      <mat-card class="filter-card">
        <div class="filters-row">
          <div class="date-pickers">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="date-field">
              <mat-label>Fecha Inicial</mat-label>
              <input matInput type="date" [(ngModel)]="fechaInicial">
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="date-field">
              <mat-label>Fecha Final</mat-label>
              <input matInput type="date" [(ngModel)]="fechaFinal">
            </mat-form-field>

            <button mat-flat-button class="btn-filtrar" (click)="cargarDatos()">
              <mat-icon>filter_alt</mat-icon>
              <span>Aplicar Filtro</span>
            </button>
          </div>

          <span class="filter-spacer"></span>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-user-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="searchFilter" placeholder="Buscar funcionario...">
          </mat-form-field>
        </div>
      </mat-card>

      <!-- Tabla de Monitoreo por Funcionario (Sustituye a tablefunk) -->
      <mat-card class="table-card">
        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="datosFiltrados()" class="w-full monitoreo-table">
            <!-- Funcionario Column -->
            <ng-container matColumnDef="funcionario">
              <th mat-header-cell *matHeaderCellDef>FUNCIONARIO</th>
              <td mat-cell *matCellDef="let row">
                <div class="user-cell">
                  <div class="user-mini-avatar">{{ row.nombres ? row.nombres[0].toUpperCase() : 'U' }}</div>
                  <div class="user-names">
                    <strong>{{ row.nombres }} {{ row.apellidos }}</strong>
                    <small>ID: #{{ row._usuario_creacion }}</small>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Enviados / En Curso -->
            <ng-container matColumnDef="enviados">
              <th mat-header-cell *matHeaderCellDef class="text-center">ENVIADOS</th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="count-pill pill-orange" *ngIf="row.ENVIADO">{{ row.ENVIADO }}</span>
                <span class="count-zero" *ngIf="!row.ENVIADO">&mdash;</span>
              </td>
            </ng-container>

            <!-- Derivados -->
            <ng-container matColumnDef="derivados">
              <th mat-header-cell *matHeaderCellDef class="text-center">DERIVADOS</th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="count-pill pill-blue" *ngIf="row.DERIVADO">{{ row.DERIVADO }}</span>
                <span class="count-zero" *ngIf="!row.DERIVADO">&mdash;</span>
              </td>
            </ng-container>

            <!-- Aprobados -->
            <ng-container matColumnDef="aprobados">
              <th mat-header-cell *matHeaderCellDef class="text-center">APROBADOS</th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="count-pill pill-teal" *ngIf="row.APROBADO">{{ row.APROBADO }}</span>
                <span class="count-zero" *ngIf="!row.APROBADO">&mdash;</span>
              </td>
            </ng-container>

            <!-- Rechazados / Observados -->
            <ng-container matColumnDef="rechazados">
              <th mat-header-cell *matHeaderCellDef class="text-center">OBSERVADOS</th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="count-pill pill-red" *ngIf="row.RECHAZADO">{{ row.RECHAZADO }}</span>
                <span class="count-zero" *ngIf="!row.RECHAZADO">&mdash;</span>
              </td>
            </ng-container>

            <!-- Cerrados -->
            <ng-container matColumnDef="cerrados">
              <th mat-header-cell *matHeaderCellDef class="text-center">CERRADOS</th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="count-pill pill-green" *ngIf="row.CERRADO">{{ row.CERRADO }}</span>
                <span class="count-zero" *ngIf="!row.CERRADO">&mdash;</span>
              </td>
            </ng-container>

            <!-- Total Acumulado -->
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="text-right">TOTAL GESTIONADOS</th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <strong class="total-number">{{ row.total }} trámites</strong>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div class="empty-state" *ngIf="!cargando() && datosFiltrados().length === 0">
            <mat-icon>info_outline</mat-icon>
            <p>No se encontraron registros de flujo para los filtros seleccionados.</p>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .monitoreo-shell {
      max-width: 1240px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    .monitoreo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;

      h1 {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.3px;
      }
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #0284c7;
    }

    .subtitle {
      margin: 4px 0 0 0;
      color: #64748b;
      font-size: 0.88rem;
    }

    .scope-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 700;
      border: 1px solid #cbd5e1;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .scope-admin {
      background: rgba(16, 185, 129, 0.1) !important;
      color: #059669 !important;
      border-color: rgba(16, 185, 129, 0.3) !important;
    }

    /* KPI ROW */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 6px rgba(15, 32, 39, 0.03);
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .bg-orange { background: #ea580c; }
    .bg-blue { background: #0284c7; }
    .bg-teal { background: #0d9488; }
    .bg-green { background: #059669; }

    .kpi-body {
      display: flex;
      flex-direction: column;
    }

    .kpi-num {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      font-feature-settings: "tnum";
    }

    .kpi-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* FILTER CARD */
    .filter-card {
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    .filters-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .date-pickers {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .date-field {
      width: 175px;
    }

    .btn-filtrar {
      background: #0f2027 !important;
      color: #ffffff !important;
      height: 40px !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    .filter-spacer {
      flex: 1 1 auto;
    }

    .search-user-field {
      width: 260px;
    }

    /* TABLE */
    .table-card {
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .monitoreo-table {
      width: 100%;

      th.mat-mdc-header-cell {
        background-color: #0f2027 !important;
        color: #ffffff !important;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 14px 16px;
      }

      td.mat-mdc-cell {
        font-size: 0.86rem;
        padding: 12px 16px;
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-mini-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .user-names {
      display: flex;
      flex-direction: column;
      strong { color: #0f172a; }
      small { color: #94a3b8; }
    }

    .count-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 0.78rem;
    }

    .pill-orange { background: #ffedd5; color: #c2410c; }
    .pill-blue { background: #e0f2fe; color: #0369a1; }
    .pill-teal { background: #ccfbf1; color: #0f766e; }
    .pill-red { background: #fee2e2; color: #b91c1c; }
    .pill-green { background: #dcfce7; color: #15803d; }

    .count-zero {
      color: #cbd5e1;
    }

    .total-number {
      color: #0f172a;
      font-size: 0.92rem;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: #64748b;
      mat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 8px; color: #94a3b8; }
      p { margin: 0; font-size: 0.9rem; }
    }

    @media (max-width: 768px) {
      .filters-row {
        flex-direction: column;
        align-items: stretch;
      }
      .date-pickers {
        flex-direction: column;
        align-items: stretch;
      }
      .date-field, .search-user-field, .btn-filtrar {
        width: 100% !important;
      }
    }
  `]
})
export class MonitoreoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly cargando = signal(true);
  readonly datos = signal<UsuarioEstadoDoc[]>([]);
  readonly searchFilter = signal('');

  // Rango de fechas por defecto: año en curso
  fechaInicial = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  fechaFinal = new Date().toISOString().split('T')[0];

  readonly displayedColumns = ['funcionario', 'enviados', 'derivados', 'aprobados', 'rechazados', 'cerrados', 'total'];

  readonly esAdminOMae = computed(() => {
    const u = this.user();
    if (!u) return false;
    return !!u.es_mae || u.username === 'admin' || u.username === 'sys_default';
  });

  readonly totalEnviados = computed(() => this.datos().reduce((acc, d) => acc + (d.ENVIADO || 0), 0));
  readonly totalDerivados = computed(() => this.datos().reduce((acc, d) => acc + (d.DERIVADO || 0), 0));
  readonly totalAprobados = computed(() => this.datos().reduce((acc, d) => acc + (d.APROBADO || 0), 0));
  readonly totalCerrados = computed(() => this.datos().reduce((acc, d) => acc + (d.CERRADO || 0), 0));

  readonly datosFiltrados = computed(() => {
    const query = this.searchFilter().toLowerCase().trim();
    const list = this.datos();
    if (!query) return list;
    return list.filter((d) => {
      const nombre = `${d.nombres || ''} ${d.apellidos || ''}`.toLowerCase();
      return nombre.includes(query);
    });
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    const params = new HttpParams()
      .set('fechaInicial', this.fechaInicial)
      .set('fechaFinal', this.fechaFinal);

    this.http.get<any>('/api/v1/monitoreo/estados', { params }).subscribe({
      next: (res) => {
        const raw = Array.isArray(res?.datos) ? res.datos : [];
        const procesados = raw.map((d: any) => ({
          ...d,
          total: (d.CREADO || 0) + (d.ENVIADO || 0) + (d.DERIVADO || 0) + (d.APROBADO || 0) + (d.CERRADO || 0)
        }));
        this.datos.set(procesados);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }
}
