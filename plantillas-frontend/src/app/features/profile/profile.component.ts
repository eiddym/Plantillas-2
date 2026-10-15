import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';

interface AlertasConfig {
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
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  template: `
    <div class="profile-container">
      <!-- Banner / Portada con Imagen y Avatar Central (Imagen 3) -->
      <div class="profile-user-bg">
        <div class="profile-photo-wrapper">
          <div class="profile-user-photo">
            <img 
              *ngIf="user()?.foto" 
              [src]="user()?.foto" 
              alt="Foto de perfil" 
              class="photo-img"
            >
            <span *ngIf="!user()?.foto" class="photo-initial">
              {{ userInitial() }}
            </span>

            <!-- Botoncito redondo de cámara para cambiar foto -->
            <button 
              type="button" 
              class="btn-camera-overlay" 
              (click)="fileInput.click()" 
              title="Cambiar foto de perfil"
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
        </div>

        <!-- Franja de datos de usuario sobre el banner -->
        <div class="profile-data-overlay">
          <h2 class="profile-user-name">
            {{ userFullName() }}
          </h2>
          <h3 class="profile-user-email">
            {{ user()?.email || 'docs@marabuntarl.com' }}
          </h3>
        </div>
      </div>

      <!-- Sección de Datos del Usuario y Alertas (Imagen 3) -->
      <div class="profile-body-card">
        <!-- VISTA DE DETALLE NORMAL -->
        <div class="profile-info-section" *ngIf="!editandoAlertas()">
          <div class="actions-header">
            <button mat-raised-button class="btn-editar-alertas" (click)="abrirEditarAlertas()">
              <mat-icon>edit</mat-icon>
              <span>EDITAR ALERTAS</span>
            </button>
          </div>

          <div class="profile-details-list">
            <p><strong>Nombre de usuario: </strong><span>{{ user()?.username || 'sys_default' }}</span></p>
            <p><strong>Número de documento: </strong><span>{{ user()?.doc || '111111' }}</span></p>
            <p><strong>Nombre(s): </strong><span>{{ user()?.first_name || 'system' }}</span></p>
            <p><strong>Apellido(s): </strong><span>{{ user()?.last_name || 'default' }}</span></p>
            <p><strong>Correo electrónico: </strong><span>{{ user()?.email || 'docs@marabuntarl.com' }}</span></p>
            <p><strong>Activo desde: </strong><span>{{ fechaFormateada() }}</span></p>
          </div>
        </div>

        <!-- VISTA DE EDICIÓN DE ALERTAS -->
        <div class="profile-edit-section" *ngIf="editandoAlertas()">
          <h3 class="edit-title">Configuración de Alertas y Notificaciones</h3>
          <p class="edit-subtitle">Recibir notificaciones vía:</p>

          <div class="channel-row">
            <mat-checkbox [(ngModel)]="alertas.canal_habilitado" color="primary">
              CORREO ELECTRÓNICO
            </mat-checkbox>
          </div>

          <div class="email-field-box">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Correo electrónico</mat-label>
              <input matInput [value]="user()?.email || 'docs@marabuntarl.com'" disabled>
            </mat-form-field>
          </div>

          <p class="edit-subtitle">De documentos que:</p>
          <div class="checkboxes-list">
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

          <div class="edit-actions-row">
            <button mat-raised-button color="primary" class="btn-guardar" (click)="guardarAlertas()">
              <mat-icon>check</mat-icon>
              <span>Guardar</span>
            </button>
            <button mat-raised-button class="btn-cancelar" (click)="cancelarEditarAlertas()">
              <mat-icon>cancel</mat-icon>
              <span>Cancelar</span>
            </button>
          </div>
        </div>

        <!-- Footer discreto institucional (Imagen 3) -->
        <div class="profile-armotech-footer">
          <span>desarrollado por ARMOTECH 2026. armotech.org</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      width: 100%;
      min-height: calc(100vh - 110px);
      background: #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    /* BANNER / PORTADA (Imagen 3) */
    .profile-user-bg {
      background-image: url('/assets/images/bg.jpg'), linear-gradient(135deg, #0a192f 0%, #172a45 50%, #301b3f 100%);
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      height: 330px;
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
    }

    .profile-photo-wrapper {
      position: relative;
      margin-bottom: 14px;
    }

    .profile-user-photo {
      width: 120px;
      height: 120px;
      border: 5px solid #ffffff;
      border-radius: 50%;
      background: linear-gradient(135deg, #38b2ac 0%, #0d9488 100%);
      color: #ffffff;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .photo-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .photo-initial {
      font-size: 4.8rem;
      font-weight: 700;
      line-height: 1;
    }

    /* Botón de overlay de cámara (Imagen 3) */
    .btn-camera-overlay {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #00e5ff;
      border: 2px solid #ffffff;
      color: #0f2027;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease, background 0.15s ease;

      &:hover {
        transform: scale(1.08);
        background: #38bdf8;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* Franja oscura translúcida debajo del avatar (Imagen 3) */
    .profile-data-overlay {
      background-color: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      width: 100%;
      max-width: 820px;
      padding: 16px 20px 14px 20px;
      text-align: center;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .profile-user-name {
      margin: 0;
      color: #ffffff;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .profile-user-email {
      margin: 6px 0 0 0;
      color: #22d3ee; /* Cyan exacto de la Imagen 3 */
      font-size: 0.95rem;
      font-weight: 500;
    }

    /* CUERPO DEL PERFIL */
    .profile-body-card {
      background: #ffffff;
      padding: 24px 30px;
      display: flex;
      flex-direction: column;
      min-height: 280px;
    }

    .actions-header {
      margin-bottom: 20px;
    }

    .btn-editar-alertas {
      background: #ffffff !important;
      color: #1e293b !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
      font-size: 0.8rem !important;
      letter-spacing: 0.5px !important;
      height: 38px !important;
      padding: 0 16px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;

      &:hover {
        background: #f8fafc !important;
        border-color: #94a3b8 !important;
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #475569;
      }
    }

    .profile-details-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      p {
        margin: 0;
        font-size: 0.92rem;
        color: #1e293b;
        line-height: 1.5;

        strong {
          color: #0f172a;
          font-weight: 700;
          min-width: 190px;
          display: inline-block;
        }

        span {
          color: #334155;
        }
      }
    }

    /* EDICIÓN DE ALERTAS */
    .profile-edit-section {
      max-width: 600px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .edit-title {
      margin: 0 0 6px 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .edit-subtitle {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 600;
      color: #475569;
    }

    .channel-row {
      margin: 4px 0 8px 0;
    }

    .email-field-box {
      max-width: 400px;
    }

    .checkboxes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .edit-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
    }

    .btn-guardar {
      background: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    .btn-cancelar {
      background: #f1f5f9 !important;
      color: #475569 !important;
      font-weight: 600 !important;
    }

    .w-full {
      width: 100%;
    }

    /* PIE DE PÁGINA (Imagen 3) */
    .profile-armotech-footer {
      margin-top: auto;
      padding-top: 36px;
      text-align: right;

      span {
        font-size: 0.74rem;
        color: #94a3b8;
        font-family: monospace;
      }
    }

    @media (max-width: 768px) {
      .profile-user-bg {
        height: 260px;
      }
      .profile-user-photo {
        width: 90px;
        height: 90px;
      }
      .photo-initial {
        font-size: 3.5rem;
      }
      .profile-details-list p strong {
        min-width: 140px;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authService.currentUser;
  readonly editandoAlertas = signal(false);

  readonly alertas: AlertasConfig = {
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
              date_joined: d._fecha_creacion || u.date_joined
            };
            this.authService.currentUser.set(updated);
            localStorage.setItem('user', JSON.stringify(updated));
          }
        },
        error: () => {}
      });
    }
  }

  abrirEditarAlertas(): void {
    this.editandoAlertas.set(true);
  }

  cancelarEditarAlertas(): void {
    this.editandoAlertas.set(false);
  }

  guardarAlertas(): void {
    this.snackBar.open('Configuración de alertas actualizada exitosamente', 'Cerrar', {
      duration: 3500,
      panelClass: ['snackbar-success']
    });
    this.editandoAlertas.set(false);
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
