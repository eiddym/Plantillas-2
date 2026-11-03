import { Component, Inject, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentosService } from '../../core/services/documentos.service';

export interface VisorPdfData {
  titulo: string;
  pdfUrl?: string;
  docCite?: string;
  htmlContent?: string;
  idDocumento?: number;
  esBorrador?: boolean;
}

@Component({
  selector: 'app-visor-pdf-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="visor-dialog-container" [class.visor-html-mode]="data.esBorrador">
      <!-- Cabecera Institucional Verde Petróleo con Degradados -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="icon-circle" [class.html-circle]="data.esBorrador">
            <mat-icon>{{ data.esBorrador ? 'description' : 'picture_as_pdf' }}</mat-icon>
          </div>
          <div class="title-group">
            <h2 class="dialog-title">{{ data.titulo || (data.esBorrador ? 'Vista Previa' : 'Documento Oficial') }}</h2>
            <span class="sheet-dimension-tag" *ngIf="data.esBorrador">
              {{ tipoHoja() === 'Oficio' ? 'OFICIO · 21.6 × 33.0 cm' : 'CARTA · 21.6 × 27.9 cm' }}
            </span>
          </div>
        </div>

        <!-- Selector de Formato de Hoja (Carta / Oficio) para Borrador HTML -->
        <div class="header-center" *ngIf="data.esBorrador">
          <div class="format-pill-group">
            <button 
              type="button" 
              class="format-pill-btn" 
              [class.active]="tipoHoja() === 'Letter'" 
              (click)="setTipoHoja('Letter')"
              matTooltip="Ver en proporción Tamaño Carta (21.6 × 27.9 cm)">
              Carta
            </button>
            <button 
              type="button" 
              class="format-pill-btn" 
              [class.active]="tipoHoja() === 'Oficio'" 
              (click)="setTipoHoja('Oficio')"
              matTooltip="Ver en proporción Tamaño Oficio (21.6 × 33.0 cm)">
              Oficio
            </button>
          </div>
        </div>

        <button mat-icon-button (click)="dialogRef.close()" class="btn-close" matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-progress-bar *ngIf="loading()" mode="indeterminate" class="header-progress"></mat-progress-bar>

      <!-- Cuerpo del Visor: Hoja Completa en Escala Pantalla -->
      <div class="dialog-body" [class.html-body]="data.esBorrador">
        @if (loading()) {
          <div class="visor-loading-state">
            <mat-icon class="spinner-icon">hourglass_top</mat-icon>
            <h3>{{ data.esBorrador ? 'Cargando Vista Previa...' : 'Generando Documento Oficial...' }}</h3>
            <p>{{ data.esBorrador ? 'Preparando visualización del documento.' : 'Compilando sellos digitales y código QR de verificación institucional.' }}</p>
          </div>
        } @else if (errorMessage()) {
          <div class="visor-error-state">
            <mat-icon class="error-icon">report_problem</mat-icon>
            <h3>No se pudo cargar el documento</h3>
            <p>{{ errorMessage() }}</p>
            <button mat-flat-button color="primary" (click)="reintentar()">
              <mat-icon>refresh</mat-icon>
              <span>Reintentar</span>
            </button>
          </div>
        } @else if (safePdfUrl) {
          <iframe
            [src]="safePdfUrl"
            class="pdf-iframe"
            title="Visor PDF Oficial">
          </iframe>
        } @else if (safeHtml) {
          <!-- Hoja Completa Física a Escala Pantalla -->
          <div class="physical-sheet" [class.sheet-carta]="tipoHoja() === 'Letter'" [class.sheet-oficio]="tipoHoja() === 'Oficio'">
            <div [innerHTML]="safeHtml" class="document-html-content"></div>
          </div>
        }
      </div>

      <!-- Footer solo para PDF si hay descarga -->
      @if (downloadUrl() && !data.esBorrador) {
        <div class="dialog-footer">
          <a mat-raised-button color="primary" [href]="downloadUrl()" [download]="getDownloadFileName()">
            <mat-icon>download</mat-icon>
            <span>Descargar PDF</span>
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .visor-dialog-container {
      display: flex;
      flex-direction: column;
      height: 92vh;
      max-height: 94vh;
      width: fit-content;
      max-width: 95vw;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);

      &:not(.visor-html-mode) {
        width: 85vw;
        max-width: 1200px;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 18px;
        background: linear-gradient(135deg, #0f2027 0%, #15303c 50%, #0d5c63 100%);
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        box-sizing: border-box;
        flex-shrink: 0;
        gap: 12px;

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .icon-circle {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: #f87171;
          }

          &.html-circle mat-icon {
            color: #5eead4;
          }
        }

        .title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dialog-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sheet-dimension-tag {
          font-size: 0.65rem;
          color: #5eead4;
          font-weight: 600;
          letter-spacing: 0.4px;
          opacity: 0.9;
        }

        .header-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }

        .format-pill-group {
          display: inline-flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 2px;
          gap: 2px;

          .format-pill-btn {
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              color: #ffffff;
            }

            &.active {
              background: #0d5c63;
              color: #5eead4;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
            }
          }
        }

        .btn-close {
          color: #cbd5e1;
          flex-shrink: 0;
          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }

      .header-progress {
        height: 3px;
        flex-shrink: 0;
      }

      .dialog-body {
        flex: 1;
        width: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden !important;
        background: #ffffff;

        &.html-body {
          background: #ffffff !important;
        }
      }

      .pdf-iframe {
        width: 100%;
        height: calc(92vh - 120px);
        border: none;
        background: #ffffff;
        display: block;
      }

      .visor-loading-state, .visor-error-state {
        margin: auto;
        text-align: center;
        padding: 40px 20px;
        color: #64748b;

        h3 { margin: 12px 0 6px 0; color: #0f172a; font-size: 1.2rem; font-weight: 700; }
        p { margin: 0 0 16px 0; font-size: 0.9rem; color: #64748b; max-width: 440px; }
        .spinner-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #0d5c63;
          animation: pulse 1.5s infinite;
        }
        .error-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #ef4444;
        }
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
      }

      /* Hoja Física a Escala Pantalla (Carta 21.6x27.9cm / Oficio 21.6x33.0cm) */
      .physical-sheet {
        height: calc(92vh - 56px);
        max-height: calc(92vh - 56px);
        box-sizing: border-box;
        background: #ffffff;
        padding: 32px 38px 48px 38px;
        overflow-y: auto;
        overflow-x: hidden !important;
        display: flex;
        flex-direction: column;
        position: relative;
        margin: 0 auto;

        &::-webkit-scrollbar {
          width: 6px;
        }
        &::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        &::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        &.sheet-carta {
          aspect-ratio: 216 / 279;
          width: calc((92vh - 56px) * 0.7742);
        }

        &.sheet-oficio {
          aspect-ratio: 216 / 330;
          width: calc((92vh - 56px) * 0.6545);
        }

        .document-html-content {
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden !important;
          font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
          line-height: 1.5;
          color: #1e293b;
          font-size: 9.5pt;

          * {
            box-sizing: border-box !important;
            max-width: 100% !important;
          }

          .fondo-texto {
            display: none !important;
          }

          .mi-contenido {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .contenedor {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 6px;
          }

          #pageHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
            margin-bottom: 12px;
            font-size: 9.5pt;

            .cite {
              float: none !important;
              font-weight: 600;
            }
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            margin: 10px 0 !important;
            table-layout: fixed !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            font-size: 9pt;
          }

          td, th {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            vertical-align: top;
          }

          .datosGenerales {
            font-weight: 700;
            width: 110px;
            background: #f8fafc;
            color: #334155;
          }

          p {
            margin-top: 0;
            margin-bottom: 10px;
            line-height: 1.55;
            text-align: justify;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }

          h1, h2, h3, h4, h5, h6 {
            color: #0f172a;
            font-weight: 700;
            line-height: 1.25;
          }

          h2 {
            font-size: 12.5pt;
            letter-spacing: 0.3px;
            margin: 12px 0;
          }
        }
      }

      .dialog-footer {
        padding: 10px 18px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: flex-end;
        box-sizing: border-box;
        flex-shrink: 0;
      }
    }

    @media (max-width: 650px) {
      .visor-dialog-container {
        width: 96vw !important;
        max-width: 96vw !important;

        .dialog-header {
          padding: 8px 12px;
          .dialog-title { font-size: 0.95rem; }
          .format-pill-group .format-pill-btn { padding: 3px 8px; font-size: 0.7rem; }
        }

        .physical-sheet {
          width: 100% !important;
          aspect-ratio: unset !important;
          padding: 16px 14px !important;
        }
      }
    }
  `]
})
export class VisorPdfDialogComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly documentosService = inject(DocumentosService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly downloadUrl = signal('');
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');
  
  safePdfUrl: SafeResourceUrl | null = null;
  safeHtml: any = null;
  private localBlobUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<VisorPdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VisorPdfData
  ) {}

  ngOnInit(): void {
    if (this.data.htmlContent) {
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.data.htmlContent);
    } else if (this.data.esBorrador || (this.data.idDocumento && !this.data.pdfUrl)) {
      this.cargarHtmlDinamico(this.data.idDocumento || this.data.docCite!);
    } else if (this.data.pdfUrl && this.data.pdfUrl.startsWith('blob:')) {
      this.localBlobUrl = this.data.pdfUrl;
      this.downloadUrl.set(this.data.pdfUrl);
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
    } else if (this.data.docCite) {
      this.cargarPdfDinamico(this.data.docCite);
    } else if (this.data.pdfUrl) {
      this.downloadUrl.set(this.data.pdfUrl);
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
    }
  }

  ngOnDestroy(): void {
    if (this.localBlobUrl) {
      try {
        URL.revokeObjectURL(this.localBlobUrl);
      } catch {}
    }
  }

  setTipoHoja(tipo: 'Letter' | 'Oficio'): void {
    this.tipoHoja.set(tipo);
    this.cdr.markForCheck();
  }

  cargarHtmlDinamico(idOrCite: number | string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.downloadUrl.set('');
    this.safePdfUrl = null;
    this.cdr.markForCheck();

    this.documentosService.obtenerVistaPreviaHtml(idOrCite).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.datos?.tipoHoja === 'Oficio' || res.datos?.tipoHoja === 'Legal') {
          this.tipoHoja.set('Oficio');
        } else {
          this.tipoHoja.set('Letter');
        }
        const html = res.datos?.html || '<p class="text-muted">No se pudo cargar el contenido del borrador.</p>';
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.mensaje || err.message || 'No se pudo obtener la vista previa HTML del borrador.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  cargarPdfDinamico(cite: string, force = false): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.cdr.markForCheck();

    this.documentosService.generarPdfDocumento(cite, force).subscribe({
      next: (blob) => {
        this.loading.set(false);
        if (this.localBlobUrl) {
          try { URL.revokeObjectURL(this.localBlobUrl); } catch {}
        }
        this.localBlobUrl = URL.createObjectURL(blob);
        this.downloadUrl.set(this.localBlobUrl);
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.localBlobUrl);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.mensaje || err.message || 'No se pudo generar el documento PDF.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  reintentar(): void {
    if (this.data.esBorrador || (this.data.idDocumento && !this.data.pdfUrl)) {
      this.cargarHtmlDinamico(this.data.idDocumento || this.data.docCite!);
    } else if (this.data.docCite) {
      this.cargarPdfDinamico(this.data.docCite, true);
    }
  }

  getDownloadFileName(): string {
    const name = this.data.docCite || 'documento';
    return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  }
}
