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
            <span class="system-sub">Portal Oficial de Radicación de Documentos y Correspondencia</span>
          </div>
        </div>

        <div class="nav-actions">
          <a routerLink="/auth/login" mat-stroked-button class="btn-login-nav">
            <mat-icon>lock</mat-icon>
            <span>Acceso Usuarios</span>
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
              <span>Consultar Estado de Documento</span>
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
                    <mat-label>Correo Electrónico *</mat-label>
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
                    <mat-label>Tipo de Documento</mat-label>
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
                    <input matInput formControlName="referencia" placeholder="Describa el objeto de su documento de manera clara">
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
                  <span>¡Documento Radicado Exitosamente con Validez Oficial!</span>
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
                    <span>Radicar Otro Documento</span>
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
      background: var(--paper-canvas);
      display: flex;
      flex-direction: column;
      font-family: var(--font-ui);
      color: var(--ink);
    }

    .public-nav {
      background: var(--petrol-gradient);
      color: #ffffff;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--gold);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-circle {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(214, 168, 79, 0.16);
      border: 1px solid rgba(214, 168, 79, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #ead196; }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .system-title {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .system-sub {
      font-size: 0.76rem;
      color: rgba(255, 255, 255, 0.72);
    }

    .btn-login-nav.mat-mdc-outlined-button {
      color: #ead196;
      border-color: rgba(214, 168, 79, 0.55);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 8px;
    }

    /* Cabecera Moderna */
    .hero-section {
      background:
        radial-gradient(circle at 84% 24%, rgba(214, 168, 79, 0.2), transparent 46%),
        var(--petrol-gradient);
      color: #ffffff;
      padding: 36px 24px 56px;
      display: flex;
      justify-content: center;
    }

    .hero-content {
      width: 100%;
      max-width: 940px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(52, 211, 153, 0.45);
      border-radius: 999px;
      font-size: 0.76rem;
      color: #6ee7b7;
      font-weight: 700;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #34d399; }
    }

    .hero-title {
      font-family: var(--font-ui);
      font-size: 2rem;
      font-weight: 800;
      margin: 0;
      color: #ffffff;
      letter-spacing: -0.025em;
    }

    .hero-subtitle {
      font-size: 0.96rem;
      color: rgba(255, 255, 255, 0.84);
      line-height: 1.55;
      max-width: 72ch;
      margin: 0;
    }

    /* Contenedor Principal */
    .main-content {
      flex: 1;
      max-width: 980px;
      width: 100%;
      margin: -30px auto 40px;
      padding: 0 20px;
      position: relative;
      z-index: 2;
    }

    .portal-card {
      background: var(--surface);
      border-radius: 16px;
      box-shadow: 0 18px 42px rgba(15, 46, 52, 0.12);
      overflow: hidden;
      border: 1px solid var(--line);
    }

    .portal-tabs-header {
      display: flex;
      border-bottom: 1px solid var(--line);
      background: var(--surface-tinted);
    }

    .p-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px;
      border: none;
      border-bottom: 3px solid transparent;
      background: transparent;
      font-family: inherit;
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--ink-muted);
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease;

      &:hover { color: var(--ink); }

      &.p-tab-active {
        color: var(--petrol-bright);
        font-weight: 700;
        background: var(--surface);
        border-bottom-color: var(--petrol-bright);
        mat-icon { color: var(--petrol-bright); }
      }
    }

    .tab-body {
      padding: 28px 32px;
    }

    .stepper-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .step-num {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--paper-canvas);
      border: 1px solid var(--line-strong);
      color: var(--ink-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;

      &.active {
        background: var(--petrol);
        border-color: var(--petrol);
        color: #ffffff;
      }
    }

    .step-line {
      width: 56px;
      height: 1px;
      background: var(--line-strong);
    }

    .public-form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .col-span-full { grid-column: span 2; }
    .mt-4 { margin-top: 14px; }

    .form-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 6px;
      mat-icon { color: var(--gold-hover); }
    }

    .file-upload-card {
      border: 1.5px dashed var(--line-strong);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: var(--paper-canvas);
    }

    .upload-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: var(--petrol); }
    }

    .upload-text {
      flex: 1;
      h4 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--ink); }
      p { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-muted); }
    }

    .btn-browse-file.mat-mdc-outlined-button {
      border-color: var(--petrol);
      color: var(--petrol);
    }

    .form-actions-full {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .btn-radicar-public.mat-mdc-raised-button {
      background: linear-gradient(135deg, #0f3a42 0%, #0e7490 100%);
      color: #ffffff;
      padding: 0 28px;
      height: 46px;
      font-size: 0.92rem;
      font-weight: 700;
      border-radius: 12px;
      box-shadow: 0 6px 16px rgba(14, 116, 144, 0.25);
      &:hover:not(:disabled) {
        filter: brightness(1.06);
      }
    }

    /* Comprobante */
    .receipt-card {
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
    }

    .receipt-success-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--state-ok);
      font-size: 1.2rem;
      font-weight: 700;
      mat-icon { font-size: 30px; width: 30px; height: 30px; }
    }

    .receipt-body {
      background: var(--paper-canvas);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 22px;
      width: 100%;
      max-width: 820px;
      display: flex;
      gap: 24px;
      align-items: stretch;
    }

    .qr-verification-box {
      width: 240px;
      min-width: 240px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 16px;
      gap: 10px;
    }

    .qr-img-wrapper {
      width: 184px;
      height: 184px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid var(--line);
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
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--gold-hover);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .qr-hr-code {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ink);
      font-family: var(--font-mono);
    }

    .qr-lbl-url {
      font-size: 0.68rem;
      color: var(--ink-muted);
      margin-top: 4px;
    }

    .qr-url-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      color: var(--petrol);
      text-decoration: none;
      word-break: break-all;
      line-height: 1.3;
      padding: 4px 6px;
      background: var(--paper-canvas);
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
      border-bottom: 1px dashed var(--line-strong);
      padding-bottom: 6px;
      gap: 12px;
    }

    .r-lbl { font-size: 0.8rem; color: var(--ink-muted); }
    .r-val { font-size: 0.84rem; color: var(--ink); text-align: right; }
    .r-code { color: var(--petrol); font-family: var(--font-mono); font-size: 0.92rem; }

    .receipt-actions {
      display: flex;
      gap: 12px;
    }

    .btn-print-receipt.mat-mdc-raised-button {
      background: var(--petrol);
      color: #ffffff;
    }

    /* Consulta de Trámite */
    .search-tracking-box {
      display: flex;
      gap: 12px;
      max-width: 640px;
      margin: 0 auto 28px;
    }

    .tracking-input {
      flex: 1;
      margin-bottom: -1.25em;
    }

    .btn-track.mat-mdc-raised-button {
      background: var(--petrol);
      color: #ffffff;
      height: 52px;
      padding: 0 24px;
      box-shadow: none;
    }

    .tracking-result-card {
      background: var(--paper-canvas);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 22px;
      max-width: 640px;
      margin: 0 auto;
    }

    .tr-header {
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
      margin-bottom: 18px;
      mat-icon { color: var(--petrol); font-size: 30px; width: 30px; height: 30px; }
      h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--ink); }
      p { margin: 2px 0 0; font-size: 0.8rem; color: var(--ink-muted); }
    }

    .status-badge-active {
      margin-left: auto;
      font-size: 0.76rem;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--state-ok-bg);
      color: var(--state-ok);
      font-weight: 700;
    }

    .tr-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tl-item {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }

    .tl-dot {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--line-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }

    .tl-item.done .tl-dot {
      background: var(--state-ok-bg);
      border-color: rgba(21, 128, 61, 0.3);
      mat-icon { color: var(--state-ok); }
    }

    .tl-item.current .tl-dot {
      background: var(--gold-soft);
      border-color: rgba(179, 130, 34, 0.35);
      mat-icon { color: var(--gold-hover); }
    }

    .email-alert-box {
      margin-top: 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--state-ok-bg);
      border: 1px solid rgba(21, 128, 61, 0.25);
      border-left: 4px solid var(--state-ok);
      padding: 12px 16px;
      border-radius: 8px;
      color: var(--ink);
      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
        color: var(--state-ok);
      }
      p {
        margin: 2px 0 0;
        font-size: 0.82rem;
        color: var(--ink-muted);
      }
    }

    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      background: var(--state-info-bg);
      color: var(--state-info);
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .tr-header-info {
      flex: 1;
      h3 { margin: 0; font-size: 1.08rem; color: var(--ink); font-weight: 700; }
      .tr-ref { margin: 4px 0 2px; font-size: 0.88rem; color: var(--ink); }
      .tr-sub { margin: 0; font-size: 0.78rem; color: var(--ink-muted); }
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
      background: var(--petrol);
      color: #ffffff;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 0.74rem;
      font-weight: 600;
      mat-icon { font-size: 15px; width: 15px; height: 15px; color: #ead196; }
    }

    .tr-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      margin: 18px 0;
    }

    .tr-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      .tr-lbl { font-size: 0.74rem; color: var(--ink-muted); font-weight: 600; }
      strong { font-size: 0.85rem; color: var(--ink); }
      span { font-size: 0.82rem; color: var(--ink-muted); }
      .cite-text { color: var(--petrol); font-family: var(--font-mono); }
    }

    .tl-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 18px 0 12px;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--ink);
      mat-icon { color: var(--gold-hover); }
    }

    .tl-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .tl-date { font-size: 0.74rem; color: var(--ink-muted); }
    }

    .tl-obs {
      font-size: 0.8rem;
      color: var(--ink-muted);
      margin-top: 2px;
      line-height: 1.4;
    }

    .tl-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      strong { font-size: 0.85rem; color: var(--ink); }
      span { font-size: 0.76rem; color: var(--ink-muted); }
    }

    /* Footer */
    .public-footer {
      background: var(--petrol);
      color: rgba(255, 255, 255, 0.72);
      padding: 20px;
      text-align: center;
      font-size: 0.8rem;
      border-top: 2px solid var(--gold);
      p { margin: 0; }
    }

    .footer-powered {
      display: block;
      margin-top: 4px;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.45);
    }

    @media (max-width: 640px) {
      .public-nav {
        padding: 12px 14px;
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
      }
      .nav-brand {
        justify-content: center;
      }
      .btn-login-nav.mat-mdc-outlined-button {
        width: 100%;
        justify-content: center;
      }
      .hero-section {
        padding: 20px 14px;
      }
      .hero-title {
        font-size: 1.35rem;
      }
      .hero-subtitle {
        font-size: 0.84rem;
      }
      .main-content {
        padding: 0 10px;
        margin: 14px auto 24px;
        width: 100%;
        max-width: 100%;
      }
      .portal-tabs-header {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .p-tab-btn {
        padding: 12px 8px;
        font-size: 0.8rem;
        flex-direction: column;
        gap: 4px;
        min-width: 130px;
      }
      .tab-body {
        padding: 16px 12px;
      }
      .public-form-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .col-span-full {
        grid-column: span 1;
      }
      mat-form-field {
        width: 100%;
        max-width: 100%;
      }
      .file-upload-card {
        flex-direction: column;
        text-align: center;
        padding: 16px 12px;
        gap: 12px;
      }
      .btn-browse-file.mat-mdc-outlined-button,
      .btn-radicar-public.mat-mdc-raised-button,
      .btn-track.mat-mdc-raised-button {
        width: 100%;
      }
      .form-actions-full {
        justify-content: stretch;
      }
      .receipt-card {
        padding: 16px 10px;
      }
      .receipt-body {
        flex-direction: column;
        padding: 14px 10px;
        gap: 16px;
        width: 100%;
      }
      .qr-verification-box {
        width: 100%;
        min-width: 0;
      }
      .qr-img-wrapper {
        width: 160px;
        height: 160px;
      }
      .receipt-actions {
        flex-direction: column;
        width: 100%;
        button, a {
          width: 100%;
          justify-content: center;
        }
      }
      .search-tracking-box {
        flex-direction: column;
        width: 100%;
      }
      .tracking-result-card {
        padding: 16px 10px;
        width: 100%;
      }
      .tr-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .status-badge-active {
        margin-left: 0;
      }
      .tr-badges {
        align-items: flex-start;
      }
      .public-footer {
        padding: 16px 12px;
        font-size: 0.75rem;
      }
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

        this.snackBar.open(`¡Documento radicado exitosamente! Hoja de Ruta: ${d.codigo_hoja_ruta}`, 'Aceptar', {
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
        const msg = err.error?.mensaje || 'No se encontró ningún documento con ese código.';
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
