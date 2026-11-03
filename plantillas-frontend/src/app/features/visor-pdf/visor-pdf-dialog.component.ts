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
          <h2 class="dialog-title">{{ data.titulo || (data.esBorrador ? 'Vista Previa' : 'Documento Oficial') }}</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="btn-close" matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-progress-bar *ngIf="loading()" mode="indeterminate" class="header-progress"></mat-progress-bar>

      <!-- Cuerpo del Visor -->
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
          <!-- Hoja Completa Blanca sin espacios laterales oscuros -->
          <div class="document-sheet">
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
    .visor-dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      max-height: 88vh;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-sizing: border-box;

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        background: linear-gradient(135deg, #0f2027 0%, #15303c 50%, #0d5c63 100%);
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        box-sizing: border-box;
        flex-shrink: 0;

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          mat-icon {
            font-size: 22px;
            width: 22px;
            height: 22px;
            color: #f87171;
          }

          &.html-circle mat-icon {
            color: #5eead4;
          }
        }

        .dialog-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: 0.3px;
        }

        .btn-close {
          color: #cbd5e1;
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
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden !important;
        background: #1e293b;

        &.html-body {
          background: #ffffff !important;
        }
      }

      .pdf-iframe {
        width: 100%;
        height: 78vh;
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

      /* Hoja de documento completa */
      .document-sheet {
        width: 100%;
        box-sizing: border-box;
        padding: 36px 44px;
        background: #ffffff;
        color: #1e293b;
        font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
        line-height: 1.6;
        overflow-x: hidden !important;

        .document-html-content {
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden !important;

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
            margin-bottom: 8px;
          }

          #pageHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
            margin-bottom: 14px;
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
          }

          td, th {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            vertical-align: top;
          }

          .datosGenerales {
            font-weight: 700;
            width: 120px;
            background: #f8fafc;
            color: #334155;
          }

          p {
            margin-top: 0;
            margin-bottom: 12px;
            line-height: 1.65;
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
            font-size: 14pt;
            letter-spacing: 0.5px;
            margin: 16px 0;
          }
        }
      }

      .dialog-footer {
        padding: 12px 20px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        justify-content: flex-end;
        box-sizing: border-box;
        flex-shrink: 0;
      }
    }

    @media (max-width: 768px) {
      .visor-dialog-container {
        .dialog-header {
          padding: 10px 14px;
          .dialog-title { font-size: 1rem; }
        }
        .document-sheet {
          padding: 20px 16px !important;
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

  cargarHtmlDinamico(idOrCite: number | string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.downloadUrl.set('');
    this.safePdfUrl = null;
    this.cdr.markForCheck();

    this.documentosService.obtenerVistaPreviaHtml(idOrCite).subscribe({
      next: (res) => {
        this.loading.set(false);
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
