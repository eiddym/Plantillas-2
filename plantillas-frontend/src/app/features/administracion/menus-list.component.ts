import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MenuAdmin, Rol, SeguridadService } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-menus-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-titles">
          <h1>Administración de Menús</h1>
          <p class="subtitle">Estructura jerárquica de módulos, accesos y rutas del sistema</p>
        </div>
        <div class="header-actions">
          <span class="stat-badge">Total Menús: <strong>{{ menus().length }}</strong></span>
          <button mat-flat-button color="primary" class="btn-crear" (click)="abrirModalCrear()">
            <mat-icon>add</mat-icon>
            Nuevo Menú
          </button>
        </div>
      </div>

      <mat-card class="table-card">
        <!-- Barra de búsqueda y filtros -->
        <div class="card-toolbar">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="searchQuery" placeholder="Filtrar por nombre, ruta o descripción...">
          </mat-form-field>

          <span class="toolbar-spacer"></span>

          <div class="filter-toggles">
            <button 
              mat-button 
              [class.active-filter]="filtroPadre() === 'TODOS'" 
              (click)="filtroPadre.set('TODOS')"
            >
              Todos
            </button>
            <button 
              mat-button 
              [class.active-filter]="filtroPadre() === 'PRINCIPALES'" 
              (click)="filtroPadre.set('PRINCIPALES')"
            >
              Módulos Principales
            </button>
            <button 
              mat-button 
              [class.active-filter]="filtroPadre() === 'SUBMENUS'" 
              (click)="filtroPadre.set('SUBMENUS')"
            >
              Submenús
            </button>
          </div>
        </div>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="filteredMenus()" class="w-full menus-table">
            <!-- ID Column -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let m" class="id-cell">#{{ m.id_menu }}</td>
            </ng-container>

            <!-- Icono Column -->
            <ng-container matColumnDef="icono">
              <th mat-header-cell *matHeaderCellDef>Icono</th>
              <td mat-cell *matCellDef="let m">
                <div class="icon-avatar">
                  <mat-icon>{{ m.icono || 'folder' }}</mat-icon>
                </div>
              </td>
            </ng-container>

            <!-- Nombre Column -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre del Menú</th>
              <td mat-cell *matCellDef="let m">
                <div class="menu-name-col">
                  <span class="tree-bullet" *ngIf="m.fid_menu_padre">&bull;</span>
                  <strong [class.parent-text]="!m.fid_menu_padre">{{ m.nombre }}</strong>
                  <span class="parent-chip" *ngIf="obtenerNombrePadre(m.fid_menu_padre)">
                    En: {{ obtenerNombrePadre(m.fid_menu_padre) }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Ruta Column -->
            <ng-container matColumnDef="ruta">
              <th mat-header-cell *matHeaderCellDef>Ruta de Acceso</th>
              <td mat-cell *matCellDef="let m">
                <code class="route-code" *ngIf="m.ruta">/{{ m.ruta }}</code>
                <span class="no-route" *ngIf="!m.ruta">&mdash;</span>
              </td>
            </ng-container>

            <!-- Orden Column -->
            <ng-container matColumnDef="orden">
              <th mat-header-cell *matHeaderCellDef>Orden</th>
              <td mat-cell *matCellDef="let m">{{ m.orden }}</td>
            </ng-container>

            <!-- Descripción Column -->
            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let m" class="desc-cell">{{ m.descripcion || 'Sin descripción' }}</td>
            </ng-container>

            <!-- Estado Column -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let m">
                <span class="badge-tag" [ngClass]="m.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                  {{ m.estado }}
                </span>
              </td>
            </ng-container>

            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let m" class="text-right actions-cell">
                <button 
                  mat-stroked-button 
                  color="primary"
                  class="btn-roles"
                  (click)="abrirModalAsignarRoles(m)"
                  matTooltip="Reasignar roles que tienen acceso a este menú"
                >
                  <mat-icon>admin_panel_settings</mat-icon>
                  Roles
                </button>
                <button 
                  mat-icon-button 
                  color="accent" 
                  (click)="abrirModalEditar(m)"
                  matTooltip="Editar menú"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  color="warn" 
                  (click)="confirmarEliminar(m)"
                  matTooltip="Eliminar menú"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.parent-row]="!row.fid_menu_padre"></tr>
          </table>
        </div>
      </mat-card>

      <!-- Modal Reasignar Roles al Menú -->
      <div class="modal-backdrop" *ngIf="modalRolesVisible()">
        <div class="modal-container modal-roles">
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <div class="modal-icon-badge">
                <mat-icon>{{ menuSeleccionado()?.icono || 'menu' }}</mat-icon>
              </div>
              <div>
                <h2>Reasignar Roles al Menú</h2>
                <p class="modal-subtitle">
                  Configura qué roles de usuario pueden ver y acceder al menú <strong>{{ menuSeleccionado()?.nombre }}</strong>
                </p>
              </div>
            </div>
            <button mat-icon-button (click)="cerrarModalRoles()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <div class="roles-quick-actions">
              <span>Roles disponibles en el sistema:</span>
              <div class="quick-btns">
                <button mat-button class="quick-btn" (click)="seleccionarTodosRoles()">Seleccionar todos</button>
                <button mat-button class="quick-btn" (click)="deseleccionarTodosRoles()">Deseleccionar todos</button>
              </div>
            </div>

            <div class="roles-selection-grid">
              <div 
                *ngFor="let rol of listaRoles()" 
                class="role-checkbox-card"
                [class.selected]="esRolSeleccionado(rol.id_rol)"
                (click)="toggleRol(rol.id_rol)"
              >
                <mat-checkbox 
                  [checked]="esRolSeleccionado(rol.id_rol)"
                  (click)="$event.stopPropagation()"
                  (change)="toggleRol(rol.id_rol)"
                  color="primary"
                >
                </mat-checkbox>
                <div class="role-info">
                  <div class="role-name">{{ rol.nombre }}</div>
                  <div class="role-desc">{{ rol.descripcion || 'Sin descripción' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button mat-button (click)="cerrarModalRoles()">Cancelar</button>
            <button mat-flat-button color="primary" [disabled]="guardandoRoles()" (click)="guardarRolesMenu()">
              <mat-icon *ngIf="!guardandoRoles()">check</mat-icon>
              {{ guardandoRoles() ? 'Guardando...' : 'Guardar Asignación' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Crear / Editar Menú -->
      <div class="modal-backdrop" *ngIf="modalMenuVisible()">
        <div class="modal-container">
          <div class="modal-header">
            <h2>{{ modoEdicion() ? 'Editar Menú' : 'Nuevo Menú' }}</h2>
            <button mat-icon-button (click)="cerrarModalMenu()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="menuForm" (ngSubmit)="guardarMenu()">
            <div class="modal-body form-grid">
              <mat-form-field appearance="outline" class="col-span-2">
                <mat-label>Nombre del Menú</mat-label>
                <input matInput formControlName="nombre" placeholder="Ej: Documentos, Reportes, etc.">
                <mat-error *ngIf="menuForm.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Ruta (URL relativa)</mat-label>
                <input matInput formControlName="ruta" placeholder="Ej: documentos/bandeja">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Icono Material</mat-label>
                <input matInput formControlName="icono" placeholder="Ej: folder, description, people">
                <mat-icon matSuffix>{{ menuForm.get('icono')?.value || 'folder' }}</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Menú Padre (Módulo contenedor)</mat-label>
                <mat-select formControlName="fid_menu_padre">
                  <mat-option [value]="null">-- Ninguno (Módulo Principal) --</mat-option>
                  <mat-option *ngFor="let p of listaModulosPrincipales()" [value]="p.id_menu">
                    {{ p.nombre }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Orden de visualización</mat-label>
                <input matInput type="number" formControlName="orden">
              </mat-form-field>

              <mat-form-field appearance="outline" class="col-span-2">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="descripcion" rows="2" placeholder="Detalle o función del módulo..."></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Estado</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="ACTIVO">ACTIVO</mat-option>
                  <mat-option value="INACTIVO">INACTIVO</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="modal-footer">
              <button type="button" mat-button (click)="cerrarModalMenu()">Cancelar</button>
              <button type="submit" mat-flat-button color="primary" [disabled]="menuForm.invalid || guardandoMenu()">
                {{ guardandoMenu() ? 'Guardando...' : (modoEdicion() ? 'Actualizar Menú' : 'Crear Menú') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1250px;
      margin: 0 auto;
      font-family: var(--font-ui);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;

      h1 {
        margin: 0;
        color: #0f172a;
        font-size: 1.65rem;
        font-weight: 800;
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 0.88rem;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-crear {
      font-weight: 600;
      border-radius: 8px;
      padding: 0 18px;
      height: 40px;
    }

    .stat-badge {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 0.85rem;
      color: #334155;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      strong {
        color: #0284c7;
      }
    }

    .table-card {
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .card-toolbar {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      gap: 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .search-field {
      width: 320px;
      font-size: 0.88rem;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .filter-toggles {
      display: flex;
      background: #e2e8f0;
      border-radius: 8px;
      padding: 3px;
      gap: 2px;

      button {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        border-radius: 6px;
        min-width: unset;
        padding: 4px 12px;
        line-height: 24px;
        height: 32px;
        transition: all 0.2s ease;

        &.active-filter {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
      }
    }

    .table-responsive {
      overflow-x: auto;
    }

    .menus-table {
      width: 100%;

      th {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #64748b;
        font-weight: 700;
        background: #f8fafc;
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      td {
        padding: 12px 16px;
        font-size: 0.88rem;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
      }

      tr.parent-row {
        background-color: #fafbfc;
      }

      tr:hover {
        background-color: #f1f5f9;
      }
    }

    .id-cell {
      font-weight: 700;
      color: #94a3b8;
      font-size: 0.8rem;
      width: 50px;
    }

    .icon-avatar {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .menu-name-col {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .tree-bullet {
        color: #94a3b8;
        font-size: 1.2rem;
        line-height: 0;
      }

      strong {
        color: #1e293b;
        font-size: 0.92rem;

        &.parent-text {
          font-weight: 700;
          color: #0f172a;
        }
      }

      .parent-chip {
        font-size: 0.72rem;
        padding: 2px 8px;
        background: #f1f5f9;
        color: #64748b;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
    }

    .route-code {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      background: #f1f5f9;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .no-route {
      color: #94a3b8;
    }

    .desc-cell {
      max-width: 220px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.3px;

      &.badge-activo {
        background: #dcfce7;
        color: #15803d;
      }

      &.badge-inactivo {
        background: #fee2e2;
        color: #b91c1c;
      }
    }

    .actions-cell {
      white-space: nowrap;

      .btn-roles {
        margin-right: 6px;
        border-radius: 6px;
        font-size: 0.8rem;
        height: 32px;
        line-height: 30px;
        padding: 0 10px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          margin-right: 4px;
        }
      }
    }

    .text-right {
      text-align: right;
    }

    /* Modales */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-container {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;

      &.modal-roles {
        max-width: 700px;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
      }

      .modal-subtitle {
        margin: 4px 0 0 0;
        font-size: 0.85rem;
        color: #64748b;
      }
    }

    .modal-title-with-icon {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .modal-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .modal-body {
      padding: 20px 24px;
      flex: 1;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .col-span-2 {
        grid-column: span 2;
      }
    }

    .roles-quick-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      font-size: 0.85rem;
      color: #475569;
      font-weight: 600;

      .quick-btns {
        display: flex;
        gap: 8px;

        .quick-btn {
          font-size: 0.78rem;
          color: #0284c7;
          height: 28px;
          line-height: 28px;
          padding: 0 8px;
        }
      }
    }

    .roles-selection-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      max-height: 380px;
      overflow-y: auto;
      padding: 4px;
    }

    .role-checkbox-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #cbd5e1;
        background: #f1f5f9;
      }

      &.selected {
        border-color: #0284c7;
        background: #f0f9ff;
      }

      .role-info {
        flex: 1;

        .role-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: #0f172a;
        }

        .role-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.25;
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 0 0 14px 14px;
    }
  `]
})
export class MenusListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly menus = signal<MenuAdmin[]>([]);
  readonly loading = signal(false);
  readonly searchQuery = signal('');
  readonly filtroPadre = signal<'TODOS' | 'PRINCIPALES' | 'SUBMENUS'>('TODOS');

  readonly displayedColumns = ['id', 'icono', 'nombre', 'ruta', 'orden', 'descripcion', 'estado', 'acciones'];

  // Asignar roles modal state
  readonly modalRolesVisible = signal(false);
  readonly menuSeleccionado = signal<MenuAdmin | null>(null);
  readonly listaRoles = signal<Rol[]>([]);
  readonly rolesSeleccionados = signal<Set<number>>(new Set());
  readonly guardandoRoles = signal(false);

  // Crear/Editar modal state
  readonly modalMenuVisible = signal(false);
  readonly modoEdicion = signal(false);
  readonly menuEditandoId = signal<number | null>(null);
  readonly guardandoMenu = signal(false);

  menuForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    ruta: [''],
    icono: ['folder'],
    fid_menu_padre: [null],
    orden: [1, [Validators.required]],
    descripcion: [''],
    estado: ['ACTIVO', [Validators.required]]
  });

  readonly listaModulosPrincipales = computed(() => {
    return this.menus().filter((m) => !m.fid_menu_padre);
  });

  readonly filteredMenus = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filtro = this.filtroPadre();
    const list = this.menus();

    return list.filter((m) => {
      // Filtro por tipo
      if (filtro === 'PRINCIPALES' && m.fid_menu_padre !== null && m.fid_menu_padre !== undefined) {
        return false;
      }
      if (filtro === 'SUBMENUS' && (m.fid_menu_padre === null || m.fid_menu_padre === undefined)) {
        return false;
      }

      // Filtro de texto
      if (!query) return true;
      const nombre = (m.nombre || '').toLowerCase();
      const ruta = (m.ruta || '').toLowerCase();
      const desc = (m.descripcion || '').toLowerCase();
      return nombre.includes(query) || ruta.includes(query) || desc.includes(query);
    });
  });

  ngOnInit(): void {
    this.cargarMenus();
    this.cargarRoles();
  }

  cargarMenus(): void {
    this.loading.set(true);
    this.seguridadService.getMenus().subscribe({
      next: (res) => {
        const resultado = res.datos.resultado || [];
        resultado.sort((a, b) => {
          const padreA = a.fid_menu_padre ?? a.id_menu ?? 0;
          const padreB = b.fid_menu_padre ?? b.id_menu ?? 0;
          if (padreA !== padreB) return padreA - padreB;
          return a.orden - b.orden;
        });
        this.menus.set(resultado);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  cargarRoles(): void {
    this.seguridadService.getRoles().subscribe({
      next: (res) => {
        const roles = res.datos.resultado || [];
        this.listaRoles.set(roles);
      }
    });
  }

  obtenerNombrePadre(fidPadre?: number | null): string | null {
    if (!fidPadre) return null;
    const padre = this.menus().find((m) => m.id_menu === fidPadre);
    return padre ? padre.nombre : `#${fidPadre}`;
  }

  // --- Reasignar Roles al Menú ---
  abrirModalAsignarRoles(m: MenuAdmin): void {
    this.menuSeleccionado.set(m);
    this.rolesSeleccionados.set(new Set());
    this.modalRolesVisible.set(true);

    if (m.id_menu) {
      this.seguridadService.getMenuRoles(m.id_menu).subscribe({
        next: (res) => {
          const asignaciones = res.datos || [];
          const ids = new Set<number>();
          asignaciones.forEach((item: any) => {
            if (item.estado === 'ACTIVO' && item.fid_rol) {
              ids.add(item.fid_rol);
            }
          });
          this.rolesSeleccionados.set(ids);
        }
      });
    }
  }

  cerrarModalRoles(): void {
    this.modalRolesVisible.set(false);
    this.menuSeleccionado.set(null);
  }

  esRolSeleccionado(idRol?: number): boolean {
    return !!idRol && this.rolesSeleccionados().has(idRol);
  }

  toggleRol(idRol?: number): void {
    if (!idRol) return;
    const set = new Set(this.rolesSeleccionados());
    if (set.has(idRol)) {
      set.delete(idRol);
    } else {
      set.add(idRol);
    }
    this.rolesSeleccionados.set(set);
  }

  seleccionarTodosRoles(): void {
    const ids = new Set<number>();
    this.listaRoles().forEach((r) => {
      if (r.id_rol) ids.add(r.id_rol);
    });
    this.rolesSeleccionados.set(ids);
  }

  deseleccionarTodosRoles(): void {
    this.rolesSeleccionados.set(new Set());
  }

  guardarRolesMenu(): void {
    const m = this.menuSeleccionado();
    if (!m || !m.id_menu) return;

    this.guardandoRoles.set(true);
    const rolesArray = Array.from(this.rolesSeleccionados());

    this.seguridadService.actualizarMenuRoles(m.id_menu, rolesArray).subscribe({
      next: () => {
        this.guardandoRoles.set(false);
        this.snackBar.open(`Roles reasignados al menú "${m.nombre}" con éxito`, 'Cerrar', { duration: 3500 });
        this.cerrarModalRoles();
      },
      error: () => {
        this.guardandoRoles.set(false);
        this.snackBar.open('Error al reasignar roles al menú', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // --- Crear / Editar Menú ---
  abrirModalCrear(): void {
    this.modoEdicion.set(false);
    this.menuEditandoId.set(null);
    this.menuForm.reset({
      nombre: '',
      ruta: '',
      icono: 'folder',
      fid_menu_padre: null,
      orden: (this.menus().length || 0) + 1,
      descripcion: '',
      estado: 'ACTIVO'
    });
    this.modalMenuVisible.set(true);
  }

  abrirModalEditar(m: MenuAdmin): void {
    this.modoEdicion.set(true);
    this.menuEditandoId.set(m.id_menu ?? null);
    this.menuForm.patchValue({
      nombre: m.nombre,
      ruta: m.ruta || '',
      icono: m.icono || 'folder',
      fid_menu_padre: m.fid_menu_padre || null,
      orden: m.orden || 1,
      descripcion: m.descripcion || '',
      estado: m.estado || 'ACTIVO'
    });
    this.modalMenuVisible.set(true);
  }

  cerrarModalMenu(): void {
    this.modalMenuVisible.set(false);
  }

  guardarMenu(): void {
    if (this.menuForm.invalid) return;
    this.guardandoMenu.set(true);

    const val = this.menuForm.value;
    const payload: Partial<MenuAdmin> = {
      nombre: val.nombre,
      ruta: val.ruta || null,
      icono: val.icono || 'folder',
      fid_menu_padre: val.fid_menu_padre || null,
      orden: Number(val.orden || 1),
      descripcion: val.descripcion || null,
      estado: val.estado || 'ACTIVO'
    };

    if (this.modoEdicion() && this.menuEditandoId()) {
      this.seguridadService.actualizarMenu(this.menuEditandoId()!, payload).subscribe({
        next: () => {
          this.guardandoMenu.set(false);
          this.snackBar.open('Menú actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.cerrarModalMenu();
          this.cargarMenus();
        },
        error: () => {
          this.guardandoMenu.set(false);
          this.snackBar.open('Error al actualizar el menú', 'Cerrar', { duration: 4000 });
        }
      });
    } else {
      this.seguridadService.crearMenu(payload as MenuAdmin).subscribe({
        next: () => {
          this.guardandoMenu.set(false);
          this.snackBar.open('Menú creado correctamente', 'Cerrar', { duration: 3000 });
          this.cerrarModalMenu();
          this.cargarMenus();
        },
        error: () => {
          this.guardandoMenu.set(false);
          this.snackBar.open('Error al crear el menú', 'Cerrar', { duration: 4000 });
        }
      });
    }
  }

  confirmarEliminar(m: MenuAdmin): void {
    if (!m.id_menu) return;
    if (confirm(`¿Está seguro de eliminar el menú "${m.nombre}"?`)) {
      this.seguridadService.eliminarMenu(m.id_menu).subscribe({
        next: () => {
          this.snackBar.open('Menú eliminado correctamente', 'Cerrar', { duration: 3000 });
          this.cargarMenus();
        },
        error: () => {
          this.snackBar.open('No se pudo eliminar el menú (puede tener submenús o roles asignados)', 'Cerrar', { duration: 4000 });
        }
      });
    }
  }
}
