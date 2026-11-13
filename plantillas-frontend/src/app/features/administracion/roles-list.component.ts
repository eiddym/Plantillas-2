import { Component, OnInit, inject, signal } from '@angular/core';
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
import { Rol, MenuAdmin, SeguridadService } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-roles-list',
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
          <h1 class="section-page-title">Roles del Sistema</h1>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.88rem;">Roles institucionales y niveles de privilegio asignables</p>
        </div>
        <div class="header-controls-group">
          <button type="button" class="emerald24-primary-pill" (click)="abrirModalNuevo()">
            <mat-icon>add</mat-icon>
            <span>Añadir Rol</span>
          </button>
        </div>
      </header>

      <mat-card class="table-card">
        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="roles()" class="w-full">
            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="th-acciones">Acciones</th>
              <td mat-cell *matCellDef="let r" class="td-acciones">
                <button mat-icon-button color="primary" (click)="abrirModalEditar(r)" matTooltip="Editar Rol">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="abrirModalPermisos(r)" matTooltip="Asignar Menús a este Rol" class="btn-menu-perm">
                  <mat-icon>menu_open</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="confirmarEliminar(r)" matTooltip="Eliminar Rol">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let r">{{ r.id_rol }}</td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre del Rol</th>
              <td mat-cell *matCellDef="let r">
                <strong>{{ r.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let r">{{ r.descripcion || 'Sin descripción' }}</td>
            </ng-container>

            <ng-container matColumnDef="peso">
              <th mat-header-cell *matHeaderCellDef>Jerarquía / Peso</th>
              <td mat-cell *matCellDef="let r">{{ r.peso ?? 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let r">
                <span class="badge-tag" [ngClass]="r.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                  {{ r.estado }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </mat-card>

      <!-- MODAL CREAR / EDITAR ROL -->
      @if (modalRolVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ modoEdicion() ? 'Editar Rol' : 'Añadir Nuevo Rol' }}</h3>
              <button mat-icon-button (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
            </div>
            <form [formGroup]="rolForm" (ngSubmit)="guardarRol()" class="modal-form">
              <div class="form-group">
                <label>Nombre del Rol *</label>
                <input type="text" formControlName="nombre" class="custom-input" placeholder="Ej: AUDITOR">
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <input type="text" formControlName="descripcion" class="custom-input" placeholder="Ej: Responsable de auditoría">
              </div>
              <div class="form-group">
                <label>Jerarquía / Peso (0 = Mayor jerarquía)</label>
                <input type="number" formControlName="peso" class="custom-input">
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
                <button mat-raised-button color="primary" type="submit" [disabled]="rolForm.invalid || guardando()">
                  {{ guardando() ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL ASIGNAR MENÚS A ROL -->
      @if (modalPermisosVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card modal-large">
            <div class="modal-header">
              <h3>Permisos de Menú para el Rol: {{ rolSeleccionado()?.nombre }}</h3>
              <button mat-icon-button (click)="cerrarModalPermisos()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="modal-body-menus">
              <p class="hint-text">Seleccione los módulos del sistema visibles para este rol:</p>
              @if (cargandoPermisos()) {
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              } @else {
                <div class="menus-grid">
                  @for (m of menusDisponibles(); track m.id_menu) {
                    <div class="menu-check-item">
                      <mat-checkbox 
                        [checked]="tieneMenuAsignado(m.id_menu)"
                        (change)="toggleMenuRol(m.id_menu, $event.checked)"
                        color="primary">
                        <strong>{{ m.nombre }}</strong>
                        <small class="menu-sub-hint" *ngIf="m.ruta">({{ m.ruta }})</small>
                      </mat-checkbox>
                    </div>
                  }
                </div>
              }
            </div>
            <div class="modal-actions">
              <button mat-button type="button" (click)="cerrarModalPermisos()">Cerrar</button>
              <button mat-raised-button color="primary" type="button" (click)="guardarPermisosRol()" [disabled]="guardandoPermisos()">
                {{ guardandoPermisos() ? 'Guardando...' : 'Guardar Permisos' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL CONFIRMAR ELIMINAR -->
      @if (rolAEliminar()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card modal-sm">
            <div class="modal-header header-warn">
              <mat-icon color="warn">warning</mat-icon>
              <h3>Eliminar Rol</h3>
            </div>
            <p class="confirm-text">¿Está seguro de eliminar el rol <strong>{{ rolAEliminar()?.nombre }}</strong>?</p>
            <div class="modal-actions">
              <button mat-button (click)="rolAEliminar.set(null)">Cancelar</button>
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
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      .header-left {
        h1 { margin: 0; color: #1a237e; font-size: 1.8rem; }
        .subtitle { margin: 4px 0 0 0; color: #607d8b; }
      }
    }
    .btn-add-role {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .table-card { border-radius: 12px; overflow: hidden; }
    .w-full { width: 100%; }
    .th-acciones, .td-acciones { width: 130px; white-space: nowrap; }
    .btn-menu-perm { color: #0284c7 !important; }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .table-responsive table { min-width: 600px; }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0;
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
      width: 100%; max-width: 480px;
      padding: 20px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      &.modal-large { max-width: 680px; }
      &.modal-sm { max-width: 400px; }
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
      h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
      &.header-warn {
        display: flex; gap: 8px; justify-content: flex-start;
      }
    }
    .modal-form {
      display: flex; flex-direction: column; gap: 14px;
    }
    .form-group {
      display: flex; flex-direction: column; gap: 4px;
      label { font-size: 12px; font-weight: 600; color: #475569; }
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
    .modal-actions {
      display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;
    }
    .menus-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      max-height: 300px; overflow-y: auto; padding: 10px 0;
    }
    .menu-sub-hint { margin-left: 6px; color: #64748b; font-size: 11px; }
    .hint-text { margin: 0 0 10px; font-size: 12.5px; color: #64748b; }
    .confirm-text { margin: 10px 0 20px; font-size: 14px; color: #334155; }
    .fade-in { animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class RolesListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['acciones', 'id', 'nombre', 'descripcion', 'peso', 'estado'];
  readonly roles = signal<Rol[]>([]);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);

  // Modales
  readonly modalRolVisible = signal(false);
  readonly modoEdicion = signal(false);
  readonly rolEditandoId = signal<number | null>(null);
  readonly rolAEliminar = signal<Rol | null>(null);

  // Modal Permisos Menú
  readonly modalPermisosVisible = signal(false);
  readonly rolSeleccionado = signal<Rol | null>(null);
  readonly menusDisponibles = signal<MenuAdmin[]>([]);
  readonly menusAsignadosIds = signal<Set<number>>(new Set());
  readonly rolMenusOriginales = signal<any[]>([]);
  readonly cargandoPermisos = signal(false);
  readonly guardandoPermisos = signal(false);

  readonly rolForm = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    descripcion: new FormControl(''),
    peso: new FormControl<number>(0, [Validators.required]),
    estado: new FormControl<'ACTIVO' | 'INACTIVO'>('ACTIVO', [Validators.required])
  });

  ngOnInit(): void {
    this.cargarRoles();
  }

  cargarRoles(): void {
    this.loading.set(true);
    this.seguridadService.getRoles(50, 1).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.roles.set(res.datos?.resultado || []);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al obtener los roles.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  abrirModalNuevo(): void {
    this.modoEdicion.set(false);
    this.rolEditandoId.set(null);
    this.rolForm.reset({
      nombre: '',
      descripcion: '',
      peso: 0,
      estado: 'ACTIVO'
    });
    this.modalRolVisible.set(true);
  }

  abrirModalEditar(r: Rol): void {
    this.modoEdicion.set(true);
    this.rolEditandoId.set(r.id_rol ?? null);
    this.rolForm.patchValue({
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      peso: r.peso ?? 0,
      estado: r.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
    });
    this.modalRolVisible.set(true);
  }

  cerrarModal(): void {
    this.modalRolVisible.set(false);
    this.rolEditandoId.set(null);
  }

  guardarRol(): void {
    if (this.rolForm.invalid) return;
    this.guardando.set(true);
    const v = this.rolForm.value;
    const payload: Partial<Rol> = {
      nombre: (v.nombre || '').toUpperCase().trim(),
      descripcion: v.descripcion || '',
      peso: Number(v.peso ?? 0),
      estado: v.estado || 'ACTIVO'
    };

    if (this.modoEdicion() && this.rolEditandoId()) {
      this.seguridadService.actualizarRol(this.rolEditandoId()!, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open('Rol actualizado exitosamente.', 'Aceptar', { duration: 3000 });
          this.cargarRoles();
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al actualizar el rol.', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      this.seguridadService.crearRol(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open('Rol creado exitosamente.', 'Aceptar', { duration: 3000 });
          this.cargarRoles();
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al crear el rol.', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  confirmarEliminar(r: Rol): void {
    this.rolAEliminar.set(r);
  }

  ejecutarEliminar(): void {
    const r = this.rolAEliminar();
    if (!r || !r.id_rol) return;
    this.eliminando.set(true);
    this.seguridadService.eliminarRol(r.id_rol).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.rolAEliminar.set(null);
        this.snackBar.open(`Rol "${r.nombre}" eliminado correctamente.`, 'Aceptar', { duration: 3000 });
        this.cargarRoles();
      },
      error: (err) => {
        this.eliminando.set(false);
        this.snackBar.open(err.error?.mensaje || 'No se puede eliminar el rol porque está en uso.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ==========================================
  // GESTIÓN DE PERMISOS DE MENÚ PARA EL ROL
  // ==========================================
  abrirModalPermisos(r: Rol): void {
    this.rolSeleccionado.set(r);
    this.modalPermisosVisible.set(true);
    this.cargandoPermisos.set(true);

    // Cargar todos los menús
    this.seguridadService.getMenus().subscribe({
      next: (mRes) => {
        this.menusDisponibles.set(mRes.datos?.resultado || []);

        // Cargar los menús actualmente asignados a este rol
        if (r.id_rol) {
          this.seguridadService.getRolMenus(r.id_rol).subscribe({
            next: (rmRes) => {
              this.cargandoPermisos.set(false);
              const rolMenus = rmRes.datos || [];
              this.rolMenusOriginales.set(rolMenus);
              const ids = new Set<number>();
              rolMenus.forEach((item: any) => {
                if (item.estado === 'ACTIVO') ids.add(item.fid_menu);
              });
              this.menusAsignadosIds.set(ids);
            },
            error: () => {
              this.cargandoPermisos.set(false);
            }
          });
        } else {
          this.cargandoPermisos.set(false);
        }
      },
      error: () => {
        this.cargandoPermisos.set(false);
      }
    });
  }

  cerrarModalPermisos(): void {
    this.modalPermisosVisible.set(false);
    this.rolSeleccionado.set(null);
  }

  tieneMenuAsignado(idMenu?: number): boolean {
    return idMenu ? this.menusAsignadosIds().has(idMenu) : false;
  }

  toggleMenuRol(idMenu?: number, checked?: boolean): void {
    if (!idMenu) return;
    this.menusAsignadosIds.update(set => {
      const nuevo = new Set(set);
      if (checked) nuevo.add(idMenu);
      else nuevo.delete(idMenu);
      return nuevo;
    });
  }

  guardarPermisosRol(): void {
    const r = this.rolSeleccionado();
    if (!r || !r.id_rol) return;
    this.guardandoPermisos.set(true);

    const asignados = this.menusAsignadosIds();
    const originales = this.rolMenusOriginales();
    const menusActualizar: any[] = [];
    const menusNuevos: number[] = [];

    // Revisar originales para actualizar estado
    originales.forEach((orig: any) => {
      const estaMarcado = asignados.has(orig.fid_menu);
      menusActualizar.push({
        id_rol_menu: orig.id_rol_menu,
        fid_rol: r.id_rol,
        fid_menu: orig.fid_menu,
        estado: estaMarcado ? 'ACTIVO' : 'INACTIVO'
      });
    });

    // Detectar nuevos
    asignados.forEach((idMenu) => {
      const existia = originales.some((orig: any) => orig.fid_menu === idMenu);
      if (!existia) {
        menusNuevos.push(idMenu);
      }
    });

    const payload = {
      rol: {
        id_rol: r.id_rol,
        nombre: r.nombre,
        descripcion: r.descripcion,
        peso: r.peso,
        estado: r.estado
      },
      menus: menusActualizar,
      menus_nuevos: menusNuevos
    };

    this.seguridadService.actualizarRolMenus(r.id_rol, payload).subscribe({
      next: () => {
        this.guardandoPermisos.set(false);
        this.cerrarModalPermisos();
        this.snackBar.open('Permisos de menú actualizados correctamente.', 'Aceptar', { duration: 3000 });
      },
      error: (err) => {
        this.guardandoPermisos.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al actualizar permisos de menú.', 'Cerrar', { duration: 3500 });
      }
    });
  }
}
