import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SeguridadService, Unidad } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-unidades-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatCheckboxModule
  ],
  template: `
    <div class="page-container">
      <header class="emerald24-section-header">
        <div>
          <h1 class="section-page-title">Unidades Organizacionales</h1>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">Estructura jerárquica de unidades y departamentos institucionales</p>
        </div>
        <div class="header-controls-group">
          <button type="button" class="emerald24-secondary-pill" (click)="abrirModalFusion()">
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">merge_type</mat-icon>
            <span>Fusionar Unidades</span>
          </button>
          <button type="button" class="emerald24-primary-pill" (click)="abrirModalNuevo()">
            <mat-icon>add</mat-icon>
            <span>Crear Unidad</span>
          </button>
        </div>
      </header>

      <mat-card class="table-card">
        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="unidades()" class="w-full">
            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="th-acciones">Acciones</th>
              <td mat-cell *matCellDef="let u" class="td-acciones">
                <button mat-icon-button color="primary" (click)="abrirModalEditar(u)" matTooltip="Editar Unidad">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="iniciarFusionDesde(u)" matTooltip="Fusionar esta unidad con otra" class="btn-action-merge">
                  <mat-icon>call_merge</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmarEliminar(u)" matTooltip="Eliminar Unidad">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let u">{{ u.id_unidad }}</td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre de la Unidad</th>
              <td mat-cell *matCellDef="let u">
                <strong class="unit-name">{{ u.nombre }}</strong>
                <span *ngIf="obtenerNombrePadre(u.fid_unidad_padre)" class="padre-badge">
                  Depende de: {{ obtenerNombrePadre(u.fid_unidad_padre) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="sigla">
              <th mat-header-cell *matHeaderCellDef>Sigla / Abreviación</th>
              <td mat-cell *matCellDef="let u">
                <span class="badge-tag badge-sigla">
                  {{ u.abreviacion || u.sigla || generarSiglaSinConectores(u.nombre) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="jerarquia">
              <th mat-header-cell *matHeaderCellDef>Jerarquía</th>
              <td mat-cell *matCellDef="let u">
                <span class="level-pill" [class.level-padre]="!u.fid_unidad_padre">
                  {{ !u.fid_unidad_padre ? 'Unidad Principal (Padre)' : 'Subunidad' }}
                </span>
                <span *ngIf="u.es_colectiva" class="badge-tag badge-colectiva" style="margin-left: 6px;">COLECTIVA</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let u">
                <span class="badge-tag" [ngClass]="u.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                  {{ u.estado || 'ACTIVO' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </mat-card>

      <!-- MODAL CREAR / EDITAR UNIDAD -->
      @if (modalUnidadVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ modoEdicion() ? 'Editar Unidad' : 'Crear Nueva Unidad' }}</h3>
              <button mat-icon-button (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="unidadForm" (ngSubmit)="guardarUnidad()" class="modal-form">
              <div class="form-group">
                <label>Nombre de la Unidad *</label>
                <input type="text" formControlName="nombre" class="custom-input" placeholder="Ej: Unidad de Recursos Humanos">
              </div>

              <div class="form-group">
                <label>Sigla / Abreviación (Automática sin conectores) *</label>
                <input type="text" formControlName="abreviacion" class="custom-input font-mono" placeholder="Ej: URH">
                <span class="input-hint">Generada automáticamente a partir del nombre omitiendo conectores</span>
              </div>

              <div class="checkbox-group">
                <mat-checkbox formControlName="es_padre" color="primary">
                  <strong>Es Unidad Principal / Independiente (Sin Unidad Padre)</strong>
                </mat-checkbox>
              </div>

              @if (!unidadForm.get('es_padre')?.value) {
                <div class="form-group">
                  <label>Seleccione la Unidad Padre *</label>
                  <select formControlName="fid_unidad_padre" class="custom-select">
                    <option [ngValue]="null">-- Seleccionar Unidad Padre --</option>
                    @for (item of unidadesPadresDisponibles(); track item.id_unidad) {
                      <option [value]="item.id_unidad">{{ item.nombre }} ({{ item.abreviacion || item.sigla || generarSiglaSinConectores(item.nombre) }})</option>
                    }
                  </select>
                </div>
              }

              <div class="checkbox-group" style="margin-top: 6px;">
                <mat-checkbox formControlName="es_colectiva" color="primary">
                  <strong>Es Unidad Colectiva (Socios / Asociados)</strong>
                </mat-checkbox>
                <span class="input-hint" style="display: block; margin-left: 28px; margin-top: 2px;">
                  Despacho directo sin VÍA interno; los jefes pueden redactarles correspondencia directa.
                </span>
              </div>

              <div class="form-group">
                <label>Estado</label>
                <select formControlName="estado" class="custom-select">
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>

              <div class="modal-actions">
                <button mat-button type="button" (click)="cerrarModal()">Cancelar</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="unidadForm.invalid || guardando()">
                  {{ guardando() ? 'Guardando...' : 'Guardar Unidad' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL FUSIONAR UNIDADES -->
      @if (modalFusionVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header header-merge">
              <mat-icon class="merge-icon">call_merge</mat-icon>
              <h3>Fusionar Unidades Organizacionales</h3>
              <button mat-icon-button (click)="cerrarModalFusion()"><mat-icon>close</mat-icon></button>
            </div>
            <p class="modal-intro">
              La unidad origen transferirá todos sus usuarios, dependencias y documentos hacia la unidad de destino, y quedará marcada como inactiva.
            </p>
            <form [formGroup]="fusionForm" (ngSubmit)="ejecutarFusion()" class="modal-form">
              <div class="form-group">
                <label>Unidad Origen (A ser absorbida e inactivada) *</label>
                <select formControlName="origen_id" class="custom-select">
                  <option [ngValue]="null">-- Seleccione Unidad a Absorber --</option>
                  @for (u of unidades(); track u.id_unidad) {
                    <option [value]="u.id_unidad">{{ u.nombre }} (ID: {{ u.id_unidad }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Unidad Destino (Receptora de usuarios y documentos) *</label>
                <select formControlName="destino_id" class="custom-select">
                  <option [ngValue]="null">-- Seleccione Unidad Destino --</option>
                  @for (u of unidades(); track u.id_unidad) {
                    @if (u.id_unidad !== fusionForm.get('origen_id')?.value) {
                      <option [value]="u.id_unidad">{{ u.nombre }} (ID: {{ u.id_unidad }})</option>
                    }
                  }
                </select>
              </div>

              <div class="modal-actions">
                <button mat-button type="button" (click)="cerrarModalFusion()">Cancelar</button>
                <button mat-raised-button color="warn" type="submit" [disabled]="fusionForm.invalid || fusionando()">
                  <mat-icon>merge_type</mat-icon>
                  <span>{{ fusionando() ? 'Fusionando...' : 'Confirmar Fusión' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL CONFIRMAR ELIMINAR -->
      @if (unidadAEliminar()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card modal-sm">
            <div class="modal-header header-warn">
              <mat-icon color="warn">warning</mat-icon>
              <h3>Eliminar Unidad</h3>
            </div>
            <p class="confirm-text">¿Está seguro de eliminar la unidad <strong>{{ unidadAEliminar()?.nombre }}</strong>?</p>
            <div class="modal-actions">
              <button mat-button (click)="unidadAEliminar.set(null)">Cancelar</button>
              <button mat-raised-button color="warn" (click)="ejecutarEliminar()" [disabled]="eliminando()">
                {{ eliminando() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      .header-left {
        h1 { margin: 0; color: #1a237e; font-size: 1.8rem; }
        .subtitle { margin: 4px 0 0 0; color: #607d8b; }
      }
      .header-actions {
        display: flex; gap: 10px;
      }
    }
    .table-card { border-radius: 12px; overflow: hidden; }
    .w-full { width: 100%; }
    .th-acciones, .td-acciones { width: 140px; white-space: nowrap; }
    .btn-action-merge { color: #f59e0b !important; }

    .unit-name { display: block; color: #0f172a; font-size: 14px; }
    .padre-badge {
      display: inline-block; font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;
    }
    .badge-sigla {
      background: #eff6ff; color: #1d4ed8; font-family: monospace; font-weight: 700;
    }
    .badge-colectiva {
      background: #ede9fe; color: #6d28d9; font-weight: 700;
    }
    .level-pill {
      font-size: 11.5px; padding: 2px 8px; border-radius: 4px; background: #f1f5f9; color: #475569;
      &.level-padre { background: #dcfce7; color: #15803d; font-weight: 700; }
    }

    .modal-overlay {
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1200;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%; max-width: 520px;
      padding: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      &.modal-sm { max-width: 400px; }
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px;
      h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
      &.header-merge {
        display: flex; gap: 8px; justify-content: flex-start;
        .merge-icon { color: #f59e0b; }
      }
      &.header-warn {
        display: flex; gap: 8px; justify-content: flex-start;
      }
    }
    .modal-intro {
      font-size: 12.5px; color: #475569; line-height: 1.45; margin: 0 0 14px;
      background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;
    }
    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group {
      display: flex; flex-direction: column; gap: 4px;
      label { font-size: 12px; font-weight: 600; color: #475569; }
      .input-hint { font-size: 11px; color: #64748b; }
    }
    .custom-input, .custom-select {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13.5px;
      outline: none;
      &:focus { border-color: #0284c7; }
    }
    .checkbox-group {
      padding: 4px 0;
    }
    .modal-actions {
      display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px;
    }
    .confirm-text { margin: 10px 0 20px; font-size: 14px; color: #334155; }
    .fade-in { animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class UnidadesListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['acciones', 'id', 'nombre', 'sigla', 'jerarquia', 'estado'];
  readonly unidades = signal<Unidad[]>([]);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);
  readonly fusionando = signal(false);

  // Modales
  readonly modalUnidadVisible = signal(false);
  readonly modoEdicion = signal(false);
  readonly unidadEditandoId = signal<number | null>(null);
  readonly unidadAEliminar = signal<Unidad | null>(null);
  readonly modalFusionVisible = signal(false);

  readonly unidadForm = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    abreviacion: new FormControl('', [Validators.required]),
    es_padre: new FormControl<boolean>(true),
    fid_unidad_padre: new FormControl<number | null>(null),
    es_colectiva: new FormControl<boolean>(false),
    estado: new FormControl<'ACTIVO' | 'INACTIVO'>('ACTIVO', [Validators.required])
  });

  readonly fusionForm = new FormGroup({
    origen_id: new FormControl<number | null>(null, [Validators.required]),
    destino_id: new FormControl<number | null>(null, [Validators.required])
  });

  readonly unidadesPadresDisponibles = computed(() => {
    const list = this.unidades();
    const editId = this.unidadEditandoId();
    return list.filter(u => u.id_unidad !== editId);
  });

  ngOnInit(): void {
    this.cargarUnidades();

    // Auto-generar sigla omitiendo conectores en tiempo real
    this.unidadForm.get('nombre')?.valueChanges.subscribe(nom => {
      const sigla = this.generarSiglaSinConectores(nom || '');
      this.unidadForm.get('abreviacion')?.setValue(sigla, { emitEvent: false });
    });

    this.unidadForm.get('es_padre')?.valueChanges.subscribe(esPadre => {
      if (esPadre) {
        this.unidadForm.patchValue({ fid_unidad_padre: null });
      }
    });
  }

  generarSiglaSinConectores(texto: string): string {
    if (!texto) return '';
    const conectores = new Set([
      'de', 'del', 'la', 'las', 'los', 'el', 'en', 'para', 'por', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'sin', 'sobre'
    ]);
    const palabras = texto
      .trim()
      .split(/\s+/)
      .filter(p => p.length > 0 && !conectores.has(p.toLowerCase()));

    return palabras
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  }

  cargarUnidades(): void {
    this.loading.set(true);
    this.seguridadService.getUnidades(100, 1).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.unidades.set(res.datos?.resultado || []);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al obtener la lista de unidades.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  obtenerNombrePadre(idPadre?: number | null): string | null {
    if (!idPadre) return null;
    const padre = this.unidades().find(u => u.id_unidad === idPadre);
    return padre ? padre.nombre : null;
  }

  abrirModalNuevo(): void {
    this.modoEdicion.set(false);
    this.unidadEditandoId.set(null);
    this.unidadForm.reset({
      nombre: '',
      abreviacion: '',
      es_padre: true,
      fid_unidad_padre: null,
      es_colectiva: false,
      estado: 'ACTIVO'
    });
    this.modalUnidadVisible.set(true);
  }

  abrirModalEditar(u: Unidad): void {
    this.modoEdicion.set(true);
    this.unidadEditandoId.set(u.id_unidad ?? null);
    const esPadre = !u.fid_unidad_padre;
    this.unidadForm.patchValue({
      nombre: u.nombre,
      abreviacion: u.abreviacion || u.sigla || this.generarSiglaSinConectores(u.nombre),
      es_padre: esPadre,
      fid_unidad_padre: u.fid_unidad_padre || null,
      es_colectiva: u.es_colectiva ?? false,
      estado: u.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
    });
    this.modalUnidadVisible.set(true);
  }

  cerrarModal(): void {
    this.modalUnidadVisible.set(false);
    this.unidadEditandoId.set(null);
  }

  guardarUnidad(): void {
    if (this.unidadForm.invalid) return;
    this.guardando.set(true);
    const v = this.unidadForm.value;

    const payload: Partial<Unidad> = {
      nombre: v.nombre?.trim(),
      abreviacion: v.abreviacion || this.generarSiglaSinConectores(v.nombre || ''),
      fid_unidad_padre: v.es_padre ? null : (v.fid_unidad_padre ? Number(v.fid_unidad_padre) : null),
      es_colectiva: v.es_colectiva ?? false,
      estado: v.estado || 'ACTIVO'
    };

    if (this.modoEdicion() && this.unidadEditandoId()) {
      this.seguridadService.actualizarUnidad(this.unidadEditandoId()!, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open('Unidad actualizada exitosamente.', 'Aceptar', { duration: 3000 });
          this.cargarUnidades();
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al actualizar la unidad.', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      this.seguridadService.crearUnidad(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open('Unidad creada exitosamente.', 'Aceptar', { duration: 3000 });
          this.cargarUnidades();
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al crear la unidad.', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  confirmarEliminar(u: Unidad): void {
    this.unidadAEliminar.set(u);
  }

  ejecutarEliminar(): void {
    const u = this.unidadAEliminar();
    if (!u || !u.id_unidad) return;
    this.eliminando.set(true);
    this.seguridadService.eliminarUnidad(u.id_unidad).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.unidadAEliminar.set(null);
        this.snackBar.open(`Unidad "${u.nombre}" eliminada correctamente.`, 'Aceptar', { duration: 3000 });
        this.cargarUnidades();
      },
      error: (err) => {
        this.eliminando.set(false);
        this.snackBar.open(err.error?.mensaje || 'No se puede eliminar la unidad porque tiene registros asociados.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ==========================================
  // FUSIÓN DE UNIDADES
  // ==========================================
  abrirModalFusion(): void {
    this.fusionForm.reset({
      origen_id: null,
      destino_id: null
    });
    this.modalFusionVisible.set(true);
  }

  iniciarFusionDesde(u: Unidad): void {
    this.fusionForm.reset({
      origen_id: u.id_unidad,
      destino_id: null
    });
    this.modalFusionVisible.set(true);
  }

  cerrarModalFusion(): void {
    this.modalFusionVisible.set(false);
  }

  ejecutarFusion(): void {
    if (this.fusionForm.invalid) return;
    const v = this.fusionForm.value;
    if (v.origen_id === v.destino_id) {
      this.snackBar.open('La unidad origen y destino deben ser distintas.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.fusionando.set(true);
    this.seguridadService.fusionarUnidades(Number(v.origen_id), Number(v.destino_id)).subscribe({
      next: () => {
        this.fusionando.set(false);
        this.cerrarModalFusion();
        this.snackBar.open('Unidades fusionadas exitosamente. Se transfirieron dependencias.', 'Aceptar', { duration: 4000 });
        this.cargarUnidades();
      },
      error: (err) => {
        this.fusionando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al fusionar las unidades.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
