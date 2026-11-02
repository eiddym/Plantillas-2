import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { Documento, DocumentosService } from '../../core/services/documentos.service';
import { AuthService } from '../../core/auth/auth.service';
import { VisorPdfDialogComponent } from '../visor-pdf/visor-pdf-dialog.component';
import { normalizarEsquemaFormly } from '../../shared/utils/formly-normalizer';

@Component({
  selector: 'app-document-workbench',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    FormlyModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="workbench-container">
      <!-- Barra Superior de Control Documental -->
      <header class="workbench-topbar">
        <div class="topbar-left">
          <button mat-icon-button routerLink="/documentos" matTooltip="Volver a la bandeja" class="btn-back">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="doc-identity">
            <span class="doc-cite">{{ doc()?.nombre || 'BORRADOR' }}</span>
            <span class="doc-status-pill" [ngClass]="getStatusPillClass(doc()?.estado)">
              {{ doc()?.estado || 'BORRADOR' }}
            </span>
          </div>
        </div>

        <div class="topbar-center">
          <!-- Conmutador Redacción / Vista Previa -->
          <div class="view-mode-toggle">
            <button 
              type="button" 
              class="mode-btn" 
              [class.active]="modoEdicion()" 
              (click)="setModo(true)"
            >
              <mat-icon>edit_note</mat-icon>
              <span>Redacción</span>
            </button>
            <button 
              type="button" 
              class="mode-btn" 
              [class.active]="!modoEdicion()" 
              (click)="setModo(false)"
            >
              <mat-icon>visibility</mat-icon>
              <span>Vista Previa</span>
            </button>
          </div>

          <!-- Selector de Tamaño de Hoja (Carta u Oficio) -->
          <div class="paper-size-toggle">
            <span class="size-label">Hoja:</span>
            <button 
              type="button" 
              class="size-btn" 
              [class.active]="tipoHoja() === 'Letter'" 
              (click)="setTipoHoja('Letter')"
              matTooltip="Formato Carta (21.6 x 27.9 cm)"
            >
              Carta
            </button>
            <button 
              type="button" 
              class="size-btn" 
              [class.active]="tipoHoja() === 'Oficio'" 
              (click)="setTipoHoja('Oficio')"
              matTooltip="Formato Oficio (21.6 x 33.0 cm)"
            >
              Oficio
            </button>
          </div>
        </div>

        <div class="topbar-actions">
          <!-- Acciones de Borrador (Solo en NUEVO / BORRADOR / RECHAZADO) -->
          <ng-container *ngIf="esBorradorEditable()">
            <!-- Eliminar Borrador -->
            <button 
              type="button"
              mat-stroked-button 
              color="warn" 
              class="action-btn-delete"
              (click)="confirmarEliminarBorrador()" 
              [disabled]="guardando() || !doc()"
              matTooltip="Eliminar borrador definitivamente"
            >
              <mat-icon>delete_outline</mat-icon>
              <span>Eliminar</span>
            </button>

            <!-- Guardar Borrador -->
            <button 
              type="button"
              mat-stroked-button 
              color="primary" 
              class="action-btn-save" 
              (click)="guardarBorrador()" 
              [disabled]="guardando() || !doc()"
            >
              <mat-icon>{{ guardando() ? 'sync' : 'save' }}</mat-icon>
              <span>{{ guardando() ? 'Guardando...' : 'Guardar' }}</span>
            </button>

            <!-- Enviar Documento Oficial -->
            <button 
              type="button"
              mat-flat-button 
              color="primary" 
              class="action-btn-enviar" 
              (click)="enviarDocumento()" 
              [disabled]="guardando() || !doc()"
              matTooltip="Enviar documento al flujo de revisión y aprobación"
            >
              <mat-icon>send</mat-icon>
              <span>Enviar</span>
            </button>
          </ng-container>

          <!-- Acciones de Destinatario / Jefatura (Cuando el documento fue ENVIADO o DERIVADO al usuario actual) -->
          <ng-container *ngIf="esDestinatarioActual()">
            <button
              *ngIf="doc()?.estado === 'ENVIADO'"
              type="button"
              mat-stroked-button
              color="warn"
              class="action-btn-delete"
              (click)="observarDocumento()"
              [disabled]="guardando() || !doc()"
              matTooltip="Observar y devolver el documento al remitente para corrección"
            >
              <mat-icon>feedback</mat-icon>
              <span>Observar</span>
            </button>

            <button
              type="button"
              mat-stroked-button
              color="primary"
              class="action-btn-save"
              (click)="togglePanelDerivar()"
              [disabled]="guardando() || !doc()"
              matTooltip="Derivar documento a un funcionario o unidad dependiente"
            >
              <mat-icon>alt_route</mat-icon>
              <span>Derivar</span>
            </button>

            <button
              *ngIf="doc()?.estado === 'ENVIADO'"
              type="button"
              mat-flat-button
              color="primary"
              class="action-btn-enviar"
              (click)="aprobarDocumento()"
              [disabled]="guardando() || !doc()"
              matTooltip="Aprobar oficialmente el documento y generar CITE"
            >
              <mat-icon>verified</mat-icon>
              <span>Aprobar</span>
            </button>
          </ng-container>
        </div>
      </header>

      @if (loading() || guardando() || generandoPdf()) {
        <mat-progress-bar mode="indeterminate" class="global-progress"></mat-progress-bar>
      }

      <!-- Área de Trabajo: Hoja Física + Metadatos -->
      <div class="workbench-grid">
        <!-- Columna Central: Representación fiel de la Hoja Física (Carta / Oficio) -->
        <main class="workbench-canvas-column">
          <!-- Panel Desplegable para Derivar Documento (Jefatura / Destinatario) -->
          <div *ngIf="mostrarPanelDerivar()" class="auto-save-bar" style="flex-direction: column; align-items: stretch; gap: 12px; background: #ffffff; border: 2px solid #0284c7; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #0f172a; font-size: 0.95rem;">Derivar Documento / Proveído Oficial</strong>
              <button mat-icon-button (click)="mostrarPanelDerivar.set(false)" type="button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Destinatario a Derivar</mat-label>
                <mat-select [(ngModel)]="usuarioDestinoDerivar">
                  <mat-option [value]="'TODOS'">
                    📢 <strong>[A TODOS EN GENERAL]</strong> — Difusión institucional masiva
                  </mat-option>
                  <mat-option *ngFor="let u of listaUsuarios()" [value]="u.id_usuario">
                    {{ u.nombres }} {{ u.apellidos }} — {{ u.cargo || u.usuario }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Proveído / Instrucción</mat-label>
                <input matInput [(ngModel)]="proveidoDerivar" placeholder="Ej.: Favor atender e informar..." />
              </mat-form-field>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button mat-stroked-button type="button" (click)="mostrarPanelDerivar.set(false)">Cancelar</button>
              <button mat-flat-button color="primary" type="button" (click)="confirmarDerivarDocumento()" [disabled]="guardando() || !usuarioDestinoDerivar">
                <mat-icon>send</mat-icon>
                <span>Confirmar Derivación</span>
              </button>
            </div>
          </div>

          <!-- Barra informativa contextual fuera de la hoja física -->
          <div *ngIf="modoEdicion()" class="auto-save-bar">
            <mat-icon>edit_note</mat-icon>
            <span>Modo Edición activo sobre formato {{ tipoHoja() === 'Oficio' ? 'Oficio (21.6 x 33 cm)' : 'Carta (21.6 x 27.9 cm)' }}. Recuerde hacer clic en "Guardar Borrador" al finalizar.</span>
          </div>

          <div class="sheet-viewport">
            <div
              class="physical-sheet"
              [ngClass]="tipoHoja() === 'Oficio' ? 'pagina-oficio' : 'pagina-carta'"
            >
              <!-- Cabecera Oficial sólo en Vista Previa (en Edición la plantilla Formly incluye su propio CITE y Título) -->
              <ng-container *ngIf="!modoEdicion()">
                <div class="sheet-top-header">
                  <div class="header-cite">
                    <strong>{{ doc()?.nombre || '(CITE Automático al Aprobar)' }}</strong>
                  </div>
                  <div class="header-fecha">
                    <span>{{ obtenerFechaDocumento() }}</span>
                  </div>
                </div>

                <div class="sheet-doc-title">
                  <h2>{{ obtenerTituloDocumento() }}</h2>
                </div>
              </ng-container>

              <!-- ============================================ -->
              <!-- MODO 1: REDACCIÓN ACTIVA (FORMULARIO FORMLY) -->
              <!-- ============================================ -->
              <div *ngIf="modoEdicion()" class="editor-mode-container">
                <!-- Formulario Formly Dinámico de la Plantilla (Directo sobre la Hoja) -->
                <div class="formly-wrapper">
                  <form [formGroup]="form">
                    <formly-form 
                      [form]="form" 
                      [fields]="formlyFields" 
                      [model]="model"
                    ></formly-form>
                  </form>
                </div>
              </div>

              <!-- ============================================ -->
              <!-- MODO 2: VISTA PREVIA DE IMPRESIÓN (PROSE)    -->
              <!-- ============================================ -->
              <div *ngIf="!modoEdicion()" class="preview-mode-container">
                <!-- Bloque DE / PARA / VÍA / REF -->
                <div class="sheet-header-meta">
                  <div class="meta-row" *ngIf="obtenerTextoMeta('de')">
                    <span class="meta-label">DE:</span>
                    <span class="meta-value">{{ obtenerTextoMeta('de') }}</span>
                  </div>
                  <div class="meta-row" *ngIf="obtenerTextoMeta('para')">
                    <span class="meta-label">PARA:</span>
                    <span class="meta-value">{{ obtenerTextoMeta('para') }}</span>
                  </div>
                  <div class="meta-row" *ngIf="obtenerTextoMeta('via')">
                    <span class="meta-label">VÍA:</span>
                    <span class="meta-value">{{ obtenerTextoMeta('via') }}</span>
                  </div>
                  <div class="meta-row" *ngIf="obtenerTextoMeta('ref')">
                    <span class="meta-label">REF.:</span>
                    <span class="meta-value"><strong>{{ obtenerTextoMeta('ref') }}</strong></span>
                  </div>
                </div>

                <div class="saludo-consideracion">
                  <span>De mi consideración:</span>
                </div>

                <!-- Cuerpo de Lectura Documental (Tipografía Literata con máx 75 caracteres) -->
                <article class="document-prose">
                  @if (getCuerpoHtml()) {
                    <div [innerHTML]="getCuerpoHtml()"></div>
                  } @else {
                    <p>
                      En cumplimiento a las disposiciones normativas y a los procedimientos de la Cooperativa Minera
                      Marabunta R.L., se emite el presente documento oficial para su revisión y tramitación
                      correspondiente ante las instancias pertinentes.
                    </p>
                    <p>
                      El expediente adjunto cuenta con las valoraciones técnicas y operativas requeridas,
                      quedando registrado en el sistema con estampado criptográfico para los fines de control
                      y archivo institucional.
                    </p>
                  }
                </article>
              </div>

              <!-- Pie de Hoja Física -->
              <div class="sheet-footer">
                <span>Formato Oficial {{ tipoHoja() === 'Oficio' ? 'Oficio (21.6 x 33.0 cm)' : 'Carta (21.6 x 27.9 cm)' }}</span>
                <span class="page-number">Página 1 de 1</span>
              </div>
            </div>
          </div>
        </main>

        <!-- Columna Derecha: Panel Lateral de Metadatos y Trazabilidad -->
        <aside class="workbench-inspector-column">
          <!-- Tarjeta de Metadatos -->
          <div class="inspector-card">
            <h4 class="inspector-title">
              <mat-icon>info</mat-icon>
              <span>Metadatos del Documento</span>
            </h4>
            <div class="inspector-list">
              <div class="inspector-item">
                <span class="item-label">Clasificación</span>
                <span class="item-badge-clasif">{{ model['clasificacion'] || model['inputSelect'] || doc()?.clasificacion || 'RESERVADO' }}</span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Formato de Hoja</span>
                <span class="item-badge-hoja" (click)="setTipoHoja(tipoHoja() === 'Oficio' ? 'Letter' : 'Oficio')" matTooltip="Haga clic para alternar Carta / Oficio">
                  {{ tipoHoja() === 'Oficio' ? 'Oficio (21.6 x 33 cm)' : 'Carta (21.6 x 27.9 cm)' }}
                </span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Fecha de Creación</span>
                <span class="item-value">{{ doc()?._fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Última Modificación</span>
                <span class="item-value">{{ (doc()?._fecha_modificacion | date:'dd/MM/yyyy HH:mm') || '--' }}</span>
              </div>
            </div>
          </div>

          <!-- Historial de Flujo y Firmas -->
          <div class="inspector-card">
            <h4 class="inspector-title">
              <mat-icon>history</mat-icon>
              <span>Flujo de Aprobación</span>
            </h4>
            <div class="timeline-list">
              <div class="timeline-entry active">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <strong>Redacción del Documento</strong>
                  <p>Por: {{ obtenerTextoMeta('de') || 'Funcionario Solicitante' }}</p>
                  <small>{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</small>
                </div>
              </div>
              <div class="timeline-entry" [class.active]="doc()?.estado === 'APROBADO' || doc()?.estado === 'DERIVADO'">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <strong>Revisión y Visto Bueno</strong>
                  <p>Bandeja activa de jefatura</p>
                  <small>{{ doc()?.estado || 'BORRADOR' }}</small>
                </div>
              </div>
              <div class="timeline-entry" [class.active]="doc()?.estado === 'APROBADO'">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <strong>Aprobación y Cierre</strong>
                  <p>Archivo digital emitido con validez legal</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
      background: var(--color-canvas, #f8fafc);
    }

    .workbench-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .workbench-topbar {
      height: 64px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      z-index: 10;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-back {
      color: #64748b;
      &:hover { color: #0284c7; background: #f1f5f9; }
    }

    .doc-identity {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .doc-cite {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .doc-status-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .topbar-center {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .view-mode-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      border: 1px solid #e2e8f0;
    }

    .paper-size-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 6px;
      border-radius: 8px;

      .size-label {
        font-size: 0.76rem;
        font-weight: 700;
        color: #64748b;
        padding-right: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .size-btn {
        padding: 4px 10px;
        border: none;
        background: transparent;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 600;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          color: #0284c7;
        }

        &.active {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(2, 132, 199, 0.3);
        }
      }
    }

    .mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.active {
        background: #ffffff;
        color: #0284c7;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }

    .pill-borrador { background: #f1f5f9; color: #475569; }
    .pill-revision { background: #fef3c7; color: #d97706; }
    .pill-aprobado { background: #ecfdf5; color: #059669; }
    .pill-observado { background: #fee2e2; color: #dc2626; }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .action-btn-delete {
      color: #dc2626 !important;
      border-color: #fca5a5 !important;
      font-weight: 600;
      &:hover {
        background: #fef2f2 !important;
      }
    }

    .action-btn-save {
      color: #0284c7 !important;
      border-color: #0284c7 !important;
      font-weight: 600;
      &:hover {
        background: #f0f9ff !important;
      }
    }

    .action-btn-enviar {
      background: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
      &:hover {
        background: #0369a1 !important;
      }
    }

    .global-progress {
      position: absolute;
      top: 64px;
      left: 0;
      right: 0;
      z-index: 20;
    }

    .workbench-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 340px;
      overflow: hidden;
      height: calc(100vh - 64px);
    }

    .workbench-canvas-column {
      background: #cbd5e1;
      overflow-y: auto;
      padding: 2rem 1rem 4rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }

    .sheet-viewport {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .physical-sheet {
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 3rem 3.5rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
      height: auto;
    }

    .pagina-carta {
      width: 21.6cm;
      min-height: 27.9cm;
      height: auto;
    }

    .pagina-oficio {
      width: 21.6cm;
      min-height: 33.0cm;
      height: auto;
    }

    .sheet-top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      margin-bottom: 1.5rem;
      border-bottom: 1.5px solid #0f172a;

      .header-cite {
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.95rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.5px;
      }

      .header-fecha {
        font-size: 0.88rem;
        color: #334155;
        font-weight: 500;
      }
    }

    .sheet-doc-title {
      text-align: center;
      margin-bottom: 1.75rem;

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 1px;
        text-transform: uppercase;
        text-decoration: underline;
        text-underline-offset: 4px;
      }
    }

    .saludo-consideracion {
      margin: 1.5rem 0 1rem 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
    }

    /* MODO EDICIÓN */
    .editor-mode-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .editor-header-fields {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #fafafa;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .w-full {
      width: 100%;
    }

    .formly-wrapper {
      margin-top: 0.5rem;
    }

    .auto-save-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 0.84rem;
      width: 21.6cm;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0 0 1.25rem 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #0284c7;
      }
    }

    /* MODO VISTA PREVIA */
    .preview-mode-container {
      display: flex;
      flex-direction: column;
    }

    .sheet-header-meta {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 80px 1fr;
      line-height: 1.5;

      .meta-label {
        font-weight: 700;
        color: #0f172a;
      }
      .meta-value {
        color: #334155;
      }
    }

    .sheet-divider {
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 2rem;
    }

    .document-prose {
      font-family: 'Literata', Georgia, serif;
      font-size: 1.05rem;
      line-height: 1.75;
      color: #1e293b;
      max-width: 75ch;
      margin-bottom: 3rem;

      p {
        margin-bottom: 1.25rem;
        text-align: justify;
      }
    }

    .sheet-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .item-badge-hoja {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
      cursor: pointer;
      border: 1px solid #bae6fd;
      transition: all 0.2s;
      &:hover {
        background: #0284c7;
        color: #ffffff;
      }
    }

    .workbench-inspector-column {
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .inspector-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
    }

    .inspector-title {
      margin: 0 0 1rem 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #0284c7;
      }
    }

    .inspector-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .inspector-item {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .item-label {
        font-size: 0.72rem;
        color: #64748b;
        font-weight: 500;
      }
      .item-value {
        font-size: 0.85rem;
        color: #0f172a;
        font-weight: 600;
      }
      .item-badge-clasif {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        background: #fef3c7;
        color: #92400e;
        padding: 2px 8px;
        border-radius: 4px;
        width: fit-content;
      }
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: relative;
      padding-left: 12px;

      &::before {
        content: '';
        position: absolute;
        left: 17px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: #e2e8f0;
      }
    }

    .timeline-entry {
      display: flex;
      gap: 12px;
      position: relative;

      .timeline-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #cbd5e1;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 1px #e2e8f0;
        margin-top: 3px;
        flex-shrink: 0;
        z-index: 1;
      }

      &.active .timeline-dot {
        background: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
      }

      .timeline-content {
        strong {
          display: block;
          font-size: 0.82rem;
          color: #0f172a;
        }
        p {
          margin: 2px 0 0 0;
          font-size: 0.75rem;
          color: #64748b;
        }
        small {
          font-size: 0.7rem;
          color: #94a3b8;
        }
      }
    }

    /* RESPONSIVE DESIGN PARA MÓVIL Y TABLET */
    @media (max-width: 960px) {
      .workbench-grid {
        grid-template-columns: 1fr;
        height: auto;
        overflow-y: visible;
      }

      .workbench-canvas-column {
        padding: 1rem 0.5rem;
        overflow-y: visible;
      }

      .workbench-inspector-column {
        border-left: none;
        border-top: 2px solid #e2e8f0;
        padding: 1.25rem 1rem;
        overflow-y: visible;
      }
    }

    @media (max-width: 860px) {
      .workbench-topbar {
        height: auto;
        min-height: 56px;
        padding: 8px 10px;
        flex-wrap: wrap;
        gap: 8px;
      }

      .topbar-left {
        gap: 8px;
        flex: 1 1 auto;
      }

      .doc-cite {
        font-size: 0.95rem;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-center {
        order: 2;
      }

      .topbar-actions {
        order: 3;
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 6px;

        button {
          flex: 1 1 auto;
          padding: 0 6px !important;
          font-size: 0.78rem !important;
          min-width: 0 !important;
          height: 38px !important;

          mat-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            margin-right: 2px !important;
          }
        }
      }

      .mode-btn {
        padding: 4px 8px;
        font-size: 0.75rem;
      }

      .physical-sheet {
        padding: 1.25rem 0.85rem !important;
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px;
      }

      .pagina-carta, .pagina-oficio {
        width: 100% !important;
        min-height: auto !important;
      }

      .sheet-membrete {
        grid-template-columns: 52px 1fr;
        gap: 8px;
        padding-bottom: 0.85rem;
        margin-bottom: 1rem;
      }

      .membrete-logo-box {
        width: 50px;
        height: 50px;
      }

      .membrete-text {
        h3 { font-size: 0.8rem; }
        p { font-size: 0.7rem; }
        small { font-size: 0.65rem; }
      }

      .membrete-cite-box {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        text-align: left;
      }

      .form-row-2 {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .meta-row {
        grid-template-columns: 55px 1fr;
        font-size: 0.88rem;
      }

      .document-prose {
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }
    }
  `]
})
export class DocumentWorkbenchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentosService = inject(DocumentosService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly currentUser = this.authService.currentUser;
  readonly doc = signal<Documento | null>(null);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly generandoPdf = signal(false);
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');
  readonly modoEdicion = signal(true);
  readonly mostrarPanelDerivar = signal(false);
  readonly listaUsuarios = signal<any[]>([]);

  usuarioDestinoDerivar: number | string | null = null;
  proveidoDerivar = '';

  readonly esBorradorEditable = computed(() => {
    const d = this.doc();
    if (!d) return false;
    return d.estado === 'NUEVO' || d.estado === 'BORRADOR' || d.estado === 'RECHAZADO';
  });

  readonly esDestinatarioActual = computed(() => {
    const d = this.doc() as any;
    const u = this.currentUser();
    if (!d || !u) return false;
    if (d.estado !== 'ENVIADO' && d.estado !== 'DERIVADO') return false;
    return Number(d.via_actual) === Number(u.id);
  });

  readonly form = new FormGroup({});
  model: Record<string, any> = {};
  formlyFields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
    this.cargarUsuarios();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cargarDocumento(Number(idParam));
    }
  }

  setModo(esEdicion: boolean): void {
    this.modoEdicion.set(esEdicion);
  }

  onLogoError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('logo.png')) {
      target.src = 'assets/images/logo.png';
    }
  }

  cargarDocumento(id: number): void {
    this.loading.set(true);
    this.documentosService.getDocumento(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        const d = res.datos;
        this.doc.set(d);

        // Inicializar Modelo desde plantilla_valor
        try {
          this.model = JSON.parse(d?.plantilla_valor || '{}');
        } catch {
          this.model = {};
        }

        // Sincronizar datosGenerales y datosGenerales-0 si existen
        if (this.model['datosGenerales-0'] && !this.model['datosGenerales']) {
          this.model['datosGenerales'] = this.model['datosGenerales-0'];
        } else if (this.model['datosGenerales'] && !this.model['datosGenerales-0']) {
          this.model['datosGenerales-0'] = this.model['datosGenerales'];
        }

        // Limpiar posibles valores de texto plano obsoletos en model.de/para/via
        delete this.model['de'];
        delete this.model['para'];
        delete this.model['via'];

        const refDoc = (d as any)?.referencia || d?.ref;
        if (refDoc && !this.model['ref']) this.model['ref'] = refDoc;
        if (d.clasificacion && !this.model['inputSelect']) this.model['inputSelect'] = d.clasificacion;

        // Compilar esquema Formly desde la instantánea congelada en documento.plantilla
        if (d?.plantilla) {
          try {
            const rawFields = typeof d.plantilla === 'string' ? JSON.parse(d.plantilla) : d.plantilla;
            const parsedArray = Array.isArray(rawFields) ? rawFields : [];
            this.formlyFields = normalizarEsquemaFormly(parsedArray, this.model);
            
            // Detectar formato de hoja (Carta vs Oficio)
            if (this.formlyFields[0]?.templateOptions?.['tipoHoja'] === 'Oficio') {
              this.tipoHoja.set('Oficio');
            } else {
              this.tipoHoja.set('Letter');
            }
          } catch {
            this.formlyFields = [];
          }
        }

        // Si el estado es APROBADO, CERRADO, ENVIADO o DERIVADO, mostrar directamente en modo lectura (Vista Previa)
        if (d.estado === 'APROBADO' || d.estado === 'CERRADO' || d.estado === 'ENVIADO' || d.estado === 'DERIVADO') {
          this.modoEdicion.set(false);
        } else {
          this.modoEdicion.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al cargar el documento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  obtenerTituloDocumento(): string {
    const d = this.doc();
    if (d?.plantilla?.nombre) return d.plantilla.nombre.toUpperCase();
    if (d?.nombre_plantilla) return d.nombre_plantilla.toUpperCase();
    return 'NOTA INTERNA';
  }

  obtenerFechaDocumento(): string {
    const f = this.doc()?._fecha_creacion;
    if (!f) return this.fechaHoyTexto();
    const d = new Date(f);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  fechaHoyTexto(): string {
    const hoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }

  formatearMeta(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val.nombres || val.apellidos) {
        return `${val.nombres || ''} ${val.apellidos || ''} ${val.cargo ? '- ' + val.cargo : ''}`.trim();
      }
      if (val.nombre) return val.nombre;
      if (val.label) return val.label;
      if (val.value) return val.value;
    }
    return String(val);
  }

  getCuerpoHtml(): string {
    const sections: string[] = [];
    if (this.model['cuerpo']) {
      sections.push(this.model['cuerpo']);
    }
    for (const key of Object.keys(this.model)) {
      if (key !== 'cuerpo' && (key.startsWith('editorTexto') || key.startsWith('editor')) && typeof this.model[key] === 'string' && this.model[key].trim().length > 0) {
        sections.push(this.model[key]);
      }
    }
    if (sections.length > 0) {
      return sections.join('<div class="section-divider" style="height: 14px;"></div>');
    }
    if (this.model['texto'] && typeof this.model['texto'] === 'string') return this.model['texto'];
    const d = this.doc();
    if (d?.contenido?.cuerpo) return d.contenido.cuerpo;
    return '';
  }

  obtenerTextoMeta(campo: 'de' | 'para' | 'via' | 'ref'): string {
    const dg = this.model['datosGenerales'] || this.model['datosGenerales-0'] || {};
    const fmtUser = (u: any): string => {
      if (!u) return '';
      if (typeof u === 'string') {
        const trimmed = u.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) return '';
        return trimmed;
      }
      if (typeof u === 'object') {
        const nombreCompleto = `${u.nombres || ''} ${u.apellidos || ''}`.trim();
        if (nombreCompleto) {
          return u.cargo ? `${nombreCompleto} - ${u.cargo}` : nombreCompleto;
        }
        if (u.nombre) return u.nombre;
      }
      return '';
    };

    if (campo === 'ref') {
      return dg.ref || this.model['ref'] || (this.doc() as any)?.referencia || this.doc()?.ref || '';
    }

    const val = dg[campo];
    if (Array.isArray(val)) {
      const textos = val.map(fmtUser).filter(Boolean);
      if (textos.length > 0) return textos.join(' / ');
    } else if (val) {
      const txt = fmtUser(val);
      if (txt) return txt;
    }

    const rawDocVal = (this.doc() as any)?.[campo];
    return fmtUser(rawDocVal);
  }

  private sincronizarMetadatosDesdeDatosGenerales(): void {
    const dg = this.model['datosGenerales'] || this.model['datosGenerales-0'];
    if (dg) {
      this.model['datosGenerales'] = dg;
      this.model['datosGenerales-0'] = dg;
      if (dg.ref) {
        this.model['ref'] = dg.ref;
      }
    }
    delete this.model['de'];
    delete this.model['para'];
    delete this.model['via'];
  }

  private construirPayloadDocumento(d: Documento): Partial<Documento> & Record<string, any> {
    this.sincronizarMetadatosDesdeDatosGenerales();

    let plantillaActualizada = d.plantilla;
    if (this.formlyFields && this.formlyFields.length > 0) {
      try {
        const raw = typeof d.plantilla === 'string' ? JSON.parse(d.plantilla) : [...d.plantilla];
        if (Array.isArray(raw) && raw.length > 0) {
          raw[0].templateOptions = raw[0].templateOptions || {};
          raw[0].templateOptions['tipoHoja'] = this.tipoHoja();
          plantillaActualizada = JSON.stringify(raw);
        }
      } catch {}
    }

    const dg = this.model['datosGenerales'] || this.model['datosGenerales-0'] || {};
    const extraerIds = (val: any, fallbackStr?: string, defaultIds: number[] = []): number[] => {
      const arr = Array.isArray(val) ? val : (val ? [val] : []);
      const ids = arr
        .map((item: any) => Number(item?.id_usuario ?? item?.id ?? item))
        .filter((id: number) => Number.isInteger(id) && id > 0);
      if (ids.length > 0) return ids;
      if (typeof fallbackStr === 'string') {
        try {
          const parsed = JSON.parse(fallbackStr);
          const pIds = (Array.isArray(parsed) ? parsed : [parsed])
            .map((item: any) => Number(item?.id_usuario ?? item?.id ?? item))
            .filter((id: number) => Number.isInteger(id) && id > 0);
          if (pIds.length > 0) return pIds;
        } catch {}
      }
      return defaultIds;
    };

    const idCreador = Number(d._usuario_creacion) || 1;
    const idsDe = extraerIds(dg.de, d.de, [idCreador]);
    let idsPara: number[] = [];
    const pObj = Array.isArray(dg.para) ? dg.para[0] : dg.para;
    if (pObj && (pObj.todos || pObj.id_usuario === 'TODOS')) {
      if (Array.isArray(pObj.todos_ids) && pObj.todos_ids.length > 0) {
        idsPara = pObj.todos_ids;
      } else {
        idsPara = (this.listaUsuarios() || []).map((u: any) => Number(u.id_usuario)).filter((n: number) => n > 0);
      }
      if (this.model['inputt_1'] === undefined || this.model['inputt_1'] === '') {
        this.model['inputt_1'] = 'A TODO EL PERSONAL';
      }
    } else {
      idsPara = extraerIds(dg.para, d.para, []);
    }
    const idsVia = extraerIds(dg.via, d.via, []);
    const refTexto = dg.ref || this.model['ref'] || (d as any).referencia || d.ref || '';

    return {
      plantilla: plantillaActualizada,
      plantilla_valor: JSON.stringify(this.model),
      de: JSON.stringify(idsDe),
      para: JSON.stringify(idsPara),
      via: JSON.stringify(idsVia),
      ref: refTexto,
      referencia: refTexto,
      clasificacion: this.model['clasificacion'] || this.model['inputSelect'] || d.clasificacion || 'Reservado'
    };
  }

  setTipoHoja(tipo: 'Letter' | 'Oficio'): void {
    this.tipoHoja.set(tipo);
    this.model['tipoHoja'] = tipo;
    if (this.formlyFields && this.formlyFields.length > 0 && this.formlyFields[0].templateOptions) {
      this.formlyFields[0].templateOptions['tipoHoja'] = tipo;
    }
  }

  guardarBorrador(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    const payload = this.construirPayloadDocumento(d);
    this.guardando.set(true);

    this.documentosService.actualizarDocumento(d.id_documento, payload).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.doc.set(res.datos);
        this.snackBar.open('Borrador guardado exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al guardar el borrador', 'Cerrar', { duration: 3000 });
      }
    });
  }

  confirmarEliminarBorrador(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    if (!confirm(`¿Está seguro de que desea eliminar el borrador "${d.nombre || 'Sin título'}" permanentemente?`)) {
      return;
    }

    this.guardando.set(true);
    this.documentosService.eliminarDocumento(d.id_documento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Borrador eliminado correctamente', 'Aceptar', { duration: 3000 });
        this.router.navigate(['/documentos']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al eliminar el borrador', 'Cerrar', { duration: 3000 });
      }
    });
  }

  enviarDocumento(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    const payload = this.construirPayloadDocumento(d);
    let idsPara: number[] = [];
    try { idsPara = JSON.parse(payload.para || '[]'); } catch {}

    if (!Array.isArray(idsPara) || idsPara.length === 0) {
      this.snackBar.open('Debe seleccionar al menos un destinatario (PARA) antes de enviar el documento.', 'Entendido', { duration: 4000 });
      return;
    }

    if (!confirm('¿Desea enviar este documento oficialmente para su revisión y aprobación?')) {
      return;
    }

    this.guardando.set(true);

    this.documentosService.enviarDocumento(d.id_documento, payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Documento enviado exitosamente al conducto regular / destinatario', 'Aceptar', { duration: 4000 });
        this.router.navigate(['/documentos']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al enviar el documento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cargarUsuarios(): void {
    this.http.get<any>('/api/v1/seguridad/usuario?limit=100').subscribe({
      next: (res) => {
        const rows = res?.datos?.resultado || res?.datos || [];
        const miId = Number(this.currentUser()?.id || 0);
        this.listaUsuarios.set(
          (Array.isArray(rows) ? rows : []).filter((u: any) => u.estado === 'ACTIVO' && Number(u.id_usuario) !== miId)
        );
      }
    });
  }

  togglePanelDerivar(): void {
    const nuevoEstado = !this.mostrarPanelDerivar();
    this.mostrarPanelDerivar.set(nuevoEstado);
    if (nuevoEstado && this.listaUsuarios().length === 0) {
      this.cargarUsuarios();
    }
  }

  confirmarDerivarDocumento(): void {
    const d = this.doc();
    if (!d || !d.id_documento || !this.usuarioDestinoDerivar) return;

    this.guardando.set(true);
    const obs = (this.proveidoDerivar || '').trim() || 'Favor atender según corresponda.';
    const esParaTodos = this.usuarioDestinoDerivar === 'TODOS';
    const destinoNum = esParaTodos ? 0 : Number(this.usuarioDestinoDerivar);

    const peticion$ = d.estado === 'ENVIADO'
      ? this.documentosService.aprobarDocumento(d.id_documento, {
          derivar: true,
          usuario_derivar: destinoNum,
          observaciones: obs
        })
      : this.documentosService.derivarDocumento(d.id_documento, {
          destino: destinoNum,
          observaciones: obs
        });

    peticion$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarPanelDerivar.set(false);
        this.snackBar.open('Documento derivado exitosamente', 'Aceptar', { duration: 4000 });
        this.router.navigate(['/aprobacion']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al derivar el documento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  aprobarDocumento(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    if (!confirm('¿Desea aprobar oficialmente este documento y generar su CITE institucional?')) {
      return;
    }

    this.guardando.set(true);
    this.documentosService.aprobarDocumento(d.id_documento, { derivar: false }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Documento aprobado exitosamente', 'Aceptar', { duration: 4000 });
        this.router.navigate(['/aprobacion']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al aprobar el documento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  observarDocumento(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    const motivo = prompt('Ingrese la observación o motivo de devolución al remitente:');
    if (!motivo || !motivo.trim()) return;

    const u = this.currentUser() as any;
    const observadoPor = u ? `${u.nombres || u.first_name || ''} ${u.apellidos || u.last_name || ''}`.trim() || u.username : 'Jefatura';

    this.guardando.set(true);
    this.documentosService.rechazarDocumento(d.id_documento, {
      observaciones: motivo.trim(),
      observado_por: observadoPor
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Documento observado y devuelto al remitente', 'Aceptar', { duration: 4000 });
        this.router.navigate(['/aprobacion']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al observar el documento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  getStatusPillClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'pill-aprobado';
      case 'ENVIADO':
      case 'DERIVADO':
      case 'EN CURSO': return 'pill-revision';
      case 'RECHAZADO':
      case 'OBSERVADO': return 'pill-observado';
      default: return 'pill-borrador';
    }
  }
}
