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
        <mat-icon class="pdf-icon">picture_as_pdf</mat-icon>
        <div>
          <h2 mat-dialog-title class="dialog-title">{{ data.titulo || 'Vista Previa Oficial' }}</h2>
          <span class="dialog-subtitle" *ngIf="data.docCite">CITE: {{ data.docCite }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button mat-icon-button (click)="imprimir()" matTooltip="Imprimir" [disabled]="loading() || !!errorMessage()">
          <mat-icon>print</mat-icon>
        </button>
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
          <h3>Generando Documento Oficial...</h3>
          <p>Compilando plantilla, sellos digitales y código QR de verificación institucional.</p>
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
      } @else if (data.htmlContent) {
        <div
          [innerHTML]="safeHtml"
          class="html-preview-container">
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-footer">
      <button mat-stroked-button mat-dialog-close>Cerrar</button>
      @if (downloadUrl()) {
        <a mat-raised-button color="primary" [href]="downloadUrl()" [download]="getDownloadFileName()">
          <mat-icon>download</mat-icon>
          <span>Descargar PDF</span>
        </a>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: #0a192f;
      color: #ffffff;

      .header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pdf-icon {
        color: #ef4444;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .dialog-title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      }
      .dialog-subtitle {
        font-size: 0.78rem;
        color: #94a3b8;
      }
      .header-actions {
        display: flex;
        gap: 4px;
        button { color: #cbd5e1; }
      }
    }

    .header-progress {
      height: 3px;
    }

    .dialog-body {
      padding: 0 !important;
      height: 78vh;
      min-width: 65vw;
      background: #1e293b;
      display: flex;
      position: relative;
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
      p { margin: 0 0 16px 0; font-size: 0.9rem; color: #94a3b8; max-width: 420px; }
      .spinner-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #38bdf8;
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

    .html-preview-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 40px;
      background: #ffffff;
      max-width: 800px;
      margin: 20px auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
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
        height: 68vh;
      }

      .html-preview-container {
        padding: 16px 12px;
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

  cargarPdfDinamico(cite: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.cdr.markForCheck();

    this.documentosService.generarPdfDocumento(cite, true).subscribe({
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
          err.error?.mensaje || err.message || 'No se pudo generar el documento PDF. Por favor verifique que el borrador tenga todos los datos requeridos.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  reintentar(): void {
    if (this.data.docCite) {
      this.cargarPdfDinamico(this.data.docCite);
    }
  }

  imprimir(): void {
    window.print();
  }

  getDownloadFileName(): string {
    const name = this.data.docCite || 'documento';
    return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  }
}

