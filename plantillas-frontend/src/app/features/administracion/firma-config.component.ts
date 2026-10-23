import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface FirmaConfigResp {
  tipo_firma: 'FIRMA_DIGITAL' | 'CIUDADANIA_DIGITAL';
  descripcion: string;
  _fecha_modificacion: string;
}

@Component({
  selector: 'app-firma-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  template: `
    <div class="firma-config-container">
      <div class="header-section">
        <div class="title-row">
          <div class="icon-badge">
            <mat-icon>verified</mat-icon>
          </div>
          <div>
            <h1>Configuración de Firma y Validez Legal</h1>
            <p class="subtitle">
              Defina el mecanismo institucional oficial que rige la validación, firma y emisión de documentos para <strong>Cooperativa Minera Marabunta R.L.</strong>
            </p>
          </div>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="loading-bar"></mat-progress-bar>

      <div class="cards-grid">
        <!-- OPCIÓN 1: FIRMA DIGITAL -->
        <mat-card 
          class="method-card" 
          [class.active-card]="tipoFirmaSeleccionado === 'FIRMA_DIGITAL'"
          (click)="tipoFirmaSeleccionado = 'FIRMA_DIGITAL'"
        >
          <div class="card-status-badge" *ngIf="tipoFirmaActivo() === 'FIRMA_DIGITAL'">
            <mat-icon>check_circle</mat-icon> VIGENTE EN EL SISTEMA
          </div>
          <div class="card-header-inner">
            <div class="method-icon-box icon-firmatic">
              <mat-icon>fingerprint</mat-icon>
            </div>
            <div>
              <h2>Firma Digital Oficial (FirmaTIC / Token)</h2>
              <span class="sub-label">Estándar PKI - AGETIC / ATT</span>
            </div>
          </div>

          <div class="card-body">
            <p>
              Emisión de documentos oficiales suscritos mediante certificados digitales en dispositivos criptográficos físicos (Token USB) o en la nube a través de la pasarela <strong>FirmaTIC (AGETIC)</strong>.
            </p>
            <ul class="method-features">
              <li><mat-icon>done</mat-icon> Plena equivalencia jurídica y no repudio (Ley N° 164 de Telecomunicaciones y TIC).</li>
              <li><mat-icon>done</mat-icon> Bandeja principal de firma en <code>/firmar</code> con integración de applet/daemon local.</li>
              <li><mat-icon>done</mat-icon> Sellado de tiempo y estampilla visual con código QR de verificación pública.</li>
            </ul>
          </div>

          <div class="card-footer">
            <mat-radio-button 
              name="tipoFirma" 
              value="FIRMA_DIGITAL" 
              [checked]="tipoFirmaSeleccionado === 'FIRMA_DIGITAL'"
              (change)="tipoFirmaSeleccionado = 'FIRMA_DIGITAL'"
            >
              Seleccionar Firma Digital
            </mat-radio-button>
          </div>
        </mat-card>

        <!-- OPCIÓN 2: CIUDADANÍA DIGITAL -->
        <mat-card 
          class="method-card" 
          [class.active-card]="tipoFirmaSeleccionado === 'CIUDADANIA_DIGITAL'"
          (click)="tipoFirmaSeleccionado = 'CIUDADANIA_DIGITAL'"
        >
          <div class="card-status-badge" *ngIf="tipoFirmaActivo() === 'CIUDADANIA_DIGITAL'">
            <mat-icon>check_circle</mat-icon> VIGENTE EN EL SISTEMA
          </div>
          <div class="card-header-inner">
            <div class="method-icon-box icon-cd">
              <mat-icon>how_to_reg</mat-icon>
            </div>
            <div>
              <h2>Aprobación con Ciudadanía Digital</h2>
              <span class="sub-label">Plataforma Única AGETIC - D.S. 3525</span>
            </div>
          </div>

          <div class="card-body">
            <p>
              Validación y aprobación de trámites y resoluciones institucionales mediante consentimiento informado y autenticación multifactor de <strong>Ciudadanía Digital del Estado Plurinacional</strong>.
            </p>
            <ul class="method-features">
              <li><mat-icon>done</mat-icon> Autenticación segura de autoridades y operadores sin requerir tokens físicos.</li>
              <li><mat-icon>done</mat-icon> Bandeja de aprobación en <code>/aprobar_documento</code> vinculada a AGETIC OAuth2.</li>
              <li><mat-icon>done</mat-icon> Generación inmediata de CITE institucional con firma de consentimiento digital.</li>
            </ul>
          </div>

          <div class="card-footer">
            <mat-radio-button 
              name="tipoFirma" 
              value="CIUDADANIA_DIGITAL" 
              [checked]="tipoFirmaSeleccionado === 'CIUDADANIA_DIGITAL'"
              (change)="tipoFirmaSeleccionado = 'CIUDADANIA_DIGITAL'"
            >
              Seleccionar Ciudadanía Digital
            </mat-radio-button>
          </div>
        </mat-card>
      </div>

      <!-- BANNER INFORMATIVO DE APLICACIÓN -->
      <div class="info-callout">
        <mat-icon>info</mat-icon>
        <div class="callout-content">
          <strong>Impacto institucional del cambio de modalidad:</strong>
          <span>
            Al aplicar este ajuste, los documentos oficiales derivados para su etapa de rúbrica se canalizarán a la bandeja correspondiente (Firma Digital o Ciudadanía Digital). Ambos métodos garantizan la integridad y la trazabilidad del código CITE y el expediente digital.
          </span>
        </div>
      </div>

      <!-- BOTÓN DE ACCIÓN -->
      <div class="action-bar">
        <button 
          mat-flat-button 
          class="btn-save" 
          [disabled]="guardando() || tipoFirmaSeleccionado === tipoFirmaActivo()"
          (click)="guardarConfiguracion()"
        >
          <mat-icon>{{ guardando() ? 'hourglass_top' : 'save' }}</mat-icon>
          <span>{{ guardando() ? 'Guardando cambios...' : 'Establecer como Mecanismo Institucional Oficial' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .firma-config-container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 24px;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    .header-section {
      margin-bottom: 24px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 16px;

      h1 {
        margin: 0;
        font-size: 1.6rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 0.9rem;
      }
    }

    .icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0f2027, #203a43);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      box-shadow: 0 4px 12px rgba(15, 32, 39, 0.15);

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    .loading-bar {
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .method-card {
      position: relative;
      border-radius: 16px !important;
      border: 2px solid #e2e8f0;
      padding: 24px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);

      &:hover {
        border-color: #94a3b8;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      }

      &.active-card {
        border-color: #0284c7;
        background: #f0f9ff;
        box-shadow: 0 8px 24px rgba(2, 132, 199, 0.12);
      }
    }

    .card-status-badge {
      position: absolute;
      top: 14px;
      right: 14px;
      background: #10b981;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.3px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .card-header-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
      }

      .sub-label {
        font-size: 0.78rem;
        color: #64748b;
        font-weight: 600;
      }
    }

    .method-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.icon-firmatic {
        background: rgba(2, 132, 199, 0.12);
        color: #0284c7;
      }

      &.icon-cd {
        background: rgba(16, 185, 129, 0.12);
        color: #059669;
      }

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .card-body {
      p {
        color: #334155;
        font-size: 0.88rem;
        line-height: 1.6;
        margin: 0 0 16px 0;
      }
    }

    .method-features {
      list-style: none;
      padding: 0;
      margin: 0 0 20px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;

      li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.82rem;
        color: #475569;
        line-height: 1.4;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: #0284c7;
          flex-shrink: 0;
          margin-top: 1px;
        }

        code {
          background: #e2e8f0;
          padding: 1px 4px;
          border-radius: 4px;
          font-size: 0.76rem;
          color: #0f172a;
        }
      }
    }

    .card-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: flex-end;
    }

    .info-callout {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      color: #1e3a8a;

      mat-icon {
        color: #2563eb;
        font-size: 22px;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      .callout-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.84rem;
        line-height: 1.5;

        strong {
          font-weight: 700;
        }
      }
    }

    .action-bar {
      display: flex;
      justify-content: flex-end;

      .btn-save {
        background: #0f2027 !important;
        color: #ffffff !important;
        border-radius: 24px !important;
        padding: 0 28px !important;
        height: 46px !important;
        font-weight: 700 !important;
        font-size: 0.9rem !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        box-shadow: 0 4px 14px rgba(15, 32, 39, 0.2) !important;

        &:disabled {
          background: #cbd5e1 !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }
      }
    }
  `]
})
export class FirmaConfigComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly tipoFirmaActivo = signal<'FIRMA_DIGITAL' | 'CIUDADANIA_DIGITAL'>('FIRMA_DIGITAL');
  tipoFirmaSeleccionado: 'FIRMA_DIGITAL' | 'CIUDADANIA_DIGITAL' = 'FIRMA_DIGITAL';

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.cargando.set(true);
    this.http.get<{ tipoMensaje: string; datos: FirmaConfigResp }>('/api/v1/admin/firma/config').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res && res.datos) {
          this.tipoFirmaActivo.set(res.datos.tipo_firma);
          this.tipoFirmaSeleccionado = res.datos.tipo_firma;
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al obtener la configuración de firma del servidor', 'Cerrar', { duration: 3000 });
      }
    });
  }

  guardarConfiguracion(): void {
    if (this.tipoFirmaSeleccionado === this.tipoFirmaActivo()) return;

    this.guardando.set(true);
    this.http.put<{ tipoMensaje: string; mensaje: string; datos: FirmaConfigResp }>('/api/v1/admin/firma/config', {
      tipo_firma: this.tipoFirmaSeleccionado
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.tipoFirmaActivo.set(this.tipoFirmaSeleccionado);
        this.snackBar.open(
          `Mecanismo rector actualizado a: ${this.tipoFirmaSeleccionado === 'FIRMA_DIGITAL' ? 'Firma Digital (FirmaTIC)' : 'Ciudadanía Digital (AGETIC)'}`,
          'Aceptar',
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err.error?.mensaje || 'Error al actualizar la configuración';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
