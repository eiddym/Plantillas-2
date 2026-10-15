import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { SeguridadService, Unidad } from '../../core/services/seguridad.service';

export interface CorrespondenciaExterna {
  id_documento?: number;
  hoja_ruta: string;
  cite_externo: string;
  remitente: string;
  entidad: string;
  referencia: string;
  fojas: number;
  unidad_destino: string;
  fecha_ingreso: string;
  estado: string;
}

@Component({
  selector: 'app-ventanilla-unica',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="vu-page-container">
      <!-- Top Banner -->
      <header class="vu-header">
        <div class="header-left">
          <div class="header-icon-box">
            <mat-icon>inbox</mat-icon>
          </div>
          <div>
            <h1 class="header-title">Ventanilla Única de Correspondencia</h1>
            <p class="header-desc">Recepción, radicación y derivación de correspondencia externa y notas oficiales</p>
          </div>
        </div>

        <div class="header-right">
          <button mat-flat-button class="btn-nueva-recepcion" (click)="mostrarFormulario.set(!mostrarFormulario())">
            <mat-icon>{{ mostrarFormulario() ? 'close' : 'add_circle' }}</mat-icon>
            <span>{{ mostrarFormulario() ? 'Cerrar Registro' : 'Radicar Correspondencia' }}</span>
          </button>
        </div>
      </header>

      <!-- Formulario de Radicación de Correspondencia Externa -->
      @if (mostrarFormulario()) {
        <section class="form-section fade-in">
          <div class="form-card">
            <div class="card-header">
              <mat-icon>edit_note</mat-icon>
              <h3>Registro y Emisión de Hoja de Ruta</h3>
            </div>

            <form [formGroup]="registroForm" (ngSubmit)="radicarCorrespondencia()" class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>CITE o Nota Externa</mat-label>
                <input matInput formControlName="cite_externo" placeholder="Ej: GOB-LPZ/045/2026">
                <mat-icon matSuffix>tag</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Entidad o Institución Remitente</mat-label>
                <input matInput formControlName="entidad" placeholder="Ej: Ministerio de Economía, Alcaldía...">
                <mat-icon matSuffix>apartment</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nombre Completo del Remitente</mat-label>
                <input matInput formControlName="remitente" placeholder="Ej: Juan Pérez Morales">
                <mat-icon matSuffix>person</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Número de Fojas</mat-label>
                <input matInput type="number" formControlName="fojas" placeholder="1">
                <mat-icon matSuffix>pages</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="col-span-2">
                <mat-label>Asunto o Referencia Principal</mat-label>
                <input matInput formControlName="referencia" placeholder="Descripción clara del trámite">
                <mat-icon matSuffix>notes</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Derivar a Unidad de Destino</mat-label>
                <mat-select formControlName="fid_unidad_destino">
                  @for (u of unidades(); track u.id_unidad) {
                    <mat-option [value]="u.id_unidad">{{ u.nombre }}</mat-option>
                  }
                </mat-select>
                <mat-icon matSuffix>business</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Prioridad</mat-label>
                <mat-select formControlName="prioridad">
                  <mat-option value="NORMAL">Normal</mat-option>
                  <mat-option value="URGENTE">Urgente (48 horas)</mat-option>
                  <mat-option value="MUY_URGENTE">Muy Urgente (Inmediata)</mat-option>
                </mat-select>
                <mat-icon matSuffix>priority_high</mat-icon>
              </mat-form-field>

              <div class="form-actions-full">
                <button type="submit" mat-flat-button class="btn-submit-radicacion" [disabled]="registroForm.invalid || guardando()">
                  <mat-icon>assignment_turned_in</mat-icon>
                  <span>{{ guardando() ? 'Generando Hoja de Ruta...' : 'Radicar y Expedir Hoja de Ruta' }}</span>
                </button>
                <button type="button" mat-stroked-button (click)="mostrarFormulario.set(false)">
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      }

      <!-- Listado de Correspondencia Externa Radicada -->
      <section class="list-section">
        <div class="table-card">
          <div class="table-toolbar">
            <div class="toolbar-left">
              <h3>Bandeja de Correspondencia Radicada ({{ correspondenciaList().length }})</h3>
            </div>
            <div class="toolbar-right">
              <mat-form-field appearance="outline" class="search-field-clean">
                <mat-label>Buscar por CITE, HR o Remitente</mat-label>
                <input matInput [formControl]="filtroCtrl" placeholder="Filtrar bandeja...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
            </div>
          </div>

          @if (cargando()) {
            <div class="loading-state">
              <mat-spinner diameter="44"></mat-spinner>
              <p>Consultando bandeja de correspondencia...</p>
            </div>
          } @else if (correspondenciaFiltrada().length === 0) {
            <div class="empty-state">
              <mat-icon>all_inbox</mat-icon>
              <h3>No hay correspondencia pendiente</h3>
              <p>Toda la correspondencia externa recibida ha sido procesada y derivada.</p>
            </div>
          } @else {
            <table mat-table [dataSource]="correspondenciaFiltrada()" class="modern-table">
              <!-- Hoja de Ruta -->
              <ng-container matColumnDef="hr">
                <th mat-header-cell *matHeaderCellDef>Hoja de Ruta</th>
                <td mat-cell *matCellDef="let c">
                  <div class="hr-cell">
                    <mat-icon class="hr-icon">markunread_mailbox</mat-icon>
                    <span class="hr-code">{{ c.hoja_ruta }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- CITE Externo -->
              <ng-container matColumnDef="cite">
                <th mat-header-cell *matHeaderCellDef>CITE Externo</th>
                <td mat-cell *matCellDef="let c">
                  <span class="cite-code">{{ c.cite_externo }}</span>
                </td>
              </ng-container>

              <!-- Remitente / Entidad -->
              <ng-container matColumnDef="remitente">
                <th mat-header-cell *matHeaderCellDef>Remitente & Entidad</th>
                <td mat-cell *matCellDef="let c">
                  <div class="sender-cell">
                    <span class="sender-name">{{ c.remitente }}</span>
                    <span class="sender-entity">{{ c.entidad }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Referencia -->
              <ng-container matColumnDef="referencia">
                <th mat-header-cell *matHeaderCellDef>Referencia</th>
                <td mat-cell *matCellDef="let c">
                  <div class="ref-text" [matTooltip]="c.referencia">{{ c.referencia }}</div>
                </td>
              </ng-container>

              <!-- Unidad Destino -->
              <ng-container matColumnDef="destino">
                <th mat-header-cell *matHeaderCellDef>Destino</th>
                <td mat-cell *matCellDef="let c">
                  <span class="unit-badge">{{ c.unidad_destino }}</span>
                </td>
              </ng-container>

              <!-- Fecha -->
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Fecha Ingreso</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.fecha_ingreso }}
                </td>
              </ng-container>

              <!-- Acciones -->
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let c">
                  <div class="action-buttons">
                    <button mat-icon-button class="btn-action print-btn" (click)="imprimirComprobante(c)" matTooltip="Imprimir Rótulo / Hoja de Ruta">
                      <mat-icon>print</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columnas"></tr>
              <tr mat-row *matRowDef="let row; columns: columnas;" class="table-row"></tr>
            </table>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .vu-page-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .vu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      padding: 24px 32px;
      border-radius: 16px;
      color: #fff;
      box-shadow: 0 10px 30px rgba(15, 32, 39, 0.4);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-icon-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 180, 219, 0.35);
    }

    .header-icon-box mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
      color: #fff;
    }

    .header-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .header-desc {
      font-size: 14px;
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.7);
    }

    .btn-nueva-recepcion {
      background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%) !important;
      color: #fff !important;
      padding: 0 22px !important;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    /* Formulario */
    .form-card {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: #0f2027;
      h3 { margin: 0; font-size: 18px; font-weight: 700; }
      mat-icon { color: #00b4db; font-size: 26px; width: 26px; height: 26px; }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .col-span-2 {
      grid-column: span 2;
    }

    @media (max-width: 768px) {
      .col-span-2 { grid-column: span 1; }
    }

    .form-actions-full {
      grid-column: 1 / -1;
      display: flex;
      gap: 12px;
      margin-top: 10px;
    }

    .btn-submit-radicacion {
      background: #0f2027 !important;
      color: #fff !important;
      padding: 0 24px !important;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tabla */
    .table-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }

    .table-toolbar {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
    }

    .search-field-clean {
      width: 280px;
      margin-bottom: -1.25em;
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;

      th {
        background: #f8fafc;
        color: #475569;
        font-weight: 700;
        font-size: 12.5px;
        text-transform: uppercase;
        padding: 16px;
      }

      td {
        padding: 14px 16px;
        font-size: 13.5px;
        color: #1e293b;
        border-bottom: 1px solid #f1f5f9;
      }
    }

    .table-row:hover { background: #f8fafc; }

    .hr-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hr-icon {
      color: #00b4db;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .hr-code {
      font-weight: 800;
      color: #0f2027;
      letter-spacing: 0.3px;
    }

    .cite-code {
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .sender-cell {
      display: flex;
      flex-direction: column;
    }

    .sender-name {
      font-weight: 600;
      color: #0f172a;
    }

    .sender-entity {
      font-size: 11.5px;
      color: #64748b;
    }

    .ref-text {
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .unit-badge {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
    }

    .btn-action.print-btn {
      color: #0284c7;
    }

    .loading-state, .empty-state {
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #64748b;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #cbd5e1; }
      h3 { margin: 0; font-size: 16px; color: #334155; }
      p { margin: 0; font-size: 13.5px; }
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
export class VentanillaUnicaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly seguridadService = inject(SeguridadService);
  private readonly snackBar = inject(MatSnackBar);

  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly mostrarFormulario = signal<boolean>(false);
  readonly unidades = signal<Unidad[]>([]);
  readonly correspondenciaList = signal<CorrespondenciaExterna[]>([]);

  readonly filtroCtrl = new FormControl('');

  readonly registroForm = new FormGroup({
    cite_externo: new FormControl('', [Validators.required]),
    entidad: new FormControl('', [Validators.required]),
    remitente: new FormControl('', [Validators.required]),
    fojas: new FormControl(1, [Validators.min(1)]),
    referencia: new FormControl('', [Validators.required]),
    fid_unidad_destino: new FormControl<number | null>(null, [Validators.required]),
    prioridad: new FormControl('NORMAL')
  });

  readonly columnas = ['hr', 'cite', 'remitente', 'referencia', 'destino', 'fecha', 'acciones'];

  ngOnInit(): void {
    this.cargarUnidades();
    this.cargarCorrespondencia();
  }

  cargarUnidades(): void {
    this.seguridadService.getUnidades(100, 1).subscribe({
      next: (res) => {
        this.unidades.set(res.datos?.resultado || []);
      }
    });
  }

  cargarCorrespondencia(): void {
    this.cargando.set(true);
    // Simulación / consulta de correspondencia externa
    setTimeout(() => {
      this.cargando.set(false);
      this.correspondenciaList.set([
        {
          id_documento: 101,
          hoja_ruta: 'HR-2026-00412',
          cite_externo: 'MEFP/VPT/092/2026',
          remitente: 'Lic. Marcelo Soliz Ramos',
          entidad: 'Ministerio de Economía y Finanzas Públicas',
          referencia: 'Solicitud de informe de conciliación de saldos fiscales presupuestarios gestión 2025',
          fojas: 14,
          unidad_destino: 'Dirección General de Asuntos Administrativos',
          fecha_ingreso: '15/10/2026',
          estado: 'DERIVADO'
        },
        {
          id_documento: 102,
          hoja_ruta: 'HR-2026-00413',
          cite_externo: 'AGETIC/DGE/120/2026',
          remitente: 'Ing. Vladimir Terán',
          entidad: 'Agencia de Gobierno Electrónico y TIC',
          referencia: 'Convenio de interoperabilidad para servicios de firma digital y pasarela de autenticación',
          fojas: 28,
          unidad_destino: 'Unidad de Tecnologías de Información',
          fecha_ingreso: '15/10/2026',
          estado: 'DERIVADO'
        }
      ]);
    }, 400);
  }

  correspondenciaFiltrada(): CorrespondenciaExterna[] {
    const list = this.correspondenciaList();
    const filtro = (this.filtroCtrl.value || '').toLowerCase();
    if (!filtro) return list;

    return list.filter(c =>
      c.hoja_ruta.toLowerCase().includes(filtro) ||
      c.cite_externo.toLowerCase().includes(filtro) ||
      c.remitente.toLowerCase().includes(filtro) ||
      c.entidad.toLowerCase().includes(filtro) ||
      c.referencia.toLowerCase().includes(filtro)
    );
  }

  radicarCorrespondencia(): void {
    if (this.registroForm.invalid) return;

    this.guardando.set(true);
    const v = this.registroForm.value;
    const unidadDest = this.unidades().find(u => u.id_unidad === v.fid_unidad_destino)?.nombre || 'Unidad Asignada';

    const corrId = Math.floor(1000 + Math.random() * 9000);
    const nuevaHR: CorrespondenciaExterna = {
      id_documento: Date.now(),
      hoja_ruta: `HR-2026-00${corrId}`,
      cite_externo: v.cite_externo || '',
      remitente: v.remitente || '',
      entidad: v.entidad || '',
      referencia: v.referencia || '',
      fojas: Number(v.fojas) || 1,
      unidad_destino: unidadDest,
      fecha_ingreso: new Date().toLocaleDateString('es-BO'),
      estado: 'DERIVADO'
    };

    setTimeout(() => {
      this.guardando.set(false);
      this.correspondenciaList.update(list => [nuevaHR, ...list]);
      this.mostrarFormulario.set(false);
      this.registroForm.reset({ fojas: 1, prioridad: 'NORMAL' });
      this.snackBar.open(`Hoja de Ruta ${nuevaHR.hoja_ruta} expedida y derivada exitosamente`, 'Aceptar', { duration: 4500 });
    }, 600);
  }

  imprimirComprobante(c: CorrespondenciaExterna): void {
    window.print();
  }
}
