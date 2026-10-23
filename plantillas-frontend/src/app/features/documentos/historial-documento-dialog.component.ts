import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

export interface HitoHistorial {
  id_historial_flujo?: number;
  id_documento?: number;
  accion: string;
  observacion?: string;
  estado?: string;
  _fecha_creacion: string;
  _fecha_modificacion?: string;
  tipo_doc?: string;
  cite?: string;
  nombres?: string;
  usuario?: string;
}

@Component({
  selector: 'app-historial-documento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  template: `
    <div class="historial-dialog-container">
      <!-- Encabezado Institucional Verde Petróleo -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="icon-circle">
            <mat-icon>history_edu</mat-icon>
          </div>
          <div class="header-titles">
            <h2>Trazabilidad y Flujo del Trámite</h2>
            <div class="cite-meta">
              <span class="badge-cite">{{ data.nombre || 'Sin CITE Oficial' }}</span>
              <span class="doc-tipo" *ngIf="data.nombre_plantilla">{{ data.nombre_plantilla }}</span>
            </div>
          </div>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="btn-close" matTooltip="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Barra de Referencia -->
      <div class="referencia-bar" *ngIf="data.referencia || data.ref">
        <mat-icon>info_outline</mat-icon>
        <span class="ref-label">Ref:</span>
        <span class="ref-text">{{ data.referencia || data.ref }}</span>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate" class="loading-bar"></mat-progress-bar>

      <!-- Cuerpo del Historial / Timeline -->
      <div class="dialog-body">
        @if (cargando()) {
          <div class="state-loading">
            <mat-icon class="spin-icon">sync</mat-icon>
            <p>Cargando trazabilidad oficial del documento...</p>
          </div>
        } @else if (error()) {
          <div class="state-error">
            <mat-icon>error_outline</mat-icon>
            <p>{{ error() }}</p>
          </div>
        } @else if (hitos().length === 0) {
          <div class="state-empty">
            <mat-icon>schedule</mat-icon>
            <p>No se registran movimientos en el historial de este documento aún.</p>
          </div>
        } @else {
          <div class="timeline-container">
            @for (h of hitos(); track $index; let first = $first; let last = $last) {
              <div class="timeline-item" [class.current-step]="first">
                <!-- Conector vertical -->
                <div class="timeline-axis">
                  <div class="timeline-dot" [ngClass]="getAccionClass(h.accion)">
                    <mat-icon>{{ getAccionIcon(h.accion) }}</mat-icon>
                  </div>
                  @if (!last) {
                    <div class="timeline-line"></div>
                  }
                </div>

                <!-- Tarjeta del Hito -->
                <div class="timeline-content">
                  <div class="timeline-card-header">
                    <div class="action-info">
                      <span class="action-badge" [ngClass]="getAccionClass(h.accion)">
                        {{ getAccionLabel(h.accion) }}
                      </span>
                      @if (first) {
                        <span class="latest-tag">ÚLTIMO ESTADO</span>
                      }
                    </div>
                    <span class="time-stamp">
                      <mat-icon>event</mat-icon>
                      {{ formatFecha(h._fecha_creacion) }}
                    </span>
                  </div>

                  <div class="timeline-card-body">
                    <div class="actor-row">
                      <mat-icon>person</mat-icon>
                      <span class="actor-name">{{ h.nombres || h.usuario || 'Funcionario Institucional' }}</span>
                      <span class="actor-user" *ngIf="h.usuario">&#64;{{ h.usuario }}</span>
                    </div>

                    @if (h.observacion) {
                      <div class="obs-box">
                        <mat-icon>chat_bubble_outline</mat-icon>
                        <p class="obs-text">{{ h.observacion }}</p>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Pie del Dialog -->
      <div class="dialog-footer">
        <span class="footer-note">Registro cronológico inmutable respaldado en base de datos.</span>
        <button mat-flat-button class="btn-cerrar" (click)="dialogRef.close()">
          <span>Cerrar</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .historial-dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 680px;
      max-height: 85vh;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      font-family: 'Inter', Roboto, sans-serif;
    }

    .dialog-header {
      background: linear-gradient(135deg, #0f2027 0%, #0d5c63 100%);
      color: #ffffff;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #5eead4; }
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.2px;
      }
    }

    .cite-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-cite {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 12px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .doc-tipo {
      font-size: 12px;
      color: #a7f3d0;
    }

    .btn-close {
      color: #ffffff !important;
      opacity: 0.8;
      &:hover { opacity: 1; }
    }

    .referencia-bar {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0d5c63; flex-shrink: 0; }
    }

    .ref-label {
      font-weight: 700;
      color: #0f2027;
      flex-shrink: 0;
    }

    .ref-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dialog-body {
      flex: 1;
      padding: 20px 24px;
      overflow-y: auto;
      max-height: calc(85vh - 160px);
    }

    .state-loading, .state-empty, .state-error {
      padding: 40px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #64748b;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #94a3b8; }
    }

    .spin-icon {
      animation: spin 1.2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Timeline Styling */
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .timeline-item {
      display: flex;
      gap: 16px;
      position: relative;
    }

    .timeline-axis {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 36px;
      flex-shrink: 0;
    }

    .timeline-dot {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      box-shadow: 0 2px 5px rgba(0,0,0,0.12);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #ffffff; }

      &.creado { background: #3b82f6; }
      &.enviado { background: #0284c7; }
      &.derivado { background: #8b5cf6; }
      &.aprobado { background: #10b981; }
      &.firmado { background: #0d5c63; }
      &.cerrado { background: #059669; }
      &.rechazado { background: #ef4444; }
      &.revisando { background: #f59e0b; }
      &.default { background: #64748b; }
    }

    .timeline-line {
      width: 2px;
      flex: 1;
      background: #e2e8f0;
      min-height: 24px;
      margin: 4px 0;
    }

    .timeline-content {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      transition: all 0.2s ease;
      &:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }
    }

    .current-step .timeline-content {
      border-color: #0d5c63;
      background: #f0fdfa;
    }

    .timeline-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .action-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-badge {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.3px;
      text-transform: uppercase;

      &.creado { background: #dbeafe; color: #1e40af; }
      &.enviado { background: #e0f2fe; color: #0369a1; }
      &.derivado { background: #ede9fe; color: #6d28d9; }
      &.aprobado { background: #d1fae5; color: #065f46; }
      &.firmado { background: #ccfbf1; color: #0f766e; }
      &.cerrado { background: #dcfce7; color: #166534; }
      &.rechazado { background: #fee2e2; color: #991b1b; }
      &.revisando { background: #fef3c7; color: #92400e; }
      &.default { background: #f1f5f9; color: #475569; }
    }

    .latest-tag {
      font-size: 10px;
      font-weight: 800;
      background: #0d5c63;
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .time-stamp {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: #64748b;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .timeline-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .actor-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #1e293b;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64748b; }
    }

    .actor-name {
      font-weight: 600;
    }

    .actor-user {
      font-size: 12px;
      color: #64748b;
    }

    .obs-box {
      display: flex;
      gap: 8px;
      background: #f8fafc;
      border-left: 3px solid #0d5c63;
      border-radius: 0 8px 8px 0;
      padding: 8px 12px;
      font-size: 12.5px;
      color: #334155;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0d5c63; flex-shrink: 0; margin-top: 2px; }
    }

    .obs-text {
      margin: 0;
      line-height: 1.45;
    }

    .dialog-footer {
      padding: 14px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .footer-note {
      font-size: 11.5px;
      color: #94a3b8;
    }

    .btn-cerrar {
      background: #0f2027 !important;
      color: #ffffff !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      padding: 0 20px !important;
    }
  `]
})
export class HistorialDocumentoDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<HistorialDocumentoDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);

  readonly hitos = signal<HitoHistorial[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.data.id_documento;
    if (!id) {
      this.cargando.set(false);
      this.error.set('No se especificó el identificador del documento.');
      return;
    }

    this.http.get<any>(`/api/v1/historialFlujo/${id}`).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO' && Array.isArray(res.datos)) {
          this.hitos.set(res.datos);
        } else {
          this.hitos.set([]);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err.error?.mensaje || 'No fue posible cargar el historial de flujo.';
        this.error.set(msg);
      }
    });
  }

  getAccionClass(accion: string): string {
    const a = (accion || '').toUpperCase();
    if (a.includes('CREAD')) return 'creado';
    if (a.includes('ENVIAD')) return 'enviado';
    if (a.includes('DERIV')) return 'derivado';
    if (a.includes('APROB')) return 'aprobado';
    if (a.includes('FIRM')) return 'firmado';
    if (a.includes('CERR')) return 'cerrado';
    if (a.includes('RECHAZ')) return 'rechazado';
    if (a.includes('REVIS')) return 'revisando';
    return 'default';
  }

  getAccionIcon(accion: string): string {
    const a = (accion || '').toUpperCase();
    if (a.includes('CREAD')) return 'add_circle';
    if (a.includes('ENVIAD')) return 'send';
    if (a.includes('DERIV')) return 'swap_horiz';
    if (a.includes('APROB')) return 'verified';
    if (a.includes('FIRM')) return 'fingerprint';
    if (a.includes('CERR')) return 'task_alt';
    if (a.includes('RECHAZ')) return 'cancel';
    if (a.includes('REVIS')) return 'visibility';
    return 'fiber_manual_record';
  }

  getAccionLabel(accion: string): string {
    const a = (accion || '').toUpperCase();
    switch (a) {
      case 'CREADO': return 'Documento Creado';
      case 'ENVIADO': return 'Enviado para Revisión';
      case 'DERIVADO': return 'Derivado a Unidad';
      case 'APROBADO': return 'Aprobado Oficialmente';
      case 'FIRMO':
      case 'FIRMADO': return 'Firmado Digitalmente';
      case 'CERRADO': return 'Trámite Concluido / Cerrado';
      case 'RECHAZADO': return 'Rechazado con Observación';
      case 'REVISANDO': return 'En Revisión Activa';
      case 'ANULADO': return 'Documento Anulado';
      default: return accion;
    }
  }

  formatFecha(fechaStr?: string): string {
    if (!fechaStr) return 'Fecha no registrada';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fechaStr;
    }
  }
}
