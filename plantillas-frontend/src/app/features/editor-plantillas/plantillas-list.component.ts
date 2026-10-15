import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlantillaFormly, PlantillasService } from '../../core/services/plantillas.service';
import { DocumentosService } from '../../core/services/documentos.service';

@Component({
  selector: 'app-plantillas-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Gestor de Plantillas Formly</h1>
          <p class="subtitle">Administración y diseño de formularios institucionales</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/plantillas/nuevo">
          <mat-icon>add</mat-icon>
          <span>Nueva Plantilla</span>
        </button>
      </div>

      <mat-card class="table-card">
        <div class="toolbar-filter">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar plantilla...</mat-label>
            <input matInput (input)="onFilterChange($event)" placeholder="Ej. Informe, Memorando...">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </div>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <table mat-table [dataSource]="plantillas()" class="w-full">
          <!-- ID Column -->
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let p">{{ p.id_plantilla_formly }}</td>
          </ng-container>

          <!-- Nombre Column -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre de Plantilla</th>
            <td mat-cell *matCellDef="let p">
              <strong>{{ p.nombre }}</strong>
            </td>
          </ng-container>

          <!-- Abreviación Column -->
          <ng-container matColumnDef="abreviacion">
            <th mat-header-cell *matHeaderCellDef>Abreviación</th>
            <td mat-cell *matCellDef="let p">
              <span class="badge-tag">{{ p.abreviacion }}</span>
            </td>
          </ng-container>

          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let p">
              <span class="badge-tag" [ngClass]="p.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'">
                {{ p.estado }}
              </span>
            </td>
          </ng-container>

          <!-- Acciones Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
            <td mat-cell *matCellDef="let p" class="text-right">
              <button mat-icon-button color="accent" (click)="redactarConPlantilla(p)" matTooltip="Redactar documento con esta plantilla">
                <mat-icon>post_add</mat-icon>
              </button>
              <a mat-icon-button color="primary" [routerLink]="['/plantillas', p.id_plantilla_formly, 'editar']" matTooltip="Editar diseño">
                <mat-icon>edit</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-cell" [attr.colspan]="displayedColumns.length">
              <mat-icon class="empty-icon">find_in_page</mat-icon>
              <p>No se encontraron plantillas registradas.</p>
            </td>
          </tr>
        </table>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5, 10, 25]"
          (page)="onPageChange($event)">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      h1 { margin: 0; color: #1a237e; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0 0; color: #607d8b; }
      button { display: flex; align-items: center; gap: 6px; }
    }
    .table-card {
      border-radius: 12px;
      overflow: hidden;
    }
    .toolbar-filter {
      padding: 16px;
    }
    .search-field {
      width: 320px;
      margin-bottom: -1.25em;
    }
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .empty-cell {
      text-align: center;
      padding: 40px !important;
      color: #90a4ae;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
  `]
})
export class PlantillasListComponent implements OnInit {
  private readonly plantillasService = inject(PlantillasService);
  private readonly documentosService = inject(DocumentosService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['id', 'nombre', 'abreviacion', 'estado', 'acciones'];
  readonly plantillas = signal<PlantillaFormly[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly loading = signal(false);
  private searchFilter = '';

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  cargarPlantillas(): void {
    this.loading.set(true);
    this.plantillasService.getPlantillas(this.pageSize(), this.pageIndex() + 1, this.searchFilter).subscribe({
      next: (res) => {
        this.loading.set(false);
        const data = res.datos;
        this.plantillas.set(data.resultado || []);
        this.total.set(data.total || 0);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.cargarPlantillas();
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchFilter = input.value.trim();
    this.pageIndex.set(0);
    this.cargarPlantillas();
  }

  redactarConPlantilla(p: PlantillaFormly): void {
    const payload = {
      nombre: 'BORRADOR',
      plantilla: p.plantilla,
      plantilla_valor: JSON.stringify({ inputSelect: 'Reservado' }),
      sw: { enviado: false, enviar: false },
      fid_plantilla: p.id_plantilla_formly
    };

    this.documentosService.crearDocumento(payload).subscribe({
      next: (res) => {
        const doc = res.datos;
        this.snackBar.open('Borrador creado exitosamente', 'Cerrar', { duration: 3000 });
        if (doc?.id_documento) {
          this.router.navigate(['/documentos', doc.id_documento]);
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al instanciar el documento', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
