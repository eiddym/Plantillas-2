import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth/auth.service';
import { EchartComponent } from '../../shared/components/echart/echart.component';
import * as echarts from 'echarts';

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

export type MonitoreoTab = 'global' | 'unidad' | 'personal' | 'historico';

@Component({
  selector: 'app-monitoreo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule,
    EchartComponent
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
          <p class="subtitle">Tablero de Control de Gestión, Cuellos de Botella y Productividad Institucional</p>
        </div>

        <div class="scope-badges">
          <span class="scope-badge" [class.scope-admin]="esAdminOMae()">
            <mat-icon>{{ esAdminOMae() ? 'public' : 'person' }}</mat-icon>
            <span>{{ esAdminOMae() ? 'Control MAE / Directivo' : 'Panel de Funcionario' }}</span>
          </span>
        </div>
      </div>

      <!-- Barra de Pestañas de Navegación Multinivel -->
      <div class="tabs-nav-bar">
        <button
          *ngIf="esAdminOMae()"
          class="tab-btn"
          [class.active]="tabActiva() === 'global'"
          (click)="cambiarTab('global')"
        >
          <mat-icon>public</mat-icon>
          <span>Visión Global Institucional</span>
        </button>

        <button
          *ngIf="esAdminOMae() || esJefe()"
          class="tab-btn"
          [class.active]="tabActiva() === 'unidad'"
          (click)="cambiarTab('unidad')"
        >
          <mat-icon>apartment</mat-icon>
          <span>Carga por Unidad</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="tabActiva() === 'personal'"
          (click)="cambiarTab('personal')"
        >
          <mat-icon>account_circle</mat-icon>
          <span>Mi Auto-Monitoreo y Rendimiento</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="tabActiva() === 'historico'"
          (click)="cambiarTab('historico')"
        >
          <mat-icon>history</mat-icon>
          <span>Auditoría de Acciones</span>
        </button>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 1: VISIÓN GLOBAL INSTITUCIONAL (MAE / ADMIN)           -->
      <!-- ============================================================== -->
      <div *ngIf="tabActiva() === 'global'" class="tab-content fade-in">
        <!-- KPIs Globales -->
        <div class="kpi-row">
          <div class="kpi-stat-card card-total">
            <div class="kpi-icon-box bg-slate">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ globalResumen()?.totalGlobal || 0 }}</span>
              <span class="kpi-label">TOTAL EXPEDIENTES</span>
            </div>
          </div>

          <div class="kpi-stat-card card-pendientes">
            <div class="kpi-icon-box bg-orange">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ globalResumen()?.totalPendientes || 0 }}</span>
              <span class="kpi-label">PENDIENTES EN CURSO</span>
            </div>
          </div>

          <div class="kpi-stat-card card-atendidos">
            <div class="kpi-icon-box bg-teal">
              <mat-icon>verified</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ globalResumen()?.totalConcluidos || 0 }}</span>
              <span class="kpi-label">CONCLUIDOS / CERRADOS</span>
            </div>
          </div>

          <div class="kpi-stat-card card-tasa">
            <div class="kpi-icon-box bg-blue">
              <mat-icon>speed</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ globalResumen()?.tasaResolucion || 0 }}%</span>
              <span class="kpi-label">TASA DE RESOLUCIÓN</span>
            </div>
          </div>
        </div>

        <!-- Fila de Gráficos ECharts Globales -->
        <div class="charts-grid-2">
          <!-- Gráfico de Carga de Pendientes vs Atendidos por Unidad -->
          <mat-card class="chart-panel">
            <div class="panel-header">
              <div class="panel-title">
                <mat-icon class="icon-bars">bar_chart</mat-icon>
                <span>Carga de Trámites por Unidad Organizacional</span>
              </div>
              <span class="panel-tag">Pendientes vs Atendidos</span>
            </div>
            <app-echart [options]="chartUnidadesOptions()" [loading]="cargando()" height="320px"></app-echart>
          </mat-card>

          <!-- Gráfico de Distribución Global por Estado -->
          <mat-card class="chart-panel">
            <div class="panel-header">
              <div class="panel-title">
                <mat-icon class="icon-donut">donut_large</mat-icon>
                <span>Distribución por Estado Actual</span>
              </div>
              <span class="panel-tag">Consolidado general</span>
            </div>
            <app-echart [options]="chartEstadosOptions()" [loading]="cargando()" height="320px"></app-echart>
          </mat-card>
        </div>

        <!-- Tabla Resumen por Unidad -->
        <mat-card class="table-card mt-4">
          <div class="table-header-box">
            <h3>Detalle de Carga y Demora por Unidad</h3>
          </div>
          <div class="table-responsive">
            <table class="w-full data-table">
              <thead>
                <tr>
                  <th>UNIDAD</th>
                  <th class="text-center">ABREV.</th>
                  <th class="text-center">PENDIENTES</th>
                  <th class="text-center">CON DEMORA (>3 DÍAS)</th>
                  <th class="text-center">CONCLUIDOS</th>
                  <th class="text-center">TOTAL</th>
                  <th class="text-center">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of globalUnidades()">
                  <td><strong>{{ u.unidad }}</strong></td>
                  <td class="text-center"><span class="badge-abrev">{{ u.abreviacion }}</span></td>
                  <td class="text-center">
                    <span class="count-pill pill-orange" *ngIf="u.pendientes > 0">{{ u.pendientes }}</span>
                    <span class="text-muted" *ngIf="u.pendientes === 0">0</span>
                  </td>
                  <td class="text-center">
                    <span class="count-pill pill-red" *ngIf="u.con_demora > 0">
                      <mat-icon class="inline-icon">warning</mat-icon> {{ u.con_demora }}
                    </span>
                    <span class="text-green" *ngIf="u.con_demora === 0">Al día</span>
                  </td>
                  <td class="text-center">
                    <span class="count-pill pill-teal" *ngIf="u.atendidos > 0">{{ u.atendidos }}</span>
                    <span class="text-muted" *ngIf="u.atendidos === 0">0</span>
                  </td>
                  <td class="text-center"><strong>{{ u.total }}</strong></td>
                  <td class="text-center">
                    <button mat-stroked-button class="btn-ver-unidad" (click)="seleccionarUnidadYVer(u.id_unidad)">
                      <mat-icon>visibility</mat-icon> Ver Equipo
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 2: VISIÓN DE UNIDAD / JEFATURA                         -->
      <!-- ============================================================== -->
      <div *ngIf="tabActiva() === 'unidad'" class="tab-content fade-in">
        <!-- Selector de Unidad si es MAE/Admin -->
        <mat-card class="filter-card">
          <div class="unit-selector-row">
            <mat-icon class="unit-icon">apartment</mat-icon>
            <span class="unit-label">Unidad a Monitorear:</span>
            <select
              class="custom-select"
              [(ngModel)]="unidadSeleccionadaId"
              (ngModelChange)="cargarMetricasUnidad()"
            >
              <option *ngFor="let u of globalUnidades()" [value]="u.id_unidad">
                {{ u.unidad }} ({{ u.abreviacion }})
              </option>
            </select>
            <button mat-flat-button class="btn-recargar" (click)="cargarMetricasUnidad()">
              <mat-icon>refresh</mat-icon> Actualizar
            </button>
          </div>
        </mat-card>

        <!-- Gráfico Semáforo de Antigüedad por Funcionario -->
        <mat-card class="chart-panel mt-4">
          <div class="panel-header">
            <div class="panel-title">
              <mat-icon class="icon-semaforo">traffic</mat-icon>
              <span>Semáforo de Antigüedad de Trámites en Bandeja de Funcionarios</span>
            </div>
            <div class="semaforo-legend">
              <span class="leg-item"><span class="dot bg-green"></span> &lt; 24h</span>
              <span class="leg-item"><span class="dot bg-yellow"></span> 1 a 3 días</span>
              <span class="leg-item"><span class="dot bg-red"></span> &gt; 3 días</span>
            </div>
          </div>
          <app-echart [options]="chartSemaforoOptions()" [loading]="cargando()" height="320px"></app-echart>
        </mat-card>

        <!-- Tabla de Funcionarios de la Unidad -->
        <mat-card class="table-card mt-4">
          <div class="table-header-box">
            <h3>Carga de Trabajo por Funcionario</h3>
          </div>
          <div class="table-responsive">
            <table class="w-full data-table">
              <thead>
                <tr>
                  <th>FUNCIONARIO</th>
                  <th>CARGO</th>
                  <th class="text-center">&lt; 24H (AL DÍA)</th>
                  <th class="text-center">1-3 DÍAS (ATENCIÓN)</th>
                  <th class="text-center">&gt; 3 DÍAS (CRÍTICO)</th>
                  <th class="text-center">PENDIENTES</th>
                  <th class="text-center">CONCLUIDOS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let f of unidadFuncionarios()">
                  <td>
                    <div class="user-row-cell">
                      <div class="avatar-circle">{{ f.nombreCompleto ? f.nombreCompleto[0].toUpperCase() : 'U' }}</div>
                      <strong>{{ f.nombreCompleto }}</strong>
                    </div>
                  </td>
                  <td><span class="cargo-text">{{ f.cargo }}</span></td>
                  <td class="text-center">
                    <span class="semaforo-pill pill-green-light" *ngIf="f.semaforo.verde > 0">{{ f.semaforo.verde }}</span>
                    <span class="text-muted" *ngIf="f.semaforo.verde === 0">-</span>
                  </td>
                  <td class="text-center">
                    <span class="semaforo-pill pill-yellow-light" *ngIf="f.semaforo.amarillo > 0">{{ f.semaforo.amarillo }}</span>
                    <span class="text-muted" *ngIf="f.semaforo.amarillo === 0">-</span>
                  </td>
                  <td class="text-center">
                    <span class="semaforo-pill pill-red-light" *ngIf="f.semaforo.rojo > 0">{{ f.semaforo.rojo }}</span>
                    <span class="text-muted" *ngIf="f.semaforo.rojo === 0">-</span>
                  </td>
                  <td class="text-center">
                    <span class="count-pill pill-orange"><strong>{{ f.pendientes }}</strong></span>
                  </td>
                  <td class="text-center">
                    <span class="count-pill pill-teal">{{ f.atendidos }}</span>
                  </td>
                </tr>
                <tr *ngIf="unidadFuncionarios().length === 0">
                  <td colspan="7" class="text-center py-4 text-muted">
                    No se encontraron funcionarios activos en esta unidad.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 3: MI AUTO-MONITOREO Y RENDIMIENTO                     -->
      <!-- ============================================================== -->
      <div *ngIf="tabActiva() === 'personal'" class="tab-content fade-in">
        <!-- Fila Superior de Métricas Personales -->
        <div class="kpi-row">
          <div class="kpi-stat-card card-total">
            <div class="kpi-icon-box bg-blue">
              <mat-icon>assignment</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ personalResumen()?.creados || 0 }}</span>
              <span class="kpi-label">REDACTADOS EN EL MES</span>
            </div>
          </div>

          <div class="kpi-stat-card card-pendientes">
            <div class="kpi-icon-box bg-orange">
              <mat-icon>inbox</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ personalResumen()?.pendientes || 0 }}</span>
              <span class="kpi-label">EN MI BANDEJA</span>
            </div>
          </div>

          <div class="kpi-stat-card card-atendidos">
            <div class="kpi-icon-box bg-teal">
              <mat-icon>task_alt</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ personalResumen()?.atendidos || 0 }}</span>
              <span class="kpi-label">DESPACHADOS / ATENDIDOS</span>
            </div>
          </div>

          <div class="kpi-stat-card card-tasa">
            <div class="kpi-icon-box bg-green">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-num">{{ personalResumen()?.tasaEficiencia || 100 }}%</span>
              <span class="kpi-label">EFICIENCIA DE DESPACHO</span>
            </div>
          </div>
        </div>

        <div class="charts-grid-2">
          <!-- Tacómetro Gauge de Eficiencia -->
          <mat-card class="chart-panel">
            <div class="panel-header">
              <div class="panel-title">
                <mat-icon class="icon-gauge">speed</mat-icon>
                <span>Tacómetro de Rendimiento Personal</span>
              </div>
              <span class="panel-tag">Mes en curso</span>
            </div>
            <app-echart [options]="chartGaugeOptions()" [loading]="cargando()" height="300px"></app-echart>
          </mat-card>

          <!-- Gráfico de Actividad de los últimos 7 días -->
          <mat-card class="chart-panel">
            <div class="panel-header">
              <div class="panel-title">
                <mat-icon class="icon-flow">stacked_line_chart</mat-icon>
                <span>Mi Actividad en los Últimos 7 Días</span>
              </div>
              <span class="panel-tag">Acciones de flujo</span>
            </div>
            <app-echart [options]="chartSemanaOptions()" [loading]="cargando()" height="300px"></app-echart>
          </mat-card>
        </div>

        <!-- Lista de Mis Pendientes en Bandeja -->
        <mat-card class="table-card mt-4">
          <div class="table-header-box">
            <h3>Mis Trámites Pendientes en Bandeja</h3>
          </div>
          <div class="table-responsive">
            <table class="w-full data-table">
              <thead>
                <tr>
                  <th>CITE / CÓDIGO</th>
                  <th>ASUNTO / REFERENCIA</th>
                  <th class="text-center">ESTADO</th>
                  <th class="text-center">DÍAS EN ESPERA</th>
                  <th class="text-center">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of personalPendientes()">
                  <td><strong>{{ p.cite }}</strong></td>
                  <td><span class="asunto-text">{{ p.asunto || 'Sin asunto registrado' }}</span></td>
                  <td class="text-center">
                    <span class="status-pill status-nuevo" *ngIf="p.estado === 'NUEVO'">NUEVO</span>
                    <span class="status-pill status-derivado" *ngIf="p.estado === 'DERIVADO'">DERIVADO</span>
                    <span class="status-pill status-enviado" *ngIf="p.estado === 'ENVIADO'">EN TRÁMITE</span>
                  </td>
                  <td class="text-center">
                    <span class="dias-badge" [class.dias-alerta]="p.dias_espera > 2">
                      {{ p.dias_espera === 0 ? 'Hoy' : p.dias_espera + ' d' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button mat-raised-button class="btn-atender" [routerLink]="['/documentos', p.id_documento]">
                      <mat-icon>edit_note</mat-icon> Atender
                    </button>
                  </td>
                </tr>
                <tr *ngIf="personalPendientes().length === 0">
                  <td colspan="5" class="text-center py-4 text-green">
                    <mat-icon class="inline-icon">check_circle</mat-icon>
                    ¡Felicidades! No tienes trámites pendientes por resolver en tu bandeja.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 4: AUDITORÍA HISTÓRICA DE ACCIONES (TABLA CLÁSICA)    -->
      <!-- ============================================================== -->
      <div *ngIf="tabActiva() === 'historico'" class="tab-content fade-in">
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

              <button mat-flat-button class="btn-filtrar" (click)="cargarDatosHistoricos()">
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

        <mat-card class="table-card mt-4">
          <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>
          <div class="table-responsive">
            <table mat-table [dataSource]="datosHistoricosFiltrados()" class="w-full monitoreo-table">
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

              <ng-container matColumnDef="enviados">
                <th mat-header-cell *matHeaderCellDef class="text-center">ENVIADOS</th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="count-pill pill-orange" *ngIf="row.ENVIADO">{{ row.ENVIADO }}</span>
                  <span class="text-muted" *ngIf="!row.ENVIADO">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="derivados">
                <th mat-header-cell *matHeaderCellDef class="text-center">DERIVADOS</th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="count-pill pill-blue" *ngIf="row.DERIVADO">{{ row.DERIVADO }}</span>
                  <span class="text-muted" *ngIf="!row.DERIVADO">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="aprobados">
                <th mat-header-cell *matHeaderCellDef class="text-center">APROBADOS</th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="count-pill pill-teal" *ngIf="row.APROBADO">{{ row.APROBADO }}</span>
                  <span class="text-muted" *ngIf="!row.APROBADO">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="rechazados">
                <th mat-header-cell *matHeaderCellDef class="text-center">RECHAZADOS</th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="count-pill pill-red" *ngIf="row.RECHAZADO">{{ row.RECHAZADO }}</span>
                  <span class="text-muted" *ngIf="!row.RECHAZADO">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="cerrados">
                <th mat-header-cell *matHeaderCellDef class="text-center">CERRADOS</th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="count-pill pill-green" *ngIf="row.CERRADO">{{ row.CERRADO }}</span>
                  <span class="text-muted" *ngIf="!row.CERRADO">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef class="text-right">TOTAL ACCIONES</th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <strong class="total-number">{{ row.total }}</strong>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .monitoreo-shell {
      padding: 24px;
      background: #f8fafc;
      min-height: calc(100vh - 64px);
      box-sizing: border-box;
    }

    /* HEADER */
    .monitoreo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      .title-icon { font-size: 28px; width: 28px; height: 28px; color: #0284c7; }
      h1 { margin: 0; font-size: 1.45rem; font-weight: 800; color: #0f172a; }
    }

    .subtitle { margin: 4px 0 0 0; font-size: 0.85rem; color: #64748b; }

    .scope-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &.scope-admin { background: #dbeafe; color: #1e40af; }
    }

    /* PESTAÑAS (TABS NAV) */
    .tabs-nav-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 12px;
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: #ffffff;
      color: #475569;
      font-weight: 700;
      font-size: 0.84rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      mat-icon { font-size: 19px; width: 19px; height: 19px; }

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      &.active {
        background: #0284c7;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
      }
    }

    /* KPIS ROW */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 6px rgba(15, 32, 39, 0.03);
    }

    .kpi-icon-box {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #ffffff; font-size: 22px; width: 22px; height: 22px; }
      &.bg-slate { background: #475569; }
      &.bg-orange { background: #f97316; }
      &.bg-teal { background: #0d9488; }
      &.bg-blue { background: #2563eb; }
      &.bg-green { background: #16a34a; }
    }

    .kpi-body {
      display: flex;
      flex-direction: column;
    }

    .kpi-num {
      font-size: 1.8rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }

    .kpi-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* GRÁFICOS */
    .charts-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .chart-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px 10px 20px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .icon-bars { color: #2563eb; }
      .icon-donut { color: #059669; }
      .icon-semaforo { color: #f59e0b; }
      .icon-gauge { color: #6366f1; }
      .icon-flow { color: #0284c7; }
    }

    .panel-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 12px;
    }

    .semaforo-legend {
      display: flex;
      gap: 12px;
      font-size: 0.76rem;
      font-weight: 700;
      color: #475569;
      .leg-item { display: inline-flex; align-items: center; gap: 4px; }
      .dot { width: 8px; height: 8px; border-radius: 50%; }
      .bg-green { background: #10b981; }
      .bg-yellow { background: #f59e0b; }
      .bg-red { background: #ef4444; }
    }

    /* FILTROS Y SELECTORES */
    .filter-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 20px;
      box-shadow: 0 1px 4px rgba(15, 32, 39, 0.03);
    }

    .unit-selector-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      .unit-icon { color: #0284c7; }
      .unit-label { font-weight: 700; font-size: 0.88rem; color: #0f172a; }
      .custom-select {
        padding: 7px 12px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        font-size: 0.85rem;
        font-weight: 600;
        color: #1e293b;
        background: #ffffff;
        min-width: 280px;
      }
      .btn-recargar {
        background: #0284c7;
        color: #ffffff;
        border-radius: 8px;
        font-weight: 700;
        height: 36px;
      }
    }

    .filters-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .date-pickers {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .date-field { width: 160px; }
    .search-user-field { width: 260px; }

    .btn-filtrar {
      background: #0284c7;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 700;
      height: 48px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .filter-spacer { flex: 1; }

    /* TABLAS */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .table-header-box {
      margin-bottom: 12px;
      h3 { margin: 0; font-size: 0.94rem; font-weight: 800; color: #0f172a; }
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;

      th {
        background: #0f2027;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 10px 14px;
        text-align: left;
      }

      td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }

      tr:hover td {
        background: #f8fafc;
      }
    }

    .monitoreo-table {
      width: 100%;
      th.mat-mdc-header-cell {
        background-color: #0f2027 !important;
        color: #ffffff !important;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.6px;
      }
      td.mat-mdc-cell {
        font-size: 0.84rem;
        padding: 10px 14px;
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-mini-avatar, .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-names {
      display: flex;
      flex-direction: column;
      strong { color: #0f172a; }
      small { color: #64748b; font-size: 0.72rem; }
    }

    .cargo-text { font-size: 0.78rem; color: #64748b; }
    .asunto-text { font-size: 0.82rem; color: #334155; }

    .count-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 0.76rem;
      &.pill-orange { background: #ffedd5; color: #c2410c; }
      &.pill-blue { background: #dbeafe; color: #1d4ed8; }
      &.pill-teal { background: #ccfbf1; color: #0f766e; }
      &.pill-green { background: #dcfce7; color: #15803d; }
      &.pill-red { background: #fee2e2; color: #b91c1c; }
    }

    .semaforo-pill {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 0.76rem;
      &.pill-green-light { background: #dcfce7; color: #166534; }
      &.pill-yellow-light { background: #fef3c7; color: #92400e; }
      &.pill-red-light { background: #fee2e2; color: #991b1b; }
    }

    .badge-abrev {
      font-size: 0.74rem;
      font-weight: 800;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .status-pill {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 12px;
      &.status-nuevo { background: #e0f2fe; color: #0369a1; }
      &.status-derivado { background: #ffedd5; color: #c2410c; }
      &.status-enviado { background: #ede9fe; color: #6d28d9; }
    }

    .dias-badge {
      font-size: 0.76rem;
      font-weight: 800;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 8px;
      &.dias-alerta { background: #fee2e2; color: #dc2626; }
    }

    .btn-ver-unidad {
      border-radius: 16px !important;
      height: 30px !important;
      font-size: 0.76rem !important;
      font-weight: 700 !important;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .btn-atender {
      background: #0284c7 !important;
      color: #ffffff !important;
      border-radius: 16px !important;
      height: 30px !important;
      font-size: 0.76rem !important;
      font-weight: 700 !important;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .inline-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; font-size: 0.78rem; }
    .text-green { color: #15803d; font-weight: 700; font-size: 0.78rem; }
    .mt-4 { margin-top: 20px; }

    .fade-in {
      animation: fadeIn 0.25s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .monitoreo-shell { padding: 14px; }
      .charts-grid-2 { grid-template-columns: 1fr; }
      .filters-row, .date-pickers { flex-direction: column; align-items: stretch; }
      .date-field, .search-user-field, .btn-filtrar { width: 100% !important; }
    }
  `]
})
export class MonitoreoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.currentUser;
  readonly cargando = signal(true);
  readonly tabActiva = signal<MonitoreoTab>('global');

  // Metadatos Globales (MAE/Admin)
  readonly globalResumen = signal<any>(null);
  readonly globalUnidades = signal<any[]>([]);
  readonly chartUnidadesOptions = signal<echarts.EChartsOption | null>(null);
  readonly chartEstadosOptions = signal<echarts.EChartsOption | null>(null);

  // Metadatos por Unidad (Jefatura)
  readonly unidadFuncionarios = signal<any[]>([]);
  readonly chartSemaforoOptions = signal<echarts.EChartsOption | null>(null);
  unidadSeleccionadaId: number = 1;

  // Metadatos Personales (Auto-Monitoreo del Funcionario)
  readonly personalResumen = signal<any>(null);
  readonly personalPendientes = signal<any[]>([]);
  readonly chartGaugeOptions = signal<echarts.EChartsOption | null>(null);
  readonly chartSemanaOptions = signal<echarts.EChartsOption | null>(null);

  // Auditoría Histórica
  readonly datosHistoricos = signal<UsuarioEstadoDoc[]>([]);
  readonly searchFilter = signal('');
  fechaInicial = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  fechaFinal = new Date().toISOString().split('T')[0];
  readonly displayedColumns = ['funcionario', 'enviados', 'derivados', 'aprobados', 'rechazados', 'cerrados', 'total'];

  readonly esAdminOMae = computed(() => {
    const u = this.user();
    if (!u) return false;
    return !!u.es_mae || this.authService.isMae() || this.authService.hasRole('ADMIN') || this.authService.hasRole('SUPERADMIN');
  });

  readonly esJefe = computed(() => {
    return this.authService.hasRole('JEFE') || this.authService.hasRole('ADMIN');
  });

  readonly datosHistoricosFiltrados = computed(() => {
    const query = this.searchFilter().toLowerCase().trim();
    const list = this.datosHistoricos();
    if (!query) return list;
    return list.filter((d) => {
      const nombre = `${d.nombres || ''} ${d.apellidos || ''}`.toLowerCase();
      return nombre.includes(query);
    });
  });

  ngOnInit(): void {
    // Si no es MAE ni Admin, iniciar en su pestaña personal
    if (!this.esAdminOMae()) {
      this.tabActiva.set('personal');
    }
    this.cargarMetricasGlobales();
    this.cargarMetricasUnidad();
    this.cargarMetricasPersonales();
  }

  cambiarTab(tab: MonitoreoTab): void {
    this.tabActiva.set(tab);
    if (tab === 'global') this.cargarMetricasGlobales();
    if (tab === 'unidad') this.cargarMetricasUnidad();
    if (tab === 'personal') this.cargarMetricasPersonales();
    if (tab === 'historico') this.cargarDatosHistoricos();
  }

  seleccionarUnidadYVer(idUnidad: number): void {
    this.unidadSeleccionadaId = idUnidad;
    this.cambiarTab('unidad');
  }

  /**
   * Carga métricas globales para la MAE y Administradores
   */
  cargarMetricasGlobales(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/monitoreo/metricas/global').subscribe({
      next: (res) => {
        const datos = res?.datos || {};
        this.globalResumen.set(datos.resumen || {});
        const unidades = Array.isArray(datos.porUnidad) ? datos.porUnidad : [];
        this.globalUnidades.set(unidades);

        // Preseleccionar la primera unidad con pendientes si existe
        if (unidades.length > 0 && !this.unidadSeleccionadaId) {
          this.unidadSeleccionadaId = unidades[0].id_unidad;
        }

        // 1. Gráfico de Barras Horizontales (Pendientes vs Atendidos por Unidad)
        const unidadesNombres = unidades.map((u: any) => u.abreviacion || u.unidad);
        const pendientesSerie = unidades.map((u: any) => u.pendientes);
        const atendidosSerie = unidades.map((u: any) => u.atendidos);

        this.chartUnidadesOptions.set({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#334155',
            textStyle: { color: '#f8fafc', fontSize: 12 }
          },
          legend: {
            top: 0,
            icon: 'circle',
            textStyle: { color: '#475569', fontSize: 11 }
          },
          grid: {
            top: 35,
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
            axisLabel: { color: '#64748b', fontSize: 11 }
          },
          yAxis: {
            type: 'category',
            data: unidadesNombres,
            axisLabel: { color: '#1e293b', fontWeight: 'bold', fontSize: 11 }
          },
          series: [
            {
              name: 'Pendientes',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#f97316' },
              data: pendientesSerie
            },
            {
              name: 'Atendidos / Concluidos',
              type: 'bar',
              stack: 'total',
              itemStyle: { color: '#0d9488' },
              data: atendidosSerie
            }
          ]
        });

        // 2. Gráfico de Dona de Estados Globales
        const estados = datos.distribucionEstados || {};
        this.chartEstadosOptions.set({
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#334155',
            textStyle: { color: '#f8fafc', fontSize: 12 },
            formatter: '{b}: <strong>{c}</strong> ({d}%)'
          },
          legend: {
            bottom: 0,
            icon: 'circle',
            textStyle: { color: '#475569', fontSize: 11 }
          },
          color: ['#0284c7', '#f97316', '#8b5cf6', '#10b981', '#475569', '#ef4444'],
          series: [
            {
              name: 'Estado Global',
              type: 'pie',
              radius: ['45%', '70%'],
              center: ['50%', '45%'],
              avoidLabelOverlap: false,
              itemStyle: { borderRadius: 6, borderColor: '#ffffff', borderWidth: 2 },
              label: { show: false },
              data: [
                { value: estados.NUEVO || 0, name: 'Nuevos' },
                { value: estados.ENVIADO || 0, name: 'Enviados' },
                { value: estados.DERIVADO || 0, name: 'Derivados' },
                { value: estados.APROBADO || 0, name: 'Aprobados' },
                { value: estados.CERRADO || 0, name: 'Cerrados' },
                { value: estados.RECHAZADO || 0, name: 'Rechazados' }
              ]
            }
          ]
        });

        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  /**
   * Carga balance de carga y semáforo de antigüedad por funcionario de una unidad
   */
  cargarMetricasUnidad(): void {
    this.cargando.set(true);
    const id = this.unidadSeleccionadaId || 1;
    this.http.get<any>(`/api/v1/monitoreo/metricas/unidad/${id}`).subscribe({
      next: (res) => {
        const funcionarios = Array.isArray(res?.datos?.funcionarios) ? res.datos.funcionarios : [];
        this.unidadFuncionarios.set(funcionarios);

        const nombres = funcionarios.map((f: any) => f.nombreCompleto);
        const verdes = funcionarios.map((f: any) => f.semaforo.verde);
        const amarillos = funcionarios.map((f: any) => f.semaforo.amarillo);
        const rojos = funcionarios.map((f: any) => f.semaforo.rojo);

        this.chartSemaforoOptions.set({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: '#334155',
            textStyle: { color: '#f8fafc', fontSize: 12 }
          },
          legend: {
            top: 0,
            icon: 'circle',
            textStyle: { color: '#475569', fontSize: 11 }
          },
          grid: {
            top: 35,
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
          },
          yAxis: {
            type: 'category',
            data: nombres,
            axisLabel: { color: '#1e293b', fontWeight: 'bold', fontSize: 11 }
          },
          series: [
            {
              name: '< 24h (Al día)',
              type: 'bar',
              stack: 'semaforo',
              itemStyle: { color: '#10b981' },
              data: verdes
            },
            {
              name: '1 a 3 días (Atención)',
              type: 'bar',
              stack: 'semaforo',
              itemStyle: { color: '#f59e0b' },
              data: amarillos
            },
            {
              name: '> 3 días (Crítico)',
              type: 'bar',
              stack: 'semaforo',
              itemStyle: { color: '#ef4444' },
              data: rojos
            }
          ]
        });

        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  /**
   * Carga métricas de productividad y pendientes personales del usuario
   */
  cargarMetricasPersonales(): void {
    this.cargando.set(true);
    const u = this.user();
    const idUsuario = u ? ((u as any).id_usuario || u.id) : 1;
    this.http.get<any>(`/api/v1/monitoreo/metricas/mi-actividad?id_usuario=${idUsuario}`).subscribe({
      next: (res) => {
        const datos = res?.datos || {};
        this.personalResumen.set(datos.resumenMes || {});
        this.personalPendientes.set(datos.misPendientesCriticos || []);

        const tasa = datos.resumenMes?.tasaEficiencia || 100;

        // 1. Tacómetro Gauge de Eficiencia
        this.chartGaugeOptions.set({
          tooltip: { formatter: '{a} <br/>{b} : {c}%' },
          series: [
            {
              name: 'Eficiencia',
              type: 'gauge',
              radius: '85%',
              progress: { show: true, width: 14 },
              axisLine: { lineStyle: { width: 14 } },
              axisTick: { show: false },
              splitLine: { length: 10, lineStyle: { width: 2, color: '#999' } },
              axisLabel: { distance: 20, color: '#999', fontSize: 10 },
              anchor: { show: true, showAbove: true, size: 14, itemStyle: { borderWidth: 4 } },
              title: { show: true, offsetCenter: [0, '70%'], fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
              detail: { valueAnimation: true, fontSize: 24, fontWeight: 'bolder', offsetCenter: [0, '35%'], formatter: '{value}%' },
              data: [{ value: tasa, name: 'Resolución de Trámites' }]
            }
          ]
        });

        // 2. Gráfico de Actividad de los últimos 7 días
        const semana = Array.isArray(datos.actividadUltimos7Dias) ? datos.actividadUltimos7Dias : [];
        const diasLabels = semana.map((s: any) => s.diaLabel || s.dia);
        const accionesData = semana.map((s: any) => s.acciones);

        this.chartSemanaOptions.set({
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            textStyle: { color: '#ffffff', fontSize: 12 }
          },
          grid: { top: 25, left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: diasLabels.length > 0 ? diasLabels : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            axisLabel: { color: '#64748b', fontSize: 11 }
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
          },
          series: [
            {
              name: 'Acciones de Flujo',
              type: 'bar',
              barWidth: '40%',
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#1d4ed8' }
                ]),
                borderRadius: [4, 4, 0, 0]
              },
              data: accionesData.length > 0 ? accionesData : [2, 4, 1, 6, 8, 3, 0]
            }
          ]
        });

        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  /**
   * Carga auditoría histórica tabular
   */
  cargarDatosHistoricos(): void {
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
        this.datosHistoricos.set(procesados);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }
}
