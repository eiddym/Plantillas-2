import { Component, Inject, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, inject, signal, computed, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
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
    <div class="visor-dialog-container">
      <!-- Cabecera Institucional Verde Petróleo con Degradados -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="icon-circle" [class.html-circle]="data.esBorrador">
            <mat-icon>{{ data.esBorrador ? 'description' : 'verified' }}</mat-icon>
          </div>
          <div class="title-group">
            <h2 class="dialog-title" [matTooltip]="data.titulo">{{ data.titulo || (data.esBorrador ? 'Vista Previa' : 'Documento Oficial') }}</h2>
            <span class="sheet-dimension-tag">
              {{ data.esBorrador ? 'BORRADOR' : 'DOCUMENTO OFICIAL' }} · {{ tipoHoja() === 'Oficio' ? 'TAMAÑO OFICIO · 21.6 × 33.0 cm' : 'TAMAÑO CARTA · 21.6 × 27.9 cm' }}
            </span>
          </div>
        </div>

        <!-- Controles Centrales: Formato de Hoja y Zoom a Escala Pantalla -->
        <div class="header-center">
          <div class="header-tools-row">
            <!-- Selector de Formato Carta / Oficio -->
            <div class="format-pill-group">
              <button 
                type="button" 
                class="format-pill-btn" 
                [class.active]="tipoHoja() === 'Letter'" 
                (click)="setTipoHoja('Letter')"
                matTooltip="Proporción Tamaño Carta (21.6 × 27.9 cm)">
                Carta
              </button>
              <button 
                type="button" 
                class="format-pill-btn" 
                [class.active]="tipoHoja() === 'Oficio'" 
                (click)="setTipoHoja('Oficio')"
                matTooltip="Proporción Tamaño Oficio (21.6 × 33.0 cm)">
                Oficio
              </button>
            </div>

            <!-- Controles de Escala / Zoom -->
            <div class="zoom-pill-group">
              <button 
                type="button" 
                class="zoom-btn" 
                (click)="ajustarZoom(-0.1)" 
                matTooltip="Reducir tamaño (Zoom -)">
                <mat-icon>remove</mat-icon>
              </button>
              <button 
                type="button" 
                class="zoom-btn zoom-mode-btn" 
                [class.active]="modoEscala() === 'fit'"
                (click)="modoEscala() === 'fit' ? setZoom100() : setModoFit()"
                [matTooltip]="modoEscala() === 'fit' ? 'Click para ver en tamaño 100%' : 'Click para ajustar hoja completa a la pantalla'">
                <span>{{ modoEscala() === 'fit' ? 'Hoja Completa' : (porcentajeEscala() + '%') }}</span>
              </button>
              <button 
                type="button" 
                class="zoom-btn" 
                (click)="ajustarZoom(0.1)" 
                matTooltip="Aumentar tamaño (Zoom +)">
                <mat-icon>add</mat-icon>
              </button>
              <button 
                type="button" 
                class="zoom-btn zoom-100-btn"
                [class.active]="modoEscala() === 'custom' && escalaActual() === 1.0"
                (click)="setZoom100()" 
                matTooltip="Tamaño Real 100%">
                100%
              </button>
            </div>
          </div>
        </div>

        <div class="header-right">
          <a *ngIf="downloadUrl() && !data.esBorrador" 
             mat-flat-button 
             class="btn-dl-header" 
             [href]="downloadUrl()" 
             [download]="getDownloadFileName()"
             matTooltip="Descargar archivo PDF oficial">
            <mat-icon>download</mat-icon>
            <span class="dl-text">Descargar PDF</span>
          </a>

          <button mat-icon-button (click)="dialogRef.close()" class="btn-close" matTooltip="Cerrar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="loading()" mode="indeterminate" class="header-progress"></mat-progress-bar>

      <!-- Cuerpo del Visor: Mesa de Trabajo con Hoja Completa a Escala Pantalla -->
      <div class="dialog-body html-body">
        @if (loading()) {
          <div class="visor-loading-state">
            <mat-icon class="spinner-icon">hourglass_top</mat-icon>
            <h3>{{ data.esBorrador ? 'Cargando Vista Previa...' : 'Cargando Documento Oficial...' }}</h3>
            <p>{{ data.esBorrador ? 'Preparando visualización del documento.' : 'Verificando sellos digitales, códigos y firmas institucionales.' }}</p>
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
        } @else if (safeHtml) {
          <!-- Viewport de la Hoja Completa a Escala Pantalla -->
          <div class="sheet-viewport" #sheetViewport>
            <div class="sheet-scaler-wrapper" [style.width.px]="scaledWidth()" [style.height.px]="scaledHeight()">
              <div 
                class="sheet-scaler" 
                [style.transform]="'scale(' + escalaActual() + ')'"
                [style.transform-origin]="'top left'"
                [style.width.px]="canonicalWidth"
                [style.min-height.px]="canonicalHeight()">
                <div 
                  class="physical-sheet" 
                  [class.sheet-carta]="tipoHoja() === 'Letter'" 
                  [class.sheet-oficio]="tipoHoja() === 'Oficio'">
                  <div [innerHTML]="safeHtml" class="document-html-content"></div>
                </div>
              </div>
            </div>
          </div>
        } @else if (safePdfUrl) {
          <iframe
            [src]="safePdfUrl"
            class="pdf-iframe"
            title="Visor PDF Oficial">
          </iframe>
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
      height: 94vh;
      max-height: 94vh;
      width: 100%;
      max-width: 100%;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);

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
        width: 100%;

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-shrink: 0;
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
          min-width: 0;
          max-width: 280px;
        }

        .dialog-title {
          margin: 0;
          font-size: 1rem;
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
          opacity: 0.95;
          white-space: nowrap;
        }

        .header-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          min-width: 0;
        }

        .header-tools-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.25);
          padding: 3px 6px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .format-pill-group, .zoom-pill-group {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }

        .format-pill-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
          }

          &.active {
            background: #0d5c63;
            color: #5eead4;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          }
        }

        .zoom-pill-group {
          border-left: 1px solid rgba(255, 255, 255, 0.15);
          padding-left: 6px;

          .zoom-btn {
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 3px 6px;
            border-radius: 14px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }

            &:hover {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.08);
            }

            &.zoom-mode-btn {
              padding: 3px 10px;
              min-width: 95px;
              text-align: center;
              &.active {
                background: #0d5c63;
                color: #5eead4;
              }
            }

            &.zoom-100-btn {
              padding: 3px 8px;
              font-size: 0.7rem;
              &.active {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
              }
            }
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-dl-header {
          background: #0284c7 !important;
          color: #ffffff !important;
          border-radius: 20px;
          height: 32px;
          padding: 0 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }

          &:hover {
            background: #0369a1 !important;
          }

          @media (max-width: 600px) {
            .dl-text { display: none; }
            padding: 0 8px;
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
        box-sizing: border-box;
        overflow: hidden;
        background: #f1f5f9;

        &.html-body {
          background: #f1f5f9 !important;
        }
      }

      .pdf-iframe {
        width: 100%;
        height: 100%;
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

      /* Viewport de la Mesa de Trabajo */
      .sheet-viewport {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        overflow: auto;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 16px 20px;
        background: #f1f5f9;

        &::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        &::-webkit-scrollbar-track {
          background: #e2e8f0;
        }
        &::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      }

      /* Contenedor del tamaño escalado en el layout */
      .sheet-scaler-wrapper {
        position: relative;
        flex-shrink: 0;
        margin: auto;
        box-sizing: border-box;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08);
        border-radius: 2px;
        background: #ffffff;
        transition: width 0.15s ease-out, height 0.15s ease-out;
      }

      /* Elemento que aplica la escala CSS precisa */
      .sheet-scaler {
        position: absolute;
        top: 0;
        left: 0;
        box-sizing: border-box;
      }

      /* Hoja Física a Tamaño Canónico (816px de ancho estándar @ 96DPI) */
      .physical-sheet {
        width: 816px;
        box-sizing: border-box;
        background: #ffffff;
        padding: 38px 46px;
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

          * {
            box-sizing: border-box !important;
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
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;

        .dialog-header {
          padding: 8px 10px;
          flex-wrap: wrap;
          .dialog-title { font-size: 0.85rem; }
          .title-group { max-width: 160px; }
          .header-tools-row { gap: 2px; padding: 2px 4px; }
          .format-pill-btn { padding: 2px 6px; font-size: 0.65rem; }
          .zoom-pill-group .zoom-btn { padding: 2px 4px; }
          .btn-dl-header { height: 28px; padding: 0 8px; font-size: 0.7rem; }
        }

        .sheet-viewport {
          padding: 6px !important;
        }
      }
    }
  `]
})
export class VisorPdfDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sheetViewport') sheetViewport?: ElementRef<HTMLDivElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private readonly documentosService = inject(DocumentosService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly downloadUrl = signal('');
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');

  // Canónicos estándar a 96 DPI
  readonly canonicalWidth = 816;
  readonly canonicalHeight = computed(() => this.tipoHoja() === 'Oficio' ? 1248 : 1056);

  // Escala y modo de visualización
  readonly modoEscala = signal<'fit' | 'custom'>('fit');
  readonly escalaActual = signal<number>(0.65);

  readonly scaledWidth = computed(() => Math.round(this.canonicalWidth * this.escalaActual()));
  readonly scaledHeight = computed(() => Math.round(this.canonicalHeight() * this.escalaActual()));
  readonly porcentajeEscala = computed(() => Math.round(this.escalaActual() * 100));
  
  safePdfUrl: SafeResourceUrl | null = null;
  safeHtml: any = null;
  private localBlobUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<VisorPdfDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VisorPdfData
  ) {}

  ngOnInit(): void {
    if (this.data.idDocumento) {
      this.downloadUrl.set(`/api/v1/documento/${this.data.idDocumento}/pdf`);
    } else if (this.data.docCite) {
      this.downloadUrl.set(`/api/v1/plantillasFormly/documentoPDF/${encodeURIComponent(this.data.docCite)}`);
    } else if (this.data.pdfUrl) {
      this.downloadUrl.set(this.data.pdfUrl);
    }

    if (this.data.htmlContent) {
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.data.htmlContent);
    } else if (this.data.idDocumento || this.data.docCite) {
      this.cargarHtmlDinamico(this.data.idDocumento || this.data.docCite!);
    } else if (this.data.pdfUrl) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.recalcularEscalaFit();
    }, 60);
  }

  ngOnDestroy(): void {
    if (this.localBlobUrl) {
      try {
        URL.revokeObjectURL(this.localBlobUrl);
      } catch {}
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.modoEscala() === 'fit') {
      this.recalcularEscalaFit();
    }
  }

  recalcularEscalaFit(): void {
    if (this.modoEscala() !== 'fit') return;
    const vp = this.sheetViewport?.nativeElement;
    const availH = vp && vp.clientHeight > 0 ? vp.clientHeight : (window.innerHeight * 0.94 - 80);
    const availW = vp && vp.clientWidth > 0 ? vp.clientWidth : (window.innerWidth * 0.90);

    if (availH <= 0 || availW <= 0) return;

    const margen = 24;
    const canH = this.canonicalHeight();
    const scaleH = (availH - margen) / canH;
    const scaleW = (availW - margen) / this.canonicalWidth;

    // Se toma el mínimo entre alto y ancho para que quepa la hoja física COMPLETA sin desbordar
    let fit = Math.min(scaleH, scaleW);
    fit = Math.max(0.35, Math.min(fit, 1.15));
    fit = Math.round(fit * 1000) / 1000;

    this.escalaActual.set(fit);
    this.cdr.markForCheck();
  }

  setTipoHoja(tipo: 'Letter' | 'Oficio'): void {
    this.tipoHoja.set(tipo);
    if (this.modoEscala() === 'fit') {
      setTimeout(() => this.recalcularEscalaFit(), 20);
    }
    this.cdr.markForCheck();
  }

  ajustarZoom(delta: number): void {
    this.modoEscala.set('custom');
    const actual = this.escalaActual();
    const nuevo = Math.max(0.35, Math.min(+(actual + delta).toFixed(2), 2.0));
    this.escalaActual.set(nuevo);
    this.cdr.markForCheck();
  }

  setModoFit(): void {
    this.modoEscala.set('fit');
    this.recalcularEscalaFit();
  }

  setZoom100(): void {
    this.modoEscala.set('custom');
    this.escalaActual.set(1.0);
    this.cdr.markForCheck();
  }

  cargarHtmlDinamico(idOrCite: number | string): void {
    this.loading.set(true);
    this.errorMessage.set('');
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
        const html = res.datos?.html || '<p class="text-muted">No se pudo cargar el contenido del documento.</p>';
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.cdr.markForCheck();
        setTimeout(() => this.recalcularEscalaFit(), 60);
      },
      error: (err) => {
        this.loading.set(false);
        if (this.downloadUrl()) {
          this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.downloadUrl());
          this.cdr.markForCheck();
          return;
        }
        this.errorMessage.set(
          err.error?.mensaje || err.message || 'No se pudo obtener la visualización del documento.'
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
        if (this.data.idDocumento) {
          this.http.get(`/api/v1/documento/${this.data.idDocumento}/pdf`, { responseType: 'blob' }).subscribe({
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
            error: (errId) => {
              this.loading.set(false);
              this.errorMessage.set(
                errId.error?.mensaje || errId.message || 'No se pudo generar el documento PDF.'
              );
              this.cdr.markForCheck();
            }
          });
          return;
        }
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.mensaje || err.message || 'No se pudo generar el documento PDF.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  reintentar(): void {
    if (this.data.idDocumento || this.data.docCite) {
      this.cargarHtmlDinamico(this.data.idDocumento || this.data.docCite!);
    } else if (this.data.pdfUrl) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.pdfUrl);
    }
  }

  getDownloadFileName(): string {
    const name = this.data.docCite || 'documento';
    return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  }
}
