import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { SeguridadService, UsuarioAdmin } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p class="subtitle">Usuarios del sistema, roles asignados y estado de cuenta</p>
        </div>
      </div>

      <mat-card class="table-card">
        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="usuarios()" class="w-full">
            <!-- Usuario Column -->
            <ng-container matColumnDef="usuario">
              <th mat-header-cell *matHeaderCellDef>Usuario</th>
              <td mat-cell *matCellDef="let u">
                <div class="user-cell">
                  <mat-icon class="user-avatar-icon">account_circle</mat-icon>
                  <div>
                    <strong>{{ u.usuario }}</strong>
                    <small class="user-email">{{ u.email }}</small>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Nombre Completo Column -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre Completo</th>
              <td mat-cell *matCellDef="let u">
                {{ u.nombres }} {{ u.apellidos }}
              </td>
            </ng-container>

            <!-- Cargo Column -->
            <ng-container matColumnDef="cargo">
              <th mat-header-cell *matHeaderCellDef>Cargo</th>
              <td mat-cell *matCellDef="let u">{{ u.cargo || 'Sin cargo' }}</td>
            </ng-container>

            <!-- Roles Column -->
            <ng-container matColumnDef="roles">
              <th mat-header-cell *matHeaderCellDef>Roles Asignados</th>
              <td mat-cell *matCellDef="let u">
                <div class="roles-wrap">
                  <span class="role-tag" *ngFor="let ur of u.usuario_rol">
                    {{ ur.rol?.nombre }}
                  </span>
                  <span *ngIf="!u.usuario_rol || u.usuario_rol.length === 0" class="no-role">Sin rol</span>
                </div>
              </td>
            </ng-container>

            <!-- Estado Column -->
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
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header {
      margin-bottom: 24px;
      h1 { margin: 0; color: #1a237e; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0 0; color: #607d8b; }
    }
    .table-card { border-radius: 12px; overflow: hidden; }
    .w-full { width: 100%; }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
    }
    .user-avatar-icon {
      color: #3f51b5;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .user-email {
      display: block;
      color: #78909c;
      font-size: 0.8rem;
    }
    .roles-wrap {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .role-tag {
      background: #e8eaf6;
      color: #283593;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .no-role { color: #b0bec5; font-style: italic; font-size: 0.8rem; }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table-responsive table {
      min-width: 580px;
    }

    @media (max-width: 768px) {
      .page-header {
        margin-bottom: 16px;
        h1 { font-size: 1.45rem; }
      }
    }
  `]
})
export class UsuariosListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);

  readonly displayedColumns = ['usuario', 'nombre', 'cargo', 'roles', 'estado'];
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.seguridadService.getUsuarios().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.usuarios.set(res.datos || []);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
