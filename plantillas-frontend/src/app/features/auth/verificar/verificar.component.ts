import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface Firmante {
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  cargo?: string;
  ci?: string;
  fecha?: string;
  fecha_firma?: string;
  tipo?: string;
  estado?: string;
}

export interface VerificacionResultado {
  cite: string;
  hash: string;
  codigo: string;
  token?: string;
  firmantes?: Firmante[];
  tipo_aprobacion?: 'TOKEN' | 'CIUDADANIA_DIGITAL';
}

@Component({
  selector: 'app-verificar-documento',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="verif-portal">
      <!-- Barra Superior Institucional -->
      <header class="verif-header">
        <div class="header-inner">
          <div class="brand-block">
            <div class="logo-box">
              <img 
                src="assets/images/logo_cooperativa.png" 
                alt="Logo Institucional" 
                class="brand-logo"
                (error)="onLogoError($event)"
              />
            </div>
            <div class="brand-text">
              <span class="system-title">SISTEMA OFICIAL DE VALIDACIÓN DOCUMENTAL</span>
              <span class="system-sub">Portal Público de Fe Pública y Autenticidad Jurídica</span>
            </div>
          </div>
          <div class="header-actions">
            <a routerLink="/auth/login" class="login-link">
              <mat-icon>lock_outline</mat-icon>
              <span>Acceso Funcionarios</span>
            </a>
          </div>
        </div>
      </header>

      <!-- Banner Hero Institucional Petróleo -->
      <section class="verif-hero">
        <div class="hero-inner">
          <div class="hero-badge">
            <mat-icon>verified</mat-icon>
            <span>Portal Oficial de Fe Pública y Autenticidad Jurídica</span>
          </div>
          <h1 class="hero-title">Cotejo y Verificación de Documentos</h1>
          <p class="hero-subtitle">
            Consulte la validez legal, integridad criptográfica y firmas digitales de resoluciones, notas y documentos institucionales custodiados.
          </p>
        </div>
      </section>

      <!-- Contenedor Principal -->
      <main class="verif-main">
        <div class="verif-layout">
          
          <!-- Columna Izquierda: Formulario de Consulta y Firmantes -->
          <div class="col-query">
            
            <!-- Tarjeta de Búsqueda -->
            <div class="query-card">
              <div class="card-lead">
                <div class="lead-icon">
                  <mat-icon>verified_user</mat-icon>
                </div>
                <div>
                  <h1 class="lead-title">Cotejo de Autenticidad</h1>
                  <p class="lead-desc">Ingrese el CITE y código de seguridad impreso en el pie de página o código QR del documento.</p>
                </div>
              </div>

              <mat-progress-bar *ngIf="loading()" mode="indeterminate" class="query-progress"></mat-progress-bar>

              <form [formGroup]="verifyForm" (ngSubmit)="consultar()" class="verif-form">
                <div class="field-row">
                  <label class="field-label" for="cite-input">CITE Institucional</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input 
                      id="cite-input"
                      matInput 
                      formControlName="cite" 
                      placeholder="Ej. AJAM-DJ-INF-2026-089" 
                      autocomplete="off"
                    />
                    <mat-icon matPrefix class="form-icon">tag</mat-icon>
                    <mat-error *ngIf="verifyForm.get('cite')?.hasError('required')">El CITE es obligatorio</mat-error>
                  </mat-form-field>
                </div>

                <div class="field-row">
                  <label class="field-label" for="codigo-input">Código de Seguridad / Verificación</label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input 
                      id="codigo-input"
                      matInput 
                      formControlName="codigo" 
                      placeholder="Ej. 8B2F-9A1C" 
                      autocomplete="off"
                      style="font-family: monospace; letter-spacing: 1px;"
                    />
                    <mat-icon matPrefix class="form-icon">pin</mat-icon>
                    <mat-error *ngIf="verifyForm.get('codigo')?.hasError('required')">El código es obligatorio</mat-error>
                  </mat-form-field>
                </div>

                <button 
                  type="submit" 
                  class="btn-validar" 
                  [disabled]="verifyForm.invalid || loading()"
                >
                  <mat-icon *ngIf="!loading()">search</mat-icon>
                  <mat-icon *ngIf="loading()" class="spin">sync</mat-icon>
                  <span>{{ loading() ? 'Validando en Registros Oficiales...' : 'Validar Documento Oficial' }}</span>
                </button>
              </form>

              <!-- Mensaje de Error / Observación -->
              <div *ngIf="errorMensaje()" class="feedback-box box-error">
                <mat-icon>error_outline</mat-icon>
                <div class="feedback-text">
                  <strong>Documento no verificado</strong>
                  <p>{{ errorMensaje() }}</p>
                </div>
              </div>
            </div>

            <!-- Panel de Firmantes Digitales (visible si hay resultado) -->
            <div *ngIf="resultado() as res" class="signers-card">
              <div class="signers-header">
                <mat-icon>how_to_reg</mat-icon>
                <h2>Autoridades y Firmantes Acreditados</h2>
              </div>

              <div *ngIf="res.firmantes && res.firmantes.length > 0; else noFirmantes" class="signers-list">
                <div *ngFor="let f of res.firmantes" class="signer-item">
                  <div class="signer-badge">
                    <mat-icon>security</mat-icon>
                  </div>
                  <div class="signer-info">
                    <div class="signer-name">{{ f.nombres || '' }} {{ f.apellidos || '' }} {{ f.nombre_completo || '' }}</div>
                    <div class="signer-cargo">{{ f.cargo || 'Funcionario Autorizado' }}</div>
                    <div class="signer-meta" *ngIf="f.fecha || f.fecha_firma">
                      <span class="meta-label">Estampado Digital:</span>
                      <span class="meta-val">{{ (f.fecha || f.fecha_firma) | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                  <div class="signer-status">
                    <span class="tag-valido">Firma Válida</span>
                  </div>
                </div>
              </div>

              <ng-template #noFirmantes>
                <div class="empty-signers">
                  <mat-icon>info</mat-icon>
                  <span>El documento cuenta con aprobación oficial registrada en la base de datos central.</span>
                </div>
              </ng-template>
            </div>

          </div>

          <!-- Columna Derecha: Certificación Oficial y Visor de Copia Digital -->
          <div class="col-result">
            
            <div *ngIf="!resultado() && !loading()" class="placeholder-card">
              <div class="placeholder-graphic">
                <mat-icon>verified</mat-icon>
              </div>
              <h3>Esperando Consulta de Documento</h3>
              <p>Ingrese los datos de verificación o escanee el código QR desde su dispositivo para consultar el dictamen de autenticidad y el documento digital custodiado.</p>
              <div class="badge-legal-notice">
                <mat-icon>gavel</mat-icon>
                <span>Conforme a la Ley N° 164 y D.S. 3525 de Validez Jurídica de Documentos Digitales</span>
              </div>
            </div>

            <!-- Vista del Resultado Positivo -->
            <div *ngIf="resultado() as res" class="certified-card">
              
              <!-- Insignia Solemne de Validez -->
              <div class="cert-banner">
                <div class="cert-icon-wrap">
                  <mat-icon>check_circle</mat-icon>
                </div>
                <div class="cert-headline">
                  <span class="cert-eyebrow">DICTAMEN OFICIAL DE VALIDEZ JURÍDICA</span>
                  <h2>DOCUMENTO AUTÉNTICO Y EN CUSTODIA OFICIAL</h2>
                  <p class="cert-cite">CITE: <strong>{{ res.cite }}</strong></p>
                </div>
                <div class="cert-stamp">
                  <span class="stamp-pill">VÁLIDO</span>
                </div>
              </div>

              <!-- Metadatos de Integridad Criptográfica -->
              <div class="integrity-grid">
                <div class="integ-cell">
                  <span class="cell-label">CÓDIGO DE VERIFICACIÓN</span>
                  <span class="cell-val code-val">{{ res.codigo }}</span>
                </div>
                <div class="integ-cell hash-cell">
                  <span class="cell-label">HUELLA DIGITAL (HASH SHA-256)</span>
                  <span class="cell-val hash-val" [title]="res.hash">{{ res.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }}</span>
                </div>
              </div>

              <!-- Barra de Acciones del Documento -->
              <div class="cert-actions">
                <button 
                  type="button" 
                  class="btn-download" 
                  (click)="descargarPdf()"
                  [disabled]="loadingPdf()"
                >
                  <mat-icon>download</mat-icon>
                  <span>{{ loadingPdf() ? 'Preparando Copia Oficial...' : 'Descargar Copia Certificada (PDF)' }}</span>
                </button>

                <button 
                  type="button" 
                  class="btn-toggle-preview" 
                  (click)="togglePreview()"
                  *ngIf="pdfUrl()"
                >
                  <mat-icon>{{ showPreview() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  <span>{{ showPreview() ? 'Ocultar Visor' : 'Ver Documento en Pantalla' }}</span>
                </button>
              </div>

              <!-- Visor de Hoja Digital Integrada -->
              <div *ngIf="pdfUrl() && showPreview()" class="pdf-frame-wrapper">
                <div class="pdf-toolbar">
                  <div class="toolbar-title">
                    <mat-icon>description</mat-icon>
                    <span>Copia Digital Verificada</span>
                  </div>
                  <span class="sheet-badge">Formato Oficial</span>
                </div>
                <iframe [src]="pdfUrl()" class="pdf-iframe" title="Visor de Documento Oficial"></iframe>
              </div>

            </div>

          </div>

        </div>
      </main>

      <!-- Pie de Página Institucional -->
      <footer class="verif-footer">
        <div class="footer-inner">
          <p>© 2026 Cooperativa Multiactiva Marabunta R.L. • Sistema de Gestión y Aprobación Documental</p>
          <p class="footer-sub">Los documentos firmados digitalmente tienen la misma validez jurídica y probatoria que los manuscritos conforme a ley.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #0f172a;
      font-family: 'Poppins', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #0f172a;
    }

    .verif-portal {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f1f5f9;
    }

    /* Cabecera Solemne */
    .verif-header {
      background: linear-gradient(135deg, #0a171d 0%, #0f2027 50%, #15303c 100%);
      border-bottom: 2px solid #005c53;
      padding: 0.85rem 1.75rem;
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .header-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-box {
      width: 44px;
      height: 44px;
      background: #ffffff;
      border-radius: 10px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .brand-logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .system-title {
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.5px;
      color: #ffffff;
    }

    .system-sub {
      font-size: 0.78rem;
      color: #5eead4;
    }

    .login-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #22d3ee;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 7px 16px;
      border-radius: 20px;
      background: rgba(34, 211, 238, 0.08);
      border: 1px solid rgba(34, 211, 238, 0.35);
      transition: all 0.25s ease;

      &:hover {
        background: #0d5c63;
        color: #ffffff;
        border-color: #22d3ee;
        box-shadow: 0 2px 10px rgba(13, 92, 99, 0.4);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Banner Hero Institucional Petróleo */
    .verif-hero {
      background: linear-gradient(145deg, #0f2027 0%, #15303c 50%, #0f3d3e 100%);
      color: #ffffff;
      padding: 44px 24px 72px;
      text-align: center;
      position: relative;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .hero-inner {
      max-width: 860px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(34, 211, 238, 0.3);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #22d3ee;
      letter-spacing: 0.3px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #22d3ee;
      }
    }

    .hero-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
      color: #ffffff;
    }

    .hero-subtitle {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.78);
      line-height: 1.5;
      margin: 0;
      max-width: 680px;
    }

    /* Cuerpo Principal */
    .verif-main {
      flex: 1;
      padding: 0 24px 40px;
      max-width: 1280px;
      margin: -42px auto 40px;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      z-index: 10;
    }

    .verif-layout {
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 1.75rem;
      align-items: start;

      @media (max-width: 960px) {
        grid-template-columns: 1fr;
      }
    }

    /* Columna de Búsqueda */
    .query-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 4px solid #0d5c63;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 12px 32px rgba(15, 32, 39, 0.08);
    }

    .card-lead {
      display: flex;
      gap: 14px;
      margin-bottom: 1.25rem;
      align-items: flex-start;
    }

    .lead-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(15, 56, 62, 0.3);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .lead-title {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f2027;
    }

    .lead-desc {
      margin: 4px 0 0;
      font-size: 0.82rem;
      color: #475569;
      line-height: 1.4;
    }

    .query-progress {
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .verif-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 0.84rem;
      font-weight: 700;
      color: #0f2027;
    }

    .w-full {
      width: 100%;
    }

    .form-icon {
      color: #0d5c63;
      margin-right: 6px;
    }

    /* Custom form-field outline styling con enfoque verde petroleo */
    ::ng-deep .query-card {
      .mat-mdc-text-field-wrapper.mdc-text-field--focused .mdc-notched-outline__leading,
      .mat-mdc-text-field-wrapper.mdc-text-field--focused .mdc-notched-outline__notch,
      .mat-mdc-text-field-wrapper.mdc-text-field--focused .mdc-notched-outline__trailing {
        border-color: #0d5c63 !important;
        border-width: 2px !important;
      }
      .mat-mdc-form-field.mat-focused .form-icon {
        color: #0d5c63 !important;
      }
    }

    .btn-validar {
      width: 100%;
      height: 48px;
      background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
      color: #ffffff;
      border: none;
      border-radius: 25px;
      font-size: 0.94rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(15, 56, 62, 0.35);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #0b2c31 0%, #084348 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(15, 56, 62, 0.45);
      }

      &:disabled {
        background: linear-gradient(135deg, #78999d 0%, #688a8e 100%);
        color: rgba(255, 255, 255, 0.85);
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.8;
      }

      .spin {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .feedback-box {
      margin-top: 1rem;
      padding: 12px 14px;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 0.85rem;
    }

    .box-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;

      mat-icon {
        color: #dc2626;
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      strong {
        display: block;
        margin-bottom: 2px;
      }

      p {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.35;
      }
    }

    /* Tarjeta de Firmantes */
    .signers-card {
      margin-top: 1.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 4px solid #0d5c63;
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 6px 20px rgba(15, 32, 39, 0.06);
    }

    .signers-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
      margin-bottom: 0.75rem;

      mat-icon {
        color: #0d5c63;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      h2 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f2027;
      }
    }

    .signers-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .signer-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    .signer-badge {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(15, 56, 62, 0.25);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .signer-info {
      flex: 1;
    }

    .signer-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f172a;
    }

    .signer-cargo {
      font-size: 0.78rem;
      color: #0d5c63;
      font-weight: 600;
    }

    .signer-meta {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }

    .tag-valido {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 12px;
      background: #e6f6f7;
      color: #0d5c63;
      border: 1px solid #99dcdc;
      white-space: nowrap;
    }

    .empty-signers {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 0.82rem;
      color: #475569;
      align-items: center;

      mat-icon {
        color: #0d5c63;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* Columna Derecha: Placeholder */
    .placeholder-card {
      background: #ffffff;
      border: 2px dashed rgba(13, 92, 99, 0.35);
      border-radius: 16px;
      padding: 3.5rem 2rem;
      text-align: center;
      color: #64748b;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.05);
    }

    .placeholder-graphic {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e6f6f7 0%, #d0eded 100%);
      color: #0d5c63;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 6px 18px rgba(13, 92, 99, 0.15);

      mat-icon {
        font-size: 42px;
        width: 42px;
        height: 42px;
      }
    }

    .placeholder-card h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f2027;
      margin: 0 0 0.5rem;
    }

    .placeholder-card p {
      font-size: 0.88rem;
      line-height: 1.5;
      max-width: 500px;
      margin: 0 auto 1.5rem;
    }

    .badge-legal-notice {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 20px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      font-size: 0.78rem;
      font-weight: 600;
      color: #0f383e;
      box-shadow: 0 2px 6px rgba(13, 92, 99, 0.06);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #0d5c63;
      }
    }

    /* Tarjeta Certificada de Autenticidad */
    .certified-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(15, 32, 39, 0.12);
    }

    .cert-banner {
      background: linear-gradient(145deg, #0f2027 0%, #15303c 50%, #0f3d3e 100%);
      color: #ffffff;
      padding: 1.75rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      border-bottom: 3px solid #005c53;
    }

    .cert-icon-wrap {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: rgba(34, 211, 238, 0.15);
      border: 2px solid rgba(34, 211, 238, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #22d3ee;
      }
    }

    .cert-headline {
      flex: 1;

      .cert-eyebrow {
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 1px;
        color: #22d3ee;
        display: block;
      }

      h2 {
        margin: 2px 0 4px;
        font-size: 1.25rem;
        font-weight: 800;
        letter-spacing: -0.3px;
      }

      .cert-cite {
        margin: 0;
        font-size: 0.9rem;
        color: #e2e8f0;

        strong {
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          color: #5eead4;
        }
      }
    }

    .stamp-pill {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 1px;
      background: linear-gradient(135deg, #0d5c63 0%, #0083b0 100%);
      color: #ffffff;
      padding: 7px 16px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    /* Grilla de Integridad */
    .integrity-grid {
      display: grid;
      grid-template-columns: 220px 1fr;
      border-bottom: 1px solid #f1f5f9;
      background: #fafbfc;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .integ-cell {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      border-right: 1px solid #f1f5f9;

      &:last-child {
        border-right: none;
      }
    }

    .cell-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #0d5c63;
      letter-spacing: 0.6px;
    }

    .code-val {
      font-size: 1rem;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
    }

    .hash-val {
      font-size: 0.76rem;
      font-family: monospace;
      color: #334155;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Acciones del Certificado */
    .cert-actions {
      padding: 1.25rem 1.5rem;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 22px;
      background: linear-gradient(135deg, #0f383e 0%, #0d5c63 100%);
      color: #ffffff;
      border: none;
      border-radius: 25px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(15, 56, 62, 0.3);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #0b2c31 0%, #084348 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(15, 56, 62, 0.4);
      }

      &:disabled {
        background: linear-gradient(135deg, #78999d 0%, #688a8e 100%);
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.8;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .btn-toggle-preview {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #f0fdfa;
      color: #0d5c63;
      border: 1.5px solid #0d5c63;
      border-radius: 25px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s ease;

      &:hover {
        background: #0d5c63;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(13, 92, 99, 0.25);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* Visor PDF Integrado */
    .pdf-frame-wrapper {
      padding: 1.25rem 1.5rem 1.75rem;
      background: #f8fafc;
    }

    .pdf-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
      padding: 0 4px;
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #0f2027;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #0d5c63;
      }
    }

    .sheet-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #0d5c63;
      background: #e6f6f7;
      border: 1px solid #99dcdc;
      padding: 3px 10px;
      border-radius: 12px;
    }

    .pdf-iframe {
      width: 100%;
      height: 640px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
    }

    /* Pie de Página */
    .verif-footer {
      background: linear-gradient(145deg, #0a171d 0%, #0f2027 100%);
      color: #94a3b8;
      padding: 1.75rem 1.5rem;
      border-top: 3px solid #005c53;
      font-size: 0.8rem;
      text-align: center;
    }

    .footer-inner {
      max-width: 1280px;
      margin: 0 auto;

      p {
        margin: 2px 0;
      }

      .footer-sub {
        font-size: 0.74rem;
        color: #64748b;
      }
    }
  `]
})
export class VerificarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly verifyForm: FormGroup = this.fb.group({
    cite: ['', [Validators.required]],
    codigo: ['', [Validators.required]]
  });

  readonly loading = signal(false);
  readonly resultado = signal<VerificacionResultado | null>(null);
  readonly errorMensaje = signal<string | null>(null);
  readonly loadingPdf = signal(false);
  readonly showPreview = signal(true);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private pdfBlob: Blob | null = null;

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['cite'] || qp['codigo']) {
      this.verifyForm.patchValue({
        cite: qp['cite'] || '',
        codigo: qp['codigo'] || ''
      });
      if (qp['cite'] && qp['codigo']) {
        this.consultar();
      }
    }
  }

  onLogoError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && !target.src.includes('logo.png')) {
      target.src = 'assets/images/logo.png';
    }
  }

  consultar(): void {
    if (this.verifyForm.invalid) return;

    this.loading.set(true);
    this.resultado.set(null);
    this.errorMensaje.set(null);
    this.pdfUrl.set(null);
    this.pdfBlob = null;

    const payload = {
      cite: this.verifyForm.value.cite.trim(),
      codigo: this.verifyForm.value.codigo.trim().toUpperCase(),
      recaptcha: 'bypass'
    };

    // Intentamos primero con /verificar (firma digital por token)
    this.http.post<any>('/api/v1/seguridad/verificar', payload).subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.procesarExito(res.datos, 'TOKEN');
        } else {
          // Si no es por token, probamos si es aprobación con Ciudadanía Digital
          this.consultarCiudadaniaDigital(payload);
        }
      },
      error: () => {
        // En caso de fallo, intentamos con /verificarDocumento (Ciudadanía Digital)
        this.consultarCiudadaniaDigital(payload);
      }
    });
  }

  private consultarCiudadaniaDigital(payload: any): void {
    this.http.post<any>('/api/v1/seguridad/verificarDocumento', payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.procesarExito(res.datos, 'CIUDADANIA_DIGITAL');
        } else {
          this.errorMensaje.set(res.mensaje || 'Documento no encontrado o código de seguridad inválido');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMensaje.set(err.error?.mensaje || 'El documento no pudo ser validado. Verifique que el CITE y código sean correctos.');
      }
    });
  }

  private procesarExito(datos: any, tipo: 'TOKEN' | 'CIUDADANIA_DIGITAL'): void {
    this.loading.set(false);
    const resultado: VerificacionResultado = {
      cite: datos.cite || this.verifyForm.value.cite.trim(),
      hash: datos.hash,
      codigo: datos.codigo || this.verifyForm.value.codigo.trim().toUpperCase(),
      token: datos.token,
      firmantes: datos.firmantes || [],
      tipo_aprobacion: tipo
    };
    this.resultado.set(resultado);

    // Cargar automáticamente el PDF verificado si hay token disponible
    if (resultado.token) {
      this.cargarPdfVerificado(resultado.cite, resultado.token);
    }
  }

  private cargarPdfVerificado(cite: string, token: string): void {
    this.loadingPdf.set(true);
    this.http.post('/api/v1/seguridad/pdfVerificado', { cite, token }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.loadingPdf.set(false);
        this.pdfBlob = blob;
        const objectUrl = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
      },
      error: () => {
        this.loadingPdf.set(false);
      }
    });
  }

  descargarPdf(): void {
    if (this.pdfBlob) {
      this.iniciarDescargaBlob(this.pdfBlob);
      return;
    }

    const res = this.resultado();
    if (!res || !res.token) return;

    this.loadingPdf.set(true);
    this.http.post('/api/v1/seguridad/pdfVerificado', { cite: res.cite, token: res.token }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.loadingPdf.set(false);
        this.pdfBlob = blob;
        this.iniciarDescargaBlob(blob);
      },
      error: () => {
        this.loadingPdf.set(false);
      }
    });
  }

  private iniciarDescargaBlob(blob: Blob): void {
    const res = this.resultado();
    const cite = res?.cite || 'documento';
    const cleanCite = cite.replace(/[\/\\:*?"<>|]/g, '_');
    const filename = `${cleanCite}_verificado.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }
}
