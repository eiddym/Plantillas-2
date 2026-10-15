import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentosService, Documento } from '../../core/services/documentos.service';

export interface ExpedienteItem {
  id_documento: number;
  nombre: string;
  nombre_plantilla?: string;
  estado: string;
  fecha?: string;
  _fecha_creacion?: string;
  usuario_creacion?: {
    nombres: string;
    apellidos: string;
    cargo?: string;
  };
  padre?: any;
  hijos?: any[];
  plantilla_valor?: string;
}

@Component({
  selector: 'app-archivo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="archivo-page-container">
      <!-- Header Superior con Estética Tecnológica -->
      <header class="archivo-header">
        <div class="header-left">
          <div class="header-icon-box">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <div>
            <h1 class="header-title">Módulo Central de Archivo</h1>
            <p class="header-desc">Custodia, consulta histórica y expediente único institucional</p>
          </div>
        </div>

        <div class="header-actions">
          <div class="stats-pill">
            <mat-icon>folder_special</mat-icon>
            <span>Total Custodiados: <strong>{{ totalDocs() }}</strong></span>
          </div>
        </div>
      </header>

      <!-- Selector de Nivel de Archivo (Pestañas Sincronizadas) -->
      <div class="tabs-nav-bar">
        <button 
          class="tab-btn" 
          [class.active]="nivelActivo() === 'general'" 
          (click)="cambiarNivel('general')"
        >
          <mat-icon>public</mat-icon>
          <span>Archivo General</span>
          <span class="tab-badge">Institucional</span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="nivelActivo() === 'unidad'" 
          (click)="cambiarNivel('unidad')"
        >
          <mat-icon>domain</mat-icon>
          <span>Archivo de Unidad</span>
          <span class="tab-badge">Área Operativa</span>
        </button>

        <button 
          class="tab-btn" 
          [class.active]="nivelActivo() === 'institucional'" 
          (click)="cambiarNivel('institucional')"
        >
          <mat-icon>manage_search</mat-icon>
          <span>Buscador Maestro</span>
          <span class="tab-badge">Multicriterio</span>
        </button>
      </div>

      <!-- VISTA 1: ARCHIVO GENERAL (Circulares, Reglamentos, Resoluciones) -->
      @if (nivelActivo() === 'general') {
        <section class="archivo-section fade-in">
          <div class="section-banner general-banner">
            <div class="banner-content">
              <h2>Archivo General & Normativo</h2>
              <p>Documentación oficial de aplicación general, circulares, directrices y reglamentos aprobados.</p>
            </div>
            <div class="banner-filter">
              <mat-form-field appearance="outline" class="search-field dark-field">
                <mat-label>Filtrar por CITE o Asunto</mat-label>
                <input matInput [formControl]="filtroGeneralCtrl" placeholder="Ej: CIR-2026, Reglamento...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
            </div>
          </div>

          <!-- Tipos Rápidos -->
          <div class="quick-types">
            <button 
              class="type-chip" 
              [class.chip-active]="tipoSeleccionado() === 'TODOS'"
              (click)="filtrarPorTipo('TODOS')"
            >
              Todos los Tipos
            </button>
            <button 
              class="type-chip" 
              [class.chip-active]="tipoSeleccionado() === 'CIRCULAR'"
              (click)="filtrarPorTipo('CIRCULAR')"
            >
              Circulares
            </button>
            <button 
              class="type-chip" 
              [class.chip-active]="tipoSeleccionado() === 'RESOLUCION'"
              (click)="filtrarPorTipo('RESOLUCION')"
            >
              Resoluciones
            </button>
            <button 
              class="type-chip" 
              [class.chip-active]="tipoSeleccionado() === 'INFORME'"
              (click)="filtrarPorTipo('INFORME')"
            >
              Informes
            </button>
            <button 
              class="type-chip" 
              [class.chip-active]="tipoSeleccionado() === 'CONVENIO'"
              (click)="filtrarPorTipo('CONVENIO')"
            >
              Convenios
            </button>
          </div>

          <!-- Tabla de Resultados -->
          <div class="table-card">
            @if (cargando()) {
              <div class="loading-state">
                <mat-spinner diameter="44"></mat-spinner>
                <p>Cargando fondo documental general...</p>
              </div>
            } @else if (documentosFiltrados().length === 0) {
              <div class="empty-state">
                <mat-icon>folder_open</mat-icon>
                <h3>No se encontraron documentos custodiados</h3>
                <p>No existen registros que coincidan con los criterios seleccionados.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="documentosFiltrados()" class="modern-table">
                <!-- CITE -->
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE Oficial</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="cite-cell">
                      <mat-icon class="cite-icon">description</mat-icon>
                      <span class="cite-text">{{ d.nombre || 'Sin CITE' }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Tipo -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo / Plantilla</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="tipo-badge">{{ d.nombre_plantilla || 'Oficial' }}</span>
                  </td>
                </ng-container>

                <!-- Referencia -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Referencia / Asunto</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="ref-cell" [matTooltip]="obtenerReferencia(d)">
                      {{ obtenerReferencia(d) }}
                    </div>
                  </td>
                </ng-container>

                <!-- Emisor -->
                <ng-container matColumnDef="emisor">
                  <th mat-header-cell *matHeaderCellDef>Autor / Emisor</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="author-cell">
                      <span class="author-name">{{ d.usuario_creacion?.nombres }} {{ d.usuario_creacion?.apellidos }}</span>
                      <span class="author-unit">{{ d.usuario_creacion?.unidad?.nombre || 'Institución' }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha Registro</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="date-text">{{ formatearFecha(d._fecha_creacion || d.fecha) }}</span>
                  </td>
                </ng-container>

                <!-- Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-buttons">
                      <button 
                        mat-icon-button 
                        class="btn-action preview-btn" 
                        (click)="verExpediente(d)"
                        matTooltip="Ver Expediente / Trazabilidad"
                      >
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button 
                        mat-icon-button 
                        class="btn-action pdf-btn" 
                        (click)="descargarPdf(d)"
                        matTooltip="Descargar Copia Digital"
                      >
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnasGenerales"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasGenerales;" class="table-row"></tr>
              </table>
            }
          </div>
        </section>
      }

      <!-- VISTA 2: ARCHIVO DE UNIDAD (Área Operativa del Usuario) -->
      @if (nivelActivo() === 'unidad') {
        <section class="archivo-section fade-in">
          <div class="section-banner unidad-banner">
            <div class="banner-content">
              <h2>Archivo de Unidad: {{ nombreUnidadUsuario() }}</h2>
              <p>Acervo documental producido y recibido en esta jefatura o departamento.</p>
            </div>
            <div class="unit-stat-boxes">
              <div class="u-stat">
                <span class="u-val">{{ totalUnidadDocs() }}</span>
                <span class="u-lbl">Custodiados</span>
              </div>
              <div class="u-stat">
                <span class="u-val">{{ totalFirmados() }}</span>
                <span class="u-lbl">Concluidos / Cerrados</span>
              </div>
            </div>
          </div>

          <div class="filter-toolbar">
            <mat-form-field appearance="outline" class="search-field-compact">
              <mat-label>Buscar en la Unidad</mat-label>
              <input matInput [formControl]="filtroUnidadCtrl" placeholder="CITE, funcionario o asunto...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="select-field">
              <mat-label>Agrupar por</mat-label>
              <mat-select [formControl]="agrupadorUnidadCtrl">
                <mat-option value="todos">Todos los Documentos</mat-option>
                <mat-option value="emitidos">Solo Emitidos por la Unidad</mat-option>
                <mat-option value="recibidos">Solo Recibidos</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="table-card">
            @if (cargando()) {
              <div class="loading-state">
                <mat-spinner diameter="44"></mat-spinner>
                <p>Cargando archivo de la unidad...</p>
              </div>
            } @else {
              <table mat-table [dataSource]="documentosUnidadFiltrados()" class="modern-table">
                <!-- CITE -->
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="cite-badge">{{ d.nombre }}</span>
                  </td>
                </ng-container>

                <!-- Tipo -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let d">
                    <span>{{ d.nombre_plantilla || 'Documento' }}</span>
                  </td>
                </ng-container>

                <!-- Referencia -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Referencia</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="ref-cell">{{ obtenerReferencia(d) }}</div>
                  </td>
                </ng-container>

                <!-- Responsable -->
                <ng-container matColumnDef="responsable">
                  <th mat-header-cell *matHeaderCellDef>Generado por</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.usuario_creacion?.nombres }} {{ d.usuario_creacion?.apellidos }}
                  </td>
                </ng-container>

                <!-- Estado -->
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="status-pill" [class.status-cerrado]="d.estado === 'CERRADO'">
                      {{ d.estado }}
                    </span>
                  </td>
                </ng-container>

                <!-- Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-buttons">
                      <button mat-icon-button class="btn-action preview-btn" (click)="verExpediente(d)">
                        <mat-icon>folder_open</mat-icon>
                      </button>
                      <button mat-icon-button class="btn-action pdf-btn" (click)="descargarPdf(d)">
                        <mat-icon>download</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnasUnidad"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasUnidad;" class="table-row"></tr>
              </table>
            }
          </div>
        </section>
      }

      <!-- VISTA 3: ARCHIVO INSTITUCIONAL (Buscador Maestro Multicriterio) -->
      @if (nivelActivo() === 'institucional') {
        <section class="archivo-section fade-in">
          <!-- Formulario Maestro Multicriterio -->
          <div class="search-master-card">
            <div class="search-master-header">
              <mat-icon>tune</mat-icon>
              <h3>Buscador Maestro Institucional</h3>
            </div>
            
            <form [formGroup]="buscadorForm" (ngSubmit)="ejecutarBusquedaMaestra()" class="search-form-grid">
              <mat-form-field appearance="outline">
                <mat-label>CITE o Código de Documento</mat-label>
                <input matInput formControlName="cite" placeholder="Ej: MIN-DES-001/2026">
                <mat-icon matSuffix>tag</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Palabra Clave / Referencia</mat-label>
                <input matInput formControlName="referencia" placeholder="Asunto o término de búsqueda">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Funcionario / Remitente</mat-label>
                <input matInput formControlName="funcionario" placeholder="Nombre o apellido">
                <mat-icon matSuffix>person</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tipo de Documento</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="">Todos los Tipos</mat-option>
                  <mat-option value="CARTA">Carta</mat-option>
                  <mat-option value="INFORME">Informe</mat-option>
                  <mat-option value="MEMORANDUM">Memorándum</mat-option>
                  <mat-option value="CIRCULAR">Circular</mat-option>
                  <mat-option value="RESOLUCION">Resolución</mat-option>
                </mat-select>
              </mat-form-field>

              <div class="form-actions-full">
                <button type="submit" mat-flat-button class="btn-search-master" [disabled]="cargando()">
                  <mat-icon>manage_search</mat-icon>
                  <span>Buscar en Todo el Acervo</span>
                </button>
                <button type="button" mat-stroked-button (click)="limpiarBusqueda()" class="btn-clear-master">
                  <mat-icon>refresh</mat-icon>
                  <span>Limpiar</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Resultados del Buscador Maestro -->
          <div class="table-card">
            <div class="results-header">
              <h3>Resultados Encontrados ({{ resultadosMaestros().length }})</h3>
            </div>

            @if (cargando()) {
              <div class="loading-state">
                <mat-spinner diameter="44"></mat-spinner>
                <p>Consultando base de datos histórica...</p>
              </div>
            } @else if (resultadosMaestros().length === 0) {
              <div class="empty-state">
                <mat-icon>search_off</mat-icon>
                <h3>No hay coincidencias</h3>
                <p>Intente con un CITE parcial o ajuste los filtros de búsqueda.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="resultadosMaestros()" class="modern-table">
                <!-- CITE -->
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="cite-text-strong">{{ d.nombre }}</span>
                  </td>
                </ng-container>

                <!-- Tipo -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="tipo-tag">{{ d.nombre_plantilla || 'Oficial' }}</span>
                  </td>
                </ng-container>

                <!-- Referencia -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Referencia</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="ref-cell">{{ obtenerReferencia(d) }}</div>
                  </td>
                </ng-container>

                <!-- Emisor -->
                <ng-container matColumnDef="emisor">
                  <th mat-header-cell *matHeaderCellDef>Autor</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.usuario_creacion?.nombres }} {{ d.usuario_creacion?.apellidos }}
                  </td>
                </ng-container>

                <!-- Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let d">
                    {{ formatearFecha(d._fecha_creacion || d.fecha) }}
                  </td>
                </ng-container>

                <!-- Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-buttons">
                      <button mat-icon-button class="btn-action preview-btn" (click)="verExpediente(d)">
                        <mat-icon>account_tree</mat-icon>
                      </button>
                      <button mat-icon-button class="btn-action pdf-btn" (click)="descargarPdf(d)">
                        <mat-icon>download</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnasMaestras"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasMaestras;" class="table-row"></tr>
              </table>
            }
          </div>
        </section>
      }

      <!-- MODAL EXPEDIENTE / TRAZABILIDAD (Overlay Flotante) -->
      @if (expedienteSeleccionado()) {
        <div class="modal-backdrop" (click)="cerrarExpediente()">
          <div class="expediente-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <mat-icon>account_tree</mat-icon>
                <div>
                  <h3>Expediente del Trámite: {{ expedienteSeleccionado()?.nombre }}</h3>
                  <p>{{ obtenerReferencia(expedienteSeleccionado()) }}</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarExpediente()" class="close-modal-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="modal-body">
              <div class="expediente-summary-grid">
                <div class="sum-card">
                  <span class="sum-lbl">Estado Legal</span>
                  <span class="sum-val status-val">{{ expedienteSeleccionado()?.estado }}</span>
                </div>
                <div class="sum-card">
                  <span class="sum-lbl">Fecha Creación</span>
                  <span class="sum-val">{{ formatearFecha(expedienteSeleccionado()?._fecha_creacion) }}</span>
                </div>
                <div class="sum-card">
                  <span class="sum-lbl">Autor / Funcionario</span>
                  <span class="sum-val">{{ expedienteSeleccionado()?.usuario_creacion?.nombres }} {{ expedienteSeleccionado()?.usuario_creacion?.apellidos }}</span>
                </div>
                <div class="sum-card">
                  <span class="sum-lbl">Unidad Responsable</span>
                  <span class="sum-val">{{ expedienteSeleccionado()?.usuario_creacion?.unidad?.nombre || 'Central' }}</span>
                </div>
              </div>

              <!-- Línea de Tiempo del Trámite -->
              <div class="timeline-container">
                <h4>Cadena de Custodia & Trazabilidad</h4>
                <div class="timeline-step">
                  <div class="step-point step-done">
                    <mat-icon>edit_note</mat-icon>
                  </div>
                  <div class="step-content">
                    <h5>Creación y Redacción Inicial</h5>
                    <p>Documento generado en el sistema de plantillas por el autor.</p>
                  </div>
                </div>
                <div class="timeline-step">
                  <div class="step-point step-done">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                  <div class="step-content">
                    <h5>Aprobación por Jefatura & Asignación de CITE</h5>
                    <p>Revisado favorablemente y asignado con numeración correlativa oficial.</p>
                  </div>
                </div>
                <div class="timeline-step">
                  <div class="step-point step-active">
                    <mat-icon>verified</mat-icon>
                  </div>
                  <div class="step-content">
                    <h5>Custodia en Fondo Documental</h5>
                    <p>Almacenado bajo firma digital y disponible para consulta institucional.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button mat-stroked-button (click)="cerrarExpediente()">Cerrar</button>
              <button mat-flat-button class="btn-download-exp" (click)="descargarPdf(expedienteSeleccionado())">
                <mat-icon>picture_as_pdf</mat-icon>
                <span>Descargar Documento Oficial</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .archivo-page-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .archivo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      padding: 24px 32px;
      border-radius: 16px;
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.4);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-icon-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 180, 219, 0.35);
    }

    .header-icon-box mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: #fff;
    }

    .header-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .header-desc {
      font-size: 14px;
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.7);
    }

    .stats-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      font-size: 13.5px;
      color: #fff;
    }

    .stats-pill mat-icon {
      color: #00b4db;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .tabs-nav-bar {
      display: flex;
      gap: 12px;
      border-bottom: 2px solid rgba(0, 0, 0, 0.06);
      padding-bottom: 8px;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.25s ease;

      &:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      &.active {
        background: #0f2027;
        color: #fff;
        border-color: #0f2027;
        box-shadow: 0 4px 12px rgba(15, 32, 39, 0.2);

        .tab-badge {
          background: rgba(0, 180, 219, 0.3);
          color: #38ef7d;
        }

        mat-icon {
          color: #00b4db;
        }
      }
    }

    .tab-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #e2e8f0;
      color: #64748b;
      font-weight: 700;
    }

    .archivo-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-banner {
      padding: 24px 30px;
      border-radius: 14px;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .general-banner {
      background: linear-gradient(135deg, #1f4037 0%, #99f2c8 100%);
      color: #0d2818;
      h2 { margin: 0; font-size: 20px; font-weight: 700; }
      p { margin: 4px 0 0; font-size: 13.5px; opacity: 0.85; }
    }

    .unidad-banner {
      background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
      h2 { margin: 0; font-size: 20px; font-weight: 700; color: #fff; }
      p { margin: 4px 0 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.7); }
    }

    .unit-stat-boxes {
      display: flex;
      gap: 16px;
    }

    .u-stat {
      background: rgba(255, 255, 255, 0.1);
      padding: 10px 18px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .u-val {
      font-size: 20px;
      font-weight: 800;
      color: #00b4db;
    }

    .u-lbl {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
    }

    .quick-types {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .type-chip {
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #00b4db;
        color: #00b4db;
      }

      &.chip-active {
        background: #00b4db;
        color: #fff;
        border-color: #00b4db;
      }
    }

    .filter-toolbar {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .table-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;

      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 700;
        font-size: 12.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px;
      }

      td {
        padding: 14px 16px;
        font-size: 13.5px;
        color: #1e293b;
        border-bottom: 1px solid #f1f5f9;
      }
    }

    .table-row:hover {
      background: #f8fafc;
    }

    .cite-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #0f172a;
    }

    .cite-icon {
      color: #00b4db;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .cite-badge {
      padding: 4px 10px;
      border-radius: 6px;
      background: #f0fdf4;
      color: #166534;
      font-weight: 700;
      font-size: 12.5px;
    }

    .cite-text-strong {
      font-weight: 700;
      color: #0f2027;
    }

    .tipo-badge {
      padding: 3px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
    }

    .ref-cell {
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #334155;
    }

    .author-cell {
      display: flex;
      flex-direction: column;
    }

    .author-name {
      font-weight: 600;
      color: #0f172a;
    }

    .author-unit {
      font-size: 11.5px;
      color: #64748b;
    }

    .status-pill {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      background: #e2e8f0;
      color: #475569;
      font-weight: 700;

      &.status-cerrado {
        background: #dcfce7;
        color: #15803d;
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-action {
      &.preview-btn { color: #0284c7; }
      &.pdf-btn { color: #dc2626; }
    }

    /* Buscador Maestro */
    .search-master-card {
      background: #fff;
      border-radius: 14px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }

    .search-master-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: #0f2027;
      h3 { margin: 0; font-size: 17px; font-weight: 700; }
      mat-icon { color: #00b4db; }
    }

    .search-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .form-actions-full {
      grid-column: 1 / -1;
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-search-master {
      background: #0f2027 !important;
      color: #fff !important;
      padding: 0 24px !important;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-clear-master {
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .results-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      h3 { margin: 0; font-size: 15px; font-weight: 700; color: #334155; }
    }

    /* Modal Expediente */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .expediente-modal {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 720px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .modal-header {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 100%);
      color: #fff;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 14px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #00b4db; }
      h3 { margin: 0; font-size: 18px; font-weight: 700; }
      p { margin: 2px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.7); }
    }

    .close-modal-btn {
      color: rgba(255, 255, 255, 0.7);
      &:hover { color: #fff; }
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .expediente-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .sum-card {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .sum-val {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      h4 { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #1e293b; }
    }

    .timeline-step {
      display: flex;
      gap: 14px;
      position: relative;
    }

    .step-point {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }

      &.step-done {
        background: #dcfce7;
        mat-icon { color: #16a34a; }
      }

      &.step-active {
        background: #e0f2fe;
        mat-icon { color: #0284c7; }
      }
    }

    .step-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      h5 { margin: 0; font-size: 14px; font-weight: 600; color: #0f172a; }
      p { margin: 0; font-size: 12.5px; color: #64748b; }
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-download-exp {
      background: #dc2626 !important;
      color: #fff !important;
    }

    .loading-state, .empty-state {
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #64748b;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #cbd5e1; }
      h3 { margin: 0; font-size: 16px; color: #334155; }
      p { margin: 0; font-size: 13.5px; }
    }

    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ArchivoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly nivelActivo = signal<'general' | 'unidad' | 'institucional'>('general');
  readonly cargando = signal<boolean>(false);
  readonly todosDocumentos = signal<any[]>([]);
  readonly tipoSeleccionado = signal<string>('TODOS');
  readonly expedienteSeleccionado = signal<any | null>(null);

  readonly filtroGeneralCtrl = new FormControl('');
  readonly filtroUnidadCtrl = new FormControl('');
  readonly agrupadorUnidadCtrl = new FormControl('todos');

  readonly buscadorForm = new FormGroup({
    cite: new FormControl(''),
    referencia: new FormControl(''),
    funcionario: new FormControl(''),
    tipo: new FormControl('')
  });

  readonly resultadosMaestros = signal<any[]>([]);

  readonly columnasGenerales = ['cite', 'tipo', 'ref', 'emisor', 'fecha', 'acciones'];
  readonly columnasUnidad = ['cite', 'tipo', 'ref', 'responsable', 'estado', 'acciones'];
  readonly columnasMaestras = ['cite', 'tipo', 'ref', 'emisor', 'fecha', 'acciones'];

  readonly totalDocs = computed(() => this.todosDocumentos().length);
  readonly totalUnidadDocs = computed(() => this.documentosUnidadFiltrados().length);
  readonly totalFirmados = computed(() => 
    this.todosDocumentos().filter(d => d.estado === 'CERRADO').length
  );

  readonly nombreUnidadUsuario = computed(() => {
    const u = this.authService.currentUser() as any;
    return u?.unidad || 'Dirección / Jefatura Asignada';
  });

  readonly documentosFiltrados = computed(() => {
    const list = this.todosDocumentos();
    const filtro = (this.filtroGeneralCtrl.value || '').toLowerCase();
    const tipo = this.tipoSeleccionado();

    return list.filter(d => {
      const matchTexto = !filtro || 
        (d.nombre && d.nombre.toLowerCase().includes(filtro)) ||
        (d.ref && d.ref.toLowerCase().includes(filtro));
      
      const matchTipo = tipo === 'TODOS' || 
        (d.nombre_plantilla && d.nombre_plantilla.toUpperCase().includes(tipo)) ||
        (d.nombre && d.nombre.toUpperCase().includes(tipo));

      return matchTexto && matchTipo;
    });
  });

  readonly documentosUnidadFiltrados = computed(() => {
    const list = this.todosDocumentos();
    const filtro = (this.filtroUnidadCtrl.value || '').toLowerCase();
    const u = this.authService.currentUser();

    return list.filter(d => {
      const matchTexto = !filtro || 
        (d.nombre && d.nombre.toLowerCase().includes(filtro)) ||
        (d.ref && d.ref.toLowerCase().includes(filtro));

      return matchTexto;
    });
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'unidad' || tipo === 'institucional' || tipo === 'general') {
        this.nivelActivo.set(tipo);
      }
    });

    this.cargarDocumentosArchivo();
  }

  cambiarNivel(nivel: 'general' | 'unidad' | 'institucional'): void {
    this.nivelActivo.set(nivel);
  }

  cargarDocumentosArchivo(): void {
    this.cargando.set(true);
    const userId = this.authService.currentUser()?.id || 1;
    
    // Consulta documentos custodiados con CITE
    this.http.get<any>(`/api/v1/plantillasFormly/documento/${userId}/archivo`).subscribe({
      next: (res) => {
        this.cargando.set(false);
        const docs = res.datos?.resultado || [];
        this.todosDocumentos.set(docs);
        this.resultadosMaestros.set(docs);
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar el repositorio de archivo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  filtrarPorTipo(tipo: string): void {
    this.tipoSeleccionado.set(tipo);
  }

  ejecutarBusquedaMaestra(): void {
    const vals = this.buscadorForm.value;
    const cite = (vals.cite || '').toLowerCase();
    const ref = (vals.referencia || '').toLowerCase();
    const func = (vals.funcionario || '').toLowerCase();
    const tipo = (vals.tipo || '').toUpperCase();

    const filtrados = this.todosDocumentos().filter(d => {
      const matchCite = !cite || (d.nombre && d.nombre.toLowerCase().includes(cite));
      const matchRef = !ref || (d.ref && d.ref.toLowerCase().includes(ref));
      const matchFunc = !func || (
        (d.usuario_creacion?.nombres && d.usuario_creacion.nombres.toLowerCase().includes(func)) ||
        (d.usuario_creacion?.apellidos && d.usuario_creacion.apellidos.toLowerCase().includes(func))
      );
      const matchTipo = !tipo || (d.nombre_plantilla && d.nombre_plantilla.toUpperCase().includes(tipo));

      return matchCite && matchRef && matchFunc && matchTipo;
    });

    this.resultadosMaestros.set(filtrados);
  }

  limpiarBusqueda(): void {
    this.buscadorForm.reset();
    this.resultadosMaestros.set(this.todosDocumentos());
  }

  verExpediente(doc: any): void {
    this.expedienteSeleccionado.set(doc);
  }

  cerrarExpediente(): void {
    this.expedienteSeleccionado.set(null);
  }

  descargarPdf(doc: any): void {
    if (!doc || !doc.id_documento) return;
    window.open(`/api/v1/documento/${doc.id_documento}/pdf`, '_blank');
  }

  obtenerReferencia(d: any): string {
    if (!d) return 'Sin Asunto';
    if (d.ref) return d.ref;
    if (d.plantilla_valor) {
      try {
        const val = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        return val.ref || val.asunto || val.titulo || 'Documento Oficial Custodiado';
      } catch {
        return 'Documento Oficial Custodiado';
      }
    }
    return 'Documento Oficial Custodiado';
  }

  formatearFecha(f?: string): string {
    if (!f) return '-';
    try {
      const d = new Date(f);
      return d.toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return f;
    }
  }
}
