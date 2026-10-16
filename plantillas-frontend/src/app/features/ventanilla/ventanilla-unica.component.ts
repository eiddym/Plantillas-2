import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { AuthService } from '../../core/auth/auth.service';
import { SeguridadService, Unidad } from '../../core/services/seguridad.service';

export interface JefeUnidad {
  id_usuario: number;
  usuario: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  email: string;
  fid_unidad: number;
  es_mae?: boolean;
  unidad?: {
    id_unidad: number;
    nombre: string;
    abreviacion?: string;
  };
}

export interface DocumentoVentanilla {
  id_documento: number;
  nombre: string; // CITE oficial o HR si no tiene CITE
  referencia: string;
  codigo_hoja_ruta: string;
  origen_radicacion: 'EXTERNA' | 'INTERNA';
  estado: string;
  nombre_plantilla?: string;
  abreviacion?: string;
  para?: string;
  de?: string;
  observaciones?: string;
  archivo_adjunto?: string;
  datos_remitente?: {
    ci?: string;
    remitente?: string;
    email?: string;
    telefono?: string;
    entidad?: string;
    tipoTramite?: string;
    citeExterno?: string;
    referencia?: string;
    fojas?: number;
    prioridad?: string;
    fecha_radicacion?: string;
  };
  fecha?: string;
  _fecha_creacion?: string;
}

