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
import { MatSnackBar } from '@angular/material/snack-bar';

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
  ],
  template: `
    <div class="home-portal-container">
      <!-- Encabezado de Bienvenida Institucional -->
      <header class="home-welcome-header">
        <div class="welcome-identity">
          <div class="welcome-avatar-ring">
            <div class="welcome-avatar-inner">
              @if (user()?.foto && !avatarError()) {
                <img [src]="user()?.foto" (error)="avatarError.set(true)" alt="Avatar de usuario" class="welcome-avatar-img">
              } @else {
                <span class="welcome-avatar-initials">{{ userInitials() }}</span>
              }
            </div>
            <span class="welcome-online-dot" title="Sesión activa"></span>
          </div>
          <div class="welcome-text">
            <h1>{{ saludo() }}, {{ user()?.first_name || user()?.username || 'usuario' }}</h1>
            <p class="subtitle">{{ user()?.cargo || 'Personal institucional' }} — Cooperativa Minera Marabunta R.L.</p>
          </div>
        </div>
        <div class="welcome-actions">
          <button mat-raised-button class="btn-redactar-doc" (click)="abrirNuevoDocumento()">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Redactar documento</span>
          </button>
        </div>
      </header>

      <!-- Banner de atención -->
      @if (totalPendientes() > 0 || totalObservados() > 0) {
        <section class="attention-banner" aria-label="Requiere tu atención">
          <div class="attention-icon"><mat-icon>notifications_active</mat-icon></div>
          <div class="attention-text">
            <strong>Requiere tu atención</strong>
            <span>
              @if (totalPendientes() > 0) { {{ totalPendientes() }} por atender }
              @if (totalPendientes() > 0 && totalObservados() > 0) { · }
              @if (totalObservados() > 0) { {{ totalObservados() }} observado(s) por subsanar }
            </span>
          </div>
          <div class="attention-actions">
            @if (totalPendientes() > 0) {
              <button type="button" class="attention-btn" (click)="filtrarBandeja('atender')">Ver por atender</button>
            }
            @if (totalObservados() > 0) {
              <button type="button" class="attention-btn" (click)="filtrarBandeja('observados')">Ver observados</button>
            }
          </div>
        </section>
      } @else if (datosCargados()) {
        <section class="attention-banner is-clear" aria-label="Estás al día">
          <div class="attention-icon"><mat-icon>check_circle</mat-icon></div>
          <div class="attention-text">
            <strong>Estás al día</strong>
            <span>No tienes documentos pendientes ni observados.</span>
          </div>
        </section>
      }

      @if (user()?.celular === null && !avisoCelularOculto()) {
        <div class="phone-hint">
          <mat-icon>smartphone</mat-icon>
          <span>Agrega tu número de celular para recibir alertas por WhatsApp.</span>
          <a routerLink="/profile" class="phone-hint-link">Agregar en Mi perfil</a>
          <button type="button" class="phone-hint-close" (click)="ocultarAvisoCelular()" aria-label="Ocultar aviso">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

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

      <section class="work-grid">
        <div class="work-card">
          <div class="section-header-line"><h2>Continúa donde lo dejaste</h2></div>
          @if (docsRecientes().length === 0) {
            <p class="activity-empty">Aún no tienes documentos recientes.</p>
          } @else {
            <div class="recent-chips">
              @for (d of docsRecientes(); track d.id_documento) {
                <button type="button" class="recent-chip" (click)="irAWorkbench(d)">
                  <span class="chip-dot" [ngClass]="getStatusClass(d.estado)"></span>
                  <span class="chip-main">
                    <span class="chip-title">{{ tituloReciente(d) }}</span>
                    <span class="chip-sub">{{ d.estado }}@if (d['referencia']) { · {{ d['referencia'] }} }</span>
                  </span>
                </button>
              }
            </div>
          }
        </div>

        <div class="work-card">
          <div class="section-header-line"><h2>Plantillas frecuentes</h2></div>
          @if (plantillasFrecuentes().length === 0) {
            <p class="activity-empty">No hay plantillas disponibles.</p>
          } @else {
            <ul class="tpl-list">
              @for (p of plantillasFrecuentes(); track p.id_plantilla_formly) {
                <li class="tpl-item">
                  <span class="tpl-abbr">{{ p.abreviacion }}</span>
                  <span class="tpl-name">{{ p.nombre }}</span>
                  @if (p.usos > 0) { <span class="tpl-uses">{{ p.usos }}×</span> }
                  <button type="button" class="tpl-use-btn" [disabled]="creandoDesdePlantilla()" (click)="usarPlantilla(p)">Usar</button>
                </li>
              }
            </ul>
          }
        </div>
      </section>

      <div class="home-main-grid">
      <!-- Mis Documentos Pendientes de Atención -->
      <section class="recent-tramites-section">
        <div class="section-header-line">
          <h2>Documentos pendientes de atención</h2>
          <a routerLink="/aprobacion" class="link-ver-todo">Ver bandeja completa</a>
        </div>

        <div class="bandeja-tabs" role="tablist">
          <button type="button" role="tab" class="bandeja-tab" [class.is-active]="filtroBandeja() === 'todos'" (click)="filtroBandeja.set('todos')">
            Todos <span class="tab-count">{{ recentDocs().length }}</span>
          </button>
          <button type="button" role="tab" class="bandeja-tab" [class.is-active]="filtroBandeja() === 'atender'" (click)="filtroBandeja.set('atender')">
            Por atender <span class="tab-count">{{ contarPorAtender() }}</span>
          </button>
          <button type="button" role="tab" class="bandeja-tab" [class.is-active]="filtroBandeja() === 'observados'" (click)="filtroBandeja.set('observados')">
            Observados <span class="tab-count">{{ contarObservados() }}</span>
          </button>
        </div>

        <div class="table-responsive">
          <table mat-table [dataSource]="docsFiltrados()" class="w-full recent-table">
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
                  <span>{{ d.estado === 'RECHAZADO' ? 'Subsanar' : 'Atender' }}</span>
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

      </div>

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
                  <div class="module-icon-box" [ngClass]="'color-' + item.color">
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

    .phone-hint {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 8px 14px; margin-bottom: 14px; border-radius: 12px;
      background: #f0f9ff; border: 1px solid #bae6fd; color: #0c4a6e; font-size: 0.82rem;
    }
    .phone-hint mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
    .phone-hint-link { color: #0369a1; font-weight: 600; text-decoration: none; margin-left: auto; }
    .phone-hint-link:hover { text-decoration: underline; }
    .phone-hint-close { border: none; background: transparent; cursor: pointer; color: #64748b; display: flex; padding: 0; }

    .work-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
    .work-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; min-width: 0; }
    .recent-chips { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .recent-chip {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      border: 1px solid #f3f4f6; background: #f9fafb; border-radius: 10px; padding: 8px 10px;
      cursor: pointer; font-family: inherit;
    }
    .recent-chip:hover { background: #ecfdf5; border-color: #a7f3d0; }
    .chip-dot { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; flex-shrink: 0; }
    .chip-dot.status-aprobado { background: #10b981; }
    .chip-dot.status-revision { background: #3b82f6; }
    .chip-dot.status-observado { background: #f59e0b; }
    .chip-main { display: flex; flex-direction: column; min-width: 0; }
    .chip-title { font-size: 0.82rem; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chip-sub { font-size: 0.72rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tpl-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .tpl-item { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid #f3f4f6; }
    .tpl-item:last-child { border-bottom: none; }
    .tpl-abbr {
      min-width: 44px; text-align: center; padding: 3px 6px; border-radius: 8px;
      background: #ecfdf5; color: #047857; font-size: 0.72rem; font-weight: 700;
    }
    .tpl-name { flex: 1; min-width: 0; font-size: 0.82rem; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tpl-uses { font-size: 0.7rem; color: #9ca3af; }
    .tpl-use-btn {
      border: none; border-radius: 999px; padding: 5px 14px; cursor: pointer;
      background: #111827; color: #fff; font-size: 0.76rem; font-weight: 600; font-family: inherit;
    }
    .tpl-use-btn:disabled { opacity: 0.5; cursor: default; }
    .modules-toggle {
      margin-left: auto; display: inline-flex; align-items: center; gap: 2px;
      border: none; background: transparent; color: #047857; font-weight: 600;
      font-size: 0.8rem; cursor: pointer; font-family: inherit;
    }
    @media (max-width: 800px) { .work-grid { grid-template-columns: minmax(0, 1fr); } }

    /* BANNER DE ATENCIÓN */
    .attention-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      margin-bottom: 14px;
      border-radius: 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
    }
    .attention-banner.is-clear {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .attention-icon {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #fef3c7; color: #b45309; flex-shrink: 0;
    }
    .is-clear .attention-icon { background: #d1fae5; color: #047857; }
    .attention-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .attention-text strong { font-size: 0.92rem; color: #111827; }
    .attention-text span { font-size: 0.8rem; color: #6b7280; }
    .attention-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .attention-btn {
      border: none; cursor: pointer; border-radius: 999px;
      padding: 7px 16px; font-size: 0.8rem; font-weight: 600;
      background: #111827; color: #fff; font-family: inherit;
    }
    .attention-btn:hover { background: #1f2937; }

    /* GRID PRINCIPAL: BANDEJA + ACTIVIDAD */
    .home-main-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      margin-bottom: 18px;
    }
    .home-main-grid .recent-tramites-section { margin-bottom: 0; }

    .bandeja-tabs { display: flex; gap: 6px; margin: 4px 0 10px; flex-wrap: wrap; }
    .bandeja-tab {
      border: 1px solid #e5e7eb; background: #fff; color: #4b5563;
      border-radius: 999px; padding: 5px 12px; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .bandeja-tab.is-active { background: #ecfdf5; border-color: #6ee7b7; color: #047857; }
    .tab-count {
      display: inline-block; min-width: 18px; padding: 0 5px; margin-left: 4px;
      border-radius: 999px; background: #f3f4f6; text-align: center; font-size: 0.7rem;
    }
    .bandeja-tab.is-active .tab-count { background: #d1fae5; }

    /* ACTIVIDAD RECIENTE */
    .activity-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 16px;
    }
    .activity-empty { margin: 8px 0 0; font-size: 0.82rem; color: #9ca3af; }
    .activity-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; }
    .activity-item {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 10px 6px; border-radius: 10px; cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-item:hover { background: #f9fafb; }
    .activity-icon {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: #e5e7eb; color: #4b5563;
    }
    .activity-icon mat-icon { font-size: 17px; width: 17px; height: 17px; line-height: 17px; }
    .act-ok { background: #d1fae5; color: #047857; }
    .act-warn { background: #fef3c7; color: #b45309; }
    .act-bad { background: #fee2e2; color: #b91c1c; }
    .act-info { background: #dbeafe; color: #1d4ed8; }
    .activity-body { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 1px; }
    .activity-title { font-size: 0.82rem; color: #1f2937; }
    .activity-doc { font-size: 0.74rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .activity-note { font-size: 0.74rem; color: #92400e; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .activity-time { font-size: 0.7rem; color: #9ca3af; white-space: nowrap; flex-shrink: 0; }

    @media (max-width: 1000px) {
      .home-main-grid { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 640px) {
      .attention-banner { flex-wrap: wrap; }
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
        font-family: var(--font-ui);
        font-size: 1.7rem;
        font-weight: 800;
        color: var(--ink);
        letter-spacing: -0.025em;
      }

      .subtitle {
        margin: 4px 0 0 0;
        font-size: 0.9rem;
        color: var(--ink-muted);
      }
    }

    .welcome-identity {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .welcome-avatar-ring {
      position: relative;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      padding: 2.5px;
      background: linear-gradient(135deg, #059669 0%, #34d399 100%);
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.20);
      flex-shrink: 0;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    .welcome-avatar-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #043324;
      border: 2px solid #ffffff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .welcome-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .welcome-avatar-initials {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      color: #34d399;
    }

    .welcome-online-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      border: 2.5px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    }

    .btn-redactar-doc.mat-mdc-raised-button {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
      color: #ffffff !important;
      border-radius: 9999px;
      padding: 0 24px;
      height: 44px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
      transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px rgba(16, 185, 129, 0.45);
        filter: brightness(1.05);
      }

      mat-icon {
        color: #ffffff;
      }
    }

    /* FRANJA OPERATIVA DE BANDEJA ACTIVA */
    .tray-overview-section {
      margin-bottom: 18px;
    }

    .tray-overview-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
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
        background: var(--surface-tinted);
      }
    }

    .tray-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-petrol { background: var(--state-info); box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.14); }
    .dot-warn { background: var(--state-warn); box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.14); }
    .dot-ok { background: var(--state-ok); box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.14); }

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
      font-size: 1.55rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--state-info);
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
      border-radius: 9999px;
      border-color: #e2e8f0;
      color: #334155;
      background: #ffffff;
      font-weight: 600;
      font-size: 0.82rem;
      height: 38px;
      padding: 0 16px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #059669; }

      &:hover {
        border-color: #10b981;
        background: #ecfdf5;
        color: #065f46;
      }

      &.highlight-vu-btn {
        border-color: #a7f3d0;
        background: #ecfdf5;
        color: #065f46;
        mat-icon { color: #059669; }
        &:hover {
          background: #d1fae5;
          border-color: #059669;
        }
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
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
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
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--ink);

      mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
      }
      .icon-flow { color: var(--petrol-bright); }
      .icon-dist { color: var(--gold); }
    }

    .chart-tag {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--ink-muted);
      background: var(--surface-tinted);
      border: 1px solid var(--line);
      padding: 2px 9px;
      border-radius: 999px;
    }

    /* TABLA DE PENDIENTES */
    .recent-tramites-section {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
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
        font-family: var(--font-ui);
        font-size: 1.08rem;
        font-weight: 700;
        color: var(--ink);
      }
      .link-ver-todo {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 14px;
        border-radius: 9999px;
        background: #ecfdf5;
        font-size: 0.80rem;
        font-weight: 700;
        color: #065f46;
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
        &:hover {
          background: #d1fae5;
          color: #043324;
        }
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
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      padding: 20px 24px 24px;
    }

    .module-tabs-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      margin-bottom: 22px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0;
    }

    .module-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      color: #64748b;
      font-size: 0.86rem;
      font-weight: 600;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      font-family: inherit;
      transition: color 0.16s ease, border-color 0.16s ease;

      .module-tab-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #94a3b8;
        transition: color 0.16s ease;
      }

      &:hover {
        color: #0f172a;
        .module-tab-icon {
          color: #475569;
        }
      }

      &.is-active {
        background: transparent;
        color: #0f172a;
        border-bottom-color: #059669;
        font-weight: 700;

        .module-tab-icon {
          color: #059669;
        }
      }
    }

    .modules-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
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
      background: #ffffff !important;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

      &:hover {
        background: #ffffff !important;
        border-color: #10b981;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.08);

        .module-chevron {
          color: #059669;
          transform: translateX(3px);
        }
      }
    }

    .module-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.18s ease;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      &.color-teal {
        background: #ccfbf1;
        color: #0f766e;
      }
      &.color-purple {
        background: #f3e8ff;
        color: #7e22ce;
      }
      &.color-green, &.color-emerald {
        background: #d1fae5;
        color: #047857;
      }
      &.color-blue {
        background: #dbeafe;
        color: #1d4ed8;
      }
      &.color-orange, &.color-amber {
        background: #fef3c7;
        color: #b45309;
      }
      &.color-indigo {
        background: #e0e7ff;
        color: #4338ca;
      }
      &.color-rose {
        background: #ffe4e6;
        color: #be123c;
      }
      &.color-slate {
        background: #f1f5f9;
        color: #334155;
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
      font-size: 0.90rem;
      font-weight: 700;
      color: #0f172a;
    }

    .module-count-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 1px 8px;
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
    }

    .module-desc {
      margin: 3px 0 0 0;
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .module-chevron {
      color: #94a3b8;
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
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authService.currentUser;
  readonly avatarError = signal<boolean>(false);
  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return 'US';
    const f = (u.first_name || '').trim();
    const l = (u.last_name || '').trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    if (f) return f.substring(0, 2).toUpperCase();
    return (u.username || 'US').substring(0, 2).toUpperCase();
  });
  private readonly menus = this.authService.currentMenu;
  readonly puedeVerVentanilla = computed(() =>
    this.authService.hasRole('ADMIN') || this.authService.hasRole('CORRESPONDENCIA')
  );

  readonly displayedColumns = ['nombre', 'de', 'ref', 'estado', 'accion'];
  readonly recentDocs = signal<Documento[]>([]);
  readonly totalDocs = signal<number>(0);
  readonly totalPendientes = signal<number>(0);
  readonly totalAprobados = signal<number>(0);
  readonly totalObservados = signal<number>(0);
  readonly datosCargados = signal<boolean>(false);
  readonly filtroBandeja = signal<'todos' | 'atender' | 'observados'>('todos');
  readonly docsRecientes = signal<Documento[]>([]);
  readonly plantillasFrecuentes = signal<any[]>([]);
  readonly creandoDesdePlantilla = signal<boolean>(false);
  readonly avisoCelularOculto = signal<boolean>(localStorage.getItem('home_aviso_celular_oculto') === '1');

  readonly contarPorAtender = computed(() => this.recentDocs().filter(d => d.estado !== 'RECHAZADO').length);
  readonly contarObservados = computed(() => this.recentDocs().filter(d => d.estado === 'RECHAZADO').length);
  readonly docsFiltrados = computed(() => {
    const f = this.filtroBandeja();
    const docs = this.recentDocs();
    if (f === 'atender') return docs.filter(d => d.estado !== 'RECHAZADO');
    if (f === 'observados') return docs.filter(d => d.estado === 'RECHAZADO');
    return docs;
  });


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
  }

  cargarDatosDashboard(): void {
    // 1. Cargar documentos pendientes de atención del usuario actual (recibidos por atender o devueltos para subsanar)
    this.documentosService.getDocumentos(10, 1, 'ENVIADO,DERIVADO,RECHAZADO', '', 'home').subscribe({
      next: (res) => {
        const docs = res?.datos?.resultado || [];
        this.recentDocs.set(docs);
        this.datosCargados.set(true);
      },
      error: () => {
        this.recentDocs.set([]);
        this.datosCargados.set(true);
      }
    });

    // 1-obs. Contador de observados por subsanar
    this.documentosService.getDocumentos(1, 1, 'RECHAZADO', '', 'home').subscribe({
      next: (res) => {
        if (res.datos && res.datos.total !== undefined) {
          this.totalObservados.set(res.datos.total);
        }
      },
      error: () => {}
    });

    // 1-rec. Documentos recientes propios
    this.documentosService.getDocumentos(5, 1, 'NUEVO,RECHAZADO,ENVIADO,DERIVADO,APROBADO,CERRADO', '', 'documentos').subscribe({
      next: (res) => this.docsRecientes.set(res?.datos?.resultado || []),
      error: () => this.docsRecientes.set([])
    });

    // 1-tpl. Plantillas frecuentes
    this.http.get<any>('/api/v1/dashboard/plantillas-frecuentes?limit=5').subscribe({
      next: (res) => this.plantillasFrecuentes.set(Array.isArray(res?.datos) ? res.datos : []),
      error: () => this.plantillasFrecuentes.set([])
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

  tituloReciente(d: any): string {
    const base = d?.nombre && d.nombre !== 'BORRADOR' ? d.nombre : 'Borrador';
    return d?.nombre_plantilla ? `${base} · ${d.nombre_plantilla}` : base;
  }

  usarPlantilla(p: any): void {
    if (this.creandoDesdePlantilla()) return;
    this.creandoDesdePlantilla.set(true);
    const usuarioId = this.user()?.id || 1;
    const payload: any = {
      nombre: 'BORRADOR',
      nombre_plantilla: p.nombre,
      abreviacion: p.abreviacion,
      plantilla: p.plantilla,
      plantilla_valor: JSON.stringify({ inputSelect: 'Reservado' }),
      sw: { enviado: false, enviar: false },
      fid_plantilla: p.id_plantilla_formly,
      _usuario_creacion: usuarioId
    };
    this.documentosService.crearDocumento(payload).subscribe({
      next: (res) => {
        this.creandoDesdePlantilla.set(false);
        const doc = res?.datos;
        if (doc?.id_documento) {
          this.snackBar.open('Borrador creado', 'Cerrar', { duration: 2500 });
          this.router.navigate(['/documentos', doc.id_documento]);
        }
      },
      error: (err) => {
        this.creandoDesdePlantilla.set(false);
        this.snackBar.open(err.error?.mensaje || 'No se pudo crear el documento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  ocultarAvisoCelular(): void {
    this.avisoCelularOculto.set(true);
    localStorage.setItem('home_aviso_celular_oculto', '1');
  }

  filtrarBandeja(filtro: 'todos' | 'atender' | 'observados'): void {
    this.filtroBandeja.set(filtro);
    setTimeout(() => document.querySelector('.recent-tramites-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  irARuta(url: string): void {
    if (url) {
      this.router.navigate(['/' + url]);
    }
  }

  irAWorkbench(doc: { id_documento?: number }): void {
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
