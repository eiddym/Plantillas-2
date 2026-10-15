import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Documento, DocumentosService } from '../../core/services/documentos.service';
import { VisorPdfDialogComponent } from '../visor-pdf/visor-pdf-dialog.component';

@Component({
  selector: 'app-document-workbench',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
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
            <span class="doc-cite">{{ doc()?.nombre || 'DOCUMENTO' }}</span>
            <span class="doc-status-pill" [ngClass]="getStatusPillClass(doc()?.estado)">
              {{ doc()?.estado || 'BORRADOR' }}
            </span>
          </div>
        </div>

        <div class="topbar-actions">
          <button mat-stroked-button (click)="verPdf()" class="action-btn-pdf" [disabled]="!doc()">
            <mat-icon>picture_as_pdf</mat-icon>
            <span>Ver PDF Oficial</span>
          </button>
          <button mat-stroked-button (click)="derivarDocumento()" class="action-btn-derivar" [disabled]="!doc()">
            <mat-icon>forward</mat-icon>
            <span>Derivar</span>
          </button>
          <button mat-raised-button color="primary" (click)="firmarDocumento()" class="action-btn-firmar" [disabled]="!doc()">
            <mat-icon>draw</mat-icon>
            <span>Firmar Digitalmente</span>
          </button>
        </div>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
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
              <!-- Membrete Oficial -->
              <div class="sheet-membrete">
                <div class="membrete-logo-box">
                  <img src="/assets/images/logo_cooperativa.png" alt="Cooperativa Marabunta R.L." class="membrete-logo" />
                </div>
                <div class="membrete-text">
                  <h3>COOPERATIVA MINERA MARABUNTA R.L.</h3>
                  <p>Sistema Digital de Documentos y Aprobación</p>
                  <small>La Paz - Bolivia</small>
                </div>
                <div class="membrete-cite-box">
                  <span class="cite-label">CITE OFICIAL</span>
                  <strong class="cite-code">{{ doc()?.nombre }}</strong>
                  <span class="cite-fecha">{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>

              <!-- Encabezado Institucional A / DE / REF / FECHA -->
              <div class="sheet-header-meta">
                <div class="meta-row" *ngIf="doc()?.para">
                  <span class="meta-label">A:</span>
                  <span class="meta-value">{{ doc()?.para }}</span>
                </div>
                <div class="meta-row" *ngIf="doc()?.via">
                  <span class="meta-label">VÍA:</span>
                  <span class="meta-value">{{ doc()?.via }}</span>
                </div>
                <div class="meta-row" *ngIf="doc()?.de">
                  <span class="meta-label">DE:</span>
                  <span class="meta-value">{{ doc()?.de }}</span>
                </div>
                <div class="meta-row" *ngIf="doc()?.ref">
                  <span class="meta-label">REF:</span>
                  <span class="meta-value"><strong>{{ doc()?.ref }}</strong></span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">FECHA:</span>
                  <span class="meta-value">{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>

              <div class="sheet-divider"></div>

              <!-- Cuerpo de Lectura Documental (Tipografía Literata con máx 75 caracteres) -->
              <article class="document-prose">
                @if (docCuerpoHtml()) {
                  <div [innerHTML]="docCuerpoHtml()"></div>
                } @else {
                  <p>
                    En cumplimiento a las normativas vigentes y a los procedimientos de la Cooperativa Minera
                    Marabunta R.L., se emite el presente documento oficial para su revisión y tramitación
                    correspondiente ante las instancias pertinentes.
                  </p>
                  <p>
                    El expediente adjunto cuenta con las valoraciones técnicas y legales correspondientes,
                    quedando registrado en el sistema con estampado criptográfico para los fines de control
                    y archivo institucional.
                  </p>
                }
              </article>

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
                <span class="item-badge-clasif">{{ doc()?.clasificacion || 'ORDINARIO' }}</span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Formato de Hoja</span>
                <span class="item-value">{{ tipoHoja() }}</span>
              </div>
              <div class="inspector-item">
                <span class="item-label">Fecha de Redacción</span>
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
                  <strong>Redacción Completada</strong>
                  <p>Por: {{ doc()?.de || 'Funcionario Solicitante' }}</p>
                  <small>{{ doc()?._fecha_creacion | date:'dd/MM/yyyy' }}</small>
                </div>
              </div>
              <div class="timeline-entry" [class.active]="doc()?.estado === 'APROBADO' || doc()?.estado === 'DERIVADO'">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <strong>Revisión y Visto Bueno</strong>
                  <p>Bandeja activa de jefatura</p>
                  <small>{{ doc()?.estado }}</small>
                </div>
              </div>
              <div class="timeline-entry" [class.active]="doc()?.estado === 'APROBADO'">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <strong>Aprobación y Cierre</strong>
                  <p>Archivo digital emitido</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .workbench-container {
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    /* Barra Superior de Control */
    .workbench-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
      flex-wrap: wrap;
      gap: 12px;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-back {
      color: #0f2027;
      background: #f1f5f9;
      border-radius: 8px;
    }

    .doc-identity {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .doc-cite {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f2027;
      letter-spacing: -0.2px;
    }

    .doc-status-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pill-aprobado { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .pill-revision { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .pill-observado { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .pill-borrador { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;

      button {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 40px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 600;
        font-size: 0.88rem;
      }
    }

    .action-btn-pdf {
      color: #0284c7;
      border-color: #bae6fd;
      &:hover { background: #f0f9ff; }
    }

    .action-btn-derivar {
      color: #0f2027;
      border-color: #cbd5e1;
    }

    .action-btn-firmar {
      background-color: #0f2027 !important;
      color: #ffffff !important;
      border-radius: 20px;
      mat-icon { color: #00e5ff; }
    }

    /* Grid del Workbench */
    .workbench-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
    }

    /* Lienzo Central con la Hoja Física */
    .sheet-viewport {
      display: flex;
      justify-content: center;
      background: #e2e8f0;
      padding: 24px;
      border-radius: 14px;
      overflow-x: auto;
    }

    .physical-sheet {
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.15), 0 1px 4px rgba(0, 0, 0, 0.05);
      border-radius: 2px;
      display: flex;
      flex-direction: column;
    }

    .sheet-membrete {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #0f2027;
      margin-bottom: 20px;
    }

    .membrete-logo-box {
      width: 70px;
      height: 70px;
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
      text-align: center;
      flex: 1;
      padding: 0 16px;
      h3 { margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f2027; letter-spacing: 0.5px; }
      p { margin: 2px 0 0 0; font-size: 0.78rem; color: #475569; }
      small { font-size: 0.7rem; color: #64748b; }
    }

    .membrete-cite-box {
      text-align: right;
      display: flex;
      flex-direction: column;
      .cite-label { font-size: 0.68rem; font-weight: 700; color: #64748b; }
      .cite-code { font-size: 0.92rem; color: #0f2027; }
      .cite-fecha { font-size: 0.75rem; color: #64748b; }
    }

    .sheet-header-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.92rem;
      margin-bottom: 16px;
    }

    .meta-row {
      display: flex;
      gap: 8px;
    }

    .meta-label {
      width: 60px;
      font-weight: 700;
      color: #0f2027;
    }

    .meta-value {
      flex: 1;
      color: #1e293b;
    }

    .sheet-divider {
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 24px;
    }

    .sheet-footer {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Columna Derecha: Inspector */
    .workbench-inspector-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .inspector-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 2px 6px rgba(15, 32, 39, 0.03);
    }

    .inspector-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f2027;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0284c7; }
    }

    .inspector-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .inspector-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .item-label { color: #64748b; font-weight: 500; }
    .item-value { color: #0f2027; font-weight: 600; }
    .item-badge-clasif {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      background: #e0f2fe;
      color: #0369a1;
    }

    /* Timeline de Trazabilidad */
    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      margin-left: 8px;
      border-left: 2px solid #e2e8f0;
      padding-left: 16px;
    }

    .timeline-entry {
      position: relative;
      .timeline-dot {
        position: absolute;
        left: -23px;
        top: 3px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #cbd5e1;
        border: 2px solid #ffffff;
      }
      &.active .timeline-dot {
        background: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
      }
      strong { font-size: 0.82rem; color: #0f2027; display: block; }
      p { margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b; }
      small { font-size: 0.7rem; color: #94a3b8; }
    }

    @media (max-width: 1024px) {
      .workbench-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DocumentWorkbenchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentosService = inject(DocumentosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly doc = signal<Documento | null>(null);
  readonly loading = signal(false);
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');
  readonly docCuerpoHtml = signal<string>('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cargarDocumento(parseInt(idParam, 10));
    }
  }

  cargarDocumento(id: number): void {
    this.loading.set(true);
    this.documentosService.getDocumento(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        const d = res.datos;
        this.doc.set(d);

        // Detectar si la plantilla o documento define formato Oficio o Carta
        if (d?.plantilla && typeof d.plantilla === 'string') {
          try {
            const pArr = JSON.parse(d.plantilla);
            if (pArr?.[0]?.templateOptions?.tipoHoja === 'Oficio') {
              this.tipoHoja.set('Oficio');
            }
          } catch {
            this.tipoHoja.set('Letter');
          }
        }

        // Extraer cuerpo si existe
        if (d?.contenido && typeof d.contenido === 'object' && d.contenido.cuerpo) {
          this.docCuerpoHtml.set(d.contenido.cuerpo);
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al cargar el documento', 'Cerrar', { duration: 3000 });
      }
    });
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

  verPdf(): void {
    const d = this.doc();
    if (!d) return;

    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      data: {
        titulo: `${d.nombre} - ${d.ref || 'Documento'}`,
        pdfUrl: `/public/documentos/${d.nombre}.pdf`
      }
    });
  }

  derivarDocumento(): void {
    this.snackBar.open('Documento derivado a la bandeja correspondiente', 'Aceptar', { duration: 3000 });
  }

  firmarDocumento(): void {
    this.snackBar.open('Iniciando proceso de firma digital autorizada...', 'Aceptar', { duration: 3000 });
  }
}
