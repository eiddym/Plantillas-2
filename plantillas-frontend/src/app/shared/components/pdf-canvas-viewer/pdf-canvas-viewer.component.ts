import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
}

@Component({
  selector: 'app-pdf-canvas-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="canvas-viewer-shell">
      <div class="canvas-toolbar">
        <div class="toolbar-info">
          <span class="sheet-pill">
            {{ tipoHoja() === 'Oficio' ? 'TAMAÑO OFICIO' : 'TAMAÑO CARTA' }}
            ({{ orientacion() === 'Horizontal' ? 'HORIZONTAL' : 'VERTICAL' }})
          </span>
          @if (totalPaginas() > 1) {
            <div class="page-nav-group">
              <button
                type="button"
                class="nav-pill-btn"
                (click)="irAPagina(paginaActual() - 1)"
                [disabled]="paginaActual() <= 1"
                matTooltip="Página anterior"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="page-indicator">Pág {{ paginaActual() }} / {{ totalPaginas() }}</span>
              <button
                type="button"
                class="nav-pill-btn"
                (click)="irAPagina(paginaActual() + 1)"
                [disabled]="paginaActual() >= totalPaginas()"
                matTooltip="Página siguiente"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          }
        </div>

        <div class="zoom-controls">
          <button type="button" class="zoom-pill-btn" (click)="ajustarZoom(-0.15)" matTooltip="Reducir zoom">
            <mat-icon>remove</mat-icon>
          </button>
          <button
            type="button"
            class="zoom-pill-btn zoom-fit-btn"
            [class.active]="modoFit()"
            (click)="resetZoom()"
            matTooltip="Ajustar hoja al ancho disponible"
          >
            {{ modoFit() ? 'Ajustar' : (porcentajeZoom() + '%') }}
          </button>
          <button type="button" class="zoom-pill-btn" (click)="ajustarZoom(0.15)" matTooltip="Aumentar zoom">
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </div>

      @if (totalPaginas() > 1) {
        <div class="page-tabs-row">
          @for (p of listaPaginas(); track p) {
            <button
              type="button"
              class="page-tab-pill"
              [class.active]="paginaActual() === p"
              (click)="irAPagina(p)"
            >
              Pág {{ p }}
            </button>
          }
        </div>
      }

      <div class="canvas-stage" #canvasStage>
        @if (cargando()) {
          <div class="canvas-loading">
            <mat-spinner diameter="36"></mat-spinner>
            <span>Renderizando documento...</span>
          </div>
        } @else if (errorLocal()) {
          <div class="canvas-error">
            <mat-icon>report_problem</mat-icon>
            <span>{{ errorLocal() }}</span>
          </div>
        }
        <div class="canvas-scroll-area" #canvasWrapper [class.hidden-stage]="cargando() || !!errorLocal()">
          <canvas #pdfCanvas class="pdf-page-canvas"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .canvas-viewer-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      background: #1a241f;
      border-radius: 10px;
      overflow: hidden;
    }

    .canvas-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      background: #111c18;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    .toolbar-info {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sheet-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: rgba(16, 185, 129, 0.16);
      color: #6ee7b7;
      border: 1px solid rgba(110, 231, 183, 0.28);
      white-space: nowrap;
    }

    .page-nav-group {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 2px 6px;
    }

    .nav-pill-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: #e2e8f0;
      cursor: pointer;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); color: #ffffff; }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    .page-indicator {
      font-size: 0.74rem;
      font-weight: 700;
      color: #fde68a;
      padding: 0 4px;
      white-space: nowrap;
    }

    .zoom-controls {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 2px 4px;
    }

    .zoom-pill-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 24px;
      padding: 0 7px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #cbd5e1;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; }

      &.zoom-fit-btn.active {
        background: #b45309;
        color: #ffffff;
      }
    }

    .page-tabs-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 12px;
      background: #14211b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .page-tab-pill {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 999px;
      cursor: pointer;

      &:hover { background: rgba(255, 255, 255, 0.12); color: #ffffff; }
      &.active { background: #b45309; border-color: #b45309; color: #ffffff; }
    }

    .canvas-stage {
      flex: 1;
      min-height: 280px;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 14px 12px;
      position: relative;

      &::-webkit-scrollbar { width: 7px; height: 7px; }
      &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.24); border-radius: 4px; }
    }

    .canvas-scroll-area {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 100%;

      &.hidden-stage {
        display: none;
      }
    }

    .pdf-page-canvas {
      display: block;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      border-radius: 3px;
      max-width: 100%;
      height: auto;
    }

    .canvas-loading,
    .canvas-error {
      margin: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.84rem;
      text-align: center;
      padding: 24px;
    }

    .canvas-error mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #f87171;
    }

    @media (max-width: 640px) {
      .canvas-toolbar {
        padding: 8px;
      }
      .canvas-stage {
        padding: 8px 6px;
      }
    }
  `]
})
export class PdfCanvasViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() pdfData: Uint8Array | ArrayBuffer | null = null;
  @Output() hojaDetectada = new EventEmitter<'Letter' | 'Oficio'>();
  @Output() renderError = new EventEmitter<string>();

  @ViewChild('canvasStage') canvasStage?: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrapper') canvasWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('pdfCanvas') pdfCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  readonly cargando = signal(false);
  readonly errorLocal = signal<string | null>(null);
  readonly tipoHoja = signal<'Letter' | 'Oficio'>('Letter');
  readonly orientacion = signal<'Vertical' | 'Horizontal'>('Vertical');
  readonly totalPaginas = signal(1);
  readonly paginaActual = signal(1);
  readonly zoomFactor = signal(1.0);
  readonly modoFit = signal(true);

  readonly porcentajeZoom = computed(() => Math.round(this.zoomFactor() * 100));
  readonly listaPaginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
  );

  private loadedPdf: any = null;
  private renderTask: any = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pdfData) {
      this.cargarPdf(this.pdfData);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pdfData'] && this.viewReady) {
      if (this.pdfData) {
        this.cargarPdf(this.pdfData);
      } else {
        this.limpiarPdf();
      }
    }
  }

  ngOnDestroy(): void {
    this.limpiarPdf();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.loadedPdf) {
      this.renderizarPaginaActual();
    }
  }

  private limpiarPdf(): void {
    if (this.renderTask) {
      try { this.renderTask.cancel(); } catch {}
      this.renderTask = null;
    }
    if (this.loadedPdf) {
      try { this.loadedPdf.destroy(); } catch {}
      this.loadedPdf = null;
    }
  }

  async cargarPdf(raw: Uint8Array | ArrayBuffer): Promise<void> {
    this.limpiarPdf();
    this.cargando.set(true);
    this.errorLocal.set(null);
    this.zoomFactor.set(1.0);
    this.modoFit.set(true);
    this.cdr.markForCheck();

    try {
      // Clonamos el buffer para evitar que PDF.js transfiera el ArrayBuffer original del padre
      const bytes = raw instanceof Uint8Array
        ? new Uint8Array(raw).slice()
        : new Uint8Array(raw.slice(0));

      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        cMapUrl: '/assets/pdfjs/cmaps/',
        cMapPacked: true
      });
      const pdfDoc = await loadingTask.promise;
      this.loadedPdf = pdfDoc;
      this.totalPaginas.set(pdfDoc.numPages || 1);
      this.paginaActual.set(1);
      this.cargando.set(false);
      this.cdr.detectChanges();

      setTimeout(() => this.renderizarPaginaActual(), 30);
    } catch (err: any) {
      console.error('Error al cargar PDF en canvas:', err);
      this.cargando.set(false);
      const msg = 'No se pudo renderizar el archivo PDF.';
      this.errorLocal.set(msg);
      this.renderError.emit(msg);
      this.cdr.markForCheck();
    }
  }

  irAPagina(num: number): void {
    if (!this.loadedPdf) return;
    if (num < 1 || num > this.totalPaginas() || num === this.paginaActual()) return;
    this.paginaActual.set(num);
    this.cdr.markForCheck();
    setTimeout(() => this.renderizarPaginaActual(), 20);
  }

  ajustarZoom(delta: number): void {
    const next = Math.max(0.5, Math.min(2.2, Math.round((this.zoomFactor() + delta) * 100) / 100));
    this.zoomFactor.set(next);
    this.modoFit.set(Math.abs(next - 1.0) < 0.01);
    this.renderizarPaginaActual();
  }

  resetZoom(): void {
    this.zoomFactor.set(1.0);
    this.modoFit.set(true);
    this.renderizarPaginaActual();
  }

  async renderizarPaginaActual(): Promise<void> {
    if (!this.loadedPdf || !this.pdfCanvas?.nativeElement) return;

    if (this.renderTask) {
      try { this.renderTask.cancel(); } catch {}
      this.renderTask = null;
    }

    try {
      const page = await this.loadedPdf.getPage(this.paginaActual());
      const canvasEl = this.pdfCanvas.nativeElement;
      const stage = this.canvasStage?.nativeElement || this.canvasWrapper?.nativeElement;
      const rawAvail = stage ? Math.max(stage.clientWidth - 28, 260) : 700;
      const availableWidth = Math.min(rawAvail, 840);

      const unscaledViewport = page.getViewport({ scale: 1 });
      const esHorizontal = unscaledViewport.width > unscaledViewport.height;
      const rawRatio = esHorizontal
        ? (unscaledViewport.width / unscaledViewport.height)
        : (unscaledViewport.height / unscaledViewport.width);

      const esOficio = rawRatio > 1.41;
      const detected: 'Letter' | 'Oficio' = esOficio ? 'Oficio' : 'Letter';
      this.orientacion.set(esHorizontal ? 'Horizontal' : 'Vertical');
      this.tipoHoja.set(detected);
      this.hojaDetectada.emit(detected);
      this.cdr.markForCheck();

      const stdRatio = esOficio ? (1248 / 816) : (1056 / 816);
      const targetWidth = Math.round(availableWidth * this.zoomFactor());
      const targetHeight = Math.round(esHorizontal ? (targetWidth / stdRatio) : (targetWidth * stdRatio));

      const effectiveScale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: effectiveScale });
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

      canvasEl.width = Math.floor(viewport.width * dpr);
      canvasEl.height = Math.floor(viewport.height * dpr);
      canvasEl.style.width = `${targetWidth}px`;
      canvasEl.style.height = `${targetHeight}px`;

      const ctx = canvasEl.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.renderTask = page.render({ canvasContext: ctx, viewport });
      await this.renderTask.promise;
      this.renderTask = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Error renderizando página PDF:', err);
      }
    }
  }
}
