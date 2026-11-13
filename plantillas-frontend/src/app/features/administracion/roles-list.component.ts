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
import { Rol, MenuAdmin, SeguridadService } from '../../core/services/seguridad.service';

export interface MenuNodo {
  padre: MenuAdmin;
  hijos: MenuAdmin[];
}

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

      <!-- MODAL ASIGNAR MENÚS A ROL (JERÁRQUICO) -->
      @if (modalPermisosVisible()) {
        <div class="modal-overlay fade-in">
          <div class="modal-card modal-large modal-permisos-card">
            <div class="modal-header">
              <div class="header-title-permisos">
                <mat-icon class="perm-title-icon">security</mat-icon>
                <div>
                  <h3 style="margin: 0;">Permisos de Menú: <span class="rol-badge">{{ rolSeleccionado()?.nombre }}</span></h3>
                  <p class="hint-text" style="margin: 2px 0 0;">Configure los accesos a módulos y submódulos jerarquizados</p>
                </div>
              </div>
              <button mat-icon-button (click)="cerrarModalPermisos()"><mat-icon>close</mat-icon></button>
            </div>

            <!-- BARRA DE ESTADO Y ACCIONES RÁPIDAS -->
            <div class="permisos-toolbar">
              <div class="perm-stats">
                <span class="stat-pill">
                  <strong>{{ menusAsignadosIds().size }}</strong> de {{ menusDisponibles().length }} módulos activos
                </span>
              </div>
              <div class="perm-quick-actions">
                <button mat-stroked-button color="primary" type="button" class="btn-quick-act" (click)="marcarTodos()">
                  <mat-icon>done_all</mat-icon> Marcar Todos
                </button>
                <button mat-stroked-button color="warn" type="button" class="btn-quick-act" (click)="desmarcarTodos()">
                  <mat-icon>remove_done</mat-icon> Desmarcar Todos
                </button>
              </div>
            </div>

            <div class="modal-body-menus">
              @if (cargandoPermisos()) {
                <div style="padding: 30px; text-align: center;">
                  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                  <p style="margin-top: 10px; color: #64748b; font-size: 13px;">Cargando catálogo jerárquico de permisos...</p>
                </div>
              } @else {
                <div class="menu-groups-container">
                  @for (nodo of menusJerarquicos(); track nodo.padre.id_menu) {
                    <div class="menu-group-card" [class.group-active]="isPadreChecked(nodo)">
                      <!-- ENCABEZADO DEL GRUPO PADRE -->
                      <div class="group-header">
                        <div class="group-header-left">
                          <mat-checkbox
                            [checked]="isPadreChecked(nodo)"
                            [indeterminate]="isPadreIndeterminate(nodo)"
                            (change)="togglePadre(nodo, $event.checked)"
                            color="primary"
                            class="parent-checkbox">
                            <span class="group-title-label">
                              <mat-icon class="group-icon">{{ getIconoPadre(nodo.padre.nombre) }}</mat-icon>
                              <strong>{{ nodo.padre.nombre }}</strong>
                            </span>
                          </mat-checkbox>
                          @if (nodo.padre.ruta) {
                            <span class="route-chip">/{{ nodo.padre.ruta }}</span>
                          }
                        </div>
                        <div class="group-header-right">
                          <span class="group-count-badge" [class.badge-all]="cantHijosActivos(nodo) === nodo.hijos.length && nodo.hijos.length > 0">
                            {{ cantHijosActivos(nodo) }}/{{ nodo.hijos.length }} activos
                          </span>
                          @if (nodo.hijos.length > 0) {
                            <button type="button" class="btn-micro-toggle" (click)="marcarTodosGrupo(nodo)" matTooltip="Marcar todos los submódulos">
                              Todos
                            </button>
                            <span class="divider-micro">|</span>
                            <button type="button" class="btn-micro-toggle" (click)="desmarcarTodosGrupo(nodo)" matTooltip="Desmarcar todos los submódulos">
                              Ninguno
                            </button>
                          }
                        </div>
                      </div>

                      <!-- SUBMÓDULOS HIJOS -->
                      @if (nodo.hijos.length > 0) {
                        <div class="group-children-grid">
                          @for (h of nodo.hijos; track h.id_menu) {
                            <div class="child-check-item" [class.item-active]="tieneMenuAsignado(h.id_menu)">
                              <mat-checkbox
                                [checked]="tieneMenuAsignado(h.id_menu)"
                                (change)="toggleHijo(nodo.padre, h, $event.checked, nodo)"
                                color="primary">
                                <span class="child-name">{{ h.nombre }}</span>
                                @if (h.ruta) {
                                  <span class="child-route-tag">/{{ h.ruta }}</span>
                                }
                              </mat-checkbox>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-actions">
              <button mat-button type="button" (click)="cerrarModalPermisos()">Cancelar</button>
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
    .modal-permisos-card {
      max-width: 840px;
      width: 95%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .header-title-permisos {
      display: flex;
      align-items: center;
      gap: 12px;
      .perm-title-icon {
        color: #0d9488;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .rol-badge {
        background: #e6f4ea;
        color: #137333;
        padding: 3px 10px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: 0.5px;
      }
    }
    .permisos-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 10px 0 14px;
      .stat-pill {
        font-size: 13px;
        color: #334155;
        strong { color: #0f766e; }
      }
      .perm-quick-actions {
        display: flex;
        gap: 8px;
      }
      .btn-quick-act {
        font-size: 11.5px;
        line-height: 28px;
        padding: 0 10px;
        height: 30px;
        mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }
      }
    }
    .modal-body-menus {
      flex: 1;
      overflow-y: auto;
      max-height: 520px;
      padding-right: 6px;
    }
    .menu-groups-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .menu-group-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.2s ease;
      &.group-active {
        border-color: #94a3b8;
        box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.05);
      }
    }
    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      .group-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .group-title-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        color: #0f172a;
        letter-spacing: 0.3px;
      }
      .group-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
        color: #0f766e;
      }
      .route-chip {
        font-size: 11px;
        color: #64748b;
        background: #e2e8f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
      .group-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .group-count-badge {
        font-size: 11px;
        padding: 2px 8px;
        background: #e2e8f0;
        color: #475569;
        border-radius: 12px;
        font-weight: 600;
        &.badge-all {
          background: #dcfce7;
          color: #15803d;
        }
      }
      .btn-micro-toggle {
        background: none;
        border: none;
        color: #0284c7;
        font-size: 11.5px;
        cursor: pointer;
        padding: 2px 4px;
        &:hover { text-decoration: underline; color: #0369a1; }
      }
      .divider-micro { color: #cbd5e1; font-size: 11px; }
    }
    .group-children-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 8px 12px;
      padding: 12px 16px;
      background: #ffffff;
    }
    .child-check-item {
      padding: 6px 10px;
      border-radius: 6px;
      transition: background 0.15s;
      &:hover { background: #f8fafc; }
      &.item-active { background: #f0fdf4; }
      .child-name {
        font-size: 12.5px;
        color: #1e293b;
        font-weight: 500;
      }
      .child-route-tag {
        margin-left: 6px;
        font-size: 10.5px;
        color: #64748b;
        font-family: monospace;
      }
    }
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

  readonly menusJerarquicos = computed<MenuNodo[]>(() => {
    const todos = this.menusDisponibles() || [];
    if (todos.length === 0) return [];

    // Padres (fid_menu_padre es nulo o vacío)
    const padres = todos
      .filter(m => !m.fid_menu_padre)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const resultado: MenuNodo[] = padres.map(padre => {
      const hijos = todos
        .filter(m => m.fid_menu_padre === padre.id_menu)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      return { padre, hijos };
    });

    // Menús huérfanos o sin padre identificado
    const idsPadres = new Set(padres.map(p => p.id_menu));
    const idsHijos = new Set(resultado.flatMap(r => r.hijos.map(h => h.id_menu)));
    const huerfanos = todos.filter(m => !idsPadres.has(m.id_menu) && !idsHijos.has(m.id_menu));
    if (huerfanos.length > 0) {
      resultado.push({
        padre: { id_menu: -1, nombre: 'OTROS MÓDULOS', orden: 99, ruta: '', estado: 'ACTIVO' },
        hijos: huerfanos
      });
    }

    return resultado;
  });

  isPadreChecked(nodo: MenuNodo): boolean {
    if (nodo.padre.id_menu && nodo.padre.id_menu > 0) {
      if (this.menusAsignadosIds().has(nodo.padre.id_menu)) return true;
    }
    if (nodo.hijos.length > 0) {
      return nodo.hijos.every(h => h.id_menu && this.menusAsignadosIds().has(h.id_menu));
    }
    return false;
  }

  isPadreIndeterminate(nodo: MenuNodo): boolean {
    if (nodo.hijos.length === 0) return false;
    const activos = this.cantHijosActivos(nodo);
    return activos > 0 && activos < nodo.hijos.length;
  }

  cantHijosActivos(nodo: MenuNodo): number {
    return nodo.hijos.filter(h => h.id_menu && this.menusAsignadosIds().has(h.id_menu)).length;
  }

  togglePadre(nodo: MenuNodo, checked: boolean): void {
    this.menusAsignadosIds.update(set => {
      const nuevo = new Set(set);
      if (checked) {
        if (nodo.padre.id_menu && nodo.padre.id_menu > 0) {
          nuevo.add(nodo.padre.id_menu);
        }
        nodo.hijos.forEach(h => {
          if (h.id_menu) nuevo.add(h.id_menu);
        });
      } else {
        if (nodo.padre.id_menu && nodo.padre.id_menu > 0) {
          nuevo.delete(nodo.padre.id_menu);
        }
        nodo.hijos.forEach(h => {
          if (h.id_menu) nuevo.delete(h.id_menu);
        });
      }
      return nuevo;
    });
  }

  toggleHijo(padre: MenuAdmin, hijo: MenuAdmin, checked: boolean, grupo: MenuNodo): void {
    if (!hijo.id_menu) return;
    this.menusAsignadosIds.update(set => {
      const nuevo = new Set(set);
      if (checked) {
        nuevo.add(hijo.id_menu!);
        if (padre.id_menu && padre.id_menu > 0) {
          nuevo.add(padre.id_menu);
        }
      } else {
        nuevo.delete(hijo.id_menu!);
        const algunHijoSigueActivo = grupo.hijos.some(h => h.id_menu !== hijo.id_menu && nuevo.has(h.id_menu!));
        if (!algunHijoSigueActivo && (!padre.ruta || padre.ruta.trim() === '')) {
          if (padre.id_menu && padre.id_menu > 0) {
            nuevo.delete(padre.id_menu);
          }
        }
      }
      return nuevo;
    });
  }

  marcarTodosGrupo(nodo: MenuNodo): void {
    this.togglePadre(nodo, true);
  }

  desmarcarTodosGrupo(nodo: MenuNodo): void {
    this.togglePadre(nodo, false);
  }

  marcarTodos(): void {
    const ids = new Set<number>();
    this.menusDisponibles().forEach(m => {
      if (m.id_menu && m.id_menu > 0) ids.add(m.id_menu);
    });
    this.menusAsignadosIds.set(ids);
  }

  desmarcarTodos(): void {
    this.menusAsignadosIds.set(new Set());
  }

  getIconoPadre(nombre: string): string {
    const n = (nombre || '').toUpperCase();
    if (n.includes('ADMIN')) return 'admin_panel_settings';
    if (n.includes('CONFIG')) return 'tune';
    if (n.includes('DOC')) return 'description';
    if (n.includes('CATALOG')) return 'menu_book';
    if (n.includes('ARCHIV')) return 'inventory_2';
    if (n.includes('VENTANILLA')) return 'mark_email_unread';
    return 'folder';
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
