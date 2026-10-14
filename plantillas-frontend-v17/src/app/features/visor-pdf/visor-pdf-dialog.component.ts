import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface VisorPdfData {
  titulo: string;
  pdfUrl?: string;
  htmlContent?: string;
}

@Component({
  selector: 'app-visor-pdf-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <mat-icon color="primary">picture_as_pdf</mat-icon>
        <h2 mat-dialog-title class="dialog-title">{{ data.titulo || 'Vista Previa del Documento' }}</h2>
      </div>
      <div class="header-actions">
        <button mat-icon-button (click)="imprimir()" matTooltip="Imprimir">
          <mat-icon>print</mat-icon>
        </button>
        <button mat-icon-button mat-dialog-close matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-dialog-content class="dialog-body">
      <!-- PDF iframe viewer -->
      <iframe
        *ngIf="safePdfUrl"
        [src]="safePdfUrl"
        class="pdf-iframe"
        title="Visor PDF">
      </iframe>

      <!-- HTML preview container when rendering HTML directly -->
      <div
        *ngIf="!safePdfUrl && data.htmlContent"
        [innerHTML]="safeHtml"
        class="html-preview-container">
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-footer">
      <button mat-stroked-button mat-dialog-close>Cerrar</button>
      <a *ngIf="data.pdfUrl" mat-raised-button color="primary" [href]="data.pdfUrl" target="_blank" download>
        <mat-icon>download</mat-icon>
        <span>Descargar PDF</span>
      </a>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #e0e0e0;
      .header-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dialog-title {
        margin: 0;
        font-size: 1.25rem;
        color: #1a237e;
      }
    }
    .dialog-body {
      padding: 0 !important;
      height: 75vh;
      min-width: 60vw;
      background: #525659;
      display: flex;
    }
    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }
    .html-preview-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 40px;
      background: #ffffff;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      max-width: 800px;
      margin: 20px auto;
    }
    .dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class VisorPdfDialogComponent {
  private readonly sanitizer = inject(DomSanitizer);
  safePdfUrl: SafeResourceUrl | null = null;
  safeHtml: any = null;

  constructor(
    public dialogRef: MatDialogRef<VisorPdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VisorPdfData
  ) {
    if (data.pdfUrl) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.pdfUrl);
    }
    if (data.htmlContent) {
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(data.htmlContent);
    }
  }

  imprimir(): void {
    window.print();
  }
}
