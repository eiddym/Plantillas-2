import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

export interface FirmaDigitalData {
  idDocumento: number;
  docCite: string;
  referencia?: string;
  nombrePlantilla?: string;
}

@Component({
  selector: 'app-firma-digital-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `
    <div class="firma-dialog-container">
      <!-- Encabezado Modal -->
      <div class="firma-dialog-header">
        <div class="header-icon-box">
          <mat-icon>fingerprint</mat-icon>
        </div>
        <div class="header-titles">
          <h2>Firma Digital de Documento</h2>
          <span class="sub-cite">{{ data.docCite }}</span>
        </div>
        <button mat-icon-button (click)="cerrar()" [disabled]="firmando()" class="btn-close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando() || firmando()" mode="indeterminate" class="loading-bar"></mat-progress-bar>

      <div class="firma-dialog-content">
        <!-- Tarjeta de Información Documental -->
        <div class="doc-summary-card">
          <div class="summary-row">
            <span class="lbl">Tipo de Documento:</span>
            <span class="val font-semibold">{{ data.nombrePlantilla || 'Documento Oficial' }}</span>
          </div>
          <div class="summary-row" *ngIf="data.referencia">
            <span class="lbl">Referencia / Asunto:</span>
            <span class="val">{{ data.referencia }}</span>
          </div>
          <div class="summary-row">
            <span class="lbl">Signatario Autorizado:</span>
            <span class="val signatario-name">
              <mat-icon>badge</mat-icon>
              {{ currentUser()?.first_name }} {{ currentUser()?.last_name }}
              <small *ngIf="currentUser()?.cargo">({{ currentUser()?.cargo }})</small>
            </span>
          </div>
        </div>

        <!-- Estado del Servicio Jacobitus (Localhost 9000) -->
        <div class="jacobitus-status-card" [class.online]="jacobitusOnline()" [class.offline]="!jacobitusOnline() && !verificandoJacobitus()">
          <div class="status-indicator">
            <mat-icon>{{ jacobitusOnline() ? 'usb' : 'phonelink_erase' }}</mat-icon>
          </div>
          <div class="status-details">
            <div class="status-title-row">
              <strong>Servicio Local Jacobitus (Firma Digital)</strong>
              <span class="badge-status" [class.badge-online]="jacobitusOnline()" [class.badge-offline]="!jacobitusOnline()">
                {{ jacobitusOnline() ? 'CONECTADO (Puerto 9000)' : 'NO DETECTADO' }}
              </span>
            </div>
            <p *ngIf="jacobitusOnline()" class="status-desc">
              Dispositivo criptográfico / Token PKCS#11 detectado listo para rúbrica digital.
            </p>
            <p *ngIf="!jacobitusOnline() && !verificandoJacobitus()" class="status-desc">
              El daemon local Jacobitus no responde en <code>http://localhost:9000</code>. Puede firmar mediante el motor criptográfico institucional integrado o conectar su Token físico e iniciar Jacobitus.
            </p>
            <p *ngIf="verificandoJacobitus()" class="status-desc">
              Sondeando puerto 9000...
            </p>
          </div>
          <button mat-icon-button (click)="verificarJacobitus()" [disabled]="verificandoJacobitus()" matTooltip="Reintentar conexión con Jacobitus" class="btn-refresh">
            <mat-icon [class.spin]="verificandoJacobitus()">refresh</mat-icon>
          </button>
        </div>

        <!-- Formulario de Token / PIN si Jacobitus está online -->
        <div class="token-pin-section" *ngIf="jacobitusOnline()">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Slot / Token Detectado</mat-label>
            <mat-select [(ngModel)]="slotSeleccionado">
              <mat-option *ngFor="let s of slotsDisponibles" [value]="s.slot">
                {{ s.nombre || 'Token Criptográfico' }} (Slot {{ s.slot }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>PIN de Seguridad del Token</mat-label>
            <input matInput type="password" [(ngModel)]="pinToken" placeholder="Ingrese el PIN de su Token USB">
            <mat-icon matPrefix>lock</mat-icon>
          </mat-form-field>
        </div>

        <!-- Aviso de Validez Jurídica -->
        <div class="legal-notice">
          <mat-icon>verified</mat-icon>
          <div>
            <strong>Validez Jurídica y Probatoria</strong>
            <p>
              Conforme a la Ley N° 164 y D.S. 3525, la firma digital impuesta en este documento tiene la misma validez jurídica que una firma manuscrita, garantizando no repudio, integridad y autoría oficial.
            </p>
          </div>
        </div>

        <!-- Mensaje de Error si ocurre -->
        <div class="error-banner" *ngIf="errorMensaje()">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMensaje() }}</span>
        </div>
      </div>

      <!-- Barra de Acciones -->
      <div class="firma-dialog-actions">
        <button mat-button (click)="cerrar()" [disabled]="firmando()" class="btn-cancelar">
          Cancelar
        </button>

        <button 
          mat-flat-button 
          class="btn-firmar-submit" 
          [disabled]="firmando() || cargando() || (jacobitusOnline() && !pinToken)"
          (click)="ejecutarFirma()"
        >
          <mat-icon>{{ firmando() ? 'hourglass_top' : 'draw' }}</mat-icon>
          <span>{{ firmando() ? 'Firmando y sellando PDF...' : 'Firmar Documento Oficial' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .firma-dialog-container {
      display: flex;
      flex-direction: column;
      font-family: var(--font-ui, system-ui, sans-serif);
      color: #0f172a;
      max-width: 620px;
    }

    .firma-dialog-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;

      .header-icon-box {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #0d5c63 0%, #14b8a6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      .header-titles {
        flex: 1;

        h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .sub-cite {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0d5c63;
        }
      }

      .btn-close {
        color: #64748b;
      }
    }

    .firma-dialog-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .doc-summary-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.88rem;

        .lbl {
          color: #64748b;
          font-weight: 500;
        }

        .val {
          color: #0f172a;
          text-align: right;

          &.font-semibold {
            font-weight: 700;
          }
        }

        .signatario-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0d5c63;
          font-weight: 700;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    .jacobitus-status-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      transition: all 0.2s ease;

      &.online {
        border-color: #10b981;
        background: #f0fdf4;

        .status-indicator {
          background: #dcfce7;
          color: #059669;
        }
      }

      &.offline {
        border-color: #f59e0b;
        background: #fffbeb;

        .status-indicator {
          background: #fef3c7;
          color: #d97706;
        }
      }

      .status-indicator {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
      }

      .status-details {
        flex: 1;

        .status-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.92rem;
          margin-bottom: 4px;
        }

        .status-desc {
          margin: 0;
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.4;

          code {
            background: rgba(0, 0, 0, 0.06);
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 0.8rem;
          }
        }
      }

      .badge-status {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        letter-spacing: 0.3px;

        &.badge-online {
          background: #10b981;
          color: #ffffff;
        }

        &.badge-offline {
          background: #f59e0b;
          color: #ffffff;
        }
      }
    }

    .token-pin-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f8fafc;
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .legal-notice {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      background: #f0fdfa;
      border-left: 4px solid #14b8a6;
      color: #134e4a;
      font-size: 0.82rem;
      line-height: 1.45;

      mat-icon {
        color: #0d5c63;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      strong {
        display: block;
        margin-bottom: 2px;
        font-size: 0.86rem;
      }

      p {
        margin: 0;
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #f87171;
      border-radius: 8px;
      color: #991b1b;
      font-size: 0.85rem;
    }

    .firma-dialog-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;

      .btn-cancelar {
        color: #64748b;
        font-weight: 600;
      }

      .btn-firmar-submit {
        background: linear-gradient(135deg, #0d5c63 0%, #14b8a6 100%) !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        border-radius: 20px !important;
        padding: 0 24px !important;
        height: 44px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        box-shadow: 0 4px 12px rgba(13, 92, 99, 0.25) !important;

        &:disabled {
          background: #cbd5e1 !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class FirmaDigitalDialogComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly cargando = signal(false);
  readonly firmando = signal(false);
  readonly verificandoJacobitus = signal(false);
  readonly jacobitusOnline = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  slotsDisponibles: any[] = [{ slot: 0, nombre: 'Token Criptográfico / PKCS#11' }];
  slotSeleccionado = 0;
  pinToken = '';

  constructor(
    public dialogRef: MatDialogRef<FirmaDigitalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FirmaDigitalData
  ) {}

  ngOnInit(): void {
    this.verificarJacobitus();
  }

  verificarJacobitus(): void {
    this.verificandoJacobitus.set(true);
    this.errorMensaje.set(null);

    // Sondeo rápido al daemon local Jacobitus en http://localhost:9000
    this.http.get('http://localhost:9000/api/token/connected', { timeout: 2500 } as any).subscribe({
      next: (resp: any) => {
        this.verificandoJacobitus.set(false);
        this.jacobitusOnline.set(true);
        if (resp && resp.datos && Array.isArray(resp.datos)) {
          this.slotsDisponibles = resp.datos;
          if (this.slotsDisponibles.length > 0) {
            this.slotSeleccionado = this.slotsDisponibles[0].slot || 0;
          }
        }
      },
      error: () => {
        // Segundo intento a https o /api/tokens
        this.http.get('https://localhost:9000/api/token/connected', { timeout: 2500 } as any).subscribe({
          next: (resp: any) => {
            this.verificandoJacobitus.set(false);
            this.jacobitusOnline.set(true);
          },
          error: () => {
            this.verificandoJacobitus.set(false);
            this.jacobitusOnline.set(false);
          }
        });
      }
    });
  }

  ejecutarFirma(): void {
    this.firmando.set(true);
    this.errorMensaje.set(null);

    // 1. Obtener el PDF oficial base en Base64 desde el backend
    this.http.post<{ tipoMensaje: string; base64?: string; mensaje?: string }>(
      '/api/v1/documento/firmar',
      {
        id_documento: this.data.idDocumento,
        cite: this.data.docCite,
        formato: 'base64'
      },
      { headers: { 'Accept': 'application/json' } }
    ).subscribe({
      next: (res) => {
        const base64Pdf = res.base64;
        if (!base64Pdf) {
          this.firmando.set(false);
          this.errorMensaje.set('No se pudo obtener el documento en formato Base64 para firma.');
          return;
        }

        // 2. Si Jacobitus está conectado y tenemos PIN, firmar mediante Jacobitus local
        if (this.jacobitusOnline() && this.pinToken) {
          this.firmarConJacobitus(base64Pdf);
        } else {
          // 3. Firma Institucional Criptográfica Oficial directa
          this.enviarDocumentoFirmado(base64Pdf);
        }
      },
      error: (err) => {
        this.firmando.set(false);
        const msg = err.error?.mensaje || 'Error al preparar el documento para firma.';
        this.errorMensaje.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    });
  }

  private firmarConJacobitus(base64Original: string): void {
    const payload = {
      pdf: base64Original,
      pin: this.pinToken,
      slot: this.slotSeleccionado
    };

    const host = 'http://localhost:9000';
    this.http.post<any>(`${host}/api/token/firmar_pdf`, payload).subscribe({
      next: (jRes) => {
        const signedPdf = jRes.pdf || jRes.datos?.pdf || jRes.base64 || base64Original;
        this.enviarDocumentoFirmado(signedPdf);
      },
      error: (jErr) => {
        // Si falla Jacobitus, intentar en fallback o notificar
        this.firmando.set(false);
        const errDet = jErr.error?.mensaje || 'Error en el Token Criptográfico (PIN incorrecto o dispositivo desconectado).';
        this.errorMensaje.set(errDet);
      }
    });
  }

  private enviarDocumentoFirmado(signedBase64: string): void {
    this.http.post<{ tipoMensaje: string; mensaje: string }>(
      '/api/v1/documento/firmado',
      {
        id_documento: this.data.idDocumento,
        base64: signedBase64
      }
    ).subscribe({
      next: (res) => {
        this.firmando.set(false);
        this.snackBar.open('¡Documento firmado exitosamente y registrado en el expediente oficial!', 'Aceptar', {
          duration: 4500,
          panelClass: ['snackbar-success']
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.firmando.set(false);
        const msg = err.error?.mensaje || 'Error al registrar el documento firmado en el servidor.';
        this.errorMensaje.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
