import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../core/auth/auth.service';

export interface VersionArchivo {
  version: number;
  nombre_archivo: string;
  ruta: string;
  fecha: string;
  usuario: string;
  observacion: string;
}

export interface DocumentoArchivo {
  id_documento: number;
  nombre: string;
  nombre_plantilla: string;
  categoria_institucional?: string;
  referencia?: string;
  estado: string;
  es_institucional?: boolean;
  versiones?: VersionArchivo[];
  _fecha_creacion?: string;
  fecha?: string;
  usuario_creacion?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    cargo?: string;
    fid_unidad?: number;
    unidad?: {
      id_unidad: number;
      nombre: string;
      abreviacion: string;
    };
  };
  plantilla_valor?: string;
}

export interface UnidadArchivo {
  id_unidad: number;
  nombre: string;
  abreviacion: string;
  fid_unidad_padre?: number;
  total_documentos: number;
  documentos: DocumentoArchivo[];
  agrupado_por_tipo: Record<string, DocumentoArchivo[]>;
  sub_unidades?: UnidadArchivo[];
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
    MatDialogModule,
    MatExpansionModule
  ],
  template: `
    <div class="archivo-container">
      <!-- Topbar del Módulo -->
      <header class="archivo-topbar">
        <div class="topbar-left">
          <div class="topbar-icon">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <div>
            <h1 class="topbar-title">Fondo Documental & Archivo Central</h1>
            <p class="topbar-sub">Custodia digital clasificada, trazabilidad histórica y versionado institucional</p>
          </div>
        </div>

        <div class="topbar-right">
          @if (nivelActivo() === 'institucional' && esAdminOMae()) {
            <button mat-flat-button class="btn-cargar-institucional" (click)="abrirModalCarga()">
              <mat-icon>upload_file</mat-icon>
              <span>Cargar Documento Institucional</span>
            </button>
          }
        </div>
      </header>

      <!-- Selector de Nivel de Archivo -->
      <nav class="nivel-tabs-bar">
        <button 
          class="nivel-btn" 
          [class.active]="nivelActivo() === 'general'" 
          (click)="cambiarNivel('general')"
        >
          <mat-icon>public</mat-icon>
          <span>Archivo General</span>
          <span class="badge-count">{{ totalDocsGeneral() }}</span>
        </button>

        <button 
          class="nivel-btn" 
          [class.active]="nivelActivo() === 'unidad'" 
          (click)="cambiarNivel('unidad')"
        >
          <mat-icon>domain</mat-icon>
          <span>Archivo de Unidad</span>
          <span class="badge-count">{{ totalDocsUnidad() }}</span>
        </button>

        <button 
          class="nivel-btn" 
          [class.active]="nivelActivo() === 'institucional'" 
          (click)="cambiarNivel('institucional')"
        >
          <mat-icon>verified</mat-icon>
          <span>Archivo Institucional</span>
          <span class="badge-count badge-gold">{{ docsInstitucionales().length }}</span>
        </button>
      </nav>

      <!-- Layout Split Screen: Visor a la Izquierda, Catálogo a la Derecha -->
      <div class="archivo-split-layout">
        <!-- MITAD IZQUIERDA: VISOR EMBEBIDO -->
        <aside class="visor-embebido-panel" [class.tiene-doc]="docSeleccionado() !== null">
          <div class="visor-card">
            @if (docSeleccionado()) {
              <div class="visor-header">
                <div class="visor-doc-info">
                  <span class="visor-badge-cite">{{ docSeleccionado()?.nombre }}</span>
                  <span class="visor-doc-titulo">{{ docSeleccionado()?.nombre_plantilla || 'Documento Oficial Custodiado' }}</span>
                </div>
                <div class="visor-actions">
                  <button mat-icon-button class="btn-visor-act" (click)="descargarArchivoFisico(docSeleccionado())" matTooltip="Descargar Copia PDF">
                    <mat-icon>download</mat-icon>
                  </button>
                  <button mat-icon-button class="btn-visor-act close" (click)="cerrarVisor()" matTooltip="Cerrar Previsualización">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
              <div class="visor-iframe-wrapper">
                <iframe [src]="urlPdfSegura()" class="pdf-local-iframe" title="Visor Documental Embebido"></iframe>
              </div>
            } @else {
              <div class="visor-empty-state">
                <div class="empty-icon-circle">
                  <mat-icon>picture_as_pdf</mat-icon>
                </div>
                <h3 class="empty-title">Visor Documental Embebido</h3>
                <p class="empty-text">Haga clic en el icono PDF o en cualquier fila del listado para previsualizar el documento de inmediato sin abandonar el sistema.</p>
                <div class="empty-hint-pill">
                  <mat-icon>touch_app</mat-icon>
                  <span>Seleccione un documento del catálogo</span>
                </div>
              </div>
            }
          </div>
        </aside>

        <!-- MITAD DERECHA: CATÁLOGO Y FILTROS -->
        <main class="catalogo-panel">
          <!-- VISTA 1: ARCHIVO GENERAL (Agrupado por Unidades y Tipos Dinámicos) -->
          @if (nivelActivo() === 'general') {
        <section class="section-container fade-in">
          <!-- Filtros Dinámicos de Tipos (Solo los existentes en documentos reales) -->
          @if (tiposDisponiblesGeneral().length > 0) {
            <div class="dynamic-types-bar">
              <span class="filter-caption">Tipos de Documento:</span>
              <button 
                class="type-pill" 
                [class.active]="tipoFiltroGeneral() === 'TODOS'"
                (click)="filtrarTipoGeneral('TODOS')"
              >
                Todos los Tipos ({{ totalDocsGeneral() }})
              </button>
              @for (tipo of tiposDisponiblesGeneral(); track tipo) {
                <button 
                  class="type-pill" 
                  [class.active]="tipoFiltroGeneral() === tipo"
                  (click)="filtrarTipoGeneral(tipo)"
                >
                  {{ tipo }} ({{ contarDocsPorTipo(tipo) }})
                </button>
              }
            </div>
          }

          <!-- Buscador Rápido -->
          <div class="search-box-bar">
            <mat-form-field appearance="outline" class="search-input">
              <mat-label>Buscar por CITE, asunto o funcionario emisor...</mat-label>
              <input matInput [formControl]="filtroGeneralCtrl" placeholder="Ej. NOTA-001/2026, Informe...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>

          <!-- Documentos Globales Iniciales -->
          <div class="content-card">
            <div class="card-top-title">
              <mat-icon>description</mat-icon>
              <h3>Documentos Custodiados Globalmente ({{ docsGeneralesFiltrados().length }})</h3>
            </div>

            @if (cargando()) {
              <div class="state-loading">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Consultando archivo general y fondo de unidades...</p>
              </div>
            } @else if (docsGeneralesFiltrados().length === 0) {
              <div class="state-empty">
                <mat-icon>folder_open</mat-icon>
                <p>No se encontraron documentos cerrados para este criterio.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="docsGeneralesFiltrados()" class="archivo-table">
                <!-- CITE -->
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE Oficial</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="cite-text">{{ d.nombre }}</span>
                  </td>
                </ng-container>

                <!-- Tipo Dinámico -->
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="tipo-tag">{{ d.nombre_plantilla || 'Documento Oficial' }}</span>
                  </td>
                </ng-container>

                <!-- Asunto -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Referencia / Asunto</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="ref-text" [matTooltip]="obtenerReferencia(d)">{{ obtenerReferencia(d) }}</span>
                  </td>
                </ng-container>

                <!-- Unidad Emisora -->
                <ng-container matColumnDef="unidad">
                  <th mat-header-cell *matHeaderCellDef>Unidad Emisora</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="unit-tag">{{ d.usuario_creacion?.unidad?.nombre || 'Unidad Central' }}</span>
                  </td>
                </ng-container>

                <!-- Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="date-text">{{ formatearFecha(d._fecha_creacion || d.fecha) }}</span>
                  </td>
                </ng-container>

                <!-- Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-btn-row">
                      <button mat-icon-button (click)="verDetalle(d)" matTooltip="Ver Trazabilidad y Versiones" class="btn-action">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button (click)="descargarPdf(d)" matTooltip="Descargar Copia Digital" class="btn-action pdf">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                      @if (puedePromover() && !d.es_institucional) {
                        <button 
                          mat-icon-button 
                          (click)="promoverAInstitucional(d)" 
                          matTooltip="Promover a Archivo Institucional"
                          class="btn-action promote"
                        >
                          <mat-icon>verified</mat-icon>
                        </button>
                      }
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnasGenerales"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasGenerales;" class="data-row clickable-row" [class.selected-row]="docSeleccionado()?.id_documento === row.id_documento" (click)="seleccionarDocumento(row)"></tr>
              </table>
            }
          </div>

          <!-- Estructura Dinámica por Unidades Institucionales -->
          <div class="unidades-hierarchy-card">
            <div class="card-top-title">
              <mat-icon>corporate_fare</mat-icon>
              <h3>Unidades y Direcciones de la Institución ({{ unidadesGeneral().length }})</h3>
            </div>
            <p class="section-desc">Estructura dinámica de unidades creadas. Se reflejan en tiempo real aunque no contengan archivos:</p>

            <mat-accordion multi class="unidades-accordion">
              @for (u of unidadesGeneral(); track u.id_unidad) {
                <mat-expansion-panel class="unidad-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title class="panel-title-custom">
                      <mat-icon class="unit-icon">account_balance</mat-icon>
                      <span class="u-name">{{ u.nombre }} ({{ u.abreviacion }})</span>
                    </mat-panel-title>
                    <mat-panel-description class="panel-desc-custom">
                      <span class="u-count-badge" [class.has-docs]="u.total_documentos > 0">
                        {{ u.total_documentos }} archivo(s)
                      </span>
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="unidad-expanded-content">
                    @if (u.total_documentos === 0) {
                      <div class="unit-empty-state">
                        <mat-icon>info</mat-icon>
                        <span>Esta unidad está registrada y activa en el sistema pero aún no ha producido documentos cerrados.</span>
                      </div>
                    } @else {
                      <div class="tipos-unidad-grid">
                        @for (tipoKey of obtenerClaves(u.agrupado_por_tipo); track tipoKey) {
                          <div class="tipo-sub-card">
                            <div class="tipo-header">
                              <mat-icon>folder</mat-icon>
                              <strong>{{ tipoKey }} ({{ u.agrupado_por_tipo[tipoKey].length }})</strong>
                            </div>
                            <div class="docs-mini-list">
                              @for (doc of u.agrupado_por_tipo[tipoKey]; track doc.id_documento) {
                                <div class="doc-mini-row">
                                  <div class="doc-mini-info">
                                    <strong class="mini-cite">{{ doc.nombre }}</strong>
                                    <span class="mini-ref">{{ obtenerReferencia(doc) }}</span>
                                  </div>
                                  <div class="mini-actions">
                                    <button mat-icon-button (click)="verDetalle(doc)" class="btn-action-mini">
                                      <mat-icon>visibility</mat-icon>
                                    </button>
                                    <button mat-icon-button (click)="descargarPdf(doc)" class="btn-action-mini pdf">
                                      <mat-icon>picture_as_pdf</mat-icon>
                                    </button>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          </div>
        </section>
      }

      <!-- VISTA 2: ARCHIVO DE UNIDAD (Unidad del Usuario y Sub-unidades Dependientes) -->
      @if (nivelActivo() === 'unidad') {
        <section class="section-container fade-in">
          <div class="banner-unidad-actual">
            <div class="banner-unidad-info">
              <span class="badge-area">Área Asignada</span>
              <h2>{{ dataUnidadActual()?.unidad?.nombre || 'Mi Unidad Operativa' }}</h2>
              <p>Acervo documental producido por funcionarios de esta unidad y sub-unidades jerárquicas dependientes.</p>
            </div>
            <div class="banner-unidad-stat">
              <span class="stat-number">{{ dataUnidadActual()?.total_documentos || 0 }}</span>
              <span class="stat-label">Documentos Concluidos</span>
            </div>
          </div>

          <!-- Tipos Dinámicos de la Unidad -->
          @if (dataUnidadActual()?.tipos_disponibles && dataUnidadActual()!.tipos_disponibles.length > 0) {
            <div class="dynamic-types-bar">
              <span class="filter-caption">Tipos producidos en la unidad:</span>
              <button 
                class="type-pill" 
                [class.active]="tipoFiltroUnidad() === 'TODOS'"
                (click)="tipoFiltroUnidad.set('TODOS')"
              >
                Todos los Tipos
              </button>
              @for (t of dataUnidadActual()!.tipos_disponibles; track t) {
                <button 
                  class="type-pill" 
                  [class.active]="tipoFiltroUnidad() === t"
                  (click)="tipoFiltroUnidad.set(t)"
                >
                  {{ t }}
                </button>
              }
            </div>
          }

          <!-- Documentos Propios de la Unidad Principal -->
          <div class="content-card">
            <div class="card-top-title">
              <mat-icon>folder_special</mat-icon>
              <h3>Documentos Propios de la Unidad</h3>
            </div>

            @if (docsUnidadFiltrados().length === 0) {
              <div class="state-empty">
                <mat-icon>description</mat-icon>
                <p>No hay documentos cerrados en esta unidad bajo el tipo seleccionado.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="docsUnidadFiltrados()" class="archivo-table">
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="cite-text">{{ d.nombre }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="tipo-tag">{{ d.nombre_plantilla }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Referencia</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="ref-text" [matTooltip]="obtenerReferencia(d)">{{ obtenerReferencia(d) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="autor">
                  <th mat-header-cell *matHeaderCellDef>Generado por</th>
                  <td mat-cell *matCellDef="let d">
                    {{ d.usuario_creacion?.nombres }} {{ d.usuario_creacion?.apellidos }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-btn-row">
                      <button mat-icon-button (click)="verDetalle(d)" matTooltip="Ver Trazabilidad" class="btn-action">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button (click)="descargarPdf(d)" matTooltip="Descargar Copia Digital" class="btn-action pdf">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                      @if (puedePromover() && !d.es_institucional) {
                        <button 
                          mat-icon-button 
                          (click)="promoverAInstitucional(d)" 
                          matTooltip="Promover a Archivo Institucional"
                          class="btn-action promote"
                        >
                          <mat-icon>verified</mat-icon>
                        </button>
                      }
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['cite', 'tipo', 'ref', 'autor', 'acciones']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['cite', 'tipo', 'ref', 'autor', 'acciones'];" class="data-row clickable-row" [class.selected-row]="docSeleccionado()?.id_documento === row.id_documento" (click)="seleccionarDocumento(row)"></tr>
              </table>
            }
          </div>

          <!-- Sub-Unidades Jerárquicas Dependientes -->
          @if (dataUnidadActual()?.sub_unidades && dataUnidadActual()!.sub_unidades!.length > 0) {
            <div class="sub-unidades-box">
              <div class="card-top-title">
                <mat-icon>alt_route</mat-icon>
                <h3>Sub-Unidades Jerárquicas Dependientes ({{ dataUnidadActual()!.sub_unidades!.length }})</h3>
              </div>

              @for (sub of dataUnidadActual()!.sub_unidades!; track sub.id_unidad) {
                <div class="sub-unidad-card">
                  <div class="sub-header">
                    <mat-icon>domain_add</mat-icon>
                    <strong>{{ sub.nombre }} ({{ sub.abreviacion }})</strong>
                    <span class="sub-badge">{{ sub.total_documentos }} doc(s)</span>
                  </div>

                  @if (sub.total_documentos === 0) {
                    <p class="sub-empty">Sub-unidad operativa sin documentos cerrados actualmente.</p>
                  } @else {
                    <div class="sub-docs-grid">
                      @for (tKey of obtenerClaves(sub.agrupado_por_tipo); track tKey) {
                        <div class="sub-tipo-item">
                          <h5>{{ tKey }} ({{ sub.agrupado_por_tipo[tKey].length }})</h5>
                          @for (sDoc of sub.agrupado_por_tipo[tKey]; track sDoc.id_documento) {
                            <div class="sub-doc-row">
                              <span>{{ sDoc.nombre }} - {{ obtenerReferencia(sDoc) }}</span>
                              <button mat-icon-button (click)="descargarPdf(sDoc)" class="btn-action-mini pdf">
                                <mat-icon>download</mat-icon>
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- VISTA 3: ARCHIVO INSTITUCIONAL (Exclusivamente Documentos Institucionales) -->
      @if (nivelActivo() === 'institucional') {
        <section class="section-container fade-in">
          <div class="banner-institucional">
            <div class="banner-inst-content">
              <span class="badge-gold-header">Fondo de Custodia Mayor</span>
              <h2>Archivo Institucional Oficial</h2>
              <p>Documentos de alcance corporativo promovidos por Jefaturas/MAE o cargados por Administración.</p>
            </div>
            @if (esAdminOMae()) {
              <button mat-flat-button class="btn-upload-inst" (click)="abrirModalCarga()">
                <mat-icon>cloud_upload</mat-icon>
                <span>Cargar Documento Oficial</span>
              </button>
            }
          </div>

          <div class="content-card">
            <div class="card-top-title">
              <mat-icon>verified</mat-icon>
              <h3>Documentos Oficiales Institucionales ({{ docsInstitucionales().length }})</h3>
            </div>

            @if (cargando()) {
              <div class="state-loading">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Cargando fondo documental institucional...</p>
              </div>
            } @else if (docsInstitucionales().length === 0) {
              <div class="state-empty">
                <mat-icon>verified_user</mat-icon>
                <p>Aún no se han promovido ni cargado documentos institucionales oficiales.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="docsInstitucionales()" class="archivo-table">
                <!-- CITE con Copiado Rápido -->
                <ng-container matColumnDef="cite">
                  <th mat-header-cell *matHeaderCellDef>CITE Oficial</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="cite-cell">
                      <span class="cite-badge-mono">{{ d.nombre }}</span>
                      <button mat-icon-button class="btn-copy-mini" (click)="copiarCite(d.nombre); $event.stopPropagation()" matTooltip="Copiar CITE para referenciar en trámites">
                        <mat-icon>content_copy</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <!-- Documento / Sigla -->
                <ng-container matColumnDef="documento">
                  <th mat-header-cell *matHeaderCellDef>Documento Institucional</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="doc-title-box">
                      <strong class="doc-main-name">{{ d.nombre_plantilla || obtenerTituloDoc(d) }}</strong>
                      @if (d.abreviacion) {
                        <span class="sigla-tag">{{ d.abreviacion }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Referencia / Descripción -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Descripción / Objeto</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="ref-text" [matTooltip]="obtenerDescripcionDoc(d)">
                      {{ obtenerDescripcionDoc(d) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Categoría -->
                <ng-container matColumnDef="categoria">
                  <th mat-header-cell *matHeaderCellDef>Categoría</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="cat-pill">{{ d.categoria_institucional || 'Normativa y Políticas' }}</span>
                  </td>
                </ng-container>

                <!-- Versión Actual -->
                <ng-container matColumnDef="version">
                  <th mat-header-cell *matHeaderCellDef>Versión Actual</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="version-badge" (click)="verVersiones(d)" matTooltip="Ver trazabilidad completa de versiones">
                      v{{ obtenerVersionActual(d) }}
                      <mat-icon class="icon-v">history</mat-icon>
                    </span>
                  </td>
                </ng-container>

                <!-- Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha Custodia</th>
                  <td mat-cell *matCellDef="let d">
                    <span class="date-text">{{ formatearFecha(d._fecha_creacion || d.fecha) }}</span>
                  </td>
                </ng-container>

                <!-- Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="action-btn-row">
                      <button mat-icon-button (click)="descargarPdf(d)" matTooltip="Descargar Copia Digital (PDF)" class="btn-action pdf">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </button>
                      <button mat-icon-button (click)="verVersiones(d)" matTooltip="Historial de Versiones y Trazabilidad" class="btn-action">
                        <mat-icon>history</mat-icon>
                      </button>
                      @if (puedeVersionar()) {
                        <button mat-icon-button (click)="abrirModalVersionar(d)" matTooltip="Subir Nueva Versión (v{{ obtenerVersionActual(d) + 1 }})" class="btn-action version">
                          <mat-icon>upgrade</mat-icon>
                        </button>
                      }
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnasInstitucionales"></tr>
                <tr mat-row *matRowDef="let row; columns: columnasInstitucionales;" class="data-row clickable-row" [class.selected-row]="docSeleccionado()?.id_documento === row.id_documento" (click)="seleccionarDocumento(row)"></tr>
              </table>
            }
          </div>
        </section>
      }
        </main>
      </div>

      <!-- MODAL: CARGAR DOCUMENTO INSTITUCIONAL (ADMIN / MAE) -->
      @if (mostrarModalCarga()) {
        <div class="modal-overlay" (click)="cerrarModalCarga()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <mat-icon>upload_file</mat-icon>
                <div>
                  <h3>Cargar Documento en Archivo Institucional</h3>
                  <p>Exclusivo para Administración y Dirección Máxima Ejecutiva</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarModalCarga()" class="btn-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="cargaForm" (ngSubmit)="guardarDocumentoInstitucional()" class="modal-form">
              <!-- Sugerencias Rápidas de Documentos Habituales -->
              <div class="sugerencias-bar col-span-full">
                <span class="sug-label">Tipos Frecuentes:</span>
                <div class="sug-chips">
                  @for (s of sugerenciasInstitucionales; track s.sigla) {
                    <button type="button" class="sug-chip" (click)="seleccionarSugerencia(s)">
                      {{ s.nombre }} ({{ s.sigla }})
                    </button>
                  }
                </div>
              </div>

              <!-- Nombre del Documento -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Nombre del Documento Institucional</mat-label>
                <input matInput formControlName="nombre_documento" (input)="onNombreDocumentoChange()" placeholder="Ej. Reglamento Interno de Personal o Personalidad Jurídica" required>
                <mat-icon matPrefix>description</mat-icon>
              </mat-form-field>

              <!-- Sigla y Año -->
              <mat-form-field appearance="outline">
                <mat-label>Sigla / Código (editable)</mat-label>
                <input matInput formControlName="sigla" (input)="onSiglaChange()" placeholder="Ej. rip, PJ, eo" required>
                <mat-icon matPrefix>tag</mat-icon>
                <mat-hint>Calculada automáticamente por el sistema</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Año de Custodia</mat-label>
                <input matInput type="number" formControlName="anio" (input)="onAnioChange()" required>
                <mat-icon matPrefix>calendar_today</mat-icon>
              </mat-form-field>

              <!-- Banner de CITE Oficial Asignado en Tiempo Real -->
              <div class="cite-preview-banner col-span-full">
                <div class="cite-preview-icon">
                  <mat-icon>verified</mat-icon>
                </div>
                <div class="cite-preview-info">
                  <span class="preview-title">CITE OFICIAL GENERADO PARA REFERENCIARSE:</span>
                  <strong class="preview-cite-code">{{ citeCalculadoPreview() }}</strong>
                  <span class="preview-sub">Asignado de forma correlativa para este documento en {{ cargaForm.get('anio')?.value }}. Quedará referenciable en todo el sistema.</span>
                </div>
              </div>

              <!-- Categoría Institucional -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Categoría Institucional</mat-label>
                <mat-select formControlName="categoria">
                  <mat-option value="Reglamento Interno">Reglamento Interno / Normativa Laboral</mat-option>
                  <mat-option value="Personería Jurídica / Legal">Personería Jurídica / Reconocimiento Legal</mat-option>
                  <mat-option value="Estatuto Orgánico">Estatuto Orgánico Institucional</mat-option>
                  <mat-option value="Resolución de Directorio">Resolución de Directorio / Asamblea</mat-option>
                  <mat-option value="Convenio Interinstitucional">Convenio Interinstitucional</mat-option>
                  <mat-option value="Manual de Funciones">Manual de Organización y Funciones</mat-option>
                  <mat-option value="Normativa y Ética">Código de Ética y Conducta</mat-option>
                  <mat-option value="Planes y Programas">Plan Operativo Anual (POA) / PEI</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Descripción del Documento (Obligatoria) -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Descripción y Objeto del Documento</mat-label>
                <textarea matInput formControlName="descripcion" rows="3" placeholder="Descripción detallada del contenido, objeto institucional, resolución o alcance..." required></textarea>
                <mat-hint>Esta descripción servirá como referencia en las búsquedas y citas del sistema</mat-hint>
              </mat-form-field>

              <!-- Observación de Digitalización -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Detalle de Digitalización / Observación (Opcional)</mat-label>
                <input matInput formControlName="observacion" placeholder="Ej. Escaneo de testimonio notariado original / resguardo en archivo central">
              </mat-form-field>

              <!-- Archivo PDF -->
              <div class="file-drop-area col-span-full">
                <mat-icon>attach_file</mat-icon>
                <span>Archivo Escaneado o Copia Digital (PDF Oficial)</span>
                <input type="file" (change)="onArchivoSeleccionado($event)" accept="application/pdf" style="display: none" #fileCarga>
                <button type="button" mat-stroked-button (click)="fileCarga.click()">
                  {{ nombreArchivoCarga() || 'Seleccionar Archivo PDF' }}
                </button>
              </div>

              <div class="modal-actions col-span-full">
                <button type="button" mat-button (click)="cerrarModalCarga()">Cancelar</button>
                <button type="submit" mat-flat-button class="btn-primary-action" [disabled]="cargaForm.invalid || guardando()">
                  <mat-icon>save</mat-icon>
                  <span>{{ guardando() ? 'Guardando...' : 'Cargar y Asignar CITE Institucional' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL: VERSIONAR ARCHIVO DIGITAL (v1 -> v2...) -->
      @if (docAVersionar()) {
        <div class="modal-overlay" (click)="cerrarModalVersionar()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <mat-icon>upgrade</mat-icon>
                <div>
                  <h3>Versionar Archivo: {{ docAVersionar()?.nombre }}</h3>
                  <p>Incorporar una nueva versión digital sin eliminar las versiones previas</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarModalVersionar()" class="btn-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="versionForm" (ngSubmit)="guardarNuevaVersion()" class="modal-form">
              <div class="version-banner-info col-span-full">
                <strong>Versión a generar: v{{ obtenerVersionActual(docAVersionar()!) + 1 }}</strong>
                <span>Se preservará v{{ obtenerVersionActual(docAVersionar()!) }} en la cadena de trazabilidad.</span>
              </div>

              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Motivo o Descripción de la Nueva Versión</mat-label>
                <input matInput formControlName="observacion" placeholder="Ej. Escaneo de alta resolución con escáner institucional de mesa" required>
              </mat-form-field>

              <div class="file-drop-area col-span-full">
                <mat-icon>cloud_upload</mat-icon>
                <span>Cargar nuevo archivo PDF versionado</span>
                <input type="file" (change)="onArchivoVersionSeleccionado($event)" accept="application/pdf" style="display: none" #fileVersion>
                <button type="button" mat-stroked-button (click)="fileVersion.click()">
                  {{ nombreArchivoVersion() || 'Seleccionar Nuevo Escaneo PDF' }}
                </button>
              </div>

              <div class="modal-actions col-span-full">
                <button type="button" mat-button (click)="cerrarModalVersionar()">Cancelar</button>
                <button type="submit" mat-flat-button class="btn-primary-action" [disabled]="versionForm.invalid || guardando()">
                  <mat-icon>done_all</mat-icon>
                  <span>{{ guardando() ? 'Versionando...' : 'Guardar Versión v' + (obtenerVersionActual(docAVersionar()!) + 1) }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL: HISTORIAL DE VERSIONES Y TRAZABILIDAD -->
      @if (docVersionesVer()) {
        <div class="modal-overlay" (click)="cerrarVersiones()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <mat-icon>history</mat-icon>
                <div>
                  <h3>Historial de Versiones: {{ docVersionesVer()?.nombre }}</h3>
                  <p>{{ obtenerReferencia(docVersionesVer()) }}</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarVersiones()" class="btn-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="modal-body-versions">
              @if (!docVersionesVer()?.versiones || docVersionesVer()!.versiones!.length === 0) {
                <div class="single-version-card">
                  <div class="v-num">v1</div>
                  <div class="v-details">
                    <strong>Versión Original Concluida</strong>
                    <span>Documento cerrado y archivado en formato digital oficial.</span>
                  </div>
                  <button mat-flat-button class="btn-dl-v" (click)="descargarPdf(docVersionesVer())">
                    <mat-icon>download</mat-icon>
                    <span>Descargar</span>
                  </button>
                </div>
              } @else {
                <div class="versions-timeline">
                  @for (ver of docVersionesVer()!.versiones!; track ver.version) {
                    <div class="version-timeline-item">
                      <div class="v-circle">v{{ ver.version }}</div>
                      <div class="v-info">
                        <div class="v-title-row">
                          <strong>Versión {{ ver.version }} - {{ ver.nombre_archivo }}</strong>
                          <span class="v-date">{{ formatearFecha(ver.fecha) }}</span>
                        </div>
                        <p class="v-obs">{{ ver.observacion }}</p>
                        <span class="v-user">Registrado por: {{ ver.usuario }}</span>
                      </div>
                      <button mat-stroked-button class="btn-dl-v" (click)="descargarPdf(docVersionesVer())">
                        <mat-icon>download</mat-icon>
                        <span>Descargar</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-actions-footer">
              <button mat-button (click)="cerrarVersiones()">Cerrar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .archivo-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    /* Topbar */
    .archivo-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      padding: 24px 32px;
      border-radius: 16px;
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.4);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .topbar-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 18px rgba(0, 180, 219, 0.35);
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #fff; }
    }

    .topbar-title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.4px;
    }

    .topbar-sub {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: rgba(255, 255, 255, 0.7);
    }

    .btn-cargar-institucional {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      color: #fff !important;
      font-weight: 700;
      height: 44px;
      padding: 0 20px !important;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 10px;
    }

    /* Pestañas de Nivel */
    .nivel-tabs-bar {
      display: flex;
      gap: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }

    .nivel-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: #f8fafc;
      color: #475569;
      font-size: 14px;
      font-weight: 700;
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
        box-shadow: 0 4px 15px rgba(15, 32, 39, 0.25);
        mat-icon { color: #00b4db; }
      }
    }

    .badge-count {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.08);
      color: inherit;
      font-weight: 800;
    }

    .badge-gold {
      background: rgba(245, 158, 11, 0.3) !important;
      color: #f59e0b !important;
    }

    /* Filtros Dinámicos de Tipo */
    .dynamic-types-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      background: #fff;
      padding: 14px 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .filter-caption {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
    }

    .type-pill {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover { border-color: #0083b0; color: #0083b0; }

      &.active {
        background: #0083b0;
        border-color: #0083b0;
        color: #fff;
      }
    }

    .search-box-bar {
      .search-input { width: 100%; margin-bottom: -1.25em; }
    }

    /* Content Cards */
    .content-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
    }

    .card-top-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      color: #0f2027;
      h3 { margin: 0; font-size: 17px; font-weight: 800; }
      mat-icon { color: #00b4db; font-size: 24px; width: 24px; height: 24px; }
    }

    /* Tabla */
    .archivo-table {
      width: 100%;
      border-collapse: collapse;

      th {
        background: #f8fafc;
        color: #475569;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 14px 16px;
      }

      td {
        padding: 12px 16px;
        font-size: 13px;
        border-bottom: 1px solid #f1f5f9;
      }
    }

    .cite-text {
      font-weight: 700;
      color: #0f2027;
    }

    .tipo-tag {
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
    }

    .ref-text {
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      color: #334155;
    }

    .unit-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
    }

    .date-text { color: #64748b; font-size: 12px; }

    .action-btn-row {
      display: flex;
      gap: 4px;
    }

    .btn-action {
      color: #0284c7;
      &.pdf { color: #dc2626; }
      &.promote { color: #f59e0b; }
      &.version { color: #10b981; }
    }

    /* Acordeón de Unidades */
    .unidades-hierarchy-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 24px;
    }

    .section-desc {
      font-size: 13.5px;
      color: #64748b;
      margin: -6px 0 16px;
    }

    .unidad-panel {
      border: 1px solid #e2e8f0 !important;
      border-radius: 10px !important;
      margin-bottom: 10px !important;
      box-shadow: none !important;
    }

    .panel-title-custom {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14.5px;
      font-weight: 700;
      color: #0f2027;
      .unit-icon { color: #0083b0; }
    }

    .u-count-badge {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 600;

      &.has-docs {
        background: #dcfce7;
        color: #15803d;
        font-weight: 700;
      }
    }

    .unit-empty-state {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: #f8fafc;
      border-radius: 8px;
      color: #64748b;
      font-size: 13px;
      mat-icon { color: #94a3b8; }
    }

    .tipos-unidad-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .tipo-sub-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }

    .tipo-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      color: #0f2027;
      font-size: 13.5px;
      mat-icon { color: #0083b0; font-size: 20px; width: 20px; height: 20px; }
    }

    .docs-mini-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .doc-mini-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .doc-mini-info {
      display: flex;
      flex-direction: column;
    }

    .mini-cite { font-size: 12px; color: #0f2027; }
    .mini-ref { font-size: 11px; color: #64748b; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Banners */
    .banner-unidad-actual {
      background: linear-gradient(135deg, #141e30 0%, #243b55 100%);
      color: #fff;
      padding: 24px 30px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { margin: 6px 0 2px; font-size: 22px; font-weight: 800; }
      p { margin: 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.7); }
    }

    .badge-area {
      font-size: 11px;
      padding: 2px 8px;
      background: rgba(0, 180, 219, 0.25);
      color: #38ef7d;
      border-radius: 10px;
      font-weight: 700;
    }

    .banner-unidad-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 20px;
      border-radius: 12px;
    }

    .stat-number { font-size: 24px; font-weight: 800; color: #00b4db; }
    .stat-label { font-size: 11px; color: rgba(255, 255, 255, 0.7); }

    /* Sub-Unidades Dependientes */
    .sub-unidades-box {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sub-unidad-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      background: #f8fafc;
    }

    .sub-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      color: #0f2027;
      mat-icon { color: #0083b0; }
    }

    .sub-badge {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #e2e8f0;
      font-weight: 700;
    }

    .sub-empty { font-size: 12.5px; color: #94a3b8; margin: 0; }

    .sub-docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }

    .sub-tipo-item {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      h5 { margin: 0 0 8px; font-size: 12.5px; font-weight: 700; color: #334155; }
    }

    .sub-doc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #475569;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }

    /* Banner Institucional */
    .banner-institucional {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 100%);
      color: #fff;
      padding: 24px 30px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { margin: 6px 0 2px; font-size: 22px; font-weight: 800; }
      p { margin: 0; font-size: 13.5px; color: rgba(255, 255, 255, 0.7); }
    }

    .badge-gold-header {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.25);
      color: #fbbf24;
      font-weight: 700;
    }

    .btn-upload-inst {
      background: #fbbf24 !important;
      color: #0f2027 !important;
      font-weight: 700;
    }

    .cat-pill {
      background: #fef3c7;
      color: #92400e;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 10px;
      background: #ecfdf5;
      color: #059669;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid #a7f3d0;
      &:hover { background: #d1fae5; }
      .icon-v { font-size: 14px; width: 14px; height: 14px; }
    }

    /* CITE Cell y Copiado Rápido */
    .cite-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .cite-badge-mono {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 12.5px;
      font-weight: 700;
      color: #0f2027;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }

    .btn-copy-mini {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
      color: #64748b;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #0083b0; background: #e0f2fe; }
    }

    .doc-title-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .doc-main-name {
      font-size: 13.5px;
      color: #0f2027;
      font-weight: 700;
    }

    .sigla-tag {
      display: inline-block;
      width: fit-content;
      font-size: 11px;
      font-weight: 800;
      color: #0369a1;
      background: #e0f2fe;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* Sugerencias Rápidas */
    .sugerencias-bar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f8fafc;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .sug-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sug-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .sug-chip {
      background: #fff;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: #0f2027;
        color: #fff;
        border-color: #0f2027;
      }
    }

    /* Banner CITE Oficial Previsualizado */
    .cite-preview-banner {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 100%);
      color: #fff;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid #00b4db;
      box-shadow: 0 4px 12px rgba(0, 180, 219, 0.15);
    }

    .cite-preview-icon {
      background: rgba(0, 180, 219, 0.2);
      color: #00b4db;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    .cite-preview-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preview-title {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #00b4db;
      text-transform: uppercase;
    }

    .preview-cite-code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 17px;
      font-weight: 900;
      color: #38ef7d;
      letter-spacing: 0.5px;
    }

    .preview-sub {
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Modales */
    .modal-overlay {
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

    .modal-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 640px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    }

    .modal-header {
      background: #0f2027;
      color: #fff;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header-title {
      display: flex;
      align-items: center;
      gap: 12px;
      mat-icon { color: #00b4db; font-size: 28px; width: 28px; height: 28px; }
      h3 { margin: 0; font-size: 17px; font-weight: 700; }
      p { margin: 2px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.65); }
    }

    .btn-close { color: rgba(255, 255, 255, 0.7); &:hover { color: #fff; } }

    .modal-form {
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .col-span-full { grid-column: span 2; }

    .file-drop-area {
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      span { font-size: 13px; color: #64748b; }
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: #0083b0; }
    }

    .version-banner-info {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      strong { color: #166534; font-size: 13.5px; }
      span { color: #475569; font-size: 12px; }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-primary-action {
      background: #0f2027 !important;
      color: #fff !important;
    }

    .modal-body-versions {
      padding: 24px;
      max-height: 400px;
      overflow-y: auto;
    }

    .versions-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .version-timeline-item {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }

    .v-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #0083b0;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }

    .v-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .v-title-row {
      display: flex;
      justify-content: space-between;
      strong { font-size: 13px; color: #0f172a; }
      .v-date { font-size: 11.5px; color: #64748b; }
    }

    .v-obs { margin: 0; font-size: 12px; color: #475569; }
    .v-user { font-size: 11px; color: #94a3b8; }

    .btn-dl-v {
      color: #0284c7;
    }

    .modal-actions-footer {
      padding: 14px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }

    .state-loading, .state-empty {
      padding: 50px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: #64748b;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #cbd5e1; }
    }

    /* Split Layout para Visor Documental Embebido */
    .archivo-split-layout {
      display: grid;
      grid-template-columns: minmax(420px, 46%) 1fr;
      gap: 24px;
      align-items: start;
      margin-top: 8px;
    }

    @media (max-width: 1100px) {
      .archivo-split-layout {
        grid-template-columns: 1fr;
      }
    }

    .visor-embebido-panel {
      position: sticky;
      top: 16px;
      height: calc(100vh - 170px);
      min-height: 600px;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .visor-card {
      height: 100%;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.25s ease;
    }

    .visor-header {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #1e293b;
    }

    .visor-doc-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1;
    }

    .visor-badge-cite {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .visor-doc-titulo {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .visor-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-visor-act {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      color: #e2e8f0 !important;
      border-radius: 8px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      transition: background 0.2s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
      &:hover { background: rgba(56, 189, 248, 0.2) !important; color: #38bdf8 !important; }
      &.close:hover { background: rgba(239, 68, 68, 0.2) !important; color: #f87171 !important; }
    }

    .visor-iframe-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
      background: #334155;
      overflow: hidden;
      position: relative;
    }

    .pdf-local-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .visor-empty-state {
      height: 100%;
      padding: 40px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .empty-icon-circle {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
      mat-icon { font-size: 38px; width: 38px; height: 38px; }
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .empty-text {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      max-width: 320px;
      margin: 0 0 20px 0;
    }

    .empty-hint-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      padding: 8px 16px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #2563eb; }
    }

    .catalogo-panel {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Filas clickeables y selección */
    .clickable-row {
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.1s ease;
      &:hover {
        background-color: #f1f5f9 !important;
      }
    }

    .selected-row {
      background-color: #eff6ff !important;
      border-left: 4px solid #2563eb !important;
      td { font-weight: 500; }
    }

    .fade-in { animation: fadeIn 0.25s ease-in-out; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ArchivoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);

  // Visor Local Embebido (Split Screen)
  readonly docSeleccionado = signal<DocumentoArchivo | null>(null);
  readonly urlPdfSegura = signal<SafeResourceUrl | null>(null);

  readonly nivelActivo = signal<'general' | 'unidad' | 'institucional'>('general');
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);

  // Datos de Archivo General
  readonly unidadesGeneral = signal<UnidadArchivo[]>([]);
  readonly docsGeneral = signal<DocumentoArchivo[]>([]);
  readonly tiposDisponiblesGeneral = signal<string[]>([]);
  readonly tipoFiltroGeneral = signal<string>('TODOS');
  readonly filtroGeneralCtrl = new FormControl('');

  // Datos de Archivo de Unidad
  readonly dataUnidadActual = signal<any | null>(null);
  readonly tipoFiltroUnidad = signal<string>('TODOS');

  // Datos de Archivo Institucional
  readonly docsInstitucionales = signal<DocumentoArchivo[]>([]);

  // Modales
  readonly mostrarModalCarga = signal<boolean>(false);
  readonly docAVersionar = signal<DocumentoArchivo | null>(null);
  readonly docVersionesVer = signal<DocumentoArchivo | null>(null);
  readonly nombreArchivoCarga = signal<string | null>(null);
  readonly nombreArchivoVersion = signal<string | null>(null);

  readonly cargaForm = new FormGroup({
    nombre_documento: new FormControl('', [Validators.required]),
    sigla: new FormControl('rip', [Validators.required]),
    anio: new FormControl(new Date().getFullYear(), [Validators.required]),
    categoria: new FormControl('Reglamento Interno', [Validators.required]),
    descripcion: new FormControl('', [Validators.required]),
    observacion: new FormControl('')
  });

  readonly citeCalculadoPreview = signal<string>('marabunta/rip/1/2026');

  readonly sugerenciasInstitucionales = [
    { nombre: 'Reglamento Interno de Personal', sigla: 'rip', cat: 'Reglamento Interno', desc: 'Normativa interna de derechos, deberes y régimen laboral de la cooperativa.' },
    { nombre: 'Personalidad Jurídica', sigla: 'PJ', cat: 'Personería Jurídica / Legal', desc: 'Resolución Suprema y reconocimiento de Personalidad Jurídica de la Cooperativa.' },
    { nombre: 'Estatuto Orgánico', sigla: 'eo', cat: 'Estatuto Orgánico', desc: 'Estatuto orgánico constitutivo aprobado en asamblea general extraordinaria.' },
    { nombre: 'Manual de Organización y Funciones', sigla: 'mof', cat: 'Manual de Funciones', desc: 'Manual de organización institucional y descripción de funciones por puesto.' },
    { nombre: 'Código de Ética y Conducta', sigla: 'ce', cat: 'Normativa y Ética', desc: 'Código de ética, valores corporativos y régimen de transparencia.' },
    { nombre: 'Convenio Interinstitucional', sigla: 'ci', cat: 'Convenio Interinstitucional', desc: 'Convenio marco de cooperación interinstitucional.' }
  ];

  readonly versionForm = new FormGroup({
    observacion: new FormControl('', [Validators.required])
  });

  readonly columnasGenerales = ['cite', 'tipo', 'ref', 'unidad', 'fecha', 'acciones'];
  readonly columnasInstitucionales = ['cite', 'documento', 'ref', 'categoria', 'version', 'fecha', 'acciones'];

  readonly totalDocsGeneral = computed(() => this.docsGeneral().length);
  readonly totalDocsUnidad = computed(() => this.dataUnidadActual()?.total_documentos || 0);

  readonly docsGeneralesFiltrados = computed(() => {
    let list = this.docsGeneral();
    const tipo = this.tipoFiltroGeneral();
    const query = (this.filtroGeneralCtrl.value || '').toLowerCase().trim();

    if (tipo !== 'TODOS') {
      list = list.filter(d => (d.nombre_plantilla || '').trim() === tipo);
    }

    if (query) {
      list = list.filter(d =>
        (d.nombre && d.nombre.toLowerCase().includes(query)) ||
        (d.referencia && d.referencia.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.nombres && d.usuario_creacion.nombres.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.apellidos && d.usuario_creacion.apellidos.toLowerCase().includes(query))
      );
    }

    return list;
  });

  readonly docsUnidadFiltrados = computed(() => {
    const data = this.dataUnidadActual();
    if (!data || !data.documentos_propios) return [];

    const tipo = this.tipoFiltroUnidad();
    if (tipo === 'TODOS') return data.documentos_propios;

    return data.documentos_propios.filter((d: any) => (d.nombre_plantilla || '').trim() === tipo);
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'unidad' || tipo === 'institucional' || tipo === 'general') {
        this.nivelActivo.set(tipo);
      }
    });

    this.cargarDatos();
  }

  cambiarNivel(nivel: 'general' | 'unidad' | 'institucional'): void {
    this.nivelActivo.set(nivel);
    this.cargarDatos();
  }

  cargarDatos(): void {
    const nivel = this.nivelActivo();
    if (nivel === 'general') {
      this.cargarArchivoGeneral();
    } else if (nivel === 'unidad') {
      this.cargarArchivoUnidad();
    } else if (nivel === 'institucional') {
      this.cargarArchivoInstitucional();
    }
  }

  cargarArchivoGeneral(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/general').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.unidadesGeneral.set(res.datos.unidades || []);
          this.docsGeneral.set(res.datos.documentos || []);
          this.tiposDisponiblesGeneral.set(res.datos.tipos_disponibles || []);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar archivo general', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarArchivoUnidad(): void {
    this.cargando.set(true);
    const user = this.authService.currentUser() as any;
    const unidadId = user?.fid_unidad || 1;

    this.http.get<any>(`/api/v1/archivo/unidad/${unidadId}`).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.dataUnidadActual.set(res.datos);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar archivo de la unidad', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarArchivoInstitucional(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/institucional').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.docsInstitucionales.set(res.datos?.resultado || []);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar archivo institucional', 'Cerrar', { duration: 3000 });
      }
    });
  }

  filtrarTipoGeneral(tipo: string): void {
    this.tipoFiltroGeneral.set(tipo);
  }

  contarDocsPorTipo(tipo: string): number {
    return this.docsGeneral().filter(d => (d.nombre_plantilla || '').trim() === tipo).length;
  }

  puedePromover(): boolean {
    return this.authService.hasRole('JEFE') || 
           this.authService.hasRole('MAE') || 
           this.authService.hasRole('ADMIN') || 
           this.authService.isMae();
  }

  puedeVersionar(): boolean {
    return this.authService.hasRole('ADMIN') || 
           this.authService.hasRole('JEFE') || 
           this.authService.hasRole('MAE');
  }

  esAdminOMae(): boolean {
    return this.authService.hasRole('ADMIN') || 
           this.authService.hasRole('MAE') || 
           this.authService.isMae();
  }

  promoverAInstitucional(doc: DocumentoArchivo): void {
    if (!confirm(`¿Desea promover el documento ${doc.nombre} a Archivo Institucional Oficial? Será visible para toda la entidad.`)) {
      return;
    }

    this.http.post<any>(`/api/v1/archivo/promover/${doc.id_documento}`, {
      categoria: doc.nombre_plantilla || 'Documento Oficial Promovido'
    }).subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO') {
          this.snackBar.open(`¡Documento ${doc.nombre} promovido a Archivo Institucional!`, 'Aceptar', { duration: 4000 });
          doc.es_institucional = true;
          this.cargarArchivoInstitucional();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al promover documento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  seleccionarSugerencia(sug: any): void {
    this.cargaForm.patchValue({
      nombre_documento: sug.nombre,
      sigla: sug.sigla,
      categoria: sug.cat,
      descripcion: sug.desc
    });
    this.actualizarProximoCite();
  }

  derivarSiglaFront(nombre: string): string {
    if (!nombre) return 'DOC';
    const clean = nombre.trim();
    const lower = clean.toLowerCase();
    if (lower.includes('personalidad jur') || lower.includes('personeria jur') || lower.includes('personería jur')) return 'PJ';
    if (lower.includes('reglamento interno') && lower.includes('personal')) return 'rip';
    if (lower.includes('reglamento interno') && lower.includes('trabajo')) return 'rit';
    if (lower.includes('estatuto')) return 'eo';
    if (lower.includes('codigo de etica') || lower.includes('código de ética')) return 'ce';
    if (lower.includes('manual') && (lower.includes('funciones') || lower.includes('organizacion') || lower.includes('organización'))) return 'mof';
    if (lower.includes('plan operativo')) return 'poa';
    if (lower.includes('plan estrategico') || lower.includes('plan estratégico')) return 'pei';
    if (lower.includes('resolucion de directorio') || lower.includes('resolución de directorio')) return 'rd';
    if (lower.includes('convenio')) return 'ci';

    const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'para', 'a', 'con', 'por', 'sobre', 'al', 'o', 'e', 'un', 'una']);
    const palabras = clean
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 0 && !stopwords.has(p.toLowerCase()));
    if (palabras.length === 0) return 'DOC';
    if (palabras.length === 1) return palabras[0].substring(0, 3).toLowerCase();
    return palabras.map(p => p[0].toLowerCase()).join('');
  }

  onNombreDocumentoChange(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = this.derivarSiglaFront(nom);
    this.cargaForm.get('sigla')?.setValue(sig, { emitEvent: false });
    this.actualizarProximoCite();
  }

  onSiglaChange(): void {
    this.actualizarProximoCite();
  }

  onAnioChange(): void {
    this.actualizarProximoCite();
  }

  actualizarProximoCite(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = this.cargaForm.get('sigla')?.value || this.derivarSiglaFront(nom);
    const anio = this.cargaForm.get('anio')?.value || new Date().getFullYear();

    this.http.get<any>(`/api/v1/archivo/institucional/proximo-cite?nombre=${encodeURIComponent(nom)}&sigla=${encodeURIComponent(sig)}&anio=${anio}`)
      .subscribe({
        next: (res) => {
          if (res.tipoMensaje === 'EXITO' && res.datos?.cite) {
            this.citeCalculadoPreview.set(res.datos.cite);
          } else {
            this.citeCalculadoPreview.set(`marabunta/${sig}/1/${anio}`);
          }
        },
        error: () => {
          this.citeCalculadoPreview.set(`marabunta/${sig}/1/${anio}`);
        }
      });
  }

  copiarCite(cite: string): void {
    if (!cite) return;
    navigator.clipboard.writeText(cite).then(() => {
      this.snackBar.open(`¡CITE "${cite}" copiado al portapapeles!`, 'Aceptar', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open(`CITE: ${cite}`, 'Cerrar', { duration: 4000 });
    });
  }

  obtenerTituloDoc(d: any): string {
    if (!d) return 'Documento Oficial';
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        if (parsed.nombre_documento) return parsed.nombre_documento;
      } catch {}
    }
    return d.nombre_plantilla || d.categoria_institucional || 'Documento Oficial';
  }

  obtenerDescripcionDoc(d: any): string {
    if (!d) return 'Sin descripción registrada';
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        if (parsed.descripcion) return parsed.descripcion;
        if (parsed.ref) return parsed.ref;
      } catch {}
    }
    return d.referencia || 'Documento oficial en custodia institucional';
  }

  abrirModalCarga(): void {
    this.cargaForm.reset({
      nombre_documento: 'Reglamento Interno de Personal',
      sigla: 'rip',
      anio: new Date().getFullYear(),
      categoria: 'Reglamento Interno',
      descripcion: 'Normativa interna de derechos, deberes y régimen laboral de la cooperativa.',
      observacion: ''
    });
    this.nombreArchivoCarga.set(null);
    this.actualizarProximoCite();
    this.mostrarModalCarga.set(true);
  }

  cerrarModalCarga(): void {
    this.mostrarModalCarga.set(false);
  }

  onArchivoSeleccionado(e: any): void {
    const f = e.target.files?.[0];
    if (f) {
      this.nombreArchivoCarga.set(f.name);
    }
  }

  guardarDocumentoInstitucional(): void {
    if (this.cargaForm.invalid) return;

    this.guardando.set(true);
    const v = this.cargaForm.value;
    const user = this.authService.currentUser() as any;

    this.http.post<any>('/api/v1/archivo/institucional/cargar', {
      nombre_documento: v.nombre_documento,
      sigla: v.sigla,
      anio: v.anio,
      categoria: v.categoria,
      descripcion: v.descripcion,
      observacion: v.observacion,
      nombre_archivo: this.nombreArchivoCarga() || `${v.sigla}_v1.pdf`,
      url_archivo: `/public/documentos/${this.citeCalculadoPreview().replace(/\//g, '_')}.pdf`,
      audit_usuario: user
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.cerrarModalCarga();
        const citeAsignado = res.datos?.nombre || this.citeCalculadoPreview();
        this.snackBar.open(`¡Documento Institucional registrado con CITE: ${citeAsignado}!`, 'Aceptar', { duration: 5000 });
        this.cargarArchivoInstitucional();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al cargar documento institucional', 'Cerrar', { duration: 4000 });
      }
    });
  }

  abrirModalVersionar(doc: DocumentoArchivo): void {
    this.docAVersionar.set(doc);
    this.versionForm.reset();
    this.nombreArchivoVersion.set(null);
  }

  cerrarModalVersionar(): void {
    this.docAVersionar.set(null);
  }

  onArchivoVersionSeleccionado(e: any): void {
    const f = e.target.files?.[0];
    if (f) {
      this.nombreArchivoVersion.set(f.name);
    }
  }

  guardarNuevaVersion(): void {
    const d = this.docAVersionar();
    if (!d || this.versionForm.invalid) return;

    this.guardando.set(true);
    const obs = this.versionForm.value.observacion;
    const nextVer = this.obtenerVersionActual(d) + 1;

    this.http.post<any>(`/api/v1/archivo/versionar/${d.id_documento}`, {
      observacion: obs,
      nombre_archivo: this.nombreArchivoVersion() || `${d.nombre}_v${nextVer}.pdf`,
      url_archivo: `/api/v1/documento/${d.id_documento}/pdf?v=${nextVer}`
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.cerrarModalVersionar();
        this.snackBar.open(`¡Nueva versión v${nextVer} registrada en la trazabilidad!`, 'Aceptar', { duration: 4000 });
        this.cargarArchivoInstitucional();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al versionar archivo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  verVersiones(doc: DocumentoArchivo): void {
    this.docVersionesVer.set(doc);
  }

  cerrarVersiones(): void {
    this.docVersionesVer.set(null);
  }

  obtenerVersionActual(doc: DocumentoArchivo): number {
    if (doc.versiones && Array.isArray(doc.versiones) && doc.versiones.length > 0) {
      return doc.versiones[doc.versiones.length - 1].version;
    }
    return 1;
  }

  verDetalle(doc: DocumentoArchivo): void {
    this.verVersiones(doc);
  }

  seleccionarDocumento(doc: DocumentoArchivo): void {
    if (!doc || !doc.id_documento) return;
    this.docSeleccionado.set(doc);
    const rawUrl = `/api/v1/documento/${doc.id_documento}/pdf#toolbar=1&navpanes=0`;
    this.urlPdfSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl));
  }

  cerrarVisor(): void {
    this.docSeleccionado.set(null);
    this.urlPdfSegura.set(null);
  }

  descargarPdf(doc: any): void {
    if (!doc || !doc.id_documento) return;
    // En lugar de salir a otra pestaña con pantalla negra, se previsualiza localmente en el visor embebido
    this.seleccionarDocumento(doc);
  }

  descargarArchivoFisico(doc: any): void {
    if (!doc || !doc.id_documento) return;
    const a = document.createElement('a');
    a.href = `/api/v1/documento/${doc.id_documento}/pdf`;
    a.download = `${doc.nombre || 'documento'}.pdf`;
    a.target = '_blank';
    a.click();
  }

  obtenerReferencia(d: any): string {
    if (!d) return 'Sin Referencia';
    if (d.referencia) return d.referencia;
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        return parsed.ref || parsed.asunto || parsed.referencia || 'Documento Oficial Concluido';
      } catch {
        return 'Documento Oficial Concluido';
      }
    }
    return 'Documento Oficial Concluido';
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

  obtenerClaves(obj?: Record<string, any>): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
