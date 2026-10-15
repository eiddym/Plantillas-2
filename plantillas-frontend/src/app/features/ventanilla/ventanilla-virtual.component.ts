import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ventanilla-virtual',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="public-portal-container">
      <!-- Navbar Pública -->
      <nav class="public-nav">
        <div class="nav-brand">
          <div class="logo-circle">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="brand-text">
            <span class="system-title">Ventanilla Única Virtual</span>
            <span class="system-sub">Portal Oficial de Radicación de Trámites y Correspondencia</span>
          </div>
        </div>

        <div class="nav-actions">
          <a routerLink="/auth/login" mat-stroked-button class="btn-login-nav">
            <mat-icon>lock</mat-icon>
            <span>Acceso Funcionarios</span>
          </a>
        </div>
      </nav>

      <!-- Banner Hero -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <mat-icon>verified</mat-icon>
            <span>Atención Digital al Ciudadano & Entidades 24/7</span>
          </div>
          <h1 class="hero-title">Radicación y Seguimiento Digital de Correspondencia</h1>
          <p class="hero-subtitle">
            Ingrese sus solicitudes, notas oficiales y documentación externa con plena validez jurídica. Obtenga su Hoja de Ruta digital al instante.
          </p>
        </div>
      </section>

      <!-- Contenedor Principal de Pestañas -->
      <main class="main-content">
        <div class="portal-card">
          <div class="portal-tabs-header">
            <button 
              class="p-tab-btn" 
              [class.p-tab-active]="tabActiva() === 'radicar'"
              (click)="tabActiva.set('radicar')"
            >
              <mat-icon>post_add</mat-icon>
              <span>Radicar Nueva Solicitud</span>
            </button>
            <button 
              class="p-tab-btn" 
              [class.p-tab-active]="tabActiva() === 'consultar'"
              (click)="tabActiva.set('consultar')"
            >
              <mat-icon>travel_explore</mat-icon>
              <span>Consultar Estado de Trámite</span>
            </button>
          </div>

          <!-- PESTAÑA 1: RADICAR NUEVA SOLICITUD -->
          @if (tabActiva() === 'radicar') {
            @if (!comprobanteGenerado()) {
              <div class="tab-body fade-in">
                <div class="stepper-indicator">
                  <div class="step-num active">1</div>
                  <div class="step-line"></div>
                  <div class="step-num" [class.active]="solicitudForm.valid">2</div>
                </div>

                <form [formGroup]="solicitudForm" (ngSubmit)="enviarSolicitud()" class="public-form-grid">
                  <div class="form-section-title">
                    <mat-icon>badge</mat-icon>
                    <span>1. Datos del Solicitante o Remitente</span>
                  </div>

                  <mat-form-field appearance="outline">
                    <mat-label>Cédula de Identidad (CI) o NIT</mat-label>
                    <input matInput formControlName="ci" placeholder="Ej: 6842109 LP">
                    <mat-icon matSuffix>pin</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombres y Apellidos Completos</mat-label>
                    <input matInput formControlName="nombreCompleto" placeholder="Ej: Lic. Elena Rocabado">
                    <mat-icon matSuffix>person</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Correo Electrónico (Notificaciones)</mat-label>
                    <input matInput type="email" formControlName="email" placeholder="usuario@correo.com">
                    <mat-icon matSuffix>email</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono o Celular</mat-label>
                    <input matInput formControlName="telefono" placeholder="Ej: 71548900">
                    <mat-icon matSuffix>phone</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="col-span-full">
                    <mat-label>Institución / Entidad / Empresa (Opcional)</mat-label>
                    <input matInput formControlName="entidad" placeholder="Dejar en blanco si es persona natural">
                    <mat-icon matSuffix>business</mat-icon>
                  </mat-form-field>

                  <div class="form-section-title col-span-full mt-4">
                    <mat-icon>description</mat-icon>
                    <span>2. Datos de la Nota o Solicitud</span>
                  </div>

                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de Trámite</mat-label>
                    <mat-select formControlName="tipoTramite">
                      <mat-option value="NOTA_OFICIAL">Nota Oficial Externa</mat-option>
                      <mat-option value="SOLICITUD">Solicitud Ciudadana</mat-option>
                      <mat-option value="INFORME_EXTERNO">Remisión de Informes / Descargos</mat-option>
                      <mat-option value="CONVENIO">Propuesta de Convenio</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>CITE / Número de Nota Externa (si aplica)</mat-label>
                    <input matInput formControlName="citeExterno" placeholder="Ej: CITE-EXT-01/2026">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="col-span-full">
                    <mat-label>Referencia o Asunto Concreto</mat-label>
                    <input matInput formControlName="referencia" placeholder="Describa el objeto de su trámite de manera clara">
                  </mat-form-field>

                  <!-- Carga de Archivo -->
                  <div class="file-upload-card col-span-full">
                    <div class="upload-icon-box">
                      <mat-icon>cloud_upload</mat-icon>
                    </div>
                    <div class="upload-text">
                      <h4>Adjuntar Nota Formal Firmada (PDF)</h4>
                      <p>Formato PDF con firma manuscrita o digital autorizada (máx. 25 MB).</p>
                    </div>
                    <input type="file" #fileInput (change)="onFileSelected($event)" accept="application/pdf" style="display: none">
                    <button type="button" mat-stroked-button (click)="fileInput.click()" class="btn-browse-file">
                      <mat-icon>attach_file</mat-icon>
                      <span>{{ archivoNombre() || 'Seleccionar Archivo PDF' }}</span>
                    </button>
                  </div>

                  @if (enviando()) {
                    <div class="col-span-full">
                      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                      <p class="sending-txt">Radicando correspondencia y generando Hoja de Ruta...</p>
                    </div>
                  }

                  <div class="form-actions-full col-span-full">
                    <button 
                      type="submit" 
                      mat-flat-button 
                      class="btn-radicar-public" 
                      [disabled]="solicitudForm.invalid || enviando()"
                    >
                      <mat-icon>send</mat-icon>
                      <span>Completar Radicación Digital</span>
                    </button>
                  </div>
                </form>
              </div>
            } @else {
              <!-- Comprobante Generado -->
              <div class="receipt-card fade-in">
                <div class="receipt-success-badge">
                  <mat-icon>check_circle</mat-icon>
                  <span>¡Trámite Radicado Exitosamente!</span>
                </div>

                <div class="receipt-body">
                  <div class="qr-placeholder">
                    <mat-icon>qr_code_2</mat-icon>
                    <span>Código Seguro de Verificación</span>
                  </div>

                  <div class="receipt-details">
                    <div class="r-row">
                      <span class="r-lbl">Código de Hoja de Ruta (HR):</span>
                      <strong class="r-val r-code">{{ comprobanteGenerado()?.hojaRuta }}</strong>
                    </div>
                    <div class="r-row">
                      <span class="r-lbl">Código de Seguimiento Web:</span>
                      <strong class="r-val">{{ comprobanteGenerado()?.codigoSeguimiento }}</strong>
                    </div>
                    <div class="r-row">
                      <span class="r-lbl">Fecha y Hora de Radicación:</span>
                      <span class="r-val">{{ comprobanteGenerado()?.fecha }}</span>
                    </div>
                    <div class="r-row">
                      <span class="r-lbl">Remitente:</span>
                      <span class="r-val">{{ comprobanteGenerado()?.solicitante }}</span>
                    </div>
                    <div class="r-row">
                      <span class="r-lbl">Asunto:</span>
                      <span class="r-val">{{ comprobanteGenerado()?.referencia }}</span>
                    </div>
                  </div>
                </div>

                <div class="receipt-actions">
                  <button mat-flat-button class="btn-print-receipt" (click)="imprimirComprobante()">
                    <mat-icon>print</mat-icon>
                    <span>Imprimir Comprobante Oficial</span>
                  </button>
                  <button mat-stroked-button (click)="reiniciarFormulario()">
                    <mat-icon>add</mat-icon>
                    <span>Radicar Otro Trámite</span>
                  </button>
                </div>
              </div>
            }
          }

          <!-- PESTAÑA 2: CONSULTAR ESTADO DE TRÁMITE -->
          @if (tabActiva() === 'consultar') {
            <div class="tab-body fade-in">
              <div class="search-tracking-box">
                <mat-form-field appearance="outline" class="tracking-input">
                  <mat-label>Número de Hoja de Ruta o Código de Seguimiento</mat-label>
                  <input matInput [formControl]="codigoTrackingCtrl" placeholder="Ej: HR-2026-00412 o TRK-8921">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <button mat-flat-button class="btn-track" (click)="buscarTramite()">
                  <span>Consultar Estado</span>
                </button>
              </div>

              @if (resultadoTracking()) {
                <div class="tracking-result-card fade-in">
                  <div class="tr-header">
                    <mat-icon>verified</mat-icon>
                    <div>
                      <h3>Trámite: {{ resultadoTracking()?.hojaRuta }}</h3>
                      <p>{{ resultadoTracking()?.asunto }}</p>
                    </div>
                    <span class="status-badge-active">{{ resultadoTracking()?.estado }}</span>
                  </div>

                  <div class="tr-timeline">
                    <div class="tl-item done">
                      <div class="tl-dot"><mat-icon>check</mat-icon></div>
                      <div class="tl-info">
                        <strong>Radicación y Recepción Virtual</strong>
                        <span>{{ resultadoTracking()?.fechaIngreso }} - Ventanilla Única Central</span>
                      </div>
                    </div>
                    <div class="tl-item current">
                      <div class="tl-dot"><mat-icon>sync</mat-icon></div>
                      <div class="tl-info">
                        <strong>En Revisión por Unidad de Destino</strong>
                        <span>{{ resultadoTracking()?.unidadActual }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>

      <!-- Footer Institucional Armotech -->
      <footer class="public-footer">
        <p>© 2026 Sistema Integral de Gestión Documental y Plantillas Institucionales</p>
        <span class="footer-powered">Desarrollado con altos estándares de seguridad por ARMOTECH</span>
      </footer>
    </div>
  `,
  styles: [`
    .public-portal-container {
      min-height: 100vh;
      background: #f1f5f9;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', -apple-system, Roboto, sans-serif;
    }

    .public-nav {
      background: #0f2027;
      color: #fff;
      padding: 16px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #fff; }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .system-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .system-sub {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.65);
    }

    .btn-login-nav {
      color: #00b4db !important;
      border-color: rgba(0, 180, 219, 0.5) !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Hero */
    .hero-section {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      color: #fff;
      padding: 50px 36px;
      text-align: center;
      display: flex;
      justify-content: center;
    }

    .hero-content {
      max-width: 820px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .hero-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      font-size: 13px;
      color: #38ef7d;
      font-weight: 600;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .hero-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.8px;
    }

    .hero-subtitle {
      font-size: 15.5px;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.5;
      margin: 0;
    }

    /* Main */
    .main-content {
      flex: 1;
      max-width: 980px;
      width: 100%;
      margin: -35px auto 40px;
      padding: 0 20px;
      z-index: 10;
    }

    .portal-card {
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .portal-tabs-header {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
      background: #f8fafc;
    }

    .p-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 18px;
      border: none;
      background: transparent;
      font-size: 15px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.25s ease;

      &:hover { color: #0f172a; }

      &.p-tab-active {
        color: #0083b0;
        background: #fff;
        border-bottom: 3px solid #0083b0;
        mat-icon { color: #0083b0; }
      }
    }

    .tab-body {
      padding: 32px;
    }

    .stepper-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;

      &.active {
        background: #00b4db;
        color: #fff;
      }
    }

    .step-line {
      width: 60px;
      height: 2px;
      background: #e2e8f0;
    }

    .public-form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
    }

    .col-span-full { grid-column: span 2; }
    .mt-4 { margin-top: 14px; }

    @media (max-width: 640px) {
      .public-form-grid { grid-template-columns: 1fr; }
      .col-span-full { grid-column: span 1; }
    }

    .form-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #0f2027;
      margin-bottom: 6px;
      mat-icon { color: #00b4db; }
    }

    .file-upload-card {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #f8fafc;
    }

    .upload-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #e0f2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #0284c7; }
    }

    .upload-text {
      flex: 1;
      h4 { margin: 0; font-size: 14.5px; font-weight: 700; color: #1e293b; }
      p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; }
    }

    .btn-browse-file {
      border-color: #00b4db !important;
      color: #0083b0 !important;
    }

    .form-actions-full {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .btn-radicar-public {
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%) !important;
      color: #fff !important;
      padding: 0 32px !important;
      height: 48px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 10px;
    }

    /* Comprobante */
    .receipt-card {
      padding: 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .receipt-success-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #16a34a;
      font-size: 20px;
      font-weight: 800;
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }

    .receipt-body {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      width: 100%;
      max-width: 640px;
      display: flex;
      gap: 24px;
    }

    .qr-placeholder {
      width: 130px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 6px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #0f2027; }
      span { font-size: 10px; color: #64748b; }
    }

    .receipt-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .r-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 6px;
    }

    .r-lbl { font-size: 12.5px; color: #64748b; }
    .r-val { font-size: 13.5px; color: #0f172a; text-align: right; }
    .r-code { color: #0083b0; font-size: 15px; }

    .receipt-actions {
      display: flex;
      gap: 14px;
    }

    .btn-print-receipt {
      background: #0f2027 !important;
      color: #fff !important;
    }

    /* Consulta de Trámite */
    .search-tracking-box {
      display: flex;
      gap: 12px;
      max-width: 640px;
      margin: 0 auto 30px;
    }

    .tracking-input {
      flex: 1;
      margin-bottom: -1.25em;
    }

    .btn-track {
      background: #0083b0 !important;
      color: #fff !important;
      height: 52px;
      padding: 0 24px !important;
    }

    .tracking-result-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      max-width: 640px;
      margin: 0 auto;
    }

    .tr-header {
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
      mat-icon { color: #00b4db; font-size: 32px; width: 32px; height: 32px; }
      h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
      p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; }
    }

    .status-badge-active {
      margin-left: auto;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
    }

    .tr-timeline {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .tl-item {
      display: flex;
      gap: 14px;
    }

    .tl-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .tl-item.done .tl-dot {
      background: #dcfce7;
      mat-icon { color: #16a34a; }
    }

    .tl-item.current .tl-dot {
      background: #e0f2fe;
      mat-icon { color: #0284c7; }
    }

    .tl-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      strong { font-size: 13.5px; color: #1e293b; }
      span { font-size: 12px; color: #64748b; }
    }

    /* Footer */
    .public-footer {
      background: #0f2027;
      color: rgba(255, 255, 255, 0.65);
      padding: 24px;
      text-align: center;
      font-size: 13px;
      p { margin: 0; }
    }

    .footer-powered {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }

    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class VentanillaVirtualComponent {
  readonly tabActiva = signal<'radicar' | 'consultar'>('radicar');
  readonly enviando = signal<boolean>(false);
  readonly archivoNombre = signal<string | null>(null);
  readonly comprobanteGenerado = signal<any | null>(null);
  readonly resultadoTracking = signal<any | null>(null);

  readonly codigoTrackingCtrl = new FormControl('');

  readonly solicitudForm = new FormGroup({
    ci: new FormControl('', [Validators.required]),
    nombreCompleto: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required]),
    entidad: new FormControl(''),
    tipoTramite: new FormControl('NOTA_OFICIAL', [Validators.required]),
    citeExterno: new FormControl(''),
    referencia: new FormControl('', [Validators.required])
  });

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivoNombre.set(file.name);
    }
  }

  enviarSolicitud(): void {
    if (this.solicitudForm.invalid) return;

    this.enviando.set(true);
    const v = this.solicitudForm.value;
    const randomCode = Math.floor(1000 + Math.random() * 9000);

    setTimeout(() => {
      this.enviando.set(false);
      this.comprobanteGenerado.set({
        hojaRuta: `HR-EXT-2026-00${randomCode}`,
        codigoSeguimiento: `TRK-${randomCode}`,
        fecha: new Date().toLocaleString('es-BO'),
        solicitante: v.nombreCompleto,
        referencia: v.referencia
      });
    }, 1000);
  }

  buscarTramite(): void {
    const cod = (this.codigoTrackingCtrl.value || '').trim();
    if (!cod) return;

    this.resultadoTracking.set({
      hojaRuta: cod.toUpperCase(),
      asunto: 'Solicitud Oficial Remitida por Canal Virtual',
      estado: 'EN CURSO - UNIDAD TECNOLÓGICA',
      fechaIngreso: '15/10/2026 14:15',
      unidadActual: 'Unidad de Tecnologías de la Información y Comunicación'
    });
  }

  imprimirComprobante(): void {
    window.print();
  }

  reiniciarFormulario(): void {
    this.comprobanteGenerado.set(null);
    this.solicitudForm.reset({ tipoTramite: 'NOTA_OFICIAL' });
    this.archivoNombre.set(null);
  }
}
