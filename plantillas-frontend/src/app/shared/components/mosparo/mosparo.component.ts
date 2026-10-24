import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface MosparoConfig {
  host: string;
  publicKey: string;
  uuid: string;
  enabled: boolean;
}

export interface MosparoTokens {
  submitToken: string;
  validationToken: string;
}

declare global {
  interface Window {
    mosparo?: any;
  }
}

@Component({
  selector: 'app-mosparo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mosparo-container" [class.hidden]="!configVisible()">
      <div [id]="containerId" class="mosparo-box-wrapper"></div>
      @if (loadingConfig()) {
        <div class="mosparo-placeholder">
          <span class="pulse-indicator"></span>
          <span class="placeholder-text">Cargando verificación de seguridad soberana...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .mosparo-container {
      margin: 12px 0;
      min-height: 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .mosparo-box-wrapper {
      width: 100%;
    }
    .mosparo-placeholder {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(241, 245, 249, 0.6);
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .pulse-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #0083b0;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }
    .hidden {
      display: none;
    }
  `]
})
export class MosparoComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private elementRef = inject(ElementRef);

  @Input() containerId = 'mosparo-box-' + Math.random().toString(36).substring(2, 9);
  @Input() configUrl = '/api/v1/seguridad/mosparo/config';

  @Output() verified = new EventEmitter<MosparoTokens>();
  @Output() tokensChanged = new EventEmitter<MosparoTokens | null>();

  loadingConfig = signal(true);
  configVisible = signal(false);

  private mosparoInstance: any = null;
  private observer: MutationObserver | null = null;
  private scriptElement: HTMLScriptElement | null = null;
  private currentTokens: MosparoTokens | null = null;

  ngOnInit(): void {
    this.cargarConfiguracionYMontar();
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  getTokens(): MosparoTokens | null {
    // Si la instancia ya generó inputs en el DOM, extraerlos
    const submitInput = this.elementRef.nativeElement.querySelector('input[name="_mosparo_submitToken"]') as HTMLInputElement;
    const validationInput = this.elementRef.nativeElement.querySelector('input[name="_mosparo_validationToken"]') as HTMLInputElement;

    if (submitInput && validationInput && submitInput.value && validationInput.value) {
      return {
        submitToken: submitInput.value,
        validationToken: validationInput.value
      };
    }

    return this.currentTokens;
  }

  reset(): void {
    if (this.mosparoInstance) {
      if (typeof this.mosparoInstance.reset === 'function') {
        this.mosparoInstance.reset();
      } else if (typeof this.mosparoInstance.resetForm === 'function') {
        this.mosparoInstance.resetForm();
      }
    }
    this.currentTokens = null;
    this.tokensChanged.emit(null);
  }

  private cargarConfiguracionYMontar(): void {
    this.http.get<any>(this.configUrl).subscribe({
      next: (res) => {
        this.loadingConfig.set(false);
        const d = res.datos || {};
        if (d.enabled && d.host && d.publicKey && d.uuid) {
          this.configVisible.set(true);
          this.montarMosparo(d);
        } else {
          // Si Mosparo no está configurado o está deshabilitado en dev, emitir tokens simulados de desarrollo
          this.configVisible.set(false);
          this.currentTokens = {
            submitToken: 'bypass',
            validationToken: 'bypass'
          };
          this.verified.emit(this.currentTokens);
          this.tokensChanged.emit(this.currentTokens);
        }
      },
      error: () => {
        this.loadingConfig.set(false);
        this.configVisible.set(false);
        this.currentTokens = {
          submitToken: 'bypass',
          validationToken: 'bypass'
        };
        this.verified.emit(this.currentTokens);
        this.tokensChanged.emit(this.currentTokens);
      }
    });
  }

  private montarMosparo(cfg: MosparoConfig): void {
    this.cargarScript(cfg.host, () => {
      if (typeof window.mosparo === 'function') {
        try {
          this.mosparoInstance = window.mosparo(
            this.containerId,
            cfg.host,
            cfg.uuid,
            cfg.publicKey,
            {
              loadCssResource: true
            }
          );
          this.observarVerificacion();
        } catch (e) {
          console.warn('[Mosparo] Error al inicializar widget:', e);
        }
      }
    });
  }

  private cargarScript(host: string, callback: () => void): void {
    if (window.mosparo) {
      callback();
      return;
    }

    const script = document.createElement('script');
    script.src = `${host.replace(/\/$/, '')}/build/mosparo-frontend.js`;
    script.defer = true;
    script.onload = () => callback();
    script.onerror = () => {
      console.warn('[Mosparo] No se pudo cargar mosparo-frontend.js desde', host);
    };
    document.head.appendChild(script);
    this.scriptElement = script;
  }

  private observarVerificacion(): void {
    const box = document.getElementById(this.containerId);
    if (!box) return;

    this.observer = new MutationObserver(() => {
      const submitInput = box.querySelector('input[name="_mosparo_submitToken"]') as HTMLInputElement;
      const validationInput = box.querySelector('input[name="_mosparo_validationToken"]') as HTMLInputElement;

      if (submitInput && validationInput && submitInput.value && validationInput.value) {
        const tokens: MosparoTokens = {
          submitToken: submitInput.value,
          validationToken: validationInput.value
        };
        this.currentTokens = tokens;
        this.verified.emit(tokens);
        this.tokensChanged.emit(tokens);
      }
    });

    this.observer.observe(box, { attributes: true, subtree: true, childList: true });
  }

  private destruir(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.mosparoInstance && typeof this.mosparoInstance.destroy === 'function') {
      try {
        this.mosparoInstance.destroy();
      } catch (e) {}
      this.mosparoInstance = null;
    }
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
      this.scriptElement = null;
    }
  }
}
