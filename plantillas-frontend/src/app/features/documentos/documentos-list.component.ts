import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Documento, DocumentosService } from '../../core/services/documentos.service';
import { VisorPdfDialogComponent } from '../visor-pdf/visor-pdf-dialog.component';

@Component({
  selector: 'app-documentos-list',
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
    MatTabsModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Bandeja Documental</h1>
          <p class="subtitle">Gestión, aprobación y monitoreo del flujo de documentos</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/plantillas">
          <mat-icon>post_add</mat-icon>
          <span>Nuevo Documento</span>
        </button>
      </div>

      <mat-card class="table-card">
        <!-- Filter Tabs by Document State -->
        <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
          <mat-tab label="Todos los Documentos"></mat-tab>
          <mat-tab label="Nuevos / Borrador"></mat-tab>
          <mat-tab label="En Curso / Derivados"></mat-tab>
          <mat-tab label="Aprobados"></mat-tab>
          <mat-tab label="Cerrados / Archivo"></mat-tab>
        </mat-tab-group>

        <div class="toolbar-filter">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar por CITE, asunto o usuario...</mat-label>
            <input matInput (input)="onFilterChange($event)" placeholder="Ej. INF-2026, Memorando...">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
        </div>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        <table mat-table [dataSource]="documentos()" class="w-full">
          <!-- ID / CITE Column -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>CITE / Nombre</th>
            <td mat-cell *matCellDef="let d">
              <strong class="doc-cite">{{ d.nombre }}</strong>
              @if (d.ref) {
                <small class="doc-meta">{{ d.ref }}</small>
              }
            </td>
          </ng-container>

          <!-- De / Para Column -->
          <ng-container matColumnDef="participantes">
            <th mat-header-cell *matHeaderCellDef>De / Para</th>
            <td mat-cell *matCellDef="let d">
              <div class="participantes-col">
                @if (d.de) {
                  <span><strong>DE:</strong> {{ d.de }}</span>
                }
                @if (d.para) {
                  <span><strong>PARA:</strong> {{ d.para }}</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Clasificación Column -->
          <ng-container matColumnDef="clasificacion">
            <th mat-header-cell *matHeaderCellDef>Clasificación</th>
            <td mat-cell *matCellDef="let d">
              <span class="badge-tag" [ngClass]="getClasificacionClass(d.clasificacion)">
                {{ d.clasificacion || 'ORDINARIO' }}
              </span>
            </td>
          </ng-container>

          <!-- Estado Column -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let d">
              <span class="badge-tag" [ngClass]="getEstadoClass(d.estado)">
                {{ d.estado }}
              </span>
            </td>
          </ng-container>

          <!-- Fecha Column -->
          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let d">
              {{ d._fecha_creacion | date:'dd/MM/yyyy HH:mm' }}
            </td>
          </ng-container>

          <!-- Acciones Column -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
            <td mat-cell *matCellDef="let d" class="text-right">
              <button mat-icon-button color="primary" (click)="verPdf(d)" matTooltip="Ver PDF">
                <mat-icon>picture_as_pdf</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell empty-cell" [attr.colspan]="displayedColumns.length">
              <mat-icon class="empty-icon">inbox</mat-icon>
              <p>No se encontraron documentos en esta bandeja.</p>
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
      max-width: 1300px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      h1 { margin: 0; color: #0f2027; font-size: 1.8rem; font-family: 'Poppins', sans-serif; font-weight: 700; }
      .subtitle { margin: 4px 0 0 0; color: #64748b; font-family: 'Poppins', sans-serif; }
      button { display: flex; align-items: center; gap: 6px; background-color: #1e293b; border-radius: 20px; }
    }
    .table-card {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(15, 32, 39, 0.06);
    }
    .toolbar-filter {
      padding: 16px;
      background: #ffffff;
    }
    .search-field {
      width: 380px;
      margin-bottom: -1.25em;
    }
    .w-full { width: 100%; }
    .text-right { text-align: right; }

    th.mat-mdc-header-cell {
      background-color: #0f2027 !important;
      color: #ffffff !important;
      font-family: 'Poppins', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    tr.mat-mdc-row:hover {
      background-color: #f8fafc !important;
    }

    .doc-cite {
      display: block;
      color: #0f2027;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }
    .doc-meta {
      display: block;
      color: #64748b;
      font-size: 0.8rem;
    }
    .participantes-col {
      display: flex;
      flex-direction: column;
      font-size: 0.85rem;
      gap: 2px;
    }
    .empty-cell {
      text-align: center;
      padding: 40px !important;
      color: #94a3b8;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #cbd5e1;
    }

    .badge-ordinario { background: #e0f2fe; color: #0369a1; }
    .badge-reservado { background: #fef3c7; color: #92400e; }
    .badge-confidencial { background: #f3e8ff; color: #7e22ce; }
    .badge-secreto { background: #fee2e2; color: #b91c1c; }

    .badge-nuevo { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
    .badge-derivado { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .badge-aprobado { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-cerrado { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  `]
})
export class DocumentosListComponent implements OnInit {
  private readonly documentosService = inject(DocumentosService);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['nombre', 'participantes', 'clasificacion', 'estado', 'fecha', 'acciones'];
  readonly documentos = signal<Documento[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly loading = signal(false);

  private currentEstado = '';
  private searchFilter = '';

  private readonly estadoTabs = ['', 'NUEVO', 'DERIVADO', 'APROBADO', 'CERRADO'];

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.loading.set(true);
    this.documentosService
      .getDocumentos(this.pageSize(), this.pageIndex() + 1, this.currentEstado, this.searchFilter)
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          const data = res.datos;
          this.documentos.set(data.resultado || []);
          this.total.set(data.total || 0);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }

  onTabChange(tabIndex: number): void {
    this.currentEstado = this.estadoTabs[tabIndex] || '';
    this.pageIndex.set(0);
    this.cargarDocumentos();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.cargarDocumentos();
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchFilter = input.value.trim();
    this.pageIndex.set(0);
    this.cargarDocumentos();
  }

  verPdf(doc: Documento): void {
    const pdfUrl = `/public/documentos/${doc.nombre}.pdf`;
    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      data: {
        titulo: `${doc.nombre} - ${doc.ref || 'Documento'}`,
        pdfUrl
      }
    });
  }

  getClasificacionClass(clasificacion?: string): string {
    switch (clasificacion) {
      case 'RESERVADO': return 'badge-reservado';
      case 'CONFIDENCIAL': return 'badge-confidencial';
      case 'SECRETO': return 'badge-secreto';
      default: return 'badge-ordinario';
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'NUEVO': return 'badge-nuevo';
      case 'DERIVADO': return 'badge-derivado';
      case 'APROBADO': return 'badge-aprobado';
      default: return 'badge-cerrado';
    }
  }
}
