import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuAdmin, SeguridadService } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-menus-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-titles">
          <h1>Administración de Menús</h1>
          <p class="subtitle">Estructura jerárquica de módulos, accesos y rutas del sistema</p>
        </div>
        <div class="header-stats">
          <span class="stat-badge">Total Menús: <strong>{{ menus().length }}</strong></span>
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

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.parent-row]="!row.fid_menu_padre"></tr>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
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
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .search-field {
      width: 340px;
      font-size: 0.88rem;
    }

    .toolbar-spacer {
      flex: 1 1 auto;
    }

    .filter-toggles {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 8px;

      button {
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 6px;
        color: #64748b;
        padding: 0 12px;
        height: 32px;
        line-height: 32px;
      }

      .active-filter {
        background: #ffffff !important;
        color: #0284c7 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .menus-table {
      width: 100%;

      th.mat-mdc-header-cell {
        background-color: #0f2027 !important;
        color: #ffffff !important;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 14px 16px;
      }

      td.mat-mdc-cell {
        font-size: 0.85rem;
        padding: 12px 16px;
      }
    }

    .parent-row {
      background: #f8fafc;
    }

    .id-cell {
      font-weight: 700;
      color: #94a3b8;
    }

    .icon-avatar {
      width: 32px;
      height: 32px;
      border-radius: 6px;
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
    }

    .tree-bullet {
      color: #94a3b8;
      font-size: 1.2rem;
    }

    .parent-text {
      color: #0f172a;
      font-weight: 800;
    }

    .parent-chip {
      font-size: 0.7rem;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-weight: 600;
    }

    .route-code {
      background: #f1f5f9;
      color: #2563eb;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-family: monospace;
    }

    .no-route {
      color: #cbd5e1;
    }

    .desc-cell {
      color: #64748b;
      max-width: 280px;
    }

    .badge-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .badge-activo {
      background: #ecfdf5;
      color: #059669;
    }

    .badge-inactivo {
      background: #fef2f2;
      color: #dc2626;
    }

    @media (max-width: 768px) {
      .card-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-field {
        width: 100%;
      }
      .filter-toggles {
        width: 100%;
        justify-content: space-around;
      }
    }
  `]
})
export class MenusListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);

  readonly menus = signal<MenuAdmin[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly filtroPadre = signal<'TODOS' | 'PRINCIPALES' | 'SUBMENUS'>('TODOS');

  readonly displayedColumns = ['id', 'icono', 'nombre', 'ruta', 'orden', 'descripcion', 'estado'];

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
  }

  cargarMenus(): void {
    this.loading.set(true);
    this.seguridadService.getMenus().subscribe({
      next: (res) => {
        const resultado = res.datos.resultado || [];
        // Ordenar por menú padre y orden
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

  obtenerNombrePadre(fidPadre?: number | null): string | null {
    if (!fidPadre) return null;
    const padre = this.menus().find((m) => m.id_menu === fidPadre);
    return padre ? padre.nombre : `#${fidPadre}`;
  }
}
