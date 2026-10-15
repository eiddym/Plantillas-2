import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Rol, SeguridadService } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Roles del Sistema</h1>
        <p class="subtitle">Roles institucionales y niveles de privilegio asignables</p>
      </div>

      <mat-card class="table-card">
        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="roles()" class="w-full">
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
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header {
      margin-bottom: 24px;
      h1 { margin: 0; color: #1a237e; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0 0; color: #607d8b; }
    }
    .table-card { border-radius: 12px; overflow: hidden; }
    .w-full { width: 100%; }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table-responsive table {
      min-width: 500px;
    }

    @media (max-width: 768px) {
      .page-header {
        margin-bottom: 16px;
        h1 { font-size: 1.45rem; }
      }
    }
  `]
})
export class RolesListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);

  readonly displayedColumns = ['id', 'nombre', 'descripcion', 'peso', 'estado'];
  readonly roles = signal<Rol[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.seguridadService.getRoles().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.roles.set(res.datos?.resultado || []);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
