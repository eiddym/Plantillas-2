import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { nombreRealValidator, correoEstrictoValidator } from './ventanilla-validators';
import { MosparoComponent, MosparoTokens } from '../../shared/components/mosparo/mosparo.component';

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
    MatSnackBarModule,
    MosparoComponent
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
                  <div class="form-section-title col-span-full">
                    <mat-icon>badge</mat-icon>
                    <span>1. Datos del Solicitante o Remitente</span>
                  </div>

                  <mat-form-field appearance="outline">
                    <mat-label>Nombres y Apellidos Reales *</mat-label>
                    <input matInput formControlName="nombreCompleto" placeholder="Ej: Elena Rocabado Céspedes">
                    <mat-icon matSuffix>person</mat-icon>
                    <mat-hint>Solo nombres y apellidos reales (sin Lic., Ing., Dr., etc.)</mat-hint>
                    @if (solicitudForm.get('nombreCompleto')?.invalid && (solicitudForm.get('nombreCompleto')?.touched || solicitudForm.get('nombreCompleto')?.dirty)) {
                      <mat-error>
                        @if (solicitudForm.get('nombreCompleto')?.errors?.['tituloNoPermitido']) {
                          {{ solicitudForm.get('nombreCompleto')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('nombreCompleto')?.errors?.['caracteresInvalidos']) {
                          {{ solicitudForm.get('nombreCompleto')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('nombreCompleto')?.errors?.['nombreIncompleto']) {
                          {{ solicitudForm.get('nombreCompleto')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('nombreCompleto')?.errors?.['required']) {
                          El nombre y apellido es obligatorio.
                        }
                      </mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Cédula de Identidad (CI) o NIT</mat-label>
                    <input matInput formControlName="ci" placeholder="Ej: 6842109 LP">
                    <mat-icon matSuffix>badge</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono o Celular</mat-label>
                    <input matInput formControlName="telefono" placeholder="Ej: 71548900">
                    <mat-icon matSuffix>phone</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Correo Electrónico (Para envío de Hoja de Ruta) *</mat-label>
                    <input matInput type="email" formControlName="email" placeholder="usuario@empresa.com">
                    <mat-icon matSuffix>email</mat-icon>
                    <mat-hint>No use correos temporales ni ficticios (ej: 123&#64;123.com)</mat-hint>
                    @if (solicitudForm.get('email')?.invalid && (solicitudForm.get('email')?.touched || solicitudForm.get('email')?.dirty)) {
                      <mat-error>
                        @if (solicitudForm.get('email')?.errors?.['correoTemporal']) {
                          {{ solicitudForm.get('email')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('email')?.errors?.['correoFalso']) {
                          {{ solicitudForm.get('email')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('email')?.errors?.['correoInvalido']) {
                          {{ solicitudForm.get('email')?.errors?.['mensaje'] }}
                        } @else if (solicitudForm.get('email')?.errors?.['required']) {
                          El correo es obligatorio para enviarle su Hoja de Ruta.
                        }
                      </mat-error>
                    }
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

                  <!-- Protección Soberana Mosparo -->
                  <div class="col-span-full">
                    <app-mosparo 
                      (verified)="onMosparoVerified($event)" 
                      (tokensChanged)="onMosparoTokensChanged($event)"
                    ></app-mosparo>
                  </div>

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
                  <span>¡Trámite Radicado Exitosamente con Validez Oficial!</span>
                </div>

                <!-- Notificación por Correo Electrónico -->
                <div class="email-alert-box">
                  <mat-icon>mark_email_read</mat-icon>
                  <div>
                    <strong>Notificación enviada a su correo:</strong>
                    <p>Hemos enviado una confirmación formal con su código de Hoja de Ruta al correo <strong>{{ comprobanteGenerado()?.email }}</strong>.</p>
                  </div>
                </div>

                <div class="receipt-body">
                  <div class="qr-verification-box">
                    <div class="qr-img-wrapper">
                      <img 
                        [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + getUrlSeguimiento(comprobanteGenerado()?.hojaRuta)" 
                        alt="Código QR de Verificación de Hoja de Ruta"
                        class="qr-code-img"
                      />
                    </div>
                    <div class="qr-info-content">
                      <span class="qr-tag"><mat-icon>verified</mat-icon> Código Verificación</span>
                      <strong class="qr-hr-code">{{ comprobanteGenerado()?.hojaRuta }}</strong>
                      <span class="qr-lbl-url">URL de Consulta Oficial:</span>
                      <a [href]="getUrlSeguimiento(comprobanteGenerado()?.hojaRuta)" target="_blank" class="qr-url-link">
                        <mat-icon>link</mat-icon>
                        <span>docs.marabuntarl.com/ventanilla-virtual?codigo={{ comprobanteGenerado()?.hojaRuta }}</span>
                      </a>
                    </div>
                  </div>

                  <div class="receipt-details">
                    <div class="r-row">
                      <span class="r-lbl">Código de Hoja de Ruta (HR):</span>
                      <strong class="r-val r-code">{{ comprobanteGenerado()?.hojaRuta }}</strong>
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
                      <span class="r-lbl">Asunto / Referencia:</span>
                      <span class="r-val">{{ comprobanteGenerado()?.referencia }}</span>
                    </div>
                    <div class="r-row">
                      <span class="r-lbl">Estado Actual:</span>
                      <span class="r-val status-pill">REGISTRADO / EN BANDEJA DE CORRESPONDENCIA</span>
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
                  <mat-label>Número de Hoja de Ruta o CITE</mat-label>
                  <input matInput [formControl]="codigoTrackingCtrl" (keyup.enter)="buscarTramite()" placeholder="Ej: HR-2026-00004">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <button mat-flat-button class="btn-track" [disabled]="buscando()" (click)="buscarTramite()">
                  <span>{{ buscando() ? 'Buscando...' : 'Consultar Estado' }}</span>
                </button>
              </div>

              @if (resultadoTracking()) {
                <div class="tracking-result-card fade-in">
                  <div class="tr-header">
                    <mat-icon>verified</mat-icon>
                    <div class="tr-header-info">
                      <h3>Hoja de Ruta: {{ resultadoTracking()?.hoja_ruta }}</h3>
                      <p class="tr-ref"><strong>Asunto:</strong> {{ resultadoTracking()?.referencia }}</p>
                      <p class="tr-sub"><strong>Remitente:</strong> {{ resultadoTracking()?.remitente }}</p>
                    </div>
                    <div class="tr-badges">
                      <span class="status-badge-active">{{ resultadoTracking()?.estado }}</span>
                      @if (resultadoTracking()?.cite_oficial && resultadoTracking()?.cite_oficial !== 'PENDIENTE DE APROBACIÓN (EN TRÁMITE)') {
                        <span class="cite-badge-official">
                          <mat-icon>verified</mat-icon>
                          CITE Oficial: {{ resultadoTracking()?.cite_oficial }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="tr-details-grid">
                    <div class="tr-item">
                      <span class="tr-lbl">Destino / Unidad Actual:</span>
                      <strong>{{ resultadoTracking()?.unidad_actual }}</strong>
                    </div>
                    <div class="tr-item">
                      <span class="tr-lbl">Fecha Ingreso:</span>
                      <span>{{ resultadoTracking()?.fecha_ingreso | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <div class="tr-item">
                      <span class="tr-lbl">CITE Oficial Asignado:</span>
                      <strong class="cite-text">{{ resultadoTracking()?.cite_oficial }}</strong>
                    </div>
                  </div>

                  <h4 class="tl-title"><mat-icon>timeline</mat-icon> Trazabilidad y Flujo Documental</h4>
                  <div class="tr-timeline">
                    @for (paso of resultadoTracking()?.historial; track paso.id_historial_flujo) {
                      <div class="tl-item done">
                        <div class="tl-dot"><mat-icon>check</mat-icon></div>
                        <div class="tl-info">
                          <div class="tl-header-row">
                            <strong>{{ paso.accion }}</strong>
                            <span class="tl-date">{{ paso._fecha_creacion | date:'dd/MM/yyyy HH:mm' }}</span>
                          </div>
                          <span class="tl-obs">{{ paso.observacion }}</span>
                        </div>
                      </div>
                    }
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
      max-width: 820px;
      display: flex;
      gap: 28px;
      align-items: stretch;
    }

    .qr-verification-box {
      width: 250px;
      min-width: 250px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
      gap: 10px;
    }

    .qr-img-wrapper {
      width: 190px;
      height: 190px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      padding: 6px;
    }

    .qr-code-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .qr-info-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 100%;
    }

    .qr-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0083b0;
      text-transform: uppercase;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .qr-hr-code {
      font-size: 18px;
      font-weight: 800;
      color: #0f2027;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .qr-lbl-url {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 4px;
    }

    .qr-url-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      color: #0284c7;
      text-decoration: none;
      word-break: break-all;
      line-height: 1.3;
      padding: 4px 6px;
      background: #f0f9ff;
      border-radius: 6px;
      margin-top: 2px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; flex-shrink: 0; }
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

    .email-alert-box {
      margin-top: 14px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-left: 5px solid #10b981;
      padding: 14px 18px;
      border-radius: 8px;
      color: #065f46;
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #10b981;
      }
      p {
        margin: 2px 0 0;
        font-size: 13px;
        color: #047857;
      }
    }

    .status-pill {
      display: inline-block;
      padding: 4px 12px;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .tr-header-info {
      flex: 1;
      h3 { margin: 0; font-size: 18px; color: #0f172a; font-weight: 700; }
      .tr-ref { margin: 4px 0 2px; font-size: 14px; color: #334155; }
      .tr-sub { margin: 0; font-size: 12.5px; color: #64748b; }
    }

    .tr-badges {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
    }

    .cite-badge-official {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .tr-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin: 18px 0;
    }

    .tr-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      .tr-lbl { font-size: 11.5px; text-transform: uppercase; color: #64748b; font-weight: 600; }
      strong { font-size: 13.5px; color: #1e293b; }
      span { font-size: 13px; color: #334155; }
      .cite-text { color: #0284c7; font-family: monospace; }
    }

    .tl-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 12px;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      mat-icon { color: #0284c7; }
    }

    .tl-item {
      display: flex;
      gap: 14px;
      margin-bottom: 16px;
    }

    .tl-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .tl-date { font-size: 11.5px; color: #94a3b8; }
    }

    .tl-obs {
      font-size: 12.5px;
      color: #475569;
      margin-top: 2px;
      line-height: 1.4;
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

    .tl-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
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
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly tabActiva = signal<'radicar' | 'consultar'>('radicar');
  readonly enviando = signal<boolean>(false);
  readonly buscando = signal<boolean>(false);
  readonly archivoNombre = signal<string | null>(null);
  readonly comprobanteGenerado = signal<any | null>(null);
  readonly resultadoTracking = signal<any | null>(null);

  archivoAdjuntoBase64: string | null = null;

  readonly codigoTrackingCtrl = new FormControl('');

  readonly solicitudForm = new FormGroup({
    ci: new FormControl('', [Validators.required]),
    nombreCompleto: new FormControl('', [Validators.required, nombreRealValidator()]),
    email: new FormControl('', [Validators.required, correoEstrictoValidator()]),
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
      const reader = new FileReader();
      reader.onload = () => {
        this.archivoAdjuntoBase64 = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  mosparoTokens = signal<MosparoTokens | null>(null);

  onMosparoVerified(tokens: MosparoTokens): void {
    this.mosparoTokens.set(tokens);
  }

  onMosparoTokensChanged(tokens: MosparoTokens | null): void {
    this.mosparoTokens.set(tokens);
  }

  enviarSolicitud(): void {
    if (this.solicitudForm.invalid) return;

    this.enviando.set(true);
    const v = this.solicitudForm.value;

    const tokens = this.mosparoTokens();
    const payload: any = {
      ci: v.ci,
      nombreCompleto: v.nombreCompleto,
      email: v.email,
      telefono: v.telefono,
      entidad: v.entidad,
      tipoTramite: v.tipoTramite,
      citeExterno: v.citeExterno,
      referencia: v.referencia,
      archivo_adjunto: this.archivoAdjuntoBase64
    };

    if (tokens) {
      payload._mosparo_submitToken = tokens.submitToken;
      payload._mosparo_validationToken = tokens.validationToken;
    }

    this.http.post<any>('/api/v1/ventanilla/radicar', payload).subscribe({
      next: (res) => {
        this.enviando.set(false);
        const d = res.datos || {};
        this.comprobanteGenerado.set({
          hojaRuta: d.codigo_hoja_ruta,
          fecha: d.fecha ? new Date(d.fecha).toLocaleString('es-BO') : new Date().toLocaleString('es-BO'),
          solicitante: d.remitente,
          referencia: d.referencia,
          email: v.email,
          email_notificado: d.email_notificado
        });

        this.snackBar.open(`¡Trámite radicado exitosamente! Hoja de Ruta: ${d.codigo_hoja_ruta}`, 'Aceptar', {
          duration: 6000
        });
      },
      error: (err) => {
        this.enviando.set(false);
        const msg = err.error?.mensaje || 'Error al radicar el documento. Por favor verifique los datos.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  buscarTramite(): void {
    const cod = (this.codigoTrackingCtrl.value || '').trim();
    if (!cod) {
      this.snackBar.open('Ingrese un código de Hoja de Ruta o CITE.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscando.set(true);
    this.http.get<any>(`/api/v1/ventanilla/consultar/${encodeURIComponent(cod)}`).subscribe({
      next: (res) => {
        this.buscando.set(false);
        this.resultadoTracking.set(res.datos || null);
      },
      error: (err) => {
        this.buscando.set(false);
        this.resultadoTracking.set(null);
        const msg = err.error?.mensaje || 'No se encontró ningún trámite con ese código.';
        this.snackBar.open(msg, 'Entendido', { duration: 4000 });
      }
    });
  }

  getUrlSeguimiento(codigo: string | undefined): string {
    const cod = encodeURIComponent(codigo || '');
    return `https://docs.marabuntarl.com/ventanilla-virtual?codigo=${cod}`;
  }

  imprimirComprobante(): void {
    window.print();
  }

  reiniciarFormulario(): void {
    this.comprobanteGenerado.set(null);
    this.solicitudForm.reset({ tipoTramite: 'NOTA_OFICIAL' });
    this.archivoNombre.set(null);
    this.archivoAdjuntoBase64 = null;
  }
}
