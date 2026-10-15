import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { VisorPdfDialogComponent } from '../visor-pdf/visor-pdf-dialog.component';

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
              <span>Vista de Impresión</span>
            </button>
          </div>
        </div>

        <div class="topbar-actions">
          <button 
            mat-flat-button 
            color="primary" 
            class="action-btn-save" 
            (click)="guardarBorrador()" 
            [disabled]="guardando() || !doc()"
          >
            <mat-icon>{{ guardando() ? 'sync' : 'save' }}</mat-icon>
            <span>{{ guardando() ? 'Guardando...' : 'Guardar Borrador' }}</span>
          </button>

          <button mat-stroked-button (click)="verPdf()" class="action-btn-pdf" [disabled]="!doc() || generandoPdf()">
            <mat-icon>picture_as_pdf</mat-icon>
            <span>{{ generandoPdf() ? 'Generando...' : 'Ver PDF Oficial' }}</span>
          </button>

          <button mat-stroked-button (click)="derivarDocumento()" class="action-btn-derivar" [disabled]="!doc()">
            <mat-icon>forward</mat-icon>
            <span>Derivar</span>
          </button>

          <button mat-raised-button color="accent" (click)="firmarDocumento()" class="action-btn-firmar" [disabled]="!doc()">
            <mat-icon>draw</mat-icon>
            <span>Firmar</span>
          </button>
        </div>
      </header>

      @if (loading() || guardando() || generandoPdf()) {
        <mat-progress-bar mode="indeterminate" class="global-progress"></mat-progress-bar>
      }

      <!-- Área de Trabajo: Hoja Física + Metadatos -->
      <div class="workbench-grid">
        <!-- Columna Central: Representación fiel de la Hoja Física (Carta / Oficio) -->
        <main class="workbench-canvas-column">
          <div class="sheet-viewport">
            <div
              class="physical-sheet"
              [ngClass]="tipoHoja() === 'Oficio' ? 'pagina-oficio' : 'pagina-carta'"
            >
              <!-- Membrete Oficial Institucional -->
              <div class="sheet-membrete">
                <div class="membrete-logo-box">
                  <img src="assets/images/logo_cooperativa.png" alt="Cooperativa Marabunta R.L." class="membrete-logo" (error)="onLogoError($event)" />
                </div>
                <div class="membrete-text">
                  <h3>COOPERATIVA MULTIACTIVA MARABUNTA R.L.</h3>
                  <p>Sistema Digital de Gestión y Aprobación Documental</p>
                  <small>La Paz - Bolivia</small>
                </div>
                <div class="membrete-cite-box">
                  <span class="cite-label">CITE OFICIAL</span>
                  <strong class="cite-code">{{ doc()?.nombre || 'BORRADOR' }}</strong>
                  <span class="cite-fecha">{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>

              <!-- ============================================ -->
              <!-- MODO 1: REDACCIÓN ACTIVA (FORMULARIO FORMLY) -->
              <!-- ============================================ -->
              <div *ngIf="modoEdicion()" class="editor-mode-container">
                
                <!-- Encabezado Editable de Metadatos Documentales -->
                <div class="editor-header-fields">
                  <div class="form-row-2">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Destinatario (PARA)</mat-label>
                      <input matInput [(ngModel)]="model['para']" placeholder="Ej. Lic. Carlos Mendoza - Director">
                      <mat-icon matPrefix>person</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Vía de Aprobación (VÍA)</mat-label>
                      <input matInput [(ngModel)]="model['via']" placeholder="Ej. Abg. Marco Antonio Soliz - Jefe Legal">
                      <mat-icon matPrefix>alt_route</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row-2">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Remitente (DE)</mat-label>
                      <input matInput [(ngModel)]="model['de']" placeholder="Ej. Ing. Juan Pérez - Técnico">
                      <mat-icon matPrefix>badge</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Clasificación de Seguridad</mat-label>
                      <mat-select [(ngModel)]="model['inputSelect']">
                        <mat-option value="Ordinario">Ordinario (Público)</mat-option>
                        <mat-option value="Reservado">Reservado</mat-option>
                        <mat-option value="Confidencial">Confidencial</mat-option>
                        <mat-option value="Secreto">Secreto</mat-option>
                      </mat-select>
                      <mat-icon matPrefix>security</mat-icon>
                    </mat-form-field>
                  </div>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Referencia o Asunto (REF)</mat-label>
                    <input matInput [(ngModel)]="model['ref']" placeholder="Ej. Dictamen técnico para adecuación minera...">
                    <mat-icon matPrefix>subject</mat-icon>
                  </mat-form-field>
                </div>

                <div class="sheet-divider"></div>

                <!-- Formulario Formly Dinámico de la Plantilla -->
                <div class="formly-wrapper">
                  <form [formGroup]="form">
                    <formly-form 
                      [form]="form" 
                      [fields]="formlyFields" 
                      [model]="model"
                    ></formly-form>
                  </form>
                </div>

                <div class="auto-save-bar">
                  <mat-icon>cloud_done</mat-icon>
                  <span>Redacción en vivo sobre formato {{ tipoHoja() === 'Oficio' ? 'Oficio' : 'Carta' }}. Recuerde hacer clic en "Guardar Borrador" al finalizar.</span>
                </div>
              </div>

              <!-- ============================================ -->
              <!-- MODO 2: VISTA PREVIA DE IMPRESIÓN (PROSE)    -->
              <!-- ============================================ -->
              <div *ngIf="!modoEdicion()" class="preview-mode-container">
                <!-- Encabezado Institucional A / DE / REF / FECHA -->
                <div class="sheet-header-meta">
                  <div class="meta-row" *ngIf="model['para'] || doc()?.para">
                    <span class="meta-label">A:</span>
                    <span class="meta-value">{{ model['para'] || doc()?.para }}</span>
                  </div>
                  <div class="meta-row" *ngIf="model['via'] || doc()?.via">
                    <span class="meta-label">VÍA:</span>
                    <span class="meta-value">{{ model['via'] || doc()?.via }}</span>
                  </div>
                  <div class="meta-row" *ngIf="model['de'] || doc()?.de">
                    <span class="meta-label">DE:</span>
                    <span class="meta-value">{{ model['de'] || doc()?.de }}</span>
                  </div>
                  <div class="meta-row" *ngIf="model['ref'] || doc()?.ref">
                    <span class="meta-label">REF:</span>
                    <span class="meta-value"><strong>{{ model['ref'] || doc()?.ref }}</strong></span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">FECHA:</span>
                    <span class="meta-value">{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>

                <div class="sheet-divider"></div>

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
                <span class="item-badge-clasif">{{ model['inputSelect'] || doc()?.clasificacion || 'RESERVADO' }}</span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Formato de Hoja</span>
                <span class="item-value">{{ tipoHoja() === 'Oficio' ? 'Oficio' : 'Carta' }}</span>
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
                  <p>Por: {{ model['de'] || doc()?.de || 'Funcionario Solicitante' }}</p>
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
    }

    .view-mode-toggle {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      border: 1px solid #e2e8f0;
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
      gap: 8px;
    }

    .action-btn-save {
      background: #0284c7;
      color: #ffffff;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn-pdf {
      color: #0284c7;
      border-color: #0284c7;
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
      padding: 2.5rem 1rem;
      display: flex;
      justify-content: center;
    }

    .sheet-viewport {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .physical-sheet {
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 2px;
      padding: 3rem 3.5rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .pagina-carta {
      width: 21.6cm;
      min-height: 27.9cm;
    }

    .pagina-oficio {
      width: 21.6cm;
      min-height: 33.0cm;
    }

    .sheet-membrete {
      display: grid;
      grid-template-columns: 80px 1fr 180px;
      align-items: center;
      gap: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 1.5rem;
    }

    .membrete-logo-box {
      width: 76px;
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .membrete-logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .membrete-text {
      h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.02em;
      }
      p {
        margin: 2px 0 0 0;
        font-size: 0.8rem;
        color: #475569;
      }
      small {
        font-size: 0.72rem;
        color: #64748b;
      }
    }

    .membrete-cite-box {
      text-align: right;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;

      .cite-label {
        font-size: 0.65rem;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.05em;
      }
      .cite-code {
        font-size: 0.85rem;
        color: #0284c7;
        font-family: 'Courier New', Courier, monospace;
      }
      .cite-fecha {
        font-size: 0.75rem;
        color: #475569;
        margin-top: 2px;
      }
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
      padding: 8px 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      color: #1e40af;
      font-size: 0.78rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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
      margin-top: auto;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
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
  `]
})
export class DocumentWorkbenchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentosService = inject(DocumentosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly doc = signal<Documento | null>(null);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly generandoPdf = signal(false);
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');
  readonly modoEdicion = signal(true);

  readonly form = new FormGroup({});
  model: Record<string, any> = {};
  formlyFields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
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

        // Si los campos de encabezado están en el doc, hidratar modelo
        if (d.de && !this.model['de']) this.model['de'] = d.de;
        if (d.para && !this.model['para']) this.model['para'] = d.para;
        if (d.via && !this.model['via']) this.model['via'] = d.via;
        if (d.ref && !this.model['ref']) this.model['ref'] = d.ref;
        if (d.clasificacion && !this.model['inputSelect']) this.model['inputSelect'] = d.clasificacion;

        // Compilar esquema Formly desde la instantánea congelada en documento.plantilla
        if (d?.plantilla) {
          try {
            const rawFields = typeof d.plantilla === 'string' ? JSON.parse(d.plantilla) : d.plantilla;
            this.formlyFields = Array.isArray(rawFields) ? rawFields : [];
            
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

        // Si el estado es APROBADO o CERRADO, mostrar directamente en modo lectura
        if (d.estado === 'APROBADO' || d.estado === 'CERRADO') {
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

  getCuerpoHtml(): string {
    if (this.model['cuerpo']) return this.model['cuerpo'];
    if (this.model['texto']) return this.model['texto'];
    const d = this.doc();
    if (d?.contenido?.cuerpo) return d.contenido.cuerpo;
    return '';
  }

  guardarBorrador(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    this.guardando.set(true);

    const payload: Partial<Documento> = {
      plantilla_valor: JSON.stringify(this.model),
      de: this.model['de'] || d.de,
      para: this.model['para'] || d.para,
      via: this.model['via'] || d.via,
      ref: this.model['ref'] || d.ref,
      clasificacion: this.model['inputSelect'] || d.clasificacion || 'Reservado'
    };

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

  verPdf(): void {
    const d = this.doc();
    if (!d || !d.nombre) return;

    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      data: {
        titulo: `${d.nombre} - ${this.model['ref'] || d.ref || 'Documento Oficial'}`,
        docCite: d.nombre
      }
    });
  }

  derivarDocumento(): void {
    const d = this.doc();
    if (!d || !d.id_documento) return;

    this.guardando.set(true);
    // Transiciona a estado DERIVADO
    const payload = {
      plantilla_valor: JSON.stringify(this.model),
      de: this.model['de'] || d.de,
      para: this.model['para'] || d.para,
      via: this.model['via'] || d.via,
      ref: this.model['ref'] || d.ref,
      estado: 'DERIVADO',
      sw: { enviado: false, enviar: true }
    };

    this.documentosService.actualizarDocumento(d.id_documento, payload as any).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.doc.set(res.datos);
        this.snackBar.open('Documento derivado exitosamente a la bandeja de destino', 'Cerrar', { duration: 4000 });
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al derivar el documento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  firmarDocumento(): void {
    this.snackBar.open('Iniciando proceso de firma digital autorizada con ADSIB / Ciudadanía...', 'Aceptar', { duration: 4000 });
  }

  getStatusPillClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'pill-aprobado';
      case 'DERIVADO':
      case 'EN CURSO': return 'pill-revision';
      case 'OBSERVADO': return 'pill-observado';
      default: return 'pill-borrador';
    }
  }
}
