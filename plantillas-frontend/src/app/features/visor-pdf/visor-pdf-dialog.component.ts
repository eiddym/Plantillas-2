import { Component, Inject, OnInit, OnDestroy, inject, signal, ChangeDetectorRef } from '@angular/core';
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
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <mat-icon [class.pdf-icon]="!data.esBorrador" [class.html-icon]="data.esBorrador">
          {{ data.esBorrador ? 'description' : 'picture_as_pdf' }}
        </mat-icon>
        <div>
          <h2 mat-dialog-title class="dialog-title">
            {{ data.titulo || (data.esBorrador ? 'Vista Previa' : 'Documento Oficial') }}
          </h2>
        </div>
      </div>
      <div class="header-actions">
        <button mat-icon-button mat-dialog-close matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-progress-bar *ngIf="loading()" mode="indeterminate" class="header-progress"></mat-progress-bar>

    <mat-dialog-content class="dialog-body">
      @if (loading()) {
        <div class="pdf-loading-state">
          <mat-icon class="spinner-icon">hourglass_top</mat-icon>
          <h3>{{ data.esBorrador ? 'Cargando Vista Previa...' : 'Generando Documento Oficial...' }}</h3>
          <p>{{ data.esBorrador ? 'Preparando visualización del documento.' : 'Compilando sellos digitales y código QR de verificación institucional.' }}</p>
        </div>
      } @else if (errorMessage()) {
        <div class="pdf-error-state">
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
        <div class="html-preview-wrapper">
          <div class="sheet-viewport">
            <div
              [innerHTML]="safeHtml"
              class="html-preview-container sheet-preview">
            </div>
          </div>
        </div>
      }
    </mat-dialog-content>

    @if (downloadUrl() && !data.esBorrador) {
      <mat-dialog-actions align="end" class="dialog-footer">
        <a mat-raised-button color="primary" [href]="downloadUrl()" [download]="getDownloadFileName()">
          <mat-icon>download</mat-icon>
          <span>Descargar PDF</span>
        </a>
      </mat-dialog-actions>
    }
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: linear-gradient(135deg, #0f2027 0%, #15303c 50%, #0d5c63 100%);
      color: #ffffff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pdf-icon {
        color: #f87171;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .html-icon {
        color: #5eead4;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .dialog-title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      }
      .header-actions {
        display: flex;
        gap: 4px;
        button { color: #e2e8f0; }
      }
    }

    .header-progress {
      height: 3px;
    }

    .dialog-body {
      padding: 0 !important;
      height: 80vh;
      min-width: 65vw;
      background: #1e293b;
      display: flex;
      position: relative;
      overflow: hidden !important;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }

    .pdf-loading-state, .pdf-error-state {
      margin: auto;
      text-align: center;
      padding: 40px 20px;
      color: #cbd5e1;

      h3 { margin: 12px 0 6px 0; color: #ffffff; font-size: 1.2rem; }
      p { margin: 0 0 16px 0; font-size: 0.9rem; color: #94a3b8; max-width: 440px; }
      .spinner-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #5eead4;
        animation: pulse 1.5s infinite;
      }
      .error-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #f87171;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 1; }
    }

    .html-preview-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1e293b;
      overflow: hidden !important;
    }

    .sheet-viewport {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden !important;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
      box-sizing: border-box;
    }

    .html-preview-container {
      width: 100%;
      max-width: 780px;
      min-height: 1050px;
      background: #ffffff;
      padding: 44px 48px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      color: #1e293b;
      font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      border-radius: 2px;
      box-sizing: border-box;
      overflow-x: hidden !important;

      ::ng-deep {
        * {
          box-sizing: border-box;
          max-width: 100%;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          margin: 16px 0;
          table-layout: fixed;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        td, th {
          border: 1px solid #cbd5e1;
          padding: 8px 10px;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        p {
          margin-bottom: 12px;
          line-height: 1.6;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        h1, h2, h3, h4 {
          color: #0f172a;
          font-weight: 700;
        }
      }
    }

    .dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .dialog-header {
        padding: 10px 14px;
        .dialog-title {
          font-size: 1rem;
        }
      }

      .dialog-body {
        min-width: 92vw;
        height: 72vh;
      }

      .html-preview-container {
        padding: 20px 14px;
        margin: 10px 0;
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
