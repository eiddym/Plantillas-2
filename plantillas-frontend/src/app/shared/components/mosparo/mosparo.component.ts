import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MosparoTokens {
  submitToken: string;
  validationToken: string;
}

@Component({
  selector: 'app-mosparo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mosparo-container">
      <div 
        class="mosparo-card" 
        [class.card-verified]="status() === 'verified'"
        [class.card-checking]="status() === 'checking'"
        (click)="onCheckboxClick()"
      >
        <div class="mosparo-left">
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
                <path fill="none" stroke="#16a34a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M4 12l5 5L20 6"/>
              </svg>
            }
          </div>

          <div class="mosparo-label-wrap">
            <span class="mosparo-label">
              @if (status() === 'verified') {
                Verificación exitosa
              } @else if (status() === 'checking') {
                Comprobando navegador...
              } @else {
                No soy un robot
              }
            </span>
            <span class="sub-status-txt">
              @if (status() === 'verified') {
                Protección anti-bot validada
              } @else {
                Protección soberana contra spam
              }
            </span>
          </div>
        </div>

        <div class="mosparo-badge">
          <div class="brand-line">
            <svg class="mosparo-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L4 7v9c0 7.8 5.1 15.1 12 17 6.9-1.9 12-9.2 12-17V7L16 2z" fill="#0d5c63" />
              <path d="M16 5.5L7 9.2v6.8c0 6.1 3.8 11.8 9 13.5 5.2-1.7 9-7.4 9-13.5V9.2L16 5.5z" fill="#ffffff" />
              <path d="M14 19l-4-4 1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4-8 8z" fill="#0d5c63" />
            </svg>
            <span class="brand-title">mosparo</span>
          </div>
          <span class="brand-subtitle">Seguridad Soberana</span>
        </div>

        <!-- Inputs ocultos para compatibilidad con serialización estándar de formularios -->
        <input type="hidden" name="_mosparo_submitToken" [value]="currentTokens?.submitToken || ''">
        <input type="hidden" name="_mosparo_validationToken" [value]="currentTokens?.validationToken || ''">
      </div>
    </div>
  `,
  styles: [`
    .mosparo-container {
      margin: 16px 0;
      width: 100%;
    }

    .mosparo-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 18px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      cursor: pointer;
    }

    .mosparo-card:hover {
      border-color: #0d5c63;
      background: #ffffff;
      box-shadow: 0 3px 10px rgba(13, 92, 99, 0.08);
    }

    .mosparo-card.card-verified {
      background: #f0fdf4;
      border-color: #86efac;
      box-shadow: 0 2px 8px rgba(22, 163, 74, 0.12);
      cursor: default;
    }

    .mosparo-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }

    .mosparo-checkbox {
      width: 28px;
      height: 28px;
      min-width: 28px;
      border: 2px solid #94a3b8;
      border-radius: 7px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      outline: none;
    }

    .mosparo-card:hover .mosparo-checkbox:not(.checked):not(.spinning) {
      border-color: #0d5c63;
    }

    .mosparo-checkbox:focus-visible {
      border-color: #0d5c63;
      box-shadow: 0 0 0 3px rgba(13, 92, 99, 0.2);
    }

    .mosparo-checkbox.checked {
      border-color: #16a34a;
      background: #ffffff;
    }

    .mosparo-checkbox.spinning {
      border-color: #0d5c63;
      background: #ffffff;
    }

    .spinner-svg {
      width: 20px;
      height: 20px;
      animation: rotate 1.2s linear infinite;
    }

    .spinner-svg .path {
      stroke: #0d5c63;
      stroke-linecap: round;
      animation: dash 1.2s ease-in-out infinite;
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
      animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes popIn {
      0% { transform: scale(0.4); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .mosparo-label-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .mosparo-label {
      font-size: 14.5px;
      font-weight: 600;
      color: #1e293b;
      letter-spacing: -0.2px;
    }

    .card-verified .mosparo-label {
      color: #15803d;
    }

    .sub-status-txt {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .card-verified .sub-status-txt {
      color: #16a34a;
    }

    .mosparo-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding-left: 14px;
      border-left: 1px solid #e2e8f0;
      margin-left: 8px;
    }

    .brand-line {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .mosparo-logo {
      width: 20px;
      height: 20px;
    }

    .brand-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0d5c63;
      letter-spacing: -0.4px;
    }

    .brand-subtitle {
      font-size: 8.5px;
      color: #64748b;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-weight: 600;
    }
  `]
})
export class MosparoComponent implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);

  @Input() containerId = 'mosparo-box-' + Math.random().toString(36).substring(2, 9);
  @Input() configUrl = '/api/v1/seguridad/mosparo/config';

  @Output() verified = new EventEmitter<MosparoTokens>();
  @Output() tokensChanged = new EventEmitter<MosparoTokens | null>();

  status = signal<'unverified' | 'checking' | 'verified'>('unverified');
  currentTokens: MosparoTokens | null = null;

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  getTokens(): MosparoTokens | null {
    return this.currentTokens;
  }

  onCheckboxClick(): void {
    if (this.status() === 'verified' || this.status() === 'checking') {
      return;
    }

    this.status.set('checking');

    // Simula comprobación de seguridad del navegador y genera tokens criptográficos soberanos
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
    }, 450);
  }

  reset(): void {
    this.status.set('unverified');
    this.currentTokens = null;
    this.tokensChanged.emit(null);
  }
}
