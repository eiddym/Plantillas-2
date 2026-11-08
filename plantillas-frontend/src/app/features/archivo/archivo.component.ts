import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentosService } from '../../core/services/documentos.service';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
}

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
  abreviacion?: string;
  categoria_institucional?: string;
  clasificacion?: string;
  origen_canal?: string;
  origen_radicacion?: string;
  codigo_hoja_ruta?: string;
  etiquetas?: string[];
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
      fid_unidad_padre?: number;
    };
  };
  plantilla_valor?: string;
  archivo_adjunto?: string;
  archivo_base64?: string;
}

export interface UnidadArchivo {
  id_unidad: number;
  nombre: string;
  abreviacion: string;
  fid_unidad_padre?: number;
  es_unidad_padre?: boolean;
  total_documentos: number;
  total_con_hijos?: number;
  documentos: DocumentoArchivo[];
  agrupado_por_tipo: Record<string, DocumentoArchivo[]>;
  agrupado_por_clasificacion?: Record<string, DocumentoArchivo[]>;
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
    MatCheckboxModule,
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
          @if (nivelActivo() === 'institucional' && puedeCargarExternoInstitucional()) {
            <button mat-flat-button class="btn-cargar-institucional" (click)="abrirModalCarga()">
              <mat-icon>upload_file</mat-icon>
              <span>Cargar Documento Institucional</span>
            </button>
          }
        </div>
      </header>

      <!-- Selector de Nivel de Archivo (Jerarquizado por Permisos) -->
      <nav class="nivel-tabs-bar">
        @if (puedeVerGeneral()) {
          <button 
            class="nivel-btn" 
            [class.active]="nivelActivo() === 'general'" 
            (click)="cambiarNivel('general')"
          >
            <mat-icon>public</mat-icon>
            <span>Archivo General</span>
            <span class="badge-count">{{ totalDocsGeneral() }}</span>
          </button>
        }

        @if (puedeVerUnidad()) {
          <button 
            class="nivel-btn" 
            [class.active]="nivelActivo() === 'unidad'" 
            (click)="cambiarNivel('unidad')"
          >
            <mat-icon>domain</mat-icon>
            <span>Archivo de Unidad</span>
            <span class="badge-count">{{ totalDocsUnidad() }}</span>
          </button>
        }

        <button 
          class="nivel-btn" 
          [class.active]="nivelActivo() === 'institucional'" 
          (click)="cambiarNivel('institucional')"
        >
          <mat-icon>verified</mat-icon>
          <span>Archivo Institucional</span>
          <span class="badge-count badge-gold">{{ docsInstitucionales().length }}</span>
        </button>

        @if (puedeVerEstadisticas()) {
          <button 
            class="nivel-btn" 
            [class.active]="nivelActivo() === 'estadisticas'" 
            (click)="cambiarNivel('estadisticas')"
          >
            <mat-icon>analytics</mat-icon>
            <span>Estadísticas & Ventanilla</span>
          </button>
        }
      </nav>

