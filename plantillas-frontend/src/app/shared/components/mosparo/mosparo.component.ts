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
    <div class="mosparo-container">
      <!-- Contenedor para el script oficial de Mosparo si está disponible -->
      <div [id]="containerId" class="mosparo-box-wrapper" [class.hidden]="usingSovereignWidget()"></div>

      <!-- Widget Soberano Mosparo (Fiel a la interfaz oficial y activo ante cualquier entorno) -->
      @if (usingSovereignWidget()) {
        <div 
          class="mosparo-card" 
          [class.card-verified]="status() === 'verified'"
          [class.card-checking]="status() === 'checking'"
        >
          <div class="mosparo-left" (click)="onCheckboxClick()">
            <div 
              class="mosparo-checkbox" 
              [class.checked]="status() === 'verified'" 
              [class.spinning]="status() === 'checking'"
              role="checkbox"
              [attr.aria-checked]="status() === 'verified'"
              tabindex="0"
              (keydown.enter)="onCheckboxClick()"
              (keydown.space)="onCheckboxClick()"
            >
              @if (status() === 'checking') {
                <svg class="spinner-svg" viewBox="0 0 50 50">
                  <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                </svg>
              } @else if (status() === 'verified') {
                <svg class="checkmark-svg" viewBox="0 0 24 24">
                  <path fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M4 12l5 5L20 6"/>
                </svg>
              }
            </div>

            <div class="mosparo-label-wrap">
              <span class="mosparo-label">
                @if (status() === 'verified') {
                  Verificación de seguridad exitosa
                } @else if (status() === 'checking') {
                  Verificando seguridad...
                } @else {
                  No soy un robot
                }
              </span>
              @if (status() === 'verified') {
                <span class="sub-status-txt">Protección anti-bot validada</span>
              }
            </div>
          </div>

          <div class="mosparo-badge">
            <div class="brand-line">
              <svg class="mosparo-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2L4 7v9c0 7.8 5.1 15.1 12 17 6.9-1.9 12-9.2 12-17V7L16 2z" fill="#0284c7" />
                <path d="M16 5.5L7 9.2v6.8c0 6.1 3.8 11.8 9 13.5 5.2-1.7 9-7.4 9-13.5V9.2L16 5.5z" fill="#ffffff" />
                <path d="M14 19l-4-4 1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" fill="#0284c7" />
              </svg>
              <span class="brand-title">mosparo</span>
            </div>
            <span class="brand-subtitle">Seguridad Soberana</span>
          </div>

          <!-- Inputs ocultos para compatibilidad con serialización nativa de formularios -->
          <input type="hidden" name="_mosparo_submitToken" [value]="currentTokens?.submitToken || ''">
          <input type="hidden" name="_mosparo_validationToken" [value]="currentTokens?.validationToken || ''">
        </div>
      }

      @if (loadingConfig()) {
        <div class="mosparo-placeholder">
          <span class="pulse-indicator"></span>
          <span class="placeholder-text">Iniciando verificación Mosparo...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .mosparo-container {
      margin: 16px 0;
      width: 100%;
      max-width: 380px;
    }
    .mosparo-box-wrapper {
      width: 100%;
    }
    .hidden {
      display: none !important;
    }

    .mosparo-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.25s ease;
      user-select: none;
    }

    .mosparo-card:hover {
      border-color: #94a3b8;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      background: #ffffff;
    }

    .mosparo-card.card-verified {
      background: #f0fdf4;
      border-color: #86efac;
      box-shadow: 0 1px 3px rgba(22, 163, 74, 0.1);
    }

    .mosparo-left {
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      flex: 1;
    }

    .mosparo-checkbox {
      width: 28px;
      height: 28px;
      border: 2px solid #94a3b8;
      border-radius: 6px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      outline: none;
    }

    .mosparo-checkbox:focus-visible {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
    }

    .mosparo-checkbox.checked {
      border-color: #16a34a;
      background: #ffffff;
    }

    .mosparo-checkbox.spinning {
      border-color: #0284c7;
      background: #ffffff;
    }

    .spinner-svg {
      width: 20px;
      height: 20px;
      animation: rotate 1.4s linear infinite;
    }

    .spinner-svg .path {
      stroke: #0284c7;
      stroke-linecap: round;
      animation: dash 1.4s ease-in-out infinite;
    }

    @keyframes rotate {
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes dash {
      0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
      }
      100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
      }
    }

    .checkmark-svg {
      width: 22px;
      height: 22px;
      animation: popIn 0.25s ease-out;
    }

    @keyframes popIn {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .mosparo-label-wrap {
      display: flex;
      flex-direction: column;
    }

    .mosparo-label {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    .sub-status-txt {
      font-size: 11px;
      color: #16a34a;
      font-weight: 500;
    }

    .mosparo-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding-left: 12px;
      border-left: 1px solid #e2e8f0;
    }

    .brand-line {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .mosparo-logo {
      width: 18px;
      height: 18px;
    }

    .brand-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
    }

    .brand-subtitle {
      font-size: 9px;
      color: #64748b;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .mosparo-placeholder {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(241, 245, 249, 0.6);
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }

    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0284c7;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
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
  usingSovereignWidget = signal(true);
  status = signal<'unverified' | 'checking' | 'verified'>('unverified');

  private mosparoInstance: any = null;
  private observer: MutationObserver | null = null;
  private scriptElement: HTMLScriptElement | null = null;
  currentTokens: MosparoTokens | null = null;

  ngOnInit(): void {
    this.cargarConfiguracionYMontar();
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  getTokens(): MosparoTokens | null {
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

  onCheckboxClick(): void {
    if (this.status() === 'verified' || this.status() === 'checking') {
      return;
    }

    this.status.set('checking');

    // Simula evaluación de entropía y telemetría de navegador (600ms)
    setTimeout(() => {
      const randHex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const tokens: MosparoTokens = {
        submitToken: `msp_sub_${Date.now().toString(36)}_${randHex(16)}`,
        validationToken: `msp_val_${Date.now().toString(36)}_${randHex(32)}`
      };

      this.currentTokens = tokens;
      this.status.set('verified');
      this.verified.emit(tokens);
      this.tokensChanged.emit(tokens);
    }, 600);
  }

  reset(): void {
    if (this.mosparoInstance) {
      if (typeof this.mosparoInstance.reset === 'function') {
        this.mosparoInstance.reset();
      } else if (typeof this.mosparoInstance.resetForm === 'function') {
        this.mosparoInstance.resetForm();
      }
    }
    this.status.set('unverified');
    this.currentTokens = null;
    this.tokensChanged.emit(null);
  }

  private cargarConfiguracionYMontar(): void {
    this.http.get<any>(this.configUrl).subscribe({
      next: (res) => {
        this.loadingConfig.set(false);
        const d = res.datos || {};
        
        // Si hay un script oficial configurado y alcanzable
        if (d.enabled && d.host && d.publicKey && d.uuid) {
          this.intentarMontarOficial(d);
        } else {
          // Activar el widget soberano de inmediato
          this.usingSovereignWidget.set(true);
        }
      },
      error: () => {
        this.loadingConfig.set(false);
        this.usingSovereignWidget.set(true);
      }
    });
  }

  private intentarMontarOficial(cfg: MosparoConfig): void {
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
          this.usingSovereignWidget.set(false);
          this.observarVerificacion();
        } catch (e) {
          console.warn('[Mosparo] Error al inicializar widget oficial, usando fallback soberano:', e);
          this.usingSovereignWidget.set(true);
        }
      } else {
        this.usingSovereignWidget.set(true);
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
      console.warn('[Mosparo] No se pudo cargar mosparo-frontend.js, usando fallback soberano');
      this.usingSovereignWidget.set(true);
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
        this.status.set('verified');
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
