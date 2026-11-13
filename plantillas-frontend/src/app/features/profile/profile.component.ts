import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';

interface AlertasConfig {
  canal: string;
  celular: string;
  canal_habilitado: boolean;
  enviado: boolean;
  observado: boolean;
  derivado: boolean;
  aprobar_ciudadania: boolean;
  aprobados_ciudadania: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `
    <div class="profile-container">
      <!-- Portada Esmeralda Contemporánea (Sin consumo de assets externos) -->
      <div class="profile-cover-banner">
        <div class="cover-pattern-overlay"></div>
      </div>

      <!-- Tarjeta Principal de Identidad del Perfil -->
      <div class="profile-main-card">
        <div class="profile-header-strip">
          <div class="profile-avatar-wrapper">
            <div class="profile-avatar-circle">
              <img 
                *ngIf="user()?.foto" 
                [src]="user()?.foto" 
                alt="Foto de perfil" 
                class="photo-img"
              >
              <span *ngIf="!user()?.foto" class="photo-initial">
                {{ userInitial() }}
              </span>

              <!-- Botón cambiar foto -->
              <button 
                type="button" 
                class="btn-camera-pill" 
                (click)="fileInput.click()" 
                title="Actualizar foto de perfil"
              >
                <mat-icon>photo_camera</mat-icon>
              </button>
              <input 
                #fileInput 
                type="file" 
                accept="image/*" 
                (change)="onFotoSeleccionada($event)" 
                style="display: none;"
              >
            </div>
            <span class="avatar-online-indicator" title="Sesión activa"></span>
          </div>

          <div class="profile-identity-details">
            <div class="name-badge-row">
              <h1 class="user-display-name">{{ userFullName() }}</h1>
              <span class="user-cargo-pill">{{ user()?.cargo || 'Personal institucional' }}</span>
            </div>
            <p class="user-email-text">{{ user()?.email || 'docs@marabuntarl.com' }}</p>
          </div>

          <div class="profile-header-actions">
            <button *ngIf="!editandoAlertas()" type="button" class="emerald24-primary-pill" (click)="abrirEditarAlertas()">
              <mat-icon>notifications_active</mat-icon>
              <span>Editar Alertas</span>
            </button>
          </div>
        </div>

        <!-- CUERPO DEL PERFIL: VISTA DE DETALLE NORMAL -->
        <div class="profile-content-area" *ngIf="!editandoAlertas()">
          <div class="profile-sections-grid">
            
            <!-- TARJETA 1: INFORMACIÓN INSTITUCIONAL -->
            <div class="profile-info-card">
              <div class="card-header-line">
                <mat-icon class="section-icon">badge</mat-icon>
                <h3 class="section-title">Información Institucional</h3>
              </div>

              <div class="data-tiles-grid">
                <div class="data-tile">
                  <span class="tile-label">Nombre de usuario</span>
                  <strong class="tile-value">{{ user()?.username || '-' }}</strong>
                </div>

                <div class="data-tile">
                  <span class="tile-label">Nro. documento de identidad</span>
                  <strong class="tile-value">{{ user()?.doc || '-' }}</strong>
                </div>

                <div class="data-tile">
                  <span class="tile-label">Nombre(s)</span>
                  <strong class="tile-value">{{ user()?.first_name || '-' }}</strong>
                </div>

                <div class="data-tile">
                  <span class="tile-label">Apellido(s)</span>
                  <strong class="tile-value">{{ user()?.last_name || '-' }}</strong>
                </div>

                <div class="data-tile full-width">
                  <span class="tile-label">Correo electrónico</span>
                  <strong class="tile-value">{{ user()?.email || '-' }}</strong>
                </div>

                <div class="data-tile full-width">
                  <span class="tile-label">Activo en el sistema desde</span>
                  <strong class="tile-value">{{ fechaFormateada() }}</strong>
                </div>
              </div>
            </div>

            <!-- TARJETA 2: ESTADO DE NOTIFICACIONES Y ALERTAS -->
            <div class="profile-info-card">
              <div class="card-header-line">
                <mat-icon class="section-icon">mark_email_read</mat-icon>
                <h3 class="section-title">Preferencias de Notificación</h3>
              </div>

              <div class="notification-summary-box">
                <div class="notif-status-badge" [class.is-active]="alertas.canal_habilitado">
                  <mat-icon>{{ alertas.canal_habilitado ? 'check_circle' : 'notifications_off' }}</mat-icon>
                  <span>{{ alertas.canal_habilitado ? 'Notificaciones Habilitadas' : 'Notificaciones Inactivas' }}</span>
                </div>

                <div class="notif-detail-row">
                  <span class="detail-label">Canal configurado:</span>
                  <strong class="detail-val">
                    {{ alertas.canal === 'CORREO_WHATSAPP' ? 'Correo Electrónico y WhatsApp' : (alertas.canal === 'WHATSAPP' ? 'Solo WhatsApp' : 'Correo Electrónico') }}
                  </strong>
                </div>

                <div class="notif-detail-row" *ngIf="alertas.celular">
                  <span class="detail-label">Celular WhatsApp:</span>
                  <strong class="detail-val">{{ alertas.celular }}</strong>
                </div>

                <div class="notif-tags-list">
                  <span class="notif-pill" *ngIf="alertas.enviado">Me envíen</span>
                  <span class="notif-pill" *ngIf="alertas.observado">Me observen</span>
                  <span class="notif-pill" *ngIf="alertas.derivado">Me deriven</span>
                  <span class="notif-pill" *ngIf="alertas.aprobar_ciudadania">Aprobar con CD</span>
                  <span class="notif-pill" *ngIf="alertas.aprobados_ciudadania">Aprobados con CD</span>
                </div>

                <button type="button" class="btn-config-alerts-link" (click)="abrirEditarAlertas()">
                  <span>Modificar configuración de alertas</span>
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- CUERPO DEL PERFIL: VISTA DE EDICIÓN DE ALERTAS -->
        <div class="profile-edit-wrapper" *ngIf="editandoAlertas()">
          <div class="edit-card-box">
            <div class="edit-header-bar">
              <div>
                <h2 class="edit-box-title">Configuración de Alertas y Notificaciones</h2>
                <p class="edit-box-sub">Selecciona los canales y eventos para recibir avisos de tus trámites</p>
              </div>
            </div>

            <div class="channel-toggle-row">
              <mat-checkbox [(ngModel)]="alertas.canal_habilitado" color="primary">
                Habilitar notificaciones activas
              </mat-checkbox>
            </div>

            <div class="form-section-block">
              <label class="block-label">Recibir notificaciones vía:</label>
              <mat-radio-group [(ngModel)]="alertas.canal" [disabled]="!alertas.canal_habilitado" color="primary" class="canal-radio-group">
                <mat-radio-button value="CORREO">Solo Correo Electrónico</mat-radio-button>
                <mat-radio-button value="WHATSAPP">Solo WhatsApp</mat-radio-button>
                <mat-radio-button value="CORREO_WHATSAPP">Ambos (Correo y WhatsApp)</mat-radio-button>
              </mat-radio-group>
            </div>

            <div class="email-field-box" *ngIf="alertas.canal === 'CORREO' || alertas.canal === 'CORREO_WHATSAPP'">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Correo electrónico</mat-label>
                <input matInput [value]="user()?.email || 'docs@marabuntarl.com'" disabled>
              </mat-form-field>
            </div>

            <div class="email-field-box" *ngIf="alertas.canal === 'WHATSAPP' || alertas.canal === 'CORREO_WHATSAPP'">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Número de WhatsApp (Ej: 77777777 o 59177777777)</mat-label>
                <input matInput [(ngModel)]="alertas.celular" [disabled]="!alertas.canal_habilitado" placeholder="Ej: 77777777">
              </mat-form-field>
            </div>

            <div class="form-section-block">
              <label class="block-label">Eventos de documentos que activan alertas:</label>
              <div class="checkboxes-grid">
                <mat-checkbox [(ngModel)]="alertas.enviado" [disabled]="!alertas.canal_habilitado" color="primary">
                  Me envíen
                </mat-checkbox>
                <mat-checkbox [(ngModel)]="alertas.observado" [disabled]="!alertas.canal_habilitado" color="primary">
                  Me observen
                </mat-checkbox>
                <mat-checkbox [(ngModel)]="alertas.derivado" [disabled]="!alertas.canal_habilitado" color="primary">
                  Me deriven
                </mat-checkbox>
                <mat-checkbox [(ngModel)]="alertas.aprobar_ciudadania" [disabled]="!alertas.canal_habilitado" color="primary">
                  Deba aprobar con CD
                </mat-checkbox>
                <mat-checkbox [(ngModel)]="alertas.aprobados_ciudadania" [disabled]="!alertas.canal_habilitado" color="primary">
                  Han sido aprobados con CD
                </mat-checkbox>
              </div>
            </div>

            <div class="edit-bottom-buttons">
              <button type="button" class="emerald24-primary-pill" (click)="guardarAlertas()">
                <mat-icon>check</mat-icon>
                <span>Guardar cambios</span>
              </button>
              <button type="button" class="emerald24-secondary-pill" (click)="cancelarEditarAlertas()">
                <mat-icon>close</mat-icon>
                <span>Cancelar</span>
              </button>
            </div>

            <!-- PANEL DE VINCULACIÓN Y GRUPO INSTITUCIONAL DE WHATSAPP (EVOLUTION API) -->
            <div class="wa-admin-panel" *ngIf="esAdminOMae()">
              <div class="wa-panel-header">
                <div>
                  <h4 class="wa-panel-title">📱 Instancia Corporativa WhatsApp ({{ waInstancia() }})</h4>
                  <p class="wa-panel-desc">Difusión de Convocatorias, Circulares y Documentos Globales al Grupo Institucional</p>
                </div>
                <span class="wa-status-pill" [class.wa-open]="waEstado() === 'open'">
                  {{ waEstado() === 'open' ? '● Conectado' : '⏳ Pendiente de vincular QR' }}
                </span>
              </div>

              <div class="wa-action-buttons">
                <button type="button" class="emerald24-secondary-pill" (click)="obtenerQrWhatsApp()" [disabled]="cargandoWa()">
                  <mat-icon>qr_code_2</mat-icon>
                  <span>{{ waQrBase64() ? 'Actualizar QR' : 'Ver QR de Vinculación' }}</span>
                </button>
                <button type="button" class="emerald24-secondary-pill" (click)="cargarGruposWhatsApp()" [disabled]="cargandoWa()">
                  <mat-icon>groups</mat-icon>
                  <span>Cargar Grupos</span>
                </button>
                <button type="button" class="emerald24-secondary-pill" (click)="probarEnvioWhatsApp()" [disabled]="cargandoWa()">
                  <mat-icon>send</mat-icon>
                  <span>Enviar Prueba</span>
                </button>
              </div>

              <!-- Imagen QR si está generada -->
              <div *ngIf="waQrBase64()" class="wa-qr-box">
                <p class="wa-qr-instructions">
                  Escanee desde su celular: WhatsApp > Dispositivos vinculados > Vincular un dispositivo
                </p>
                <img [src]="waQrBase64()" alt="QR WhatsApp" class="wa-qr-image">
              </div>

              <!-- Selector de Grupo Institucional (@g.us) -->
              <div class="wa-group-select-section">
                <mat-form-field appearance="outline" class="w-full" *ngIf="waGrupos().length > 0">
                  <mat-label>Seleccionar Grupo Institucional de WhatsApp</mat-label>
                  <mat-select [(ngModel)]="waGrupoSeleccionadoId" (selectionChange)="onSeleccionarGrupoWa($event.value)">
                    <mat-option *ngFor="let g of waGrupos()" [value]="g.id">
                      {{ g.subject || g.name || g.id }} ({{ g.id }})
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>ID del Grupo Institucional (&#64;g.us) para Difusión Global</mat-label>
                  <input matInput [(ngModel)]="waGrupoSeleccionadoId" placeholder="Ej: 120363284910293847&#64;g.us">
                  <mat-hint>Cuando PARA = A TODO EL PERSONAL, el aviso de WhatsApp se enviará únicamente a este grupo</mat-hint>
                </mat-form-field>

                <div>
                  <button type="button" class="emerald24-primary-pill" (click)="guardarGrupoWhatsApp()" [disabled]="cargandoWa()">
                    <mat-icon>save</mat-icon>
                    <span>Guardar Grupo Institucional</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      width: 100%;
      min-height: calc(100vh - 100px);
      background: transparent;
      font-family: var(--font-ui, system-ui, -apple-system, sans-serif);
    }

    /* PORTADA ESMERALDA MODERNA (SIN ASSETS) */
    .profile-cover-banner {
      height: 160px;
      width: 100%;
      background: linear-gradient(135deg, #022c1e 0%, #064e3b 45%, #059669 80%, #10b981 100%);
      border-radius: 24px 24px 0 0;
      position: relative;
      overflow: hidden;
    }

    .cover-pattern-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 85% 20%, rgba(52, 211, 153, 0.35) 0%, transparent 50%);
      pointer-events: none;
    }

    /* TARJETA PRINCIPAL BLANCA */
    .profile-main-card {
      background: #ffffff;
      border-radius: 0 0 24px 24px;
      padding: 0 32px 36px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
    }

    .profile-header-strip {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }

    .profile-avatar-wrapper {
      position: relative;
      margin-top: -48px;
    }

    .profile-avatar-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: #043324;
      border: 4px solid #ffffff;
      box-shadow: 0 8px 24px rgba(4, 51, 36, 0.22);
      color: #34d399;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .photo-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .photo-initial {
      font-size: 2.4rem;
      font-weight: 800;
      line-height: 1;
      color: #34d399;
    }

    .btn-camera-pill {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #111827;
      border: 2px solid #ffffff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease, background 0.15s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        transform: scale(1.08);
        background: #059669;
      }
    }

    .avatar-online-indicator {
      position: absolute;
      bottom: 4px;
      left: 74px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    }

    .profile-identity-details {
      flex: 1;
      min-width: 240px;
      margin-top: 10px;
    }

    .name-badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .user-display-name {
      margin: 0;
      font-size: 1.55rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
    }

    .user-cargo-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 12px;
      border-radius: 9999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .user-email-text {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.88rem;
    }

    .profile-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* SECCIONES DE DETALLES */
    .profile-content-area {
      padding-top: 28px;
    }

    .profile-sections-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 960px) {
      .profile-sections-grid {
        grid-template-columns: 1fr;
      }
    }

    .profile-info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }

    .card-header-line {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;

      .section-icon {
        color: #059669;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .section-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
      }
    }

    .data-tiles-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .data-tile {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 3px;

      &.full-width {
        grid-column: 1 / -1;
      }

      .tile-label {
        font-size: 0.74rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .tile-value {
        font-size: 0.92rem;
        font-weight: 700;
        color: #0f172a;
        word-break: break-word;
      }
    }

    /* RESUMEN DE NOTIFICACIONES */
    .notification-summary-box {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .notif-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.85rem;
      font-weight: 700;
      width: fit-content;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.is-active {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        mat-icon {
          color: #059669;
        }
      }
    }

    .notif-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;

      .detail-label {
        color: #64748b;
      }
      .detail-val {
        color: #0f172a;
        font-weight: 700;
      }
    }

    .notif-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 0;
    }

    .notif-pill {
      font-size: 0.74rem;
      padding: 3px 10px;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }

    .btn-config-alerts-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      color: #059669;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      padding: 4px 0;
      font-family: inherit;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        transition: transform 0.15s ease;
      }

      &:hover {
        color: #047857;
        text-decoration: underline;
        mat-icon {
          transform: translateX(3px);
        }
      }
    }

    /* EDICIÓN DE ALERTAS */
    .profile-edit-wrapper {
      padding-top: 28px;
    }

    .edit-card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 28px;
      max-width: 800px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
    }

    .edit-header-bar {
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }

    .edit-box-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }

    .edit-box-sub {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.85rem;
    }

    .channel-toggle-row {
      margin-bottom: 18px;
    }

    .form-section-block {
      margin-bottom: 18px;
    }

    .block-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
    }

    .canal-radio-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .email-field-box {
      max-width: 440px;
      margin-bottom: 14px;
    }

    .checkboxes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
    }

    .edit-bottom-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }

    /* WHATSAPP CORPORATIVO */
    .wa-admin-panel {
      margin-top: 28px;
      padding: 22px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #f8fafc;
    }

    .wa-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .wa-panel-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .wa-panel-desc {
      margin: 2px 0 0;
      font-size: 0.80rem;
      color: #64748b;
    }

    .wa-status-pill {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;

      &.wa-open {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
    }

    .wa-action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }

    .wa-qr-box {
      text-align: center;
      padding: 16px;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      margin-bottom: 16px;
    }

    .wa-qr-instructions {
      margin: 0 0 10px;
      font-size: 0.84rem;
      color: #334155;
      font-weight: 600;
    }

    .wa-qr-image {
      width: 220px;
      height: 220px;
      object-fit: contain;
      border-radius: 8px;
    }

    .wa-group-select-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .w-full {
      width: 100%;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authService.currentUser;
  readonly editandoAlertas = signal(false);
  readonly idConfNotificacion = signal<number | null>(null);
  readonly waInstancia = signal<string>('marabunta');
  readonly waEstado = signal<string>('close');
  readonly waQrBase64 = signal<string | null>(null);
  readonly waGrupos = signal<any[]>([]);
  readonly cargandoWa = signal<boolean>(false);
  waGrupoSeleccionadoId = '';
  waGrupoSeleccionadoNombre = '';

  readonly alertas: AlertasConfig = {
    canal: 'CORREO',
    celular: '',
    canal_habilitado: true,
    enviado: true,
    observado: true,
    derivado: true,
    aprobar_ciudadania: false,
    aprobados_ciudadania: false
  };

  readonly userInitial = computed(() => {
    const u = this.user();
    if (!u) return 'S';
    return (u.first_name?.[0] || u.username?.[0] || 'S').toUpperCase();
  });

  readonly userFullName = computed(() => {
    const u = this.user();
    if (!u) return 'system default';
    if (u.first_name || u.last_name) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim();
    }
    return u.username || 'system default';
  });

  readonly fechaFormateada = computed(() => {
    const u = this.user();
    return this.formatearFechaLiteral(u?.date_joined);
  });

  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario(): void {
    const u = this.user();
    if (u?.id) {
      this.http.get<any>(`/api/v1/seguridad/usuario/${u.id}`).subscribe({
        next: (res) => {
          if (res?.datos) {
            const d = res.datos;
            const updated = {
              ...u,
              first_name: d.nombres || u.first_name,
              last_name: `${d.apellido_paterno || ''} ${d.apellido_materno || ''}`.trim() || u.last_name,
              doc: d.numero_documento || u.doc,
              email: d.email || u.email,
              date_joined: d._fecha_creacion || u.date_joined,
              foto: d.foto || u.foto || null
            };
            this.authService.currentUser.set(updated);
            localStorage.setItem('user', JSON.stringify(updated));

            // Sincronizar automáticamente hacia el backend si ya existía localmente
            if (!d.foto && u.foto) {
              this.http.put<any>(`/api/v1/seguridad/usuario/${u.id}`, { foto: u.foto }).subscribe({
                next: () => {},
                error: () => {}
              });
            }
          }
        },
        error: () => {}
      });

      // Cargar configuración de notificaciones del usuario
      this.http.get<any>(`/api/v1/notificacion/conf_notificacion?fid_usuario=${u.id}`).subscribe({
        next: (res) => {
          const item = res?.datos?.resultado?.[0];
          if (item) {
            this.idConfNotificacion.set(item.id_conf_notificacion);
            this.alertas.canal = item.canal || 'CORREO';
            this.alertas.celular = item.celular || '';
            this.alertas.canal_habilitado = item.canal_habilitado ?? true;
            this.alertas.enviado = item.enviado ?? true;
            this.alertas.observado = item.observado ?? true;
            this.alertas.derivado = item.derivado ?? true;
            this.alertas.aprobar_ciudadania = item.aprobar_ciudadania ?? false;
            this.alertas.aprobados_ciudadania = item.aprobados_ciudadania ?? false;
          }
        },
        error: () => {}
      });
    }
  }

  abrirEditarAlertas(): void {
    this.editandoAlertas.set(true);
    if (this.esAdminOMae()) {
      this.consultarEstadoWhatsApp();
    }
  }

  esAdminOMae(): boolean {
    const u: any = this.user() || {};
    return !!u.es_mae || this.authService.isMae() || this.authService.hasRole('ADMIN') || u.username === 'sys_default';
  }

  consultarEstadoWhatsApp(): void {
    this.http.get<any>('/api/v1/notificacion/whatsapp/estado').subscribe({
      next: (res) => {
        if (res?.datos) {
          this.waInstancia.set(res.datos.instancia || 'marabunta');
          this.waEstado.set(res.datos.estado || 'close');
          if (res.datos.grupoId) {
            this.waGrupoSeleccionadoId = res.datos.grupoId;
          }
          if (res.datos.grupoNombre) {
            this.waGrupoSeleccionadoNombre = res.datos.grupoNombre;
          }
          if (res.datos.estado === 'open') {
            this.waQrBase64.set(null);
            this.cargarGruposWhatsApp();
          }
        }
      },
      error: () => {}
    });
  }

  obtenerQrWhatsApp(): void {
    this.cargandoWa.set(true);
    this.http.get<any>('/api/v1/notificacion/whatsapp/qr').subscribe({
      next: (res) => {
        this.cargandoWa.set(false);
        const b64 = res?.datos?.base64 || res?.datos?.qrcode?.base64 || null;
        if (b64) {
          this.waQrBase64.set(b64);
          this.snackBar.open('Código QR generado. Escanéelo desde su WhatsApp.', 'Aceptar', { duration: 4000 });
        } else {
          this.consultarEstadoWhatsApp();
          this.snackBar.open('La instancia ya está conectada o en proceso de sincronización.', 'Aceptar', { duration: 3500 });
        }
      },
      error: (err) => {
        this.cargandoWa.set(false);
        this.snackBar.open(err.error?.mensaje || 'No se pudo obtener el código QR', 'Cerrar', { duration: 3500 });
      }
    });
  }

  cargarGruposWhatsApp(): void {
    this.cargandoWa.set(true);
    this.http.get<any>('/api/v1/notificacion/whatsapp/grupos').subscribe({
      next: (res) => {
        this.cargandoWa.set(false);
        const lista = res?.datos?.grupos || [];
        this.waGrupos.set(lista);
        if (res?.datos?.grupoId && !this.waGrupoSeleccionadoId) {
          this.waGrupoSeleccionadoId = res.datos.grupoId;
        }
        if (lista.length > 0) {
          this.waEstado.set('open');
          this.waQrBase64.set(null);
          this.snackBar.open(`Se encontraron ${lista.length} grupo(s) en la cuenta vinculada.`, 'Aceptar', { duration: 3000 });
        } else {
          this.snackBar.open('No se encontraron grupos o falta vincular el QR.', 'Cerrar', { duration: 3500 });
        }
      },
      error: () => {
        this.cargandoWa.set(false);
      }
    });
  }

  onSeleccionarGrupoWa(idGrupo: string): void {
    const g = this.waGrupos().find(x => x.id === idGrupo);
    if (g) {
      this.waGrupoSeleccionadoNombre = g.subject || g.name || '';
    }
  }

  guardarGrupoWhatsApp(): void {
    this.cargandoWa.set(true);
    this.http.post<any>('/api/v1/notificacion/whatsapp/grupo', {
      grupoId: this.waGrupoSeleccionadoId,
      grupoNombre: this.waGrupoSeleccionadoNombre
    }).subscribe({
      next: () => {
        this.cargandoWa.set(false);
        this.snackBar.open('Grupo Institucional de WhatsApp guardado exitosamente', 'Aceptar', { duration: 3500 });
      },
      error: (err) => {
        this.cargandoWa.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al guardar el grupo de WhatsApp', 'Cerrar', { duration: 3500 });
      }
    });
  }

  probarEnvioWhatsApp(): void {
    const destino = this.alertas.celular || this.waGrupoSeleccionadoId;
    if (!destino) {
      this.snackBar.open('Ingrese su número de WhatsApp o seleccione el Grupo Institucional para enviar la prueba.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.cargandoWa.set(true);
    this.http.post<any>('/api/v1/notificacion/whatsapp/probar', { destino }).subscribe({
      next: (res) => {
        this.cargandoWa.set(false);
        this.snackBar.open(res.mensaje || 'Mensaje de prueba enviado con éxito por WhatsApp', 'Aceptar', { duration: 4000 });
      },
      error: (err) => {
        this.cargandoWa.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al enviar mensaje de prueba (verifique que el QR esté vinculado)', 'Cerrar', { duration: 4500 });
      }
    });
  }

  cancelarEditarAlertas(): void {
    this.editandoAlertas.set(false);
  }

  guardarAlertas(): void {
    const id = this.idConfNotificacion();
    const payload = {
      id_conf_notificacion: id,
      canal: this.alertas.canal || 'CORREO',
      celular: this.alertas.celular || '',
      canal_habilitado: this.alertas.canal_habilitado,
      enviado: this.alertas.enviado,
      observado: this.alertas.observado,
      derivado: this.alertas.derivado,
      aprobar_ciudadania: this.alertas.aprobar_ciudadania,
      aprobados_ciudadania: this.alertas.aprobados_ciudadania
    };

    if (id) {
      this.http.put<any>(`/api/v1/notificacion/conf_notificacion/${id}`, payload).subscribe({
        next: () => {
          this.snackBar.open('Configuración de alertas actualizada exitosamente', 'Cerrar', {
            duration: 3500,
            panelClass: ['snackbar-success']
          });
          this.editandoAlertas.set(false);
        },
        error: (err) => {
          this.snackBar.open(err.error?.mensaje || 'Error al actualizar configuración de alertas', 'Cerrar', { duration: 3500 });
        }
      });
    } else {
      this.snackBar.open('Configuración guardada localmente', 'Cerrar', { duration: 3000 });
      this.editandoAlertas.set(false);
    }
  }

  onFotoSeleccionada(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const u = this.user();
        if (u) {
          const updated = { ...u, foto: base64 };
          this.authService.currentUser.set(updated);
          localStorage.setItem('user', JSON.stringify(updated));
          this.snackBar.open('Foto de perfil actualizada', 'Cerrar', { duration: 3000 });

          // Guardar en la base de datos a través del endpoint de usuario
          this.http.put<any>(`/api/v1/seguridad/usuario/${u.id}`, { foto: base64 }).subscribe({
            next: () => {},
            error: (err) => console.error('Error al sincronizar foto con base de datos:', err)
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private formatearFechaLiteral(fechaStr?: string): string {
    if (!fechaStr) {
      return 'Viernes 04 de Septiembre del 2026 a la(s) 01:25';
    }
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return 'Viernes 04 de Septiembre del 2026 a la(s) 01:25';
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const diaNom = dias[d.getDay()];
      const diaNum = String(d.getDate()).padStart(2, '0');
      const mesNom = meses[d.getMonth()];
      const anio = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${diaNom} ${diaNum} de ${mesNom} del ${anio} a la(s) ${hora}:${min}`;
    } catch {
      return 'Viernes 04 de Septiembre del 2026 a la(s) 01:25';
    }
  }
}
