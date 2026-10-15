import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CatalogoItem, CatalogosService } from '../../core/services/catalogos.service';
import { CatalogoDialogComponent } from './catalogo-dialog.component';

@Component({
  selector: 'app-catalogos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Mis Catálogos Institucionales</h1>
          <p class="subtitle">Agrupación temática de documentos mediante referenciación de CITEs oficiales</p>
        </div>

        <button mat-raised-button class="btn-crear" (click)="abrirCrearCatalogo()">
          <mat-icon>create_new_folder</mat-icon>
          <span>Armar Catálogo por CITEs</span>
        </button>
      </div>

      <mat-card class="table-card">
        <div class="card-toolbar">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="filtroTexto" (keyup)="onFiltrar()" placeholder="Buscar por nombre o descripción...">
          </mat-form-field>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="catalogos()" class="w-full catalogos-table">
            <!-- ID Column -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let c" class="id-col">#{{ c.id_catalogo }}</td>
            </ng-container>

            <!-- Nombre Column -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>NOMBRE DEL CATÁLOGO</th>
              <td mat-cell *matCellDef="let c">
                <div class="name-cell">
                  <div class="folder-avatar">
                    <mat-icon>folder</mat-icon>
                  </div>
                  <div>
                    <strong class="catalog-title">{{ c.nombre }}</strong>
                    <span class="catalog-desc">{{ c.descripcion || 'Sin descripción' }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Estado Column -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>ESTADO</th>
              <td mat-cell *matCellDef="let c">
                <span class="badge-tag" [ngClass]="c.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                  {{ c.estado }}
                </span>
              </td>
            </ng-container>

            <!-- Fecha Column -->
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef>CREACIÓN</th>
              <td mat-cell *matCellDef="let c">
                {{ c._fecha_creacion | date:'dd/MM/yyyy HH:mm' }}
              </td>
            </ng-container>

            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">ACCIONES</th>
              <td mat-cell *matCellDef="let c" class="text-right">
                <button mat-icon-button (click)="verDetalle(c)" matTooltip="Ver CITEs y usuarios compartidos">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminar(c)" matTooltip="Eliminar catálogo">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-cell" [attr.colspan]="displayedColumns.length">
                <mat-icon class="empty-icon">folder_open</mat-icon>
                <p>No tiene catálogos armados aún. Presione <strong>"Armar Catálogo por CITEs"</strong> para crear uno.</p>
              </td>
            </tr>
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
      gap: 16px;
      flex-wrap: wrap;

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

    .btn-crear {
      background: #0d9488 !important;
      color: #ffffff !important;
      border-radius: 20px !important;
      font-weight: 700 !important;
      height: 42px !important;
      padding: 0 20px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25) !important;
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
      border-bottom: 1px solid #e2e8f0;
    }

    .search-field {
      width: 340px;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .catalogos-table {
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
        font-size: 0.86rem;
        padding: 12px 16px;
      }
    }

    .id-col {
      color: #94a3b8;
      font-weight: 700;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .folder-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #ccfbf1;
      color: #0d9488;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .catalog-title {
      display: block;
      color: #0f172a;
      font-size: 0.9rem;
    }

    .catalog-desc {
      display: block;
      color: #64748b;
      font-size: 0.78rem;
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

    .badge-activo { background: #ecfdf5; color: #059669; }
    .badge-inactivo { background: #fef2f2; color: #dc2626; }

    .text-right { text-align: right; }

    .empty-cell {
      text-align: center;
      padding: 40px !important;
      color: #94a3b8;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #cbd5e1;
        margin-bottom: 8px;
      }

      p { margin: 0; font-size: 0.88rem; }
    }
  `]
})
export class CatalogosListComponent implements OnInit {
  private readonly catalogosService = inject(CatalogosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly catalogos = signal<CatalogoItem[]>([]);
  readonly cargando = signal(true);
  filtroTexto = '';

  readonly displayedColumns = ['id', 'nombre', 'estado', 'fecha', 'acciones'];

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.cargando.set(true);
    this.catalogosService.getMisCatalogos(this.filtroTexto).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.catalogos.set(res.datos.resultado || []);
      },
      error: () => this.cargando.set(false)
    });
  }

  onFiltrar(): void {
    this.cargarCatalogos();
  }

  abrirCrearCatalogo(): void {
    const dialogRef = this.dialog.open(CatalogoDialogComponent, {
      width: '780px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((creado) => {
      if (creado) {
        this.cargarCatalogos();
      }
    });
  }

  verDetalle(cat: CatalogoItem): void {
    this.dialog.open(CatalogoDialogComponent, {
      width: '780px',
      maxWidth: '95vw',
      data: {
        id_catalogo: cat.id_catalogo,
        soloLectura: true
      }
    });
  }

  eliminar(cat: CatalogoItem): void {
    if (!cat.id_catalogo) return;
    if (confirm(`¿Está seguro de eliminar el catálogo "${cat.nombre}"?`)) {
      this.catalogosService.eliminarCatalogo(cat.id_catalogo).subscribe({
        next: () => {
          this.snackBar.open('Catálogo eliminado correctamente', 'Cerrar', { duration: 3000 });
          this.cargarCatalogos();
        },
        error: (err) => {
          this.snackBar.open('Error al eliminar catálogo: ' + (err?.error?.mensaje || 'Error interno'), 'Cerrar', { duration: 4000 });
        }
      });
    }
  }
}
