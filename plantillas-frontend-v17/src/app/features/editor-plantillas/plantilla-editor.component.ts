import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, copyArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { PlantillaFormly, PlantillasService } from '../../core/services/plantillas.service';

interface PaletteItem {
  name: string;
  type: string;
  icon: string;
  defaultConfig: Partial<FormlyFieldConfig>;
}

@Component({
  selector: 'app-plantilla-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    FormlyModule
  ],
  template: `
    <div class="editor-container">
      <!-- Top Action Bar -->
      <div class="editor-topbar">
        <div class="topbar-left">
          <a mat-icon-button routerLink="/plantillas" matTooltip="Volver a la lista">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div>
            <h2>{{ isEditing() ? 'Editar Plantilla: ' + metaForm.get('nombre')?.value : 'Diseñador de Plantilla' }}</h2>
            <span class="subtitle">Lienzo interactivo Drag & Drop con motor &#64;ngx-formly</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button mat-stroked-button (click)="limpiarLienzo()">
            <mat-icon>delete_sweep</mat-icon>
            <span>Limpiar</span>
          </button>
          <button mat-raised-button color="primary" (click)="guardarPlantilla()" [disabled]="metaForm.invalid || saving()">
            <mat-icon>save</mat-icon>
            <span>{{ saving() ? 'Guardando...' : 'Guardar Plantilla' }}</span>
          </button>
        </div>
      </div>

      <!-- Metadata Header Bar -->
      <mat-card class="meta-card">
        <form [formGroup]="metaForm" class="meta-form">
          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Nombre de la Plantilla</mat-label>
            <input matInput formControlName="nombre" placeholder="Ej. Informe Técnico Circunstanciado">
            <mat-error *ngIf="metaForm.get('nombre')?.hasError('required')">El nombre es obligatorio</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field-short">
            <mat-label>Abreviación (Sigla)</mat-label>
            <input matInput formControlName="abreviacion" placeholder="Ej. ITC">
            <mat-error *ngIf="metaForm.get('abreviacion')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>
        </form>
      </mat-card>

      <!-- Workspace: Palette + Canvas + Live Preview -->
      <div class="workspace-grid">
        <!-- Palette Column -->
        <mat-card class="palette-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">widgets</mat-icon>
            <mat-card-title>Componentes</mat-card-title>
            <mat-card-subtitle>Arrastre elementos al lienzo</mat-card-subtitle>
          </mat-card-header>

          <div
            cdkDropList
            #paletteList="cdkDropList"
            [cdkDropListData]="paletteItems"
            [cdkDropListConnectedTo]="[canvasList]"
            class="palette-list">
            <div
              *ngFor="let item of paletteItems"
              cdkDrag
              class="palette-item">
              <mat-icon class="item-icon">{{ item.icon }}</mat-icon>
              <span class="item-name">{{ item.name }}</span>
            </div>
          </div>
        </mat-card>

        <!-- Canvas Column -->
        <mat-card class="canvas-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">view_stream</mat-icon>
            <mat-card-title>Estructura del Documento</mat-card-title>
            <mat-card-subtitle>Reordene arrastrando verticalmente</mat-card-subtitle>
          </mat-card-header>

          <div
            cdkDropList
            #canvasList="cdkDropList"
            [cdkDropListData]="canvasFields"
            (cdkDropListDropped)="onDrop($event)"
            class="canvas-list">
            <div *ngIf="canvasFields.length === 0" class="canvas-placeholder">
              <mat-icon>drag_indicator</mat-icon>
              <p>Arrastre componentes desde la paleta izquierda aquí para comenzar el diseño.</p>
            </div>

            <div
              *ngFor="let field of canvasFields; let i = index"
              cdkDrag
              class="canvas-item">
              <div class="canvas-item-handle" cdkDragHandle>
                <mat-icon>drag_indicator</mat-icon>
              </div>
              <div class="canvas-item-info">
                <span class="type-badge">{{ field.type }}</span>
                <strong>{{ field.templateOptions?.label || field.key || field.type }}</strong>
              </div>
              <button mat-icon-button color="warn" (click)="eliminarCampo(i)" matTooltip="Eliminar del lienzo">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </mat-card>

        <!-- Preview Column -->
        <mat-card class="preview-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">visibility</mat-icon>
            <mat-card-title>Vista Previa en Vivo</mat-card-title>
            <mat-card-subtitle>Renderizado nativo &#64;ngx-formly</mat-card-subtitle>
          </mat-card-header>

          <div class="preview-content">
            <form [formGroup]="previewForm">
              <formly-form
                [form]="previewForm"
                [fields]="canvasFields"
                [model]="previewModel">
              </formly-form>
            </form>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .editor-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      .topbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
        h2 { margin: 0; color: #1a237e; font-size: 1.5rem; }
        .subtitle { color: #607d8b; font-size: 0.85rem; }
      }
      .topbar-actions {
        display: flex;
        gap: 8px;
      }
    }
    .meta-card {
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .meta-form {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .meta-field { flex: 1; min-width: 280px; margin-bottom: -1.25em; }
    .meta-field-short { width: 180px; margin-bottom: -1.25em; }

    .workspace-grid {
      display: grid;
      grid-template-columns: 280px 1fr 1fr;
      gap: 20px;
      align-items: start;
    }

    .palette-card, .canvas-card, .preview-card {
      border-radius: 12px;
      min-height: 550px;
    }

    .palette-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #f5f7fa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: grab;
      font-weight: 500;
      color: #37474f;
      transition: background 0.15s ease, box-shadow 0.15s ease;
      &:hover {
        background: #e8eaf6;
        border-color: #c5cae9;
      }
      .item-icon { color: #3f51b5; font-size: 20px; width: 20px; height: 20px; }
    }

    .canvas-list {
      padding: 12px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .canvas-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #90a4ae;
      text-align: center;
      border: 2px dashed #cfd8dc;
      border-radius: 8px;
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
    }
    .canvas-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
      .canvas-item-handle {
        cursor: grab;
        color: #b0bec5;
        margin-right: 8px;
        display: flex;
      }
      .canvas-item-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .type-badge {
        font-size: 0.75rem;
        background: #e3f2fd;
        color: #1976d2;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
    }

    .preview-content {
      padding: 20px;
      background: #ffffff;
      border-radius: 8px;
      min-height: 400px;
    }

    .cdk-drag-preview {
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      border-radius: 8px;
      background: #ffffff;
      padding: 10px;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 2px dashed #3f51b5;
    }
  `]
})
export class PlantillaEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly plantillasService = inject(PlantillasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditing = signal(false);
  readonly saving = signal(false);
  plantillaId: number | null = null;

  readonly metaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    abreviacion: ['', [Validators.required]]
  });

  readonly previewForm = new FormGroup({});
  readonly previewModel: any = {};

  readonly paletteItems: PaletteItem[] = [
    {
      name: 'Encabezado CITE',
      type: 'cite',
      icon: 'tag',
      defaultConfig: {
        type: 'cite',
        templateOptions: { labelCite: 'CITE: MPT-INF-001/2026', labelFecha: 'FECHA: 14/10/2026', tipoMembrete: 'sin membrete' }
      }
    },
    {
      name: 'Datos Generales (PARA/DE/REF)',
      type: 'datosGenerales',
      icon: 'badge',
      defaultConfig: {
        type: 'datosGenerales',
        key: 'datosGenerales',
        templateOptions: { show: { para: true, via: false, de: true, ref: true } }
      }
    },
    {
      name: 'Título Institucional',
      type: 'texto',
      icon: 'title',
      defaultConfig: {
        type: 'texto',
        templateOptions: { label: 'INFORME TÉCNICO', tipo: 'h2', className: 'ap-text-center' }
      }
    },
    {
      name: 'Cuerpo de Texto Enriquecido',
      type: 'editorTexto',
      icon: 'format_align_left',
      defaultConfig: {
        type: 'editorTexto',
        key: 'cuerpo',
        templateOptions: { label: 'Contenido del Documento' }
      }
    },
    {
      name: 'Espaciador',
      type: 'vacio',
      icon: 'space_bar',
      defaultConfig: {
        type: 'vacio',
        templateOptions: { alto: 20 }
      }
    }
  ];

  canvasFields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.plantillaId = parseInt(idParam, 10);
      this.isEditing.set(true);
      this.cargarPlantilla(this.plantillaId);
    }
  }

  cargarPlantilla(id: number): void {
    this.plantillasService.getPlantilla(id).subscribe({
      next: (res) => {
        const p = res.datos;
        this.metaForm.patchValue({
          nombre: p.nombre,
          abreviacion: p.abreviacion
        });
        try {
          this.canvasFields = JSON.parse(p.plantilla || '[]');
        } catch {
          this.canvasFields = [];
        }
      },
      error: () => {
        this.snackBar.open('Error al cargar la plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onDrop(event: CdkDragDrop<any[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.canvasFields, event.previousIndex, event.currentIndex);
    } else {
      const paletteItem: PaletteItem = event.previousContainer.data[event.previousIndex];
      const newField: FormlyFieldConfig = JSON.parse(JSON.stringify(paletteItem.defaultConfig));
      this.canvasFields.splice(event.currentIndex, 0, newField);
    }
    this.canvasFields = [...this.canvasFields];
  }

  eliminarCampo(index: number): void {
    this.canvasFields.splice(index, 1);
    this.canvasFields = [...this.canvasFields];
  }

  limpiarLienzo(): void {
    this.canvasFields = [];
  }

  guardarPlantilla(): void {
    if (this.metaForm.invalid) return;

    this.saving.set(true);
    const payload: PlantillaFormly = {
      nombre: this.metaForm.value.nombre,
      abreviacion: this.metaForm.value.abreviacion,
      plantilla: JSON.stringify(this.canvasFields)
    };

    const req$ = this.isEditing() && this.plantillaId
      ? this.plantillasService.actualizarPlantilla(this.plantillaId, payload)
      : this.plantillasService.crearPlantilla(payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Plantilla guardada exitosamente', 'Aceptar', { duration: 3000 });
        this.router.navigate(['/plantillas']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Error al guardar la plantilla', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
