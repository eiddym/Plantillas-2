import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SeguridadService, Unidad } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-unidades-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Unidades Organizacionales</h1>
        <p class="subtitle">Estructura de unidades y departamentos de la institución</p>
      </div>

      <mat-card class="table-card">
        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <table mat-table [dataSource]="unidades()" class="w-full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let u">{{ u.id_unidad }}</td>
          </ng-container>

          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre de la Unidad</th>
            <td mat-cell *matCellDef="let u">
              <strong>{{ u.nombre }}</strong>
            </td>
          </ng-container>

          <ng-container matColumnDef="sigla">
            <th mat-header-cell *matHeaderCellDef>Sigla</th>
            <td mat-cell *matCellDef="let u">
              <span class="badge-tag">{{ u.sigla || '-' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="descripcion">
            <th mat-header-cell *matHeaderCellDef>Descripción</th>
            <td mat-cell *matCellDef="let u">{{ u.descripcion || 'Sin descripción' }}</td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let u">
              <span class="badge-tag" [ngClass]="u.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                {{ u.estado }}
              </span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
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
  `]
})
export class UnidadesListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);

  readonly displayedColumns = ['id', 'nombre', 'sigla', 'descripcion', 'estado'];
  readonly unidades = signal<Unidad[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.seguridadService.getUnidades().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.unidades.set(res.datos?.resultado || []);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