@Component({
  selector: 'app-ventanilla-unica',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatRadioModule
  ],
  template: `
    <div class="vu-page-container">
      <!-- Encabezado de la Sección Ventanilla Única -->
      <header class="vu-header">
        <div class="header-left">
          <div class="header-icon-box">
            <mat-icon>{{ tipoActivo() === 'externa' ? 'cloud_download' : 'edit_document' }}</mat-icon>
          </div>
          <div>
            <div class="header-badge">
              <mat-icon>security</mat-icon>
              <span>Gestión Central de Correspondencia y Despacho</span>
            </div>
            <h1 class="header-title">
              {{ tipoActivo() === 'externa' ? 'Ventanilla Externa - Bandeja Virtual' : 'Ventanilla Interna - Recepción Presencial' }}
            </h1>
            <p class="header-desc">
              {{ tipoActivo() === 'externa' 
                ? 'Verificación, revisión de recaudos y derivación a Unidades o MAE de correspondencia radicada en portal virtual' 
                : 'Generación inmediata de Hoja de Ruta para el usuario físico, edición previa de recaudos y carga de PDF escaneado' }}
            </p>
          </div>
        </div>

        <div class="header-right">
          <!-- Botón sólo en Ventanilla Interna -->
          @if (tipoActivo() === 'interna') {
            <button mat-flat-button class="btn-primary-action" (click)="abrirModalGenerarHR()">
              <mat-icon>note_add</mat-icon>
              <span>Generar Hoja de Ruta</span>
            </button>
          }
        </div>
      </header>

      <!-- Selector de Submódulos (Hijos Externa / Interna) -->
      <nav class="vu-tabs-nav">
        <button 
          type="button" 
          class="vu-tab-btn" 
          [class.active]="tipoActivo() === 'externa'"
          (click)="cambiarTipo('externa')"
        >
          <mat-icon>cloud_download</mat-icon>
          <div class="tab-txt">
            <strong>Ventanilla Externa</strong>
            <span>Correspondencia Virtual ({{ totalExterna() }})</span>
          </div>
        </button>

        <button 
          type="button" 
          class="vu-tab-btn" 
          [class.active]="tipoActivo() === 'interna'"
          (click)="cambiarTipo('interna')"
        >
          <mat-icon>edit_document</mat-icon>
          <div class="tab-txt">
            <strong>Ventanilla Interna</strong>
            <span>Recepción Presencial ({{ totalInterna() }})</span>
          </div>
        </button>
      </nav>

      <!-- Tabla y Bandeja de Correspondencia -->
      <section class="table-section">
        <div class="table-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3 class="toolbar-title">
                <mat-icon>inbox</mat-icon>
                <span>Bandeja de Documentos: {{ tipoActivo() === 'externa' ? 'Canal Virtual' : 'Canal Presencial' }} ({{ documentosFiltrados().length }})</span>
              </h3>
            </div>
            <div class="toolbar-right">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Buscar por HR, CITE o Remitente</mat-label>
                <input matInput [formControl]="filtroCtrl" placeholder="Filtrar bandeja...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              <button mat-icon-button (click)="cargarBandeja()" matTooltip="Refrescar bandeja" class="btn-refresh">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>

          @if (cargando()) {
            <div class="loading-state">
              <mat-spinner diameter="44"></mat-spinner>
              <p>Consultando registros de ventanilla...</p>
            </div>
          } @else if (documentosFiltrados().length === 0) {
            <div class="empty-state">
              <mat-icon>drafts</mat-icon>
              <h3>No hay correspondencia en esta bandeja</h3>
              <p>Los trámites radicados aparecerán aquí para su respectiva verificación y despacho.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table mat-table [dataSource]="documentosFiltrados()" class="modern-vu-table">
                <!-- Columna Código Hoja de Ruta -->
                <ng-container matColumnDef="hoja_ruta">
                  <th mat-header-cell *matHeaderCellDef>Hoja de Ruta</th>
                  <td mat-cell *matCellDef="let doc">
                    <div class="hr-badge-cell">
                      <mat-icon class="hr-icon">markunread_mailbox</mat-icon>
                      <strong class="hr-code">{{ doc.codigo_hoja_ruta || doc.nombre }}</strong>
                    </div>
                  </td>
                </ng-container>

                <!-- Columna CITE Oficial / Estado CITE -->
                <ng-container matColumnDef="cite_oficial">
                  <th mat-header-cell *matHeaderCellDef>CITE Oficial</th>
                  <td mat-cell *matCellDef="let doc">
                    @if (tieneCiteOficial(doc)) {
                      <span class="cite-approved-tag" [matTooltip]="'Plantilla Documento Externo (DE-A)'">
                        <mat-icon>verified</mat-icon>
                        {{ doc.nombre }}
                      </span>
                    } @else {
                      <span class="cite-pending-tag" matTooltip="Aún sin CITE oficial. Se generará tras aprobación.">
                        <mat-icon>hourglass_empty</mat-icon>
                        Sin CITE (En Trámite)
                      </span>
                    }
                  </td>
                </ng-container>

                <!-- Columna Remitente & Entidad -->
                <ng-container matColumnDef="remitente">
                  <th mat-header-cell *matHeaderCellDef>Remitente & Entidad</th>
                  <td mat-cell *matCellDef="let doc">
                    <div class="sender-box">
                      <span class="sender-name">{{ doc.datos_remitente?.remitente || doc.de || 'Ciudadano' }}</span>
                      <span class="sender-inst">{{ doc.datos_remitente?.entidad || 'Persona Natural' }}</span>
                      @if (doc.datos_remitente?.ci) {
                        <span class="sender-ci">CI/NIT: {{ doc.datos_remitente?.ci }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Referencia / Asunto -->
                <ng-container matColumnDef="referencia">
                  <th mat-header-cell *matHeaderCellDef>Referencia / Asunto</th>
                  <td mat-cell *matCellDef="let doc">
                    <div class="ref-box" [matTooltip]="doc.referencia">
                      <p class="ref-text">{{ doc.referencia }}</p>
                      @if (doc.datos_remitente?.citeExterno) {
                        <span class="ext-cite">Nota Externa: {{ doc.datos_remitente?.citeExterno }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Destino / Estado -->
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado & Destino</th>
                  <td mat-cell *matCellDef="let doc">
                    <div class="status-cell">
                      <span class="status-chip" [class.nuevo]="doc.estado === 'NUEVO'" [class.derivado]="doc.estado === 'DERIVADO'" [class.aprobado]="doc.estado === 'APROBADO'">
                        {{ doc.estado }}
                      </span>
                      @if (doc.para && doc.estado !== 'NUEVO') {
                        <span class="dest-txt" [matTooltip]="doc.para">
                          <mat-icon>trending_flat</mat-icon>
                          {{ doc.para }}
                        </span>
                      }
                    </div>
                  </td>
                </ng-container>

                <!-- Columna Fecha -->
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha Ingreso</th>
                  <td mat-cell *matCellDef="let doc">
                    <span class="date-txt">{{ (doc.fecha || doc._fecha_creacion) | date:'dd/MM/yyyy HH:mm' }}</span>
                  </td>
                </ng-container>

                <!-- Columna Acciones -->
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let doc">
                    <div class="action-buttons-cell">
                      <!-- Ver PDF Adjunto si existe -->
                      @if (doc.archivo_adjunto) {
                        <button mat-icon-button class="btn-action-view" (click)="verAdjuntoPdf(doc)" matTooltip="Ver Documento PDF Adjunto">
                          <mat-icon>picture_as_pdf</mat-icon>
                        </button>
                      }

                      <!-- Ventanilla Interna: Editar antes de enviar y cargar PDF -->
                      @if (tipoActivo() === 'interna' && doc.estado === 'NUEVO') {
                        <button mat-icon-button class="btn-action-edit" (click)="abrirModalEditar(doc)" matTooltip="Editar antes de enviar / Cargar PDF">
                          <mat-icon>edit_document</mat-icon>
                        </button>
                      }

                      <!-- Derivar a MAE o Unidad (Aún sin CITE) -->
                      @if (doc.estado === 'NUEVO') {
                        <button mat-stroked-button class="btn-action-derivar" (click)="abrirModalDerivacion(doc)" matTooltip="Derivar a Unidad o directamente a la MAE">
                          <mat-icon>send</mat-icon>
                          <span>Derivar</span>
                        </button>
                      }

                      <!-- Acción de Aprobación (genera CITE oficial Documento Externo) -->
                      @if (doc.estado === 'DERIVADO' && !tieneCiteOficial(doc)) {
                        <button mat-flat-button class="btn-action-aprobar" (click)="aprobarTramite(doc)" matTooltip="Aprobar y Generar CITE Oficial Documento Externo (DE-A)">
                          <mat-icon>verified</mat-icon>
                          <span>Aprobar CITE</span>
                        </button>
                      }

                      <!-- Imprimir Rótulo / Hoja de Ruta -->
                      <button mat-icon-button class="btn-action-print" (click)="imprimirRotulo(doc)" matTooltip="Imprimir Rótulo de Hoja de Ruta">
                        <mat-icon>print</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columnas"></tr>
                <tr mat-row *matRowDef="let row; columns: columnas;" class="table-hover-row"></tr>
              </table>
            </div>
          }
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- MODAL 1: GENERAR HOJA DE RUTA INMEDIATA (Ventanilla Interna)   -->
      <!-- ============================================================== -->
      @if (modalGenerarVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <div class="m-title-icon">
                <mat-icon>add_task</mat-icon>
              </div>
              <div>
                <h2>Expedición de Hoja de Ruta Presencial</h2>
                <p>Formulario de recepción en ventanilla física para entrega inmediata de código al solicitante</p>
              </div>
              <button mat-icon-button (click)="modalGenerarVisible.set(false)" class="close-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="generarHRForm" (ngSubmit)="guardarGenerarHR()" class="modal-body-form">
              <div class="form-grid-modal">
                <mat-form-field appearance="outline">
                  <mat-label>Cédula de Identidad (CI) o NIT</mat-label>
                  <input matInput formControlName="ci" placeholder="Ej: 5491023 LP">
                  <mat-icon matSuffix>badge</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Nombre Completo del Remitente *</mat-label>
                  <input matInput formControlName="nombreCompleto" placeholder="Ej: Juan Quispe Apaza">
                  <mat-icon matSuffix>person</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Correo Electrónico (Notificación Automática)</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="correo@ejemplo.com">
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Teléfono o Celular</mat-label>
                  <input matInput formControlName="telefono" placeholder="Ej: 71234567">
                  <mat-icon matSuffix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Entidad / Institución (Opcional)</mat-label>
                  <input matInput formControlName="entidad" placeholder="Dejar vacío si es persona natural">
                  <mat-icon matSuffix>apartment</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Tipo de Trámite</mat-label>
                  <mat-select formControlName="tipoTramite">
                    <mat-option value="NOTA_OFICIAL">Nota Oficial Externa</mat-option>
                    <mat-option value="SOLICITUD">Solicitud Ciudadana</mat-option>
                    <mat-option value="INFORME_EXTERNO">Remisión de Informes / Descargos</mat-option>
                    <mat-option value="CONVENIO">Propuesta de Convenio</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>CITE / Número de Nota Externa</mat-label>
                  <input matInput formControlName="citeExterno" placeholder="Ej: CITE-EXT-01/2026">
                  <mat-icon matSuffix>tag</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Número de Fojas</mat-label>
                  <input matInput type="number" formControlName="fojas" placeholder="1">
                  <mat-icon matSuffix>description</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-span-full">
                  <mat-label>Referencia o Asunto Concreto *</mat-label>
                  <input matInput formControlName="referencia" placeholder="Describa el objeto de la solicitud con claridad">
                  <mat-icon matSuffix>subject</mat-icon>
                </mat-form-field>
              </div>

              @if (guardandoHR()) {
                <mat-progress-bar mode="indeterminate" class="mt-3"></mat-progress-bar>
              }

              <div class="modal-footer">
                <button type="button" mat-stroked-button (click)="modalGenerarVisible.set(false)">
                  <span>Cancelar</span>
                </button>
                <button type="submit" mat-flat-button class="btn-primary-action" [disabled]="generarHRForm.invalid || guardandoHR()">
                  <mat-icon>print</mat-icon>
                  <span>Generar Hoja de Ruta Inmediata</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL 2: TICKET DE ENTREGA INMEDIATA AL CIUDADANO             -->
      <!-- ============================================================== -->
      @if (ticketGenerado()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card ticket-card">
            <div class="ticket-header">
              <mat-icon>check_circle</mat-icon>
              <h2>Hoja de Ruta Generada con Éxito</h2>
              <p>Entregue este comprobante con el código de seguimiento al ciudadano en ventanilla</p>
            </div>

            <div class="ticket-body">
              <div class="ticket-code-box">
                <span class="t-lbl">CÓDIGO OFICIAL HOJA DE RUTA</span>
                <h1 class="t-code">{{ ticketGenerado()?.codigo_hoja_ruta }}</h1>
              </div>

              <div class="ticket-details">
                <div class="t-row">
                  <span>Remitente:</span>
                  <strong>{{ ticketGenerado()?.remitente }}</strong>
                </div>
                <div class="t-row">
                  <span>Referencia:</span>
                  <span>{{ ticketGenerado()?.referencia }}</span>
                </div>
                <div class="t-row">
                  <span>Fecha y Hora:</span>
                  <span>{{ ticketGenerado()?.fecha | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                </div>
              </div>
            </div>

            <div class="modal-footer justify-center">
              <button mat-flat-button class="btn-primary-action" (click)="imprimirTicketActual()">
                <mat-icon>print</mat-icon>
                <span>Imprimir Ticket de Comprobante</span>
              </button>
              <button mat-stroked-button (click)="cerrarTicket()">
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL 3: EDITAR ANTES DE ENVIAR Y CARGAR ADJUNTO PDF          -->
      <!-- ============================================================== -->
      @if (modalEditarVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <div class="m-title-icon edit-icon">
                <mat-icon>edit_note</mat-icon>
              </div>
              <div>
                <h2>Editar Hoja de Ruta antes de Enviar</h2>
                <p>Código: <strong>{{ docSeleccionado()?.codigo_hoja_ruta }}</strong> - Corrija datos y adjunte el PDF escaneado</p>
              </div>
              <button mat-icon-button (click)="modalEditarVisible.set(false)" class="close-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="editarForm" (ngSubmit)="guardarEdicion()" class="modal-body-form">
              <div class="form-grid-modal">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre Completo del Remitente</mat-label>
                  <input matInput formControlName="remitente">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>CI / NIT</mat-label>
                  <input matInput formControlName="ci">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Entidad / Institución</mat-label>
                  <input matInput formControlName="entidad">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>CITE / Nota Externa</mat-label>
                  <input matInput formControlName="citeExterno">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Número de Fojas</mat-label>
                  <input matInput type="number" formControlName="fojas">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Prioridad</mat-label>
                  <mat-select formControlName="prioridad">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="URGENTE">Urgente (48 hrs)</mat-option>
                    <mat-option value="MUY_URGENTE">Muy Urgente (Inmediato)</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="col-span-full">
                  <mat-label>Referencia o Asunto</mat-label>
                  <input matInput formControlName="referencia">
                </mat-form-field>
              </div>

              <!-- Carga de Archivo PDF Escaneado -->
              <div class="pdf-upload-box">
                <mat-icon class="pdf-icon">cloud_upload</mat-icon>
                <div class="pdf-upload-info">
                  <h4>Cargar Nota / Recaudos Escaneados en Formato PDF</h4>
                  <p>Adjunte el documento digitalizado con los sellos de recepción física para el expediente digital.</p>
                </div>
                <input type="file" #editFileInput (change)="onPdfSelected($event)" accept="application/pdf" style="display: none">
                <button type="button" mat-stroked-button (click)="editFileInput.click()" class="btn-select-pdf">
                  <mat-icon>attach_file</mat-icon>
                  <span>{{ nombreArchivoPdf() || (docSeleccionado()?.archivo_adjunto ? 'PDF ya cargado (clic para reemplazar)' : 'Seleccionar Archivo PDF') }}</span>
                </button>
              </div>

              @if (guardandoEdicion()) {
                <mat-progress-bar mode="indeterminate" class="mt-3"></mat-progress-bar>
              }

              <div class="modal-footer">
                <button type="button" mat-stroked-button (click)="modalEditarVisible.set(false)">
                  <span>Cancelar</span>
                </button>
                <button type="submit" mat-flat-button class="btn-primary-action" [disabled]="editarForm.invalid || guardandoEdicion()">
                  <mat-icon>save</mat-icon>
                  <span>Guardar Cambios y Adjunto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL 4: DERIVACIÓN A UNIDAD O DIRECTAMENTE A MAE (SIN CITE)  -->
      <!-- ============================================================== -->
      @if (modalDerivacionVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <div class="m-title-icon derivar-icon">
                <mat-icon>send</mat-icon>
              </div>
              <div>
                <h2>Derivar Documento al Flujo Institucional</h2>
                <p>Hoja de Ruta: <strong>{{ docSeleccionado()?.codigo_hoja_ruta }}</strong> - El trámite viaja <strong>aún sin CITE</strong></p>
              </div>
              <button mat-icon-button (click)="modalDerivacionVisible.set(false)" class="close-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="derivacionForm" (ngSubmit)="confirmarDerivacion()" class="modal-body-form">
              <!-- Mensaje informativo sobre CITE y Hoja de Ruta -->
              <div class="info-alert-callout">
                <mat-icon>info</mat-icon>
                <div>
                  <strong>Regla Institucional de Ventanilla:</strong>
                  <p>Al derivar el trámite, este ingresa a la bandeja de la unidad <strong>aún sin CITE</strong>, amparado en su Código de Hoja de Ruta. Tras su aprobación oficial por el Jefe o MAE, adoptará el CITE formal de la plantilla <strong>Documento Externo (DE-A)</strong>.</p>
                </div>
              </div>

              <!-- Selector de Destino: MAE o Unidad -->
              <div class="destino-selector-group">
                <span class="group-label">Destino de la Derivación:</span>
                <mat-radio-group formControlName="tipo_destino" class="radio-destinos">
                  <mat-radio-button value="MAE" class="dest-radio-opt">
                    <div class="opt-label">
                      <strong>Directamente a la MAE</strong>
                      <span>Dirección General Ejecutiva / Despacho Principal</span>
                    </div>
                  </mat-radio-button>
                  <mat-radio-button value="UNIDAD" class="dest-radio-opt">
                    <div class="opt-label">
                      <strong>A Unidad Operativa o Administrativa</strong>
                      <span>Derivar a jefatura competente</span>
                    </div>
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <!-- Selector de Jefe de Unidad si eligió UNIDAD -->
              @if (derivacionForm.get('tipo_destino')?.value === 'UNIDAD') {
                <mat-form-field appearance="outline" class="col-span-full">
                  <mat-label>Seleccione al Jefe de Unidad Responsable (Rol Jefe) *</mat-label>
                  <mat-select formControlName="id_usuario_destino">
                    @for (j of jefes(); track j.id_usuario) {
                      <mat-option [value]="j.id_usuario">
                        <strong>{{ j.nombres }} {{ j.apellidos }}</strong> — {{ j.cargo }} ({{ j.unidad?.nombre || j.unidad?.abreviacion || 'Unidad Asignada' }})
                      </mat-option>
                    }
                  </mat-select>
                  <mat-icon matSuffix>supervisor_account</mat-icon>
                </mat-form-field>
              }

              <!-- Proveído / Instrucción -->
              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Proveído o Instrucción de Despacho *</mat-label>
                <textarea matInput formControlName="proveido" rows="3" placeholder="Ej: Para su conocimiento, análisis técnico correspondiente y pronunciamiento formal."></textarea>
                <mat-icon matSuffix>assignment</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="col-span-full">
                <mat-label>Prioridad de Despacho</mat-label>
                <mat-select formControlName="prioridad">
                  <mat-option value="NORMAL">Normal</mat-option>
                  <mat-option value="URGENTE">Urgente (48 hrs)</mat-option>
                  <mat-option value="MUY_URGENTE">Muy Urgente (Inmediata)</mat-option>
                </mat-select>
              </mat-form-field>

              @if (guardandoDerivacion()) {
                <mat-progress-bar mode="indeterminate" class="mt-3"></mat-progress-bar>
              }

              <div class="modal-footer">
                <button type="button" mat-stroked-button (click)="modalDerivacionVisible.set(false)">
                  <span>Cancelar</span>
                </button>
                <button type="submit" mat-flat-button class="btn-primary-action" [disabled]="derivacionForm.invalid || guardandoDerivacion()">
                  <mat-icon>send</mat-icon>
                  <span>Confirmar Derivación (Sin CITE)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL 5: INSPECCIÓN DE ADJUNTO PDF EN POPUP (Misma Interfaz)   -->
      <!-- ============================================================== -->
      @if (modalPdfVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card pdf-viewer-modal">
            <div class="modal-header">
              <div class="m-title-icon pdf-icon-box">
                <mat-icon>picture_as_pdf</mat-icon>
              </div>
              <div class="pdf-modal-title">
                <h2>Inspección de Documento Adjunto Oficial</h2>
                <p>{{ pdfDocTitulo() }}</p>
              </div>
              <button mat-icon-button (click)="modalPdfVisible.set(false)" class="close-btn" matTooltip="Cerrar visor">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="pdf-viewer-body">
              <iframe [src]="pdfVisualizarUrl()" class="pdf-iframe-container" title="Visualizador de PDF Integrado"></iframe>
            </div>

            <div class="modal-footer">
              <button mat-flat-button class="btn-primary-action" (click)="modalPdfVisible.set(false)">
                <mat-icon>check</mat-icon>
                <span>Cerrar Visor</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .vu-page-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 22px;
      max-width: 1440px;
      margin: 0 auto;
      font-family: 'Inter', -apple-system, Roboto, sans-serif;
    }

    /* Header */
    .vu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      padding: 24px 32px;
      border-radius: 16px;
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.35);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-icon-box {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 180, 219, 0.35);
      mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
        color: #fff;
      }
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(0, 180, 219, 0.2);
      border: 1px solid rgba(0, 180, 219, 0.4);
      color: #00b4db;
      padding: 2px 10px;
      border-radius: 999px;
      margin-bottom: 6px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    .header-title {
      font-size: 23px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.3px;
    }

    .header-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin: 4px 0 0;
      max-width: 700px;
    }

    .btn-primary-action {
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%) !important;
      color: #fff !important;
      font-weight: 600;
      padding: 10px 22px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(0, 180, 219, 0.4);
    }

    /* Submódulos Tabs */
    .vu-tabs-nav {
      display: flex;
      gap: 14px;
    }

    .vu-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #64748b;
      }
      .tab-txt {
        display: flex;
        flex-direction: column;
        strong { font-size: 15px; color: #1e293b; }
        span { font-size: 12px; color: #64748b; margin-top: 2px; }
      }
    }

    .vu-tab-btn:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
    }

    .vu-tab-btn.active {
      border-color: #0083b0;
      background: #f0f9ff;
      box-shadow: 0 6px 18px rgba(0, 131, 176, 0.12);
      mat-icon { color: #0083b0; }
      strong { color: #0083b0; }
    }

    /* Table Section */
    .table-section {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .table-toolbar {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      mat-icon { color: #0083b0; }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-field {
      width: 320px;
      ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    }

    .btn-refresh {
      color: #64748b;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }

    .modern-vu-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;

      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 14px 18px;
        border-bottom: 2px solid #e2e8f0;
      }

      td {
        padding: 14px 18px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 13.5px;
        color: #334155;
      }
    }

    .table-hover-row:hover {
      background: #f8fafc;
    }

    .hr-badge-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      .hr-icon { color: #0083b0; font-size: 20px; width: 20px; height: 20px; }
      .hr-code { font-family: monospace; font-size: 13.5px; color: #0083b0; font-weight: 700; }
    }

    .cite-approved-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 11.5px;
      font-weight: 700;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .cite-pending-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .sender-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      .sender-name { font-weight: 600; color: #0f172a; }
      .sender-inst { font-size: 12px; color: #64748b; }
      .sender-ci { font-size: 11px; color: #94a3b8; }
    }

    .ref-box {
      max-width: 320px;
      .ref-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ext-cite {
        display: inline-block;
        font-size: 11px;
        color: #0284c7;
        margin-top: 3px;
        background: #f0f9ff;
        padding: 1px 6px;
        border-radius: 4px;
      }
    }

    .status-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .status-chip {
      display: inline-block;
      width: fit-content;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      &.nuevo { background: #e0f2fe; color: #0369a1; }
      &.derivado { background: #fef3c7; color: #92400e; }
      &.aprobado { background: #dcfce7; color: #166534; }
    }

    .dest-txt {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 170px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    .date-txt {
      font-size: 12.5px;
      color: #64748b;
    }

    .action-buttons-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-action-view {
      color: #dc2626 !important;
    }

    .btn-action-edit {
      color: #0284c7 !important;
    }

    .btn-action-derivar {
      color: #0083b0 !important;
      border-color: #0083b0 !important;
      font-size: 12px;
      height: 32px;
      line-height: 32px;
      padding: 0 10px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }
    }

    .btn-action-aprobar {
      background: #10b981 !important;
      color: #fff !important;
      font-size: 11.5px;
      height: 30px;
      line-height: 30px;
      padding: 0 10px;
      mat-icon { font-size: 15px; width: 15px; height: 15px; margin-right: 4px; }
    }

    .btn-action-print {
      color: #64748b !important;
    }

    /* Loading / Empty States */
    .loading-state, .empty-state {
      padding: 50px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #cbd5e1; }
      h3 { margin: 0; color: #334155; font-size: 17px; }
      p { margin: 0; font-size: 13px; max-width: 440px; }
    }

    /* Modales */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 18px;
      width: 100%;
      max-width: 760px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 22px 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      h2 { margin: 0; font-size: 19px; font-weight: 700; color: #0f172a; }
      p { margin: 3px 0 0; font-size: 13px; color: #64748b; }
      .close-btn { margin-left: auto; color: #94a3b8; }
    }

    .m-title-icon {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      &.edit-icon { background: #fef3c7; color: #b45309; }
      &.derivar-icon { background: #ecfdf5; color: #059669; }
    }

    .modal-body-form {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-grid-modal {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      .col-span-full { grid-column: 1 / -1; }
    }

    .pdf-upload-box {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      .pdf-icon { font-size: 34px; width: 34px; height: 34px; color: #0083b0; }
      h4 { margin: 0; font-size: 14px; color: #1e293b; }
      p { margin: 0; font-size: 12px; color: #64748b; max-width: 460px; }
      .btn-select-pdf { margin-top: 6px; }
    }

    .info-alert-callout {
      display: flex;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 5px solid #3b82f6;
      border-radius: 8px;
      padding: 14px 16px;
      color: #1e3a8a;
      mat-icon { color: #3b82f6; font-size: 24px; width: 24px; height: 24px; }
      strong { font-size: 13px; }
      p { margin: 4px 0 0; font-size: 12.5px; line-height: 1.4; color: #1e40af; }
    }

    .destino-selector-group {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      .group-label { font-size: 13px; font-weight: 700; color: #334155; }
    }

    .radio-destinos {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dest-radio-opt {
      .opt-label {
        display: flex;
        flex-direction: column;
        margin-left: 6px;
        strong { font-size: 14px; color: #0f172a; }
        span { font-size: 12px; color: #64748b; }
      }
    }

    .modal-footer {
      padding-top: 14px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      &.justify-center { justify-content: center; }
    }

    /* Ticket Card */
    .ticket-card {
      max-width: 520px;
      text-align: center;
      padding: 30px;
    }

    .ticket-header {
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #10b981; }
      h2 { margin: 10px 0 4px; font-size: 20px; color: #0f172a; }
      p { margin: 0; font-size: 13px; color: #64748b; }
    }

    .ticket-code-box {
      margin: 20px 0;
      background: #f0fdf4;
      border: 2px dashed #86efac;
      border-radius: 12px;
      padding: 16px;
      .t-lbl { font-size: 11px; font-weight: 700; color: #166534; letter-spacing: 0.5px; }
      .t-code { margin: 6px 0 0; font-size: 26px; color: #15803d; font-family: monospace; font-weight: 800; }
    }

    .ticket-details {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
      font-size: 13px;
      .t-row {
        display: flex;
        justify-content: space-between;
        span:first-child { color: #64748b; }
        strong, span:last-child { color: #1e293b; font-weight: 600; }
      }
    }

    /* PDF Viewer Modal Popup */
    .pdf-viewer-modal {
      max-width: 1100px;
      width: 94vw;
      height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .pdf-icon-box {
      background: #fef2f2 !important;
      color: #dc2626 !important;
    }

    .pdf-modal-title {
      flex: 1;
      h2 { margin: 0; font-size: 18px; color: #0f172a; font-weight: 700; }
      p { margin: 3px 0 0; font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 780px; }
    }

    .pdf-viewer-body {
      flex: 1;
      padding: 12px 20px;
      background: #f1f5f9;
      display: flex;
      overflow: hidden;
    }

    .pdf-iframe-container {
      width: 100%;
      height: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
    }

    .fade-in {
      animation: fadeIn 0.25s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class VentanillaUnicaComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly seguridadService = inject(SeguridadService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);

  private routeSub?: Subscription;

  readonly tipoActivo = signal<'externa' | 'interna'>('externa');
  readonly cargando = signal<boolean>(false);
  readonly guardandoHR = signal<boolean>(false);
  readonly guardandoEdicion = signal<boolean>(false);
  readonly guardandoDerivacion = signal<boolean>(false);

  readonly unidades = signal<Unidad[]>([]);
  readonly jefes = signal<JefeUnidad[]>([]);
  readonly documentosList = signal<DocumentoVentanilla[]>([]);
  readonly totalExterna = signal<number>(0);
  readonly totalInterna = signal<number>(0);

  readonly filtroCtrl = new FormControl('');

  // Modales y selección
  readonly modalGenerarVisible = signal<boolean>(false);
  readonly ticketGenerado = signal<any | null>(null);
  readonly modalEditarVisible = signal<boolean>(false);
  readonly modalDerivacionVisible = signal<boolean>(false);
  readonly modalPdfVisible = signal<boolean>(false);
  readonly pdfVisualizarUrl = signal<SafeResourceUrl | null>(null);
  readonly pdfDocTitulo = signal<string>('');

  readonly docSeleccionado = signal<DocumentoVentanilla | null>(null);
  readonly nombreArchivoPdf = signal<string | null>(null);
  archivoPdfBase64: string | null = null;

  // Formularios
  readonly generarHRForm = new FormGroup({
    ci: new FormControl(''),
    nombreCompleto: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.email]),
    telefono: new FormControl(''),
    entidad: new FormControl(''),
    tipoTramite: new FormControl('NOTA_OFICIAL', [Validators.required]),
    citeExterno: new FormControl(''),
    fojas: new FormControl(1, [Validators.min(1)]),
    referencia: new FormControl('', [Validators.required])
  });

  readonly editarForm = new FormGroup({
    remitente: new FormControl('', [Validators.required]),
    ci: new FormControl(''),
    entidad: new FormControl(''),
    citeExterno: new FormControl(''),
    fojas: new FormControl(1, [Validators.min(1)]),
    prioridad: new FormControl('NORMAL'),
    referencia: new FormControl('', [Validators.required])
  });

  readonly derivacionForm = new FormGroup({
    tipo_destino: new FormControl<'MAE' | 'UNIDAD'>('MAE', [Validators.required]),
    id_usuario_destino: new FormControl<number | null>(null),
    fid_unidad_destino: new FormControl<number | null>(null),
    proveido: new FormControl('', [Validators.required]),
    prioridad: new FormControl('NORMAL')
  });

  readonly columnas = ['hoja_ruta', 'cite_oficial', 'remitente', 'referencia', 'estado', 'fecha', 'acciones'];

  readonly documentosFiltrados = computed(() => {
    const list = this.documentosList();
    const filtro = (this.filtroCtrl.value || '').toLowerCase().trim();
    if (!filtro) return list;

    return list.filter(d =>
      (d.codigo_hoja_ruta && d.codigo_hoja_ruta.toLowerCase().includes(filtro)) ||
      (d.nombre && d.nombre.toLowerCase().includes(filtro)) ||
      (d.referencia && d.referencia.toLowerCase().includes(filtro)) ||
      (d.datos_remitente?.remitente && d.datos_remitente.remitente.toLowerCase().includes(filtro)) ||
      (d.datos_remitente?.entidad && d.datos_remitente.entidad.toLowerCase().includes(filtro))
    );
  });

  ngOnInit(): void {
    this.cargarUnidades();
    this.cargarJefes();
    this.sincronizarRuta();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  sincronizarRuta(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const tipo = (params.get('tipo') || 'externa').toLowerCase();
      if (tipo === 'interna') {
        this.tipoActivo.set('interna');
      } else {
        this.tipoActivo.set('externa');
      }
      this.cargarBandeja();
      this.cargarTotalesContadores();
    });
  }

  cambiarTipo(tipo: 'externa' | 'interna'): void {
    this.router.navigate(['/ventanilla', tipo]);
  }

  cargarUnidades(): void {
    this.seguridadService.getUnidades(100, 1).subscribe({
      next: (res) => {
        this.unidades.set(res.datos?.resultado || []);
      }
    });
  }

  cargarJefes(): void {
    this.http.get<any>('/api/v1/ventanilla/jefes').subscribe({
      next: (res) => {
        this.jefes.set(res.datos || []);
      }
    });
  }

  cargarBandeja(): void {
    this.cargando.set(true);
    const tipo = this.tipoActivo();

    this.http.get<any>(`/api/v1/ventanilla/bandeja/${tipo}`).subscribe({
      next: (res) => {
        this.cargando.set(false);
        const docs = res.datos?.resultado || [];
        this.documentosList.set(docs);
        if (tipo === 'externa') this.totalExterna.set(docs.length);
        if (tipo === 'interna') this.totalInterna.set(docs.length);
      },
      error: () => {
        this.cargando.set(false);
        this.documentosList.set([]);
      }
    });
  }

  cargarTotalesContadores(): void {
    // Consultar el opuesto para mantener contadores actualizados
    const opuesto = this.tipoActivo() === 'externa' ? 'interna' : 'externa';
    this.http.get<any>(`/api/v1/ventanilla/bandeja/${opuesto}`).subscribe({
      next: (res) => {
        const count = res.datos?.resultado?.length || 0;
        if (opuesto === 'externa') this.totalExterna.set(count);
        if (opuesto === 'interna') this.totalInterna.set(count);
      }
    });
  }

  tieneCiteOficial(doc: DocumentoVentanilla): boolean {
    return !!doc.nombre && doc.nombre.includes('/') && !doc.nombre.startsWith('HR-');
  }

  // ==========================================
  // MODAL 1: GENERAR HOJA DE RUTA INMEDIATA
  // ==========================================
  abrirModalGenerarHR(): void {
    this.generarHRForm.reset({
      tipoTramite: 'NOTA_OFICIAL',
      fojas: 1
    });
    this.modalGenerarVisible.set(true);
  }

  guardarGenerarHR(): void {
    if (this.generarHRForm.invalid) return;

    this.guardandoHR.set(true);
    const v = this.generarHRForm.value;

    const payload = {
      ci: v.ci,
      remitente: v.nombreCompleto,
      email: v.email,
      telefono: v.telefono,
      entidad: v.entidad,
      tipoTramite: v.tipoTramite,
      citeExterno: v.citeExterno,
      referencia: v.referencia,
      fojas: v.fojas
    };

    this.http.post<any>('/api/v1/ventanilla/interna/generar', payload).subscribe({
      next: (res) => {
        this.guardandoHR.set(false);
        this.modalGenerarVisible.set(false);
        const d = res.datos || {};
        
        // Devolver inmediato el código de seguimiento al usuario externo presencial
        this.ticketGenerado.set({
          codigo_hoja_ruta: d.codigo_hoja_ruta,
          remitente: v.nombreCompleto,
          referencia: v.referencia,
          fecha: d.fecha || new Date()
        });

        this.cargarBandeja();
        this.snackBar.open(`¡Hoja de Ruta ${d.codigo_hoja_ruta} expedida exitosamente!`, 'Aceptar', { duration: 4000 });
      },
      error: (err) => {
        this.guardandoHR.set(false);
        const msg = err.error?.mensaje || 'Error al expedir la hoja de ruta.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
      }
    });
  }

  cerrarTicket(): void {
    this.ticketGenerado.set(null);
  }

  imprimirTicketActual(): void {
    window.print();
  }

  // ==========================================
  // MODAL 3: EDITAR ANTES DE ENVIAR & ADJUNTAR PDF
  // ==========================================
  abrirModalEditar(doc: DocumentoVentanilla): void {
    this.docSeleccionado.set(doc);
    this.nombreArchivoPdf.set(null);
    this.archivoPdfBase64 = null;

    const r = doc.datos_remitente || {};
    this.editarForm.patchValue({
      remitente: r.remitente || doc.de || '',
      ci: r.ci || '',
      entidad: r.entidad || '',
      citeExterno: r.citeExterno || '',
      fojas: r.fojas || 1,
      prioridad: r.prioridad || 'NORMAL',
      referencia: doc.referencia || ''
    });

    this.modalEditarVisible.set(true);
  }

  onPdfSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.nombreArchivoPdf.set(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        this.archivoPdfBase64 = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  guardarEdicion(): void {
    if (this.editarForm.invalid) return;

    const doc = this.docSeleccionado();
    if (!doc) return;

    this.guardandoEdicion.set(true);
    const v = this.editarForm.value;

    const payload = {
      remitente: v.remitente,
      ci: v.ci,
      entidad: v.entidad,
      citeExterno: v.citeExterno,
      fojas: v.fojas,
      prioridad: v.prioridad,
      referencia: v.referencia,
      archivo_adjunto: this.archivoPdfBase64 || doc.archivo_adjunto
    };

    this.http.put<any>(`/api/v1/ventanilla/interna/${doc.id_documento}`, payload).subscribe({
      next: () => {
        this.guardandoEdicion.set(false);
        this.modalEditarVisible.set(false);
        this.snackBar.open(`Documento ${doc.codigo_hoja_ruta} actualizado correctamente con su adjunto PDF.`, 'Aceptar', { duration: 4000 });
        this.cargarBandeja();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        const msg = err.error?.mensaje || 'Error al actualizar el documento.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ==========================================
  // MODAL 4: DERIVACIÓN (AÚN SIN CITE)
  // ==========================================
  abrirModalDerivacion(doc: DocumentoVentanilla): void {
    this.docSeleccionado.set(doc);
    this.derivacionForm.reset({
      tipo_destino: 'MAE',
      id_usuario_destino: null,
      prioridad: 'NORMAL',
      proveido: 'Para su conocimiento, revisión y atención correspondiente conforme a competencias.'
    });
    this.modalDerivacionVisible.set(true);
  }

  confirmarDerivacion(): void {
    if (this.derivacionForm.invalid) return;

    const doc = this.docSeleccionado();
    if (!doc) return;

    const v = this.derivacionForm.value;
    if (v.tipo_destino === 'UNIDAD' && !v.id_usuario_destino) {
      this.snackBar.open('Debe seleccionar al Jefe de Unidad responsable.', 'Cerrar', { duration: 3500 });
      return;
    }

    this.guardandoDerivacion.set(true);
    const jefe = this.jefes().find(j => j.id_usuario === v.id_usuario_destino);

    const payload = {
      tipo_destino: v.tipo_destino,
      id_usuario_destino: v.tipo_destino === 'UNIDAD' ? v.id_usuario_destino : null,
      fid_unidad_destino: v.tipo_destino === 'UNIDAD' ? (jefe?.fid_unidad || v.fid_unidad_destino) : null,
      proveido: v.proveido,
      prioridad: v.prioridad
    };

    this.http.post<any>(`/api/v1/ventanilla/derivar/${doc.id_documento}`, payload).subscribe({
      next: (res) => {
        this.guardandoDerivacion.set(false);
        this.modalDerivacionVisible.set(false);
        const destino = res.datos?.destino || 'Despacho';
        this.snackBar.open(`Trámite ${doc.codigo_hoja_ruta} derivado a ${destino} (aún sin CITE).`, 'Aceptar', { duration: 5000 });
        this.cargarBandeja();
      },
      error: (err) => {
        this.guardandoDerivacion.set(false);
        const msg = err.error?.mensaje || 'Error al derivar el trámite.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
      }
    });
  }

  // ==========================================
  // APROBACIÓN QUE GENERA CITE DOCUMENTO EXTERNO
  // ==========================================
  aprobarTramite(doc: DocumentoVentanilla): void {
    if (!confirm(`¿Desea aprobar este trámite? Esta acción generará el CITE Oficial bajo la plantilla Documento Externo (DE-A) vinculado a la Hoja de Ruta ${doc.codigo_hoja_ruta}.`)) {
      return;
    }

    this.http.post<any>(`/api/v1/ventanilla/aprobar/${doc.id_documento}`, {}).subscribe({
      next: (res) => {
        const citeGenerado = res.datos?.cite || 'Asignado';
        this.snackBar.open(`¡Documento Aprobado! CITE Oficial generado: ${citeGenerado}`, 'Aceptar', { duration: 6000 });
        this.cargarBandeja();
      },
      error: (err) => {
        const msg = err.error?.mensaje || 'Error al aprobar el documento.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ==========================================
  // MODAL 5: VER PDF EN POPUP EN LA MISMA INTERFAZ
  // ==========================================
  verAdjuntoPdf(doc: DocumentoVentanilla): void {
    if (!doc.archivo_adjunto) {
      this.snackBar.open('Este trámite no cuenta con documento PDF adjunto.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.pdfDocTitulo.set(`${doc.codigo_hoja_ruta || doc.nombre} — ${doc.referencia || 'Documento Adjunto'}`);
    this.pdfVisualizarUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(doc.archivo_adjunto));
    this.modalPdfVisible.set(true);
  }

  imprimirRotulo(doc: DocumentoVentanilla): void {
    window.print();
  }
}
