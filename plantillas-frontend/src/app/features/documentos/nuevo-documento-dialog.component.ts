import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlantillaFormly, PlantillasService } from '../../core/services/plantillas.service';
import { DocumentosService } from '../../core/services/documentos.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-nuevo-documento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <div class="icon-wrap">
          <mat-icon>post_add</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title class="dialog-title">Seleccionar Plantilla Oficial</h2>
          <p class="dialog-sub">Elija el tipo de documento institucional que desea redactar</p>
        </div>
      </div>
      <button mat-icon-button mat-dialog-close matTooltip="Cerrar" class="close-btn">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="search-box">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Filtrar plantillas por nombre o sigla...</mat-label>
          <input matInput (input)="onFilter($event)" placeholder="Ej. Informe, Memorando, Resolución...">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <mat-progress-bar *ngIf="loading() || creando()" mode="indeterminate" class="dialog-progress"></mat-progress-bar>

      <div class="templates-grid" *ngIf="!loading()">
        <div 
          *ngFor="let p of filteredPlantillas()" 
          class="template-card"
          (click)="crearDocumentoConPlantilla(p)"
          [class.disabled]="creando()"
        >
          <div class="card-top">
            <span class="abrev-pill">{{ p.abreviacion || 'DOC' }}</span>
            <span class="format-pill">{{ getFormato(p) }}</span>
          </div>
          <h4 class="template-name">{{ p.nombre }}</h4>
          <div class="card-bottom">
            <span class="inst-tag">Oficial • Activa</span>
            <button mat-flat-button color="primary" class="btn-use" [disabled]="creando()">
              <mat-icon>edit_note</mat-icon>
              <span>Redactar</span>
            </button>
          </div>
        </div>

        <div *ngIf="filteredPlantillas().length === 0" class="empty-state">
          <mat-icon>find_in_page</mat-icon>
          <p>No se encontraron plantillas con ese criterio de búsqueda.</p>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close [disabled]="creando()">Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      width: 760px;
      max-width: 95vw;
    }

    .dialog-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      background: #0a192f;
      color: #ffffff;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: rgba(2, 132, 199, 0.2);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
    }

    .dialog-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
    }

    .dialog-sub {
      margin: 2px 0 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .close-btn {
      color: #94a3b8;
      &:hover { color: #ffffff; }
    }

    .dialog-content {
      padding: 1.25rem 1.5rem;
      max-height: 65vh;
      overflow-y: auto;
      background: #f8fafc;
    }

    .search-box {
      margin-bottom: 1rem;
    }

    .w-full {
      width: 100%;
    }

    .dialog-progress {
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .template-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);

      &:hover:not(.disabled) {
        border-color: #0284c7;
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.12);
        transform: translateY(-2px);
      }

      &.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .abrev-pill {
      font-size: 0.72rem;
      font-weight: 700;
      background: #eff6ff;
      color: #0284c7;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .format-pill {
      font-size: 0.7rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .template-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    .inst-tag {
      font-size: 0.72rem;
      color: #059669;
      font-weight: 600;
    }

    .btn-use {
      height: 32px;
      padding: 0 12px;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 6px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;

      mat-icon {
        font-size: 44px;
        width: 44px;
        height: 44px;
        margin-bottom: 8px;
      }

      p { margin: 0; font-size: 0.9rem; }
    }

    .dialog-actions {
      padding: 0.75rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
    }
  `]
})
export class NuevoDocumentoDialogComponent implements OnInit {
  private readonly plantillasService = inject(PlantillasService);
  private readonly documentosService = inject(DocumentosService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<NuevoDocumentoDialogComponent>);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(true);
  readonly creando = signal(false);
  readonly plantillas = signal<PlantillaFormly[]>([]);
  readonly filterText = signal('');

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  cargarPlantillas(): void {
    this.loading.set(true);
    this.plantillasService.getPlantillas(100, 1).subscribe({
      next: (res) => {
        this.loading.set(false);
        const datosAny = res.datos as any;
        const lista = datosAny?.resultado || datosAny?.rows || (Array.isArray(res.datos) ? res.datos : []);
        // Solo mostrar plantillas activas
        this.plantillas.set(lista.filter((p: any) => p.estado !== 'INACTIVO'));
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al cargar las plantillas disponibles', 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }

  onFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value || '';
    this.filterText.set(val.trim().toLowerCase());
  }

  filteredPlantillas(): PlantillaFormly[] {
    const f = this.filterText();
    const list = this.plantillas();
    if (!f) return list;
    return list.filter(p => 
      (p.nombre && p.nombre.toLowerCase().includes(f)) ||
      (p.abreviacion && p.abreviacion.toLowerCase().includes(f))
    );
  }

  getFormato(p: PlantillaFormly): string {
    try {
      const schema = JSON.parse(p.plantilla || '[]');
      const th = schema[0]?.templateOptions?.tipoHoja;
      return th === 'Oficio' ? 'Oficio' : 'Carta';
    } catch {
      return 'Carta';
    }
  }

  crearDocumentoConPlantilla(p: PlantillaFormly): void {
    if (this.creando()) return;
    this.creando.set(true);

    const currentUser = this.authService.currentUser();
    const usuarioId = currentUser?.id || 1;

    const payload = {
      nombre: 'BORRADOR',
      plantilla: p.plantilla,
      plantilla_valor: JSON.stringify({ inputSelect: 'Reservado' }),
      sw: { enviado: false, enviar: false },
      fid_plantilla: p.id_plantilla_formly,
      _usuario_creacion: usuarioId
    };

    this.documentosService.crearDocumento(payload).subscribe({
      next: (res) => {
        this.creando.set(false);
        const nuevoDoc = res.datos;
        const id = nuevoDoc?.id_documento;
        this.snackBar.open(`Documento borrador creado exitosamente`, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(nuevoDoc);
        if (id) {
          this.router.navigate(['/documentos', id]);
        }
      },
      error: (err) => {
        this.creando.set(false);
        const msg = err.error?.mensaje || err.message || 'Error al instanciar el documento';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