      <!-- Layout: Catálogo Adaptativo y Visor Dinámico -->
      <div class="archivo-split-layout" [class.con-visor]="docSeleccionado() !== null">
        @if (docSeleccionado()) {
          <aside class="visor-embebido-panel">
            <div class="visor-card">
              <div class="visor-header">
                <div class="visor-doc-info">
                  <span class="visor-badge-cite">{{ docSeleccionado()?.nombre }}</span>
                  <span class="visor-doc-titulo">{{ docSeleccionado()?.nombre_plantilla || 'Documento Oficial Custodiado' }} · {{ tipoHojaVisor() === 'Oficio' ? 'OFICIO' : 'CARTA' }} ({{ orientacionHojaVisor() === 'Horizontal' ? 'HORIZONTAL' : 'VERTICAL' }})</span>
                </div>
                @if (htmlVisorSeguro() || esModoPdfCanvas()) {
                  <div class="visor-zoom-tools">
                    <div class="zoom-pill-group">
                      <button type="button" class="zoom-btn" (click)="ajustarZoomVisor(-0.1)" matTooltip="Reducir (Zoom -)">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <button type="button" class="zoom-btn zoom-mode-btn" [class.active]="modoEscalaVisor() === 'fit'" (click)="setModoFitVisor()" matTooltip="Ajustar hoja completa a la pantalla">
                        <span>{{ modoEscalaVisor() === 'fit' ? 'Ajustar' : (esModoPdfCanvas() ? (porcentajeZoomPdf() + '%') : (porcentajeEscalaVisor() + '%')) }}</span>
                      </button>
                      <button type="button" class="zoom-btn" (click)="ajustarZoomVisor(0.1)" matTooltip="Aumentar (Zoom +)">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  </div>
                }
                <div class="visor-actions">
                  <button mat-icon-button class="btn-visor-act close" (click)="cerrarVisor()" matTooltip="Cerrar Previsualización">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
              <div class="visor-iframe-wrapper">
                @if (cargandoVisor()) {
                  <div class="visor-loading-state">
                    <mat-spinner diameter="40"></mat-spinner>
                    <p>Cargando visualización del documento...</p>
                  </div>
                } @else if (errorVisor()) {
                  <div class="visor-error-state">
                    <mat-icon>error_outline</mat-icon>
                    <p>{{ errorVisor() }}</p>
                    <button mat-stroked-button color="primary" (click)="reintentarCargaVisor()">
                      <mat-icon>refresh</mat-icon>
                      <span>Reintentar</span>
                    </button>
                  </div>
                } @else if (esModoPdfCanvas()) {
                  <div class="visor-canvas-viewport" #pdfCanvasViewport>
                    @if (totalPaginasPdf() > 1) {
                      <div class="pdf-pagination-bar">
                        <div class="pdf-page-arrows">
                          <button type="button" class="btn-canvas-nav" (click)="irAPaginaPdf(paginaActualPdf() - 1)" [disabled]="paginaActualPdf() <= 1" matTooltip="Página anterior">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span class="page-count-text">Pág {{ paginaActualPdf() }} de {{ totalPaginasPdf() }}</span>
                          <button type="button" class="btn-canvas-nav" (click)="irAPaginaPdf(paginaActualPdf() + 1)" [disabled]="paginaActualPdf() >= totalPaginasPdf()" matTooltip="Página siguiente">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                        <div class="pdf-page-tabs">
                          @for (p of listaPaginasPdf(); track p) {
                            <button 
                              type="button" 
                              class="pdf-page-tab-btn" 
                              [class.active]="paginaActualPdf() === p" 
                              (click)="irAPaginaPdf(p)">
                              Pág {{ p }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                    <div class="pdf-canvas-wrapper" #pdfCanvasWrapper>
                      <canvas #pdfCanvas id="pdf-canvas-principal" class="pdf-rendered-canvas"></canvas>
                    </div>
                  </div>
                } @else if (urlPdfSegura()) {
                  <iframe [src]="urlPdfSegura()" class="pdf-local-iframe" title="Visor Documental Embebido"></iframe>
                } @else if (htmlVisorSeguro()) {
                  <div class="visor-sheet-viewport" #visorViewport>
                    <div class="sheet-scaler-wrapper" [style.width.px]="scaledWidthVisor()" [style.height.px]="scaledHeightVisor()">
                      <div 
                        class="sheet-scaler" 
                        [style.transform]="'scale(' + escalaVisor() + ')'"
                        [style.transform-origin]="'top left'"
                        [style.width.px]="canonicalWidthVisor()"
                        [style.min-height.px]="canonicalHeightVisor()">
                        <div 
                          class="physical-sheet" 
                          [style.width.px]="canonicalWidthVisor()"
                          [style.min-height.px]="canonicalHeightVisor()"
                          [class.sheet-carta]="tipoHojaVisor() === 'Letter'" 
                          [class.sheet-oficio]="tipoHojaVisor() === 'Oficio'">
                          <div [innerHTML]="htmlVisorSeguro()" class="document-html-content"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </aside>
        }

        <!-- MITAD DERECHA: CATÁLOGO Y FILTROS -->
        <main class="catalogo-panel">
          <!-- VISTA 1: ARCHIVO GENERAL (Agrupado por Unidades, Tipos, Clasificación y Etiquetas) -->
          @if (nivelActivo() === 'general' && puedeVerGeneral()) {
        <section class="section-container fade-in">
          <!-- Panel Multidimensional de Clasificación por Etiquetas -->
          <div class="facets-panel" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <strong style="font-size:13px; color:#0f172a; display:flex; align-items:center; gap:6px;">
                <mat-icon style="font-size:18px; width:18px; height:18px; color:#0284c7;">sell</mat-icon>
                Clasificación por Etiquetas (Unidad · Tipo · Reserva · Canal · Tags)
              </strong>
              @if (tieneFiltrosActivosGeneral()) {
                <button type="button" class="type-pill" style="background:#fee2e2; color:#991b1b; border-color:#fecaca;" (click)="limpiarFiltrosGeneral()">
                  Limpiar filtros
                </button>
              }
            </div>

            <!-- 1. Por Unidad -->
            @if (unidadesGeneral().length > 0) {
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="filter-caption" style="min-width:95px;">Por Unidad:</span>
                <button class="type-pill" [class.active]="unidadFiltroGeneral() === 'TODAS'" (click)="unidadFiltroGeneral.set('TODAS')">
                  Todas ({{ totalDocsGeneral() }})
                </button>
                @for (u of unidadesGeneral(); track u.id_unidad) {
                  <button class="type-pill" [class.active]="unidadFiltroGeneral() === u.id_unidad" (click)="unidadFiltroGeneral.set(u.id_unidad)">
                    {{ u.abreviacion || u.nombre }} ({{ u.total_documentos }})
                  </button>
                }
              </div>
            }

            <!-- 2. Por Tipo de Documento -->
            @if (tiposDisponiblesGeneral().length > 0) {
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="filter-caption" style="min-width:95px;">Por Tipo Doc:</span>
                <button class="type-pill" [class.active]="tipoFiltroGeneral() === 'TODOS'" (click)="filtrarTipoGeneral('TODOS')">
                  Todos ({{ totalDocsGeneral() }})
                </button>
                @for (tipo of tiposDisponiblesGeneral(); track tipo) {
                  <button class="type-pill" [class.active]="tipoFiltroGeneral() === tipo" (click)="filtrarTipoGeneral(tipo)">
                    {{ tipo }} ({{ contarDocsPorTipo(tipo) }})
                  </button>
                }
              </div>
            }

            <!-- 3. Por Clasificación de Documento y Canal -->
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="filter-caption" style="min-width:95px;">Clasificación:</span>
              @for (c of ['TODAS', 'Reservado', 'Confidencial', 'Secreto', 'Desclasificado']; track c) {
                <button class="type-pill" [class.active]="clasificacionFiltroGeneral() === c" (click)="clasificacionFiltroGeneral.set(c)">
                  {{ c === 'TODAS' ? 'Todas' : c }}
                </button>
              }
              <span class="filter-caption" style="margin-left:12px;">Origen:</span>
              @for (orig of origenesFiltroOpciones; track orig.val) {
                <button class="type-pill" [class.active]="origenFiltroGeneral() === orig.val" (click)="origenFiltroGeneral.set(orig.val)">
                  {{ orig.label }}
                </button>
              }
            </div>

            <!-- 4. Por Etiquetas Personalizadas (Tags) -->
            @if (etiquetasDisponiblesGeneral().length > 0) {
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="filter-caption" style="min-width:95px;">Etiquetas:</span>
                <button class="type-pill" [class.active]="etiquetaFiltroGeneral() === 'TODAS'" (click)="etiquetaFiltroGeneral.set('TODAS')">
                  Todas
                </button>
                @for (item of etiquetasDisponiblesGeneral(); track item.tag) {
                  <button class="type-pill" [class.active]="etiquetaFiltroGeneral() === item.tag" (click)="etiquetaFiltroGeneral.set(item.tag)">
                    #{{ item.tag }} ({{ item.total }})
                  </button>
                }
              </div>
            }
          </div>

          <!-- Buscador Rápido -->
          <div class="search-box-bar">
            <mat-form-field appearance="outline" class="search-input">
              <mat-label>Buscar por CITE, asunto o usuario emisor...</mat-label>
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
              <div class="doc-cards-list">
                @for (d of docsGeneralesFiltrados(); track d.id_documento) {
                  <div 
                    class="doc-item-card" 
                    [class.selected-card]="docSeleccionado()?.id_documento === d.id_documento"
                    (click)="seleccionarDocumento(d)"
                  >
                    <!-- FILA 1: CITE Y METADATOS CLAVE -->
                    <div class="doc-row-top">
                      <div class="cite-group">
                        <span class="cite-badge-mono">{{ d.nombre }}</span>
                        <button mat-icon-button class="btn-copy-mini" (click)="copiarCite(d.nombre); $event.stopPropagation()" matTooltip="Copiar CITE">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>

                      <div class="meta-badges-group">
                        <span class="tipo-tag">{{ d.nombre_plantilla || 'Documento Oficial' }}</span>
                        <span class="unit-tag">{{ d.usuario_creacion?.unidad?.nombre || 'Unidad Central' }}</span>
                        <span class="unit-tag" style="background:#f1f5f9; color:#334155;">{{ d.clasificacion || 'Reservado' }}</span>
                        @for (tag of (d.etiquetas || []); track tag) {
                          <span class="tipo-tag" style="background:#e0f2fe; color:#0369a1;">#{{ tag }}</span>
                        }
                        <span class="date-badge">
                          <mat-icon class="icon-date">event</mat-icon>
                          {{ formatearFecha(d._fecha_creacion || d.fecha) }}
                        </span>
                      </div>
                    </div>

                    <!-- FILA 2: REFERENCIA Y ACCIONES -->
                    <div class="doc-row-bottom">
                      <div class="doc-desc-container">
                        <mat-icon class="desc-icon">subject</mat-icon>
                        <span class="doc-desc-text" [matTooltip]="obtenerReferencia(d)">
                          {{ obtenerReferencia(d) || 'Sin referencia o asunto registrado' }}
                        </span>
                      </div>

                      <div class="action-btn-row" (click)="$event.stopPropagation()">
                        @if (puedeEtiquetar()) {
                          <button mat-icon-button (click)="abrirModalEtiquetas(d)" matTooltip="Etiquetar / Clasificar Documento" class="btn-action">
                            <mat-icon>sell</mat-icon>
                          </button>
                        }
                        <button mat-icon-button (click)="verDetalle(d)" matTooltip="Ver Trazabilidad y Versiones" class="btn-action">
                          <mat-icon>history</mat-icon>
                        </button>
                        <button mat-icon-button (click)="descargarArchivoFisico(d)" matTooltip="Descargar Copia Digital (PDF)" class="btn-action">
                          <mat-icon>download</mat-icon>
                        </button>
                        @if (puedePromover() && !d.es_institucional) {
                          <button 
                            mat-icon-button 
                            (click)="promoverAInstitucional(d)" 
                            matTooltip="Elevar a Archivo Institucional (Exclusivo Jefe Padre / MAE)"
                            class="btn-action promote"
                          >
                            <mat-icon>verified</mat-icon>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Estructura Dinámica por Unidades Institucionales -->
          <div class="unidades-hierarchy-card">
            <div class="card-top-title">
              <mat-icon>corporate_fare</mat-icon>
              <h3>Unidades y Direcciones de la Institución ({{ unidadesGeneral().length }})</h3>
            </div>
            <p class="section-desc">Estructura jerárquica de unidades creadas. Se reflejan en tiempo real con su clasificación padre/hija:</p>

            <mat-accordion multi class="unidades-accordion">
              @for (u of unidadesGeneral(); track u.id_unidad) {
                <mat-expansion-panel class="unidad-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title class="panel-title-custom">
                      <mat-icon class="unit-icon">{{ u.fid_unidad_padre ? 'subdirectory_arrow_right' : 'account_balance' }}</mat-icon>
                      <span class="u-name">{{ u.nombre }} ({{ u.abreviacion }})</span>
                      <span class="unit-tag" style="margin-left:8px; font-size:11px;">
                        {{ u.fid_unidad_padre ? 'Sub-unidad Hija' : 'Unidad Padre' }}
                      </span>
                    </mat-panel-title>
                    <mat-panel-description class="panel-desc-custom">
                      <span class="u-count-badge" [class.has-docs]="u.total_documentos > 0">
                        {{ u.total_documentos }} propio(s){{ u.total_con_hijos && u.total_con_hijos > u.total_documentos ? ' · ' + u.total_con_hijos + ' con sub-unidades' : '' }}
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
                                <div class="doc-mini-row" (click)="seleccionarDocumento(doc)">
                                  <div class="doc-mini-info">
                                    <strong class="mini-cite">{{ doc.nombre }}</strong>
                                    <span class="mini-ref">{{ obtenerReferencia(doc) }}</span>
                                  </div>
                                  <div class="mini-actions" (click)="$event.stopPropagation()">
                                    <button mat-icon-button (click)="verDetalle(doc)" matTooltip="Ver Trazabilidad" class="btn-action-mini">
                                      <mat-icon>history</mat-icon>
                                    </button>
                                    <button mat-icon-button (click)="descargarArchivoFisico(doc)" matTooltip="Descargar Copia PDF" class="btn-action-mini">
                                      <mat-icon>download</mat-icon>
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

      <!-- VISTA 2: ARCHIVO DE UNIDAD (Jerarquía Padre vs. Hijo) -->
      @if (nivelActivo() === 'unidad' && puedeVerUnidad()) {
        <section class="section-container fade-in">
          <div class="banner-unidad-actual">
            <div class="banner-unidad-info">
              <span class="badge-area">
                {{ dataUnidadActual()?.es_unidad_padre ? 'Jefatura de Unidad Padre (Unidad + Sub-unidades Hijas)' : 'Jefatura de Unidad Operativa (Visión Exclusiva de su Unidad)' }}
              </span>
              <h2>{{ dataUnidadActual()?.unidad?.nombre || 'Mi Unidad Operativa' }}</h2>
              <p>
                @if (dataUnidadActual()?.es_unidad_padre) {
                  Acervo documental de su unidad padre más las agrupaciones de todas sus sub-unidades dependientes.
                } @else {
                  Acervo documental exclusivo de su unidad operativa (aislado jerárquicamente de la unidad padre{{ dataUnidadActual()?.unidad_padre_nombre ? ': ' + dataUnidadActual()?.unidad_padre_nombre : '' }}).
                }
              </p>
            </div>
            <div class="banner-unidad-stat">
              <span class="stat-number">{{ dataUnidadActual()?.total_documentos || 0 }}</span>
              <span class="stat-label">Documentos en Alcance</span>
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
              <div class="doc-cards-list">
                @for (d of docsUnidadFiltrados(); track d.id_documento) {
                  <div 
                    class="doc-item-card" 
                    [class.selected-card]="docSeleccionado()?.id_documento === d.id_documento"
                    (click)="seleccionarDocumento(d)"
                  >
                    <!-- FILA 1: CITE Y METADATOS CLAVE -->
                    <div class="doc-row-top">
                      <div class="cite-group">
                        <span class="cite-badge-mono">{{ d.nombre }}</span>
                        <button mat-icon-button class="btn-copy-mini" (click)="copiarCite(d.nombre); $event.stopPropagation()" matTooltip="Copiar CITE">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>

                      <div class="meta-badges-group">
                        <span class="tipo-tag">{{ d.nombre_plantilla }}</span>
                        @if (d.usuario_creacion?.nombres) {
                          <span class="unit-tag">Por: {{ d.usuario_creacion?.nombres }} {{ d.usuario_creacion?.apellidos }}</span>
                        }
                        <span class="date-badge">
                          <mat-icon class="icon-date">event</mat-icon>
                          {{ formatearFecha(d._fecha_creacion || d.fecha) }}
                        </span>
                      </div>
                    </div>

                    <!-- FILA 2: REFERENCIA Y ACCIONES -->
                    <div class="doc-row-bottom">
                      <div class="doc-desc-container">
                        <mat-icon class="desc-icon">subject</mat-icon>
                        <span class="doc-desc-text" [matTooltip]="obtenerReferencia(d)">
                          {{ obtenerReferencia(d) || 'Sin referencia registrada' }}
                        </span>
                      </div>

                      <div class="action-btn-row" (click)="$event.stopPropagation()">
                        <button mat-icon-button (click)="verDetalle(d)" matTooltip="Ver Trazabilidad" class="btn-action">
                          <mat-icon>history</mat-icon>
                        </button>
                        <button mat-icon-button (click)="descargarArchivoFisico(d)" matTooltip="Descargar Copia Digital (PDF)" class="btn-action">
                          <mat-icon>download</mat-icon>
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
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Documentos Oficiales Recibidos en Copia (CC) -->
          @if (docsUnidadCopiaFiltrados().length > 0) {
            <div class="content-card card-copia-cc">
              <div class="card-top-title">
                <mat-icon style="color: #7e22ce;">mark_email_read</mat-icon>
                <h3>Documentos Oficiales Recibidos en Copia (CC) ({{ docsUnidadCopiaFiltrados().length }})</h3>
                <span class="badge-cc-info">Remisión Directa Oficial</span>
              </div>

              <div class="doc-cards-list">
                @for (d of docsUnidadCopiaFiltrados(); track d.id_documento) {
                  <div 
                    class="doc-item-card" 
                    [class.selected-card]="docSeleccionado()?.id_documento === d.id_documento"
                    (click)="seleccionarDocumento(d)"
                  >
                    <!-- FILA 1: CITE Y METADATOS CLAVE -->
                    <div class="doc-row-top">
                      <div class="cite-group">
                        <span class="cite-badge-mono">{{ d.nombre }}</span>
                        <button mat-icon-button class="btn-copy-mini" (click)="copiarCite(d.nombre); $event.stopPropagation()" matTooltip="Copiar CITE">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>

                      <div class="meta-badges-group">
                        <span class="tipo-tag tipo-tag-cc">{{ d.nombre_plantilla }}</span>
                        <span class="unit-tag">Origen: {{ d.usuario_creacion?.unidad?.nombre || 'Remitente Oficial' }}</span>
                        <span class="date-badge">
                          <mat-icon class="icon-date">event</mat-icon>
                          {{ formatearFecha(d._fecha_creacion || d.fecha) }}
                        </span>
                      </div>
                    </div>

                    <!-- FILA 2: REFERENCIA Y ACCIONES -->
                    <div class="doc-row-bottom">
                      <div class="doc-desc-container">
                        <mat-icon class="desc-icon">subject</mat-icon>
                        <span class="doc-desc-text" [matTooltip]="obtenerReferencia(d)">
                          {{ obtenerReferencia(d) || 'Sin referencia registrada' }}
                        </span>
                      </div>

                      <div class="action-btn-row" (click)="$event.stopPropagation()">
                        <button mat-icon-button (click)="verDetalle(d)" matTooltip="Ver Trazabilidad" class="btn-action">
                          <mat-icon>history</mat-icon>
                        </button>
                        <button mat-icon-button (click)="descargarArchivoFisico(d)" matTooltip="Descargar Copia Digital (PDF)" class="btn-action">
                          <mat-icon>download</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

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
                            <div class="sub-doc-row" (click)="seleccionarDocumento(sDoc)">
                              <span>{{ sDoc.nombre }} - {{ obtenerReferencia(sDoc) }}</span>
                              <div class="mini-actions" (click)="$event.stopPropagation()">
                                <button mat-icon-button (click)="descargarArchivoFisico(sDoc)" matTooltip="Descargar Copia PDF" class="btn-action-mini">
                                  <mat-icon>download</mat-icon>
                                </button>
                              </div>
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
              <div class="doc-cards-list">
                @for (d of docsInstitucionales(); track d.id_documento) {
                  <div 
                    class="doc-item-card" 
                    [class.selected-card]="docSeleccionado()?.id_documento === d.id_documento"
                    (click)="seleccionarDocumento(d)"
                  >
                    <!-- FILA 1: CITE Y METADATOS CLAVE -->
                    <div class="doc-row-top">
                      <div class="cite-group">
                        <span class="cite-badge-mono">{{ d.nombre }}</span>
                        <button mat-icon-button class="btn-copy-mini" (click)="copiarCite(d.nombre); $event.stopPropagation()" matTooltip="Copiar CITE para referenciar">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>

                      <div class="meta-badges-group">
                        <span class="tipo-tag">{{ d.nombre_plantilla || obtenerTituloDoc(d) }}</span>
                        @if (d.abreviacion) {
                          <span class="sigla-tag">{{ d.abreviacion }}</span>
                        }
                        <span class="cat-pill">{{ d.categoria_institucional || 'Normativa y Políticas' }}</span>
                        <span class="version-badge" (click)="verVersiones(d); $event.stopPropagation()" matTooltip="Ver historial de versiones">
                          v{{ obtenerVersionActual(d) }}
                          <mat-icon class="icon-v">history</mat-icon>
                        </span>
                        <span class="date-badge">
                          <mat-icon class="icon-date">event</mat-icon>
                          {{ formatearFecha(d._fecha_creacion || d.fecha) }}
                        </span>
                      </div>
                    </div>

                    <!-- FILA 2: DESCRIPCIÓN Y ACCIONES -->
                    <div class="doc-row-bottom">
                      <div class="doc-desc-container">
                        <mat-icon class="desc-icon">subject</mat-icon>
                        <span class="doc-desc-text" [matTooltip]="obtenerDescripcionDoc(d)">
                          {{ obtenerDescripcionDoc(d) || 'Documento institucional oficial en custodia' }}
                        </span>
                      </div>

                      <div class="action-btn-row" (click)="$event.stopPropagation()">
                        @if (esAdminOMae()) {
                          <button mat-icon-button (click)="difundirGlobalmente(d)" matTooltip="Difundir a Todos (Correos Masivos + Grupo de WhatsApp)" class="btn-action">
                            <mat-icon>campaign</mat-icon>
                          </button>
                        }
                        <button mat-icon-button (click)="verVersiones(d)" matTooltip="Historial de Versiones y Trazabilidad" class="btn-action">
                          <mat-icon>history</mat-icon>
                        </button>
                        <button mat-icon-button (click)="descargarArchivoFisico(d)" matTooltip="Descargar Copia Digital (PDF)" class="btn-action">
                          <mat-icon>download</mat-icon>
                        </button>
                        @if (puedeVersionar()) {
                          <button mat-icon-button (click)="abrirModalVersionar(d)" matTooltip="Subir Nueva Versión (v{{ obtenerVersionActual(d) + 1 }})" class="btn-action version">
                            <mat-icon>upgrade</mat-icon>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- VISTA 4: ESTADÍSTICAS DE VENTANILLA (INTERNA / EXTERNA) Y ARCHIVO -->
      @if (nivelActivo() === 'estadisticas' && puedeVerEstadisticas()) {
        <section class="section-container fade-in">
          <!-- KPIs de Canales de Ingreso -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
            <div class="content-card" style="padding:18px; border-left:4px solid #0284c7;">
              <span style="font-size:12px; color:#64748b; font-weight:700;">VENTANILLA EXTERNA (VIRTUAL)</span>
              <div style="font-size:28px; font-weight:800; color:#0f172a; margin:6px 0;">
                {{ estadisticasData()?.resumen_canales?.ventanilla_externa?.total || 0 }}
              </div>
              <div style="font-size:12px; color:#475569; display:flex; gap:10px;">
                <span>Atendidos: <strong>{{ estadisticasData()?.resumen_canales?.ventanilla_externa?.atendidos || 0 }}</strong></span>
                <span>En curso: <strong>{{ (estadisticasData()?.resumen_canales?.ventanilla_externa?.en_curso || 0) + (estadisticasData()?.resumen_canales?.ventanilla_externa?.pendientes || 0) }}</strong></span>
              </div>
            </div>

            <div class="content-card" style="padding:18px; border-left:4px solid #7c3aed;">
              <span style="font-size:12px; color:#64748b; font-weight:700;">VENTANILLA INTERNA (PRESENCIAL)</span>
              <div style="font-size:28px; font-weight:800; color:#0f172a; margin:6px 0;">
                {{ estadisticasData()?.resumen_canales?.ventanilla_interna?.total || 0 }}
              </div>
              <div style="font-size:12px; color:#475569; display:flex; gap:10px;">
                <span>Atendidos: <strong>{{ estadisticasData()?.resumen_canales?.ventanilla_interna?.atendidos || 0 }}</strong></span>
                <span>En curso: <strong>{{ (estadisticasData()?.resumen_canales?.ventanilla_interna?.en_curso || 0) + (estadisticasData()?.resumen_canales?.ventanilla_interna?.pendientes || 0) }}</strong></span>
              </div>
            </div>

            <div class="content-card" style="padding:18px; border-left:4px solid #16a34a;">
              <span style="font-size:12px; color:#64748b; font-weight:700;">FLUJO DOCUMENTAL INTERNO</span>
              <div style="font-size:28px; font-weight:800; color:#0f172a; margin:6px 0;">
                {{ estadisticasData()?.resumen_canales?.flujo_interno?.cerrados || 0 }}
              </div>
              <div style="font-size:12px; color:#475569;">
                Cerrados con CITE · En trámite: <strong>{{ estadisticasData()?.resumen_canales?.flujo_interno?.en_curso || 0 }}</strong>
              </div>
            </div>

            <div class="content-card" style="padding:18px; border-left:4px solid #d97706;">
              <span style="font-size:12px; color:#64748b; font-weight:700;">ARCHIVO INSTITUCIONAL</span>
              <div style="font-size:28px; font-weight:800; color:#0f172a; margin:6px 0;">
                {{ estadisticasData()?.resumen_canales?.institucional?.total || 0 }}
              </div>
              <div style="font-size:12px; color:#475569;">Normativas y documentos corporativos vigentes</div>
            </div>
          </div>

          <!-- Agrupaciones de Ventanilla y Clasificación -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
            <div class="content-card">
              <div class="card-top-title">
                <mat-icon>category</mat-icon>
                <h3>Ingresos de Ventanilla por Tipo de Trámite</h3>
              </div>
              @if (!estadisticasData()?.ventanilla_por_tipo_tramite?.length) {
                <p style="color:#64748b; font-size:13px;">Sin registros de ventanilla radicados aún.</p>
              } @else {
                <div style="display:flex; flex-direction:column; gap:8px;">
                  @for (item of estadisticasData()!.ventanilla_por_tipo_tramite; track item.tipo) {
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border-radius:8px;">
                      <span style="font-weight:600; font-size:13px; color:#1e293b;">{{ item.tipo }}</span>
                      <span class="u-count-badge has-docs">{{ item.total }} trámite(s)</span>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="content-card">
              <div class="card-top-title">
                <mat-icon>shield</mat-icon>
                <h3>Distribución por Clasificación y Prioridad</h3>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                @for (c of (estadisticasData()?.por_clasificacion || []); track c.clasificacion) {
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border-radius:8px;">
                    <span style="font-weight:600; font-size:13px; color:#1e293b;">Clasificación: {{ c.clasificacion }}</span>
                    <span class="u-count-badge has-docs">{{ c.total }}</span>
                  </div>
                }
                @for (p of (estadisticasData()?.ventanilla_por_prioridad || []); track p.prioridad) {
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fffbeb; border-radius:8px;">
                    <span style="font-weight:600; font-size:13px; color:#92400e;">Prioridad Ventanilla: {{ p.prioridad }}</span>
                    <span class="u-count-badge">{{ p.total }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Rendimiento Documental por Unidad -->
          <div class="content-card">
            <div class="card-top-title">
              <mat-icon>domain</mat-icon>
              <h3>Movimiento por Unidad (Archivo + Ventanilla Externa + Ventanilla Interna)</h3>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                  <tr style="background:#f1f5f9; text-align:left; color:#334155;">
                    <th style="padding:10px 12px;">Unidad / Área</th>
                    <th style="padding:10px 12px;">Emitidos Cerrados</th>
                    <th style="padding:10px 12px;">Vent. Externa</th>
                    <th style="padding:10px 12px;">Vent. Interna</th>
                    <th style="padding:10px 12px;">Vent. Atendidos</th>
                    <th style="padding:10px 12px;">Vent. Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of (estadisticasData()?.por_unidad || []); track u.id_unidad) {
                    <tr style="border-bottom:1px solid #e2e8f0;">
                      <td style="padding:10px 12px; font-weight:600;">{{ u.nombre }} ({{ u.abreviacion }})</td>
                      <td style="padding:10px 12px;">{{ u.producidos_cerrados }}</td>
                      <td style="padding:10px 12px;">{{ u.ventanilla_externa_recibidos }}</td>
                      <td style="padding:10px 12px;">{{ u.ventanilla_interna_recibidos }}</td>
                      <td style="padding:10px 12px; color:#166534; font-weight:700;">{{ u.ventanilla_atendidos }}</td>
                      <td style="padding:10px 12px; color:#b45309; font-weight:700;">{{ u.ventanilla_pendientes }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }
        </main>
      </div>

      <!-- MODAL: ETIQUETAR Y CLASIFICAR DOCUMENTO -->
      @if (docAEtiquetar()) {
        <div class="modal-overlay" (click)="cerrarModalEtiquetas()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <mat-icon>sell</mat-icon>
                <div>
                  <h3>Clasificar y Etiquetar: {{ docAEtiquetar()?.nombre }}</h3>
                  <p>Asigne etiquetas temáticas y nivel de reserva para el Archivo General</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarModalEtiquetas()" class="btn-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:14px;">
              <div>
                <strong style="font-size:13px; color:#334155; display:block; margin-bottom:8px;">Clasificación del Documento:</strong>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  @for (c of ['Reservado', 'Confidencial', 'Secreto', 'Desclasificado']; track c) {
                    <button type="button" class="type-pill" [class.active]="clasificacionEdicion() === c" (click)="clasificacionEdicion.set(c)">
                      {{ c }}
                    </button>
                  }
                </div>
              </div>

              <div>
                <strong style="font-size:13px; color:#334155; display:block; margin-bottom:8px;">Etiquetas Sugeridas (clic para activar/desactivar):</strong>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  @for (sug of etiquetasSugeridasList; track sug) {
                    <button type="button" class="type-pill" [class.active]="etiquetasEdicion().includes(sug)" (click)="toggleEtiquetaEdicion(sug)">
                      #{{ sug }}
                    </button>
                  }
                </div>
              </div>

              <div style="display:flex; gap:8px; align-items:center;">
                <mat-form-field appearance="outline" style="flex:1;">
                  <mat-label>Nueva etiqueta personalizada</mat-label>
                  <input matInput [formControl]="nuevaEtiquetaCtrl" (keyup.enter)="agregarEtiquetaCustom()" placeholder="Ej. Asamblea2026, ContratoMinero...">
                </mat-form-field>
                <button type="button" mat-stroked-button color="primary" (click)="agregarEtiquetaCustom()">Añadir</button>
              </div>

              <div class="modal-actions">
                <button type="button" mat-button (click)="cerrarModalEtiquetas()">Cancelar</button>
                <button type="button" mat-flat-button class="btn-primary-action" (click)="guardarEtiquetasDoc()" [disabled]="guardando()">
                  <mat-icon>save</mat-icon>
                  <span>Guardar Clasificación</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: CARGAR DOCUMENTO INSTITUCIONAL (MAE / SECRETARÍA / ADMIN) -->
      @if (mostrarModalCarga()) {
        <div class="modal-overlay" (click)="cerrarModalCarga()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <mat-icon>upload_file</mat-icon>
                <div>
                  <h3>Cargar Documento en Archivo Institucional</h3>
                  <p>Exclusivo para Autoridad MAE y Secretaría</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarModalCarga()" class="btn-close">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="cargaForm" (ngSubmit)="guardarDocumentoInstitucional()" class="modal-form">
              <!-- Nombre del Documento -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Nombre del Documento Institucional</mat-label>
                <input matInput formControlName="nombre_documento" (input)="onNombreDocumentoChange()" placeholder="Ej. Reglamento Interno de Personal o Personalidad Jurídica" required>
                <mat-icon matPrefix>description</mat-icon>
              </mat-form-field>

              <!-- Sigla y Año -->
              <mat-form-field appearance="outline">
                <mat-label>Sigla / Código (editable)</mat-label>
                <input matInput formControlName="sigla" (input)="onSiglaChange()" placeholder="Ej. RIP, PJ, EO" style="text-transform: uppercase;" required>
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
                  <strong class="preview-cite-code">{{ citeCalculadoPreview().toUpperCase() }}</strong>
                  <span class="preview-sub">Asignado de forma correlativa para este documento en {{ cargaForm.get('anio')?.value }}. Quedará referenciable en todo el sistema.</span>
                </div>
              </div>

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

              <!-- Opción de Difusión Masiva Directa (Sin requerir aprobación intermedia) -->
              <div class="col-span-full" style="padding: 8px 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                <mat-checkbox formControlName="difundir_todos" color="primary">
                  <strong>Difundir inmediatamente a todo el personal</strong> (Bandeja del Sistema + Correos de Todos + Grupo de WhatsApp Institucional)
                </mat-checkbox>
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
                  <button mat-flat-button color="primary" class="btn-dl-v" (click)="verDocEnVisor(docVersionesVer())">
                    <mat-icon>visibility</mat-icon>
                    <span>Ver en el Visor</span>
                  </button>
                  <button mat-stroked-button class="btn-dl-v" (click)="descargarArchivoFisico(docVersionesVer())">
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
                      <div class="version-action-btns">
                        <button mat-flat-button color="primary" class="btn-dl-v" (click)="verDocEnVisor(docVersionesVer())">
                          <mat-icon>visibility</mat-icon>
                          <span>Ver en el Visor</span>
                        </button>
                        <button mat-stroked-button class="btn-dl-v" (click)="descargarArchivoFisico(docVersionesVer())">
                          <mat-icon>download</mat-icon>
                          <span>Descargar</span>
                        </button>
                      </div>
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
      color: #ffffff !important;
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
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #ffffff !important; }
    }

    .topbar-title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.4px;
      color: #ffffff !important;
    }

    .topbar-sub {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: #e2e8f0 !important;
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

    /* Listado en Dos Filas por Documento (Sin Scrollbar Horizontal) */
    .doc-cards-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .doc-item-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      width: 100%;
      box-sizing: border-box;

      &:hover {
        border-color: #0284c7;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
        transform: translateY(-1px);
        background: #f8fafc;
      }

      &.selected-card {
        border-color: #0284c7;
        background: #f0f9ff;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #0284c7;
          border-top-left-radius: 10px;
          border-bottom-left-radius: 10px;
        }
      }
    }

    .doc-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      width: 100%;
    }

    .cite-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .cite-badge-mono {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      letter-spacing: 0.5px;
      white-space: nowrap !important;
      word-break: keep-all !important;
      display: inline-block;
    }

    .btn-copy-mini {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
      color: #64748b;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #0083b0; background: #e0f2fe; }
    }

    .meta-badges-group {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tipo-tag {
      background: #f1f5f9;
      color: #334155;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;

      &.tipo-tag-cc {
        background: #faf5ff;
        color: #7e22ce;
        border: 1px solid #e9d5ff;
      }
    }

    .sigla-tag {
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .cat-pill {
      background: #fef3c7;
      color: #b45309;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .unit-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      white-space: nowrap;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #ecfdf5;
      color: #059669;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      border: 1px solid #a7f3d0;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        background: #d1fae5;
      }

      .icon-v {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
    }

    .date-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #64748b;
      font-size: 11.5px;
      white-space: nowrap;

      .icon-date {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: #94a3b8;
      }
    }

    .doc-row-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      width: 100%;
    }

    .doc-desc-container {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex: 1;
      min-width: 0;

      .desc-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #94a3b8;
        margin-top: 1px;
        flex-shrink: 0;
      }

      .doc-desc-text {
        font-size: 12.5px;
        color: #334155;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .action-btn-row {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
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
      color: #ffffff !important;
      padding: 24px 30px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { margin: 6px 0 2px; font-size: 22px; font-weight: 800; color: #ffffff !important; }
      p { margin: 0; font-size: 13.5px; color: #e2e8f0 !important; }
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

    .card-copia-cc {
      border-top: 3px solid #7e22ce !important;
      margin-top: 20px;
    }
    .badge-cc-info {
      font-size: 11px;
      background: #f3e8ff;
      color: #7e22ce;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 8px;
      text-transform: uppercase;
    }
    .tipo-tag-cc {
      background: #faf5ff !important;
      color: #6b21a8 !important;
      border: 1px solid #d8b4fe !important;
    }

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
      color: #ffffff !important;
      padding: 24px 30px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { margin: 6px 0 2px; font-size: 22px; font-weight: 800; color: #ffffff !important; }
      p { margin: 0; font-size: 13.5px; color: #cbd5e1 !important; }
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
      h3 { margin: 0; font-size: 17px; font-weight: 700; color: #ffffff !important; }
      p { margin: 2px 0 0; font-size: 12px; color: #cbd5e1 !important; }
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
      grid-template-columns: 1fr;
      gap: 20px;
      align-items: start;
      margin-top: 8px;
      width: 100%;
      min-width: 0;

      &.con-visor {
        @media (min-width: 1100px) {
          grid-template-columns: minmax(400px, 44%) minmax(0, 1fr);
        }
      }
    }

    @media (max-width: 1099px) {
      .archivo-split-layout {
        grid-template-columns: 1fr !important;
      }
      .visor-embebido-panel {
        position: relative !important;
        top: 0 !important;
        height: auto !important;
        max-height: 85vh !important;
        margin-bottom: 20px;
        order: -1;
      }
    }

    .visor-embebido-panel {
      position: sticky;
      top: 16px;
      height: fit-content;
      max-height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .visor-card {
      height: auto;
      max-height: calc(100vh - 120px);
      background: #1e293b;
      border-radius: 16px;
      border: 1px solid rgba(226, 232, 240, 0.2);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
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

    .visor-zoom-tools {
      display: inline-flex;
      align-items: center;
    }

    .zoom-pill-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 4px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .zoom-btn {
      border: none;
      background: transparent;
      color: #94a3b8;
      height: 24px;
      padding: 0 6px;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 600;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.12);
      }

      &.zoom-mode-btn {
        padding: 0 8px;
        min-width: 58px;
        &.active {
          background: #0284c7;
          color: #ffffff;
        }
      }
    }

    .visor-iframe-wrapper {
      width: 100%;
      height: auto;
      max-height: calc(100vh - 180px);
      background: #0f172a;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Viewport de Hoja a Escala Real */
    .visor-sheet-viewport {
      width: 100%;
      height: auto;
      max-height: calc(100vh - 180px);
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 10px 12px 14px;
      background: #0f172a;

      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 3px;
      }
    }

    .sheet-scaler-wrapper {
      position: relative;
      flex-shrink: 0;
      margin: auto;
      box-sizing: border-box;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12);
      border-radius: 2px;
      background: #ffffff;
      transition: width 0.15s ease-out, height 0.15s ease-out;
    }

    .sheet-scaler {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
    }

    .physical-sheet {
      width: 816px;
      box-sizing: border-box;
      background: #ffffff;
      padding: 38px 95px; /* 2.5 cm de margen lateral */
      display: flex;
      flex-direction: column;
      color: #1e293b;

      &.sheet-carta {
        min-height: 1056px;
      }

      &.sheet-oficio {
        min-height: 1248px;
      }

      .document-html-content {
        width: 100%;
        box-sizing: border-box;
        font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
        line-height: 1.5;
        color: #1e293b;
        font-size: 10.5pt;
        display: flex;
        flex-direction: column;
        flex: 1;

        * {
          box-sizing: border-box !important;
        }

        .fondo-texto {
          display: none !important;
        }

        .mi-contenido, .cuerpo-documento, .contenedor {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        #pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          margin-bottom: 16px;
          font-size: 10pt;

          .cite {
            float: none !important;
            font-weight: 600;
          }
        }

        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse !important;
          margin: 12px 0 !important;
          table-layout: fixed !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          font-size: 9.5pt;
        }

        td, th {
          border: 1px solid #94a3b8;
          padding: 7px 12px;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          vertical-align: top;
        }

        .pdf-header-container,
        .pdf-footer-container {
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .pdf-header-container table,
        .pdf-page1-metadata,
        table.pdf-page1-metadata,
        table[role="presentation"],
        .table-sin-borde {
          border: none !important;
          border-collapse: collapse !important;
          margin: 0 !important;
          background: transparent !important;
        }

        .pdf-header-container td,
        .pdf-header-container th,
        .pdf-page1-metadata td,
        .pdf-page1-metadata th,
        table[role="presentation"] td,
        table[role="presentation"] th,
        .table-sin-borde td,
        .table-sin-borde th {
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
        }

        .datosGenerales {
          font-weight: 700;
          width: 130px;
          background: #f8fafc;
          color: #334155;
        }

        p {
          margin-top: 0;
          margin-bottom: 12px;
          line-height: 1.6;
          text-align: justify;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
        }

        h1, h2, h3, h4, h5, h6 {
          color: #0f172a;
          font-weight: 700;
          line-height: 1.3;
        }

        h2 {
          font-size: 13.5pt;
          letter-spacing: 0.3px;
          margin: 14px 0;
          text-align: center;
        }

        .bloque-cc-archivo {
          margin-top: 28px !important;
          font-size: 9pt !important;
          line-height: 1.4 !important;
          color: #334155 !important;
        }
      }
    }

    .pdf-local-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    /* Visor Canvas Nativo (PDF.js sin iframe ni descarga) */
    .visor-canvas-viewport {
      width: 100%;
      height: auto;
      max-height: calc(100vh - 180px);
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      background: #0f172a;
      padding: 10px 12px 14px;
      align-items: center;

      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      &::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 3px;
      }
    }

    .pdf-pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.12);
      z-index: 5;
      flex-wrap: wrap;
    }

    .pdf-page-arrows {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-canvas-nav {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: #f8fafc;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: #0284c7;
        color: #ffffff;
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .page-count-text {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.4px;
      white-space: nowrap;
    }

    .pdf-page-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pdf-page-tab-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }

      &.active {
        background: #0284c7;
        border-color: #0284c7;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
      }
    }

    .pdf-canvas-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 100%;
      height: auto;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .pdf-rendered-canvas {
      display: block;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      background: #ffffff;
      max-width: 100%;
      height: auto;
    }

    .visor-loading-state, .visor-error-state {
      height: 100%;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 30px;
      gap: 16px;
      background: #1e293b;
      color: #cbd5e1;
      p { margin: 0; font-size: 13.5px; max-width: 300px; }
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #f87171; }
      button { border-color: rgba(255, 255, 255, 0.2); color: #38bdf8; }
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

    @media (max-width: 768px) {
      .archivo-topbar {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 14px !important;
        padding: 16px !important;
        border-radius: 12px !important;

        .topbar-right {
          width: 100%;
          .btn-cargar-institucional {
            width: 100%;
            justify-content: center;
          }
        }
      }

      .topbar-left {
        gap: 12px;
      }

      .topbar-icon {
        width: 42px;
        height: 42px;
        mat-icon { font-size: 22px; width: 22px; height: 22px; }
      }

      .topbar-title {
        font-size: 18px !important;
      }

      .topbar-sub {
        font-size: 12px !important;
      }

      .nivel-tabs-bar {
        overflow-x: auto !important;
        padding-bottom: 6px !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        &::-webkit-scrollbar { display: none; }
      }

      .nivel-btn {
        padding: 8px 12px !important;
        font-size: 12px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }

      .content-card {
        padding: 12px !important;
      }
    }
  `]
})
export class ArchivoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private readonly documentosService = inject(DocumentosService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('visorViewport') visorViewport?: ElementRef<HTMLElement>;
  @ViewChild('pdfCanvas') pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvasWrapper') pdfCanvasWrapper?: ElementRef<HTMLElement>;

  // Visor Local Embebido (Split Screen con Hoja Física a Escala Real)
  readonly docSeleccionado = signal<DocumentoArchivo | null>(null);
  readonly urlPdfSegura = signal<SafeResourceUrl | null>(null);
  readonly htmlVisorSeguro = signal<SafeHtml | null>(null);
  readonly cargandoVisor = signal<boolean>(false);
  readonly errorVisor = signal<string | null>(null);
  readonly tipoHojaVisor = signal<'Letter' | 'Oficio'>('Letter');
  readonly orientacionHojaVisor = signal<'Vertical' | 'Horizontal'>('Vertical');
  readonly escalaVisor = signal<number>(0.6);
  readonly modoEscalaVisor = signal<'fit' | 'custom'>('fit');
  readonly porcentajeEscalaVisor = computed(() => Math.round(this.escalaVisor() * 100));

  // Estado del Visor Canvas Nativo (PDF.js sin iframe ni descarga)
  readonly esModoPdfCanvas = signal<boolean>(false);
  readonly totalPaginasPdf = signal<number>(1);
  readonly paginaActualPdf = signal<number>(1);
  readonly zoomPdfFactor = signal<number>(1.0);
  readonly porcentajeZoomPdf = computed(() => Math.round(this.zoomPdfFactor() * 100));
  readonly listaPaginasPdf = computed(() => {
    const total = this.totalPaginasPdf();
    return Array.from({ length: total }, (_, i) => i + 1);
  });
  private loadedPdfDocument: any = null;
  private renderTaskEnCurso: any = null;

  readonly canonicalWidthVisor = computed(() => {
    const baseLong = this.tipoHojaVisor() === 'Oficio' ? 1248 : 1056;
    return this.orientacionHojaVisor() === 'Horizontal' ? baseLong : 816;
  });

  readonly canonicalHeightVisor = computed(() => {
    const baseLong = this.tipoHojaVisor() === 'Oficio' ? 1248 : 1056;
    return this.orientacionHojaVisor() === 'Horizontal' ? 816 : baseLong;
  });

  readonly scaledWidthVisor = computed(() => Math.round(this.canonicalWidthVisor() * this.escalaVisor()));
  readonly scaledHeightVisor = computed(() => Math.round(this.canonicalHeightVisor() * this.escalaVisor()));

  private currentObjectUrl: string | null = null;
  archivoPdfBase64: string | null = null;

  readonly nivelActivo = signal<'general' | 'unidad' | 'institucional' | 'estadisticas'>('institucional');
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly permisosServidor = signal<any | null>(null);

  // Datos de Archivo General y Filtros por Etiquetas (Unidad, Tipo, Clasificación, Origen, Tags)
  readonly unidadesGeneral = signal<UnidadArchivo[]>([]);
  readonly docsGeneral = signal<DocumentoArchivo[]>([]);
  readonly tiposDisponiblesGeneral = signal<string[]>([]);
  readonly etiquetasDisponiblesGeneral = signal<Array<{ tag: string; total: number }>>([]);
  readonly tipoFiltroGeneral = signal<string>('TODOS');
  readonly unidadFiltroGeneral = signal<number | 'TODAS'>('TODAS');
  readonly clasificacionFiltroGeneral = signal<string>('TODAS');
  readonly origenFiltroGeneral = signal<string>('TODOS');
  readonly etiquetaFiltroGeneral = signal<string>('TODAS');
  readonly filtroGeneralCtrl = new FormControl('');

  readonly origenesFiltroOpciones = [
    { val: 'TODOS', label: 'Todos' },
    { val: 'FLUJO_INTERNO', label: 'Flujo Interno' },
    { val: 'VENTANILLA_EXTERNA', label: 'Ventanilla Externa' },
    { val: 'VENTANILLA_INTERNA', label: 'Ventanilla Interna' },
    { val: 'INSTITUCIONAL', label: 'Institucional' }
  ];

  // Datos de Archivo de Unidad
  readonly dataUnidadActual = signal<any | null>(null);
  readonly tipoFiltroUnidad = signal<string>('TODOS');

  // Datos de Archivo Institucional
  readonly docsInstitucionales = signal<DocumentoArchivo[]>([]);

  // Datos de Estadísticas
  readonly estadisticasData = signal<any | null>(null);

  // Modales y Edición de Etiquetas
  readonly mostrarModalCarga = signal<boolean>(false);
  readonly docAVersionar = signal<DocumentoArchivo | null>(null);
  readonly docVersionesVer = signal<DocumentoArchivo | null>(null);
  readonly docAEtiquetar = signal<DocumentoArchivo | null>(null);
  readonly etiquetasEdicion = signal<string[]>([]);
  readonly clasificacionEdicion = signal<string>('Reservado');
  readonly nuevaEtiquetaCtrl = new FormControl('');
  readonly nombreArchivoCarga = signal<string | null>(null);
  readonly nombreArchivoVersion = signal<string | null>(null);

  readonly etiquetasSugeridasList = [
    'Normativa',
    'Urgente',
    'Auditoría',
    'Contratos',
    'Operaciones Mineras',
    'Finanzas / Contabilidad',
    'Recursos Humanos',
    'Consejo Administración',
    'Consejo Vigilancia',
    'Legal / Jurídico'
  ];

  readonly cargaForm = new FormGroup({
    nombre_documento: new FormControl('', [Validators.required]),
    sigla: new FormControl('', [Validators.required]),
    anio: new FormControl(new Date().getFullYear(), [Validators.required]),
    categoria: new FormControl('Documento Institucional'),
    descripcion: new FormControl('', [Validators.required]),
    observacion: new FormControl(''),
    difundir_todos: new FormControl(true)
  });

  readonly citeCalculadoPreview = signal<string>('MARABUNTA/DOC/1/2026');

  readonly sugerenciasInstitucionales: any[] = [];

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
    const unidad = this.unidadFiltroGeneral();
    const clasif = this.clasificacionFiltroGeneral();
    const origen = this.origenFiltroGeneral();
    const tag = this.etiquetaFiltroGeneral();
    const query = (this.filtroGeneralCtrl.value || '').toLowerCase().trim();

    if (unidad !== 'TODAS') {
      list = list.filter(d => Number(d.usuario_creacion?.fid_unidad) === Number(unidad));
    }
    if (tipo !== 'TODOS') {
      list = list.filter(d => (d.nombre_plantilla || '').trim() === tipo);
    }
    if (clasif !== 'TODAS') {
      list = list.filter(d => (d.clasificacion || 'Reservado').trim() === clasif);
    }
    if (origen !== 'TODOS') {
      list = list.filter(d => (d.origen_canal || 'FLUJO_INTERNO') === origen);
    }
    if (tag !== 'TODAS') {
      list = list.filter(d => Array.isArray(d.etiquetas) && d.etiquetas.includes(tag));
    }
    if (query) {
      list = list.filter(d =>
        (d.nombre && d.nombre.toLowerCase().includes(query)) ||
        (d.referencia && d.referencia.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.nombres && d.usuario_creacion.nombres.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.apellidos && d.usuario_creacion.apellidos.toLowerCase().includes(query)) ||
        (Array.isArray(d.etiquetas) && d.etiquetas.some(t => t.toLowerCase().includes(query)))
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

  readonly docsUnidadCopiaFiltrados = computed(() => {
    const data = this.dataUnidadActual();
    if (!data || !data.documentos_copia) return [];

    const tipo = this.tipoFiltroUnidad();
    if (tipo === 'TODOS') return data.documentos_copia;

    return data.documentos_copia.filter((d: any) => (d.nombre_plantilla || '').trim() === tipo);
  });

  ngOnInit(): void {
    // Determinar pestaña inicial según permisos locales antes de consultar al servidor
    if (this.puedeVerGeneral()) {
      this.nivelActivo.set('general');
    } else if (this.puedeVerUnidad()) {
      this.nivelActivo.set('unidad');
    } else {
      this.nivelActivo.set('institucional');
    }

    this.route.params.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'general' && this.puedeVerGeneral()) {
        this.nivelActivo.set('general');
      } else if (tipo === 'unidad' && this.puedeVerUnidad()) {
        this.nivelActivo.set('unidad');
      } else if (tipo === 'institucional') {
        this.nivelActivo.set('institucional');
      } else if (tipo === 'estadisticas' && this.puedeVerEstadisticas()) {
        this.nivelActivo.set('estadisticas');
      }
      this.cargarDatos();
    });

    this.cargarPermisosArchivo();
  }

  cargarPermisosArchivo(): void {
    this.http.get<any>('/api/v1/archivo/permisos').subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.permisosServidor.set(res.datos);
          const actual = this.nivelActivo();
          if (actual === 'general' && !this.puedeVerGeneral()) {
            this.cambiarNivel(this.puedeVerUnidad() ? 'unidad' : 'institucional');
          } else if (actual === 'unidad' && !this.puedeVerUnidad()) {
            this.cambiarNivel('institucional');
          }
        }
      },
      error: () => {}
    });
  }

  cambiarNivel(nivel: 'general' | 'unidad' | 'institucional' | 'estadisticas'): void {
    if (nivel === 'general' && !this.puedeVerGeneral()) return;
    if (nivel === 'unidad' && !this.puedeVerUnidad()) return;
    this.cerrarVisor();
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
    } else if (nivel === 'estadisticas') {
      this.cargarEstadisticas();
    }
  }

  cargarArchivoGeneral(): void {
    if (!this.puedeVerGeneral()) return;
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/general').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.unidadesGeneral.set(res.datos.unidades || []);
          this.docsGeneral.set(res.datos.documentos || []);
          this.tiposDisponiblesGeneral.set(res.datos.tipos_disponibles || []);
          this.etiquetasDisponiblesGeneral.set(res.datos.etiquetas_disponibles || []);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al consultar archivo general', 'Cerrar', { duration: 3500 });
      }
    });
  }

  cargarArchivoUnidad(): void {
    if (!this.puedeVerUnidad()) return;
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
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al consultar archivo de la unidad', 'Cerrar', { duration: 3500 });
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

  cargarEstadisticas(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/estadisticas').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.estadisticasData.set(res.datos);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar estadísticas de archivo y ventanilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  filtrarTipoGeneral(tipo: string): void {
    this.tipoFiltroGeneral.set(tipo);
  }

  tieneFiltrosActivosGeneral(): boolean {
    return (
      this.unidadFiltroGeneral() !== 'TODAS' ||
      this.tipoFiltroGeneral() !== 'TODOS' ||
      this.clasificacionFiltroGeneral() !== 'TODAS' ||
      this.origenFiltroGeneral() !== 'TODOS' ||
      this.etiquetaFiltroGeneral() !== 'TODAS' ||
      Boolean((this.filtroGeneralCtrl.value || '').trim())
    );
  }

  limpiarFiltrosGeneral(): void {
    this.unidadFiltroGeneral.set('TODAS');
    this.tipoFiltroGeneral.set('TODOS');
    this.clasificacionFiltroGeneral.set('TODAS');
    this.origenFiltroGeneral.set('TODOS');
    this.etiquetaFiltroGeneral.set('TODAS');
    this.filtroGeneralCtrl.setValue('');
  }

  contarDocsPorTipo(tipo: string): number {
    return this.docsGeneral().filter(d => (d.nombre_plantilla || '').trim() === tipo).length;
  }

  private tieneSubmenuMenu(ruta: string, idMenu: number): boolean {
    const menus = this.authService.currentMenu() || [];
    const arch = menus.find((m: any) => m.label?.toUpperCase() === 'ARCHIVO' || m.id_menu === 35);
    const subs: any[] = Array.isArray(arch?.submenu) ? arch.submenu : [];
    return subs.some((s: any) => s.id_menu === idMenu || (s.url || '').toLowerCase() === ruta);
  }

  puedeVerGeneral(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.ver_archivo_general === 'boolean') return srv.ver_archivo_general;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      /\bsecretar(ia|io|ía)\b/i.test(cargo) ||
      this.tieneSubmenuMenu('archivo/general', 37)
    );
  }

  puedeVerUnidad(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.ver_archivo_unidad === 'boolean') return srv.ver_archivo_unidad;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('JEFE') ||
      /\b(jefe|subjefe|sub\s*jefe|responsable|director|directora|presidente|presidenta|gerente|encargado|encargada|coordinador|coordinadora)\b/i.test(cargo) ||
      this.tieneSubmenuMenu('archivo/unidad', 38)
    );
  }

  puedeVerEstadisticas(): boolean {
    return (
      this.puedeVerGeneral() ||
      this.puedeVerUnidad() ||
      this.authService.hasRole('CORRESPONDENCIA')
    );
  }

  /**
   * Elevar un documento existente a Archivo Institucional:
   * EXCLUSIVO para Jefe de Unidad Padre o MAE (y Admin).
   */
  puedePromover(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.promover_a_institucional === 'boolean') return srv.promover_a_institucional;
    if (this.esAdminOMae()) return true;
    const esJefe = this.authService.hasRole('JEFE');
    const dataU = this.dataUnidadActual();
    if (dataU && typeof dataU.es_unidad_padre === 'boolean') {
      return esJefe && dataU.es_unidad_padre;
    }
    return esJefe;
  }

  /**
   * Cargar un documento externo a Archivo Institucional:
   * EXCLUSIVO para MAE o Secretaría (y Admin).
   */
  puedeCargarExternoInstitucional(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.cargar_externo_institucional === 'boolean') return srv.cargar_externo_institucional;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      /\bsecretar(ia|io|ía)\b/i.test(cargo)
    );
  }

  puedeEtiquetar(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.etiquetar_documentos === 'boolean') return srv.etiquetar_documentos;
    return this.puedeVerGeneral() || this.puedeVerUnidad();
  }

  puedeVersionar(): boolean {
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      this.puedePromover()
    );
  }

  esAdminOMae(): boolean {
    return (
      this.authService.hasRole('ADMIN') ||
      this.authService.hasRole('MAE') ||
      this.authService.isMae()
    );
  }

  abrirModalEtiquetas(doc: DocumentoArchivo): void {
    this.docAEtiquetar.set(doc);
    this.etiquetasEdicion.set(Array.isArray(doc.etiquetas) ? [...doc.etiquetas] : []);
    this.clasificacionEdicion.set(doc.clasificacion || 'Reservado');
    this.nuevaEtiquetaCtrl.setValue('');
  }

  cerrarModalEtiquetas(): void {
    this.docAEtiquetar.set(null);
  }

  toggleEtiquetaEdicion(tag: string): void {
    const actual = [...this.etiquetasEdicion()];
    const idx = actual.indexOf(tag);
    if (idx >= 0) {
      actual.splice(idx, 1);
    } else {
      actual.push(tag);
    }
    this.etiquetasEdicion.set(actual);
  }

  agregarEtiquetaCustom(): void {
    const val = (this.nuevaEtiquetaCtrl.value || '').replace(/^#+/, '').trim();
    if (!val) return;
    const actual = [...this.etiquetasEdicion()];
    if (!actual.includes(val)) {
      actual.push(val);
      this.etiquetasEdicion.set(actual);
    }
    this.nuevaEtiquetaCtrl.setValue('');
  }

  guardarEtiquetasDoc(): void {
    const doc = this.docAEtiquetar();
    if (!doc) return;
    this.guardando.set(true);
    this.http.post<any>(`/api/v1/archivo/etiquetas/${doc.id_documento}`, {
      etiquetas: this.etiquetasEdicion(),
      clasificacion: this.clasificacionEdicion()
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          doc.etiquetas = res.datos?.etiquetas || this.etiquetasEdicion();
          doc.clasificacion = res.datos?.clasificacion || this.clasificacionEdicion();
          this.snackBar.open('Clasificación y etiquetas actualizadas correctamente', 'Aceptar', { duration: 3000 });
          this.cerrarModalEtiquetas();
          this.cargarDatos();
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al guardar etiquetas', 'Cerrar', { duration: 3000 });
      }
    });
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
    if (lower.includes('reglamento interno') && lower.includes('personal')) return 'RIP';
    if (lower.includes('reglamento interno') && lower.includes('trabajo')) return 'RIT';
    if (lower.includes('estatuto')) return 'EO';
    if (lower.includes('codigo de etica') || lower.includes('código de ética')) return 'CE';
    if (lower.includes('manual') && (lower.includes('funciones') || lower.includes('organizacion') || lower.includes('organización'))) return 'MOF';
    if (lower.includes('plan operativo')) return 'POA';
    if (lower.includes('plan estrategico') || lower.includes('plan estratégico')) return 'PEI';
    if (lower.includes('resolucion de directorio') || lower.includes('resolución de directorio')) return 'RD';
    if (lower.includes('convenio')) return 'CI';

    const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'para', 'a', 'con', 'por', 'sobre', 'al', 'o', 'e', 'un', 'una']);
    const palabras = clean
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 0 && !stopwords.has(p.toLowerCase()));
    if (palabras.length === 0) return 'DOC';
    if (palabras.length === 1) return palabras[0].substring(0, 3).toUpperCase();
    return palabras.map(p => p[0].toUpperCase()).join('');
  }

  onNombreDocumentoChange(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = this.derivarSiglaFront(nom);
    this.cargaForm.get('sigla')?.setValue(sig, { emitEvent: false });
    this.actualizarProximoCite();
  }

  onSiglaChange(): void {
    const raw = this.cargaForm.get('sigla')?.value || '';
    const sigUpper = raw.toUpperCase();
    if (raw !== sigUpper) {
      this.cargaForm.get('sigla')?.setValue(sigUpper, { emitEvent: false });
    }
    this.actualizarProximoCite();
  }

  onAnioChange(): void {
    this.actualizarProximoCite();
  }

  actualizarProximoCite(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = (this.cargaForm.get('sigla')?.value || this.derivarSiglaFront(nom) || 'DOC').toUpperCase();
    const anio = this.cargaForm.get('anio')?.value || new Date().getFullYear();

    this.http.get<any>(`/api/v1/archivo/institucional/proximo-cite?nombre=${encodeURIComponent(nom)}&sigla=${encodeURIComponent(sig)}&anio=${anio}`)
      .subscribe({
        next: (res) => {
          if (res.tipoMensaje === 'EXITO' && res.datos?.cite) {
            this.citeCalculadoPreview.set(res.datos.cite.toUpperCase());
          } else {
            this.citeCalculadoPreview.set(`MARABUNTA/${sig}/1/${anio}`);
          }
        },
        error: () => {
          this.citeCalculadoPreview.set(`MARABUNTA/${sig}/1/${anio}`);
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
      nombre_documento: '',
      sigla: '',
      anio: new Date().getFullYear(),
      categoria: 'Documento Institucional',
      descripcion: '',
      observacion: '',
      difundir_todos: true
    });
    this.nombreArchivoCarga.set(null);
    this.archivoPdfBase64 = null;
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
      const reader = new FileReader();
      reader.onload = () => {
        this.archivoPdfBase64 = reader.result as string;
      };
      reader.readAsDataURL(f);
    }
  }

  guardarDocumentoInstitucional(): void {
    if (this.cargaForm.invalid) return;

    this.guardando.set(true);
    const v = this.cargaForm.value;
    const user = this.authService.currentUser() as any;
    const siglaUpper = (v.sigla || 'DOC').toUpperCase();

    this.http.post<any>('/api/v1/archivo/institucional/cargar', {
      nombre_documento: v.nombre_documento,
      sigla: siglaUpper,
      anio: v.anio,
      categoria: v.categoria || 'Documento Institucional',
      descripcion: v.descripcion,
      observacion: v.observacion,
      nombre_archivo: this.nombreArchivoCarga() || `${siglaUpper}_v1.pdf`,
      archivo_base64: this.archivoPdfBase64,
      archivo_adjunto: this.archivoPdfBase64,
      url_archivo: `/public/documentos/${this.citeCalculadoPreview().toUpperCase().replace(/\//g, '_')}.pdf`,
      difundir_todos: !!v.difundir_todos,
      audit_usuario: user
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.cerrarModalCarga();
        const citeAsignado = (res.datos?.nombre || this.citeCalculadoPreview()).toUpperCase();
        this.snackBar.open(`¡Documento emitido y difundido con CITE: ${citeAsignado}!`, 'Aceptar', { duration: 5000 });
        this.cargarArchivoInstitucional();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al cargar documento institucional', 'Cerrar', { duration: 4000 });
      }
    });
  }

  difundirGlobalmente(doc: DocumentoArchivo): void {
    if (!confirm(`¿Desea difundir el documento ${doc.nombre} a los correos de todos los usuarios y al Grupo Institucional de WhatsApp?`)) {
      return;
    }
    this.http.post<any>(`/api/v1/archivo/difundir/${doc.id_documento}`, {}).subscribe({
      next: (res) => {
        this.snackBar.open(res.mensaje || `Difusión global ejecutada para ${doc.nombre}`, 'Aceptar', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al ejecutar difusión global', 'Cerrar', { duration: 3500 });
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

  @HostListener('window:resize')
  onResize(): void {
    if (this.docSeleccionado() && this.modoEscalaVisor() === 'fit') {
      this.recalcularEscalaFitVisor();
    }
    if (this.esModoPdfCanvas() && this.loadedPdfDocument) {
      this.renderizarPaginaActualPdf();
    }
  }

  recalcularEscalaFitVisor(): void {
    if (this.modoEscalaVisor() !== 'fit') return;
    const vp = this.visorViewport?.nativeElement;
    if (!vp) return;
    const availW = vp.clientWidth;
    if (!availW) return;

    // Estandarización exacta: el contenido ocupa todo el ancho útil del visor (restando los 24px de padding lateral)
    const innerWidth = Math.max(availW - 24, 260);
    const canW = this.canonicalWidthVisor();
    let fit = innerWidth / canW;
    fit = Math.max(0.3, Math.min(fit, 1.4));
    fit = Math.round(fit * 1000) / 1000;

    this.escalaVisor.set(fit);
    this.cdr.markForCheck();
  }

  ajustarZoomVisor(delta: number): void {
    this.modoEscalaVisor.set('custom');
    if (this.esModoPdfCanvas()) {
      const actual = this.zoomPdfFactor();
      const nuevo = Math.max(0.4, Math.min(+(actual + delta).toFixed(2), 2.2));
      this.zoomPdfFactor.set(nuevo);
      this.renderizarPaginaActualPdf();
      this.cdr.markForCheck();
      return;
    }
    const actual = this.escalaVisor();
    const nuevo = Math.max(0.25, Math.min(+(actual + delta).toFixed(2), 1.8));
    this.escalaVisor.set(nuevo);
    this.cdr.markForCheck();
  }

  setModoFitVisor(): void {
    this.modoEscalaVisor.set('fit');
    if (this.esModoPdfCanvas()) {
      this.zoomPdfFactor.set(1.0);
      this.renderizarPaginaActualPdf();
      this.cdr.markForCheck();
      return;
    }
    this.recalcularEscalaFitVisor();
  }

  tienePlantillaFormly(doc: any): boolean {
    if (!doc || !doc.plantilla) return false;
    try {
      const p = typeof doc.plantilla === 'string' ? JSON.parse(doc.plantilla) : doc.plantilla;
      return Array.isArray(p) && p.length > 0;
    } catch {
      return false;
    }
  }

  seleccionarDocumento(doc: DocumentoArchivo): void {
    if (!doc || !doc.id_documento) return;
    this.docSeleccionado.set(doc);
    this.cargandoVisor.set(true);
    this.errorVisor.set(null);
    this.htmlVisorSeguro.set(null);
    this.urlPdfSegura.set(null);
    this.esModoPdfCanvas.set(false);

    if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setTimeout(() => {
        const el = document.querySelector('.visor-embebido-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    // 1. Si no tiene plantilla Formly interactiva (documento PDF escaneado / institucional subido)
    const tieneFormly = this.tienePlantillaFormly(doc);
    if (!tieneFormly) {
      // Streaming progresivo directo con PDF.js vía HTTP Range (Carga instantánea de página 1)
      this.cargarPdfEnCanvas(`/api/v1/documento/${doc.id_documento}/pdf`);
      return;
    }

    // 2. Documento interactivo redactado en Formly
    this.cargarPreviewHtml(doc);
  }

  cargarPreviewHtml(doc: DocumentoArchivo): void {
    this.documentosService.obtenerVistaPreviaHtml(doc.id_documento || doc.nombre).subscribe({
      next: (res) => {
        if (res.datos?.esPdf || (!res.datos?.html && res.datos?.pdfUrl)) {
          const pdfUrl = res.datos?.pdfUrl || `/api/v1/documento/${doc.id_documento}/pdf`;
          this.cargarPdfEnCanvas(pdfUrl);
          return;
        }

        this.cargandoVisor.set(false);
        this.esModoPdfCanvas.set(false);
        if (res.datos?.tipoHoja === 'Oficio' || res.datos?.tipoHoja === 'Legal') {
          this.tipoHojaVisor.set('Oficio');
        } else {
          this.tipoHojaVisor.set('Letter');
        }
        const orientacion = (res.datos as any)?.orientacion;
        if (orientacion === 'Horizontal' || orientacion === 'Landscape' || orientacion === 'horizontal') {
          this.orientacionHojaVisor.set('Horizontal');
        } else {
          this.orientacionHojaVisor.set('Vertical');
        }
        const html = res.datos?.html || '<p class="text-muted">No se pudo cargar la visualización del documento.</p>';
        this.htmlVisorSeguro.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.cdr.markForCheck();
        setTimeout(() => this.recalcularEscalaFitVisor(), 40);
      },
      error: () => {
        this.cargandoVisor.set(false);
        this.errorVisor.set('No se pudo cargar la visualización del documento.');
        this.cdr.markForCheck();
      }
    });
  }

  async cargarPdfEnCanvas(src: any): Promise<void> {
    try {
      this.cargandoVisor.set(true);
      this.errorVisor.set(null);
      this.esModoPdfCanvas.set(true);
      this.urlPdfSegura.set(null);
      this.htmlVisorSeguro.set(null);
      this.zoomPdfFactor.set(1.0);
      this.modoEscalaVisor.set('fit');

      if (this.renderTaskEnCurso) {
        try { this.renderTaskEnCurso.cancel(); } catch {}
        this.renderTaskEnCurso = null;
      }

      const docParam: any = typeof src === 'string'
        ? { url: src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true }
        : (src && src.url
            ? { ...src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true }
            : { data: src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true });

      const loadingTask = pdfjsLib.getDocument(docParam);
      const pdfDoc = await loadingTask.promise;
      this.loadedPdfDocument = pdfDoc;
      this.totalPaginasPdf.set(pdfDoc.numPages || 1);
      this.paginaActualPdf.set(1);
      this.cargandoVisor.set(false);
      this.cdr.detectChanges();

      setTimeout(() => {
        this.renderizarPaginaActualPdf();
      }, 30);
    } catch (err: any) {
      console.error('Error cargando documento PDF con PDF.js:', err);
      this.cargandoVisor.set(false);
      this.esModoPdfCanvas.set(false);
      this.errorVisor.set('No se pudo procesar el archivo PDF para previsualización.');
      this.cdr.markForCheck();
    }
  }

  irAPaginaPdf(num: number): void {
    if (!this.loadedPdfDocument) return;
    const total = this.totalPaginasPdf();
    if (num < 1 || num > total || num === this.paginaActualPdf()) return;
    this.paginaActualPdf.set(num);
    this.cdr.markForCheck();
    setTimeout(() => {
      this.renderizarPaginaActualPdf();
    }, 20);
  }

  async renderizarPaginaActualPdf(): Promise<void> {
    if (!this.loadedPdfDocument) return;
    const canvasEl = this.pdfCanvas?.nativeElement || (document.getElementById('pdf-canvas-principal') as HTMLCanvasElement);
    if (!canvasEl) {
      setTimeout(() => this.renderizarPaginaActualPdf(), 50);
      return;
    }

    if (this.renderTaskEnCurso) {
      try { this.renderTaskEnCurso.cancel(); } catch {}
      this.renderTaskEnCurso = null;
    }

    try {
      const pageNum = this.paginaActualPdf();
      const page = await this.loadedPdfDocument.getPage(pageNum);

      const wrapper = this.pdfCanvasWrapper?.nativeElement || canvasEl.parentElement;
      const availableWidth = wrapper ? Math.max(wrapper.clientWidth, 260) : 600;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const esHorizontal = unscaledViewport.width > unscaledViewport.height;
      const rawRatio = esHorizontal
        ? (unscaledViewport.width / unscaledViewport.height)
        : (unscaledViewport.height / unscaledViewport.width);

      // Estandarización estricta a los dos únicos formatos institucionales: CARTA (1.2941) y OFICIO (1.5294)
      const esOficio = rawRatio > 1.41;
      this.orientacionHojaVisor.set(esHorizontal ? 'Horizontal' : 'Vertical');
      this.tipoHojaVisor.set(esOficio ? 'Oficio' : 'Letter');
      this.cdr.markForCheck();

      const stdRatio = esOficio ? (1248 / 816) : (1056 / 816);
      const targetWidth = Math.round(availableWidth * this.zoomPdfFactor());
      const targetHeight = Math.round(esHorizontal ? (targetWidth / stdRatio) : (targetWidth * stdRatio));

      const effectiveScale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: effectiveScale });

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

      canvasEl.width = Math.floor(viewport.width * dpr);
      canvasEl.height = Math.floor(viewport.height * dpr);
      canvasEl.style.width = `${targetWidth}px`;
      canvasEl.style.height = `${targetHeight}px`;

      const context = canvasEl.getContext('2d', { alpha: false });
      if (!context) return;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      this.renderTaskEnCurso = page.render(renderContext);
      await this.renderTaskEnCurso.promise;
      this.renderTaskEnCurso = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Error al renderizar página PDF en canvas:', err);
      }
    }
  }

  reintentarCargaVisor(): void {
    const doc = this.docSeleccionado();
    if (doc) {
      this.seleccionarDocumento(doc);
    }
  }

  cerrarVisor(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    if (this.renderTaskEnCurso) {
      try { this.renderTaskEnCurso.cancel(); } catch {}
      this.renderTaskEnCurso = null;
    }
    this.loadedPdfDocument = null;
    this.docSeleccionado.set(null);
    this.esModoPdfCanvas.set(false);
    this.urlPdfSegura.set(null);
    this.htmlVisorSeguro.set(null);
    this.cargandoVisor.set(false);
    this.errorVisor.set(null);
  }

  verDocEnVisor(doc: any): void {
    if (!doc) return;
    this.cerrarVersiones();
    this.seleccionarDocumento(doc);
  }

  verPdf(doc: any): void {
    if (!doc) return;
    this.seleccionarDocumento(doc);
  }

  descargarPdf(doc: any): void {
    this.verPdf(doc);
  }

  descargarArchivoFisico(doc: any): void {
    if (!doc || !doc.id_documento) return;
    if (this.currentObjectUrl) {
      const a = document.createElement('a');
      a.href = this.currentObjectUrl;
      a.download = `${doc.nombre || 'documento'}.pdf`;
      a.click();
      return;
    }
    this.http.get(`/api/v1/documento/${doc.id_documento}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.nombre || 'documento'}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.snackBar.open('Error al descargar archivo PDF', 'Cerrar', { duration: 3000 });
      }
    });
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
