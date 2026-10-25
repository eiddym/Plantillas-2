import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { PlantillaFormly, PlantillasService } from '../../core/services/plantillas.service';
import { BloquePropiedadesDialogComponent } from './bloque-propiedades-dialog.component';

export interface PaletteItem {
  name: string;
  type: string;
  icon: string;
  description: string;
  defaultConfig: Partial<FormlyFieldConfig>;
}

export interface PaletteCategory {
  title: string;
  icon: string;
  expanded: boolean;
  items: PaletteItem[];
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
    MatSelectModule,
    MatTabsModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    FormlyModule
  ],
  template: `
    <div class="editor-container">
      <!-- Barra Superior de Acciones -->
      <div class="editor-topbar">
        <div class="topbar-left">
          <a mat-icon-button routerLink="/plantillas" matTooltip="Volver a la lista de plantillas">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div>
            <h2>{{ isEditing() ? 'Editar Plantilla: ' + metaForm.get('nombre')?.value : 'Diseñador de Plantilla Modular' }}</h2>
            <span class="subtitle">Estructuración interactiva de bloques Formly con CITE institucional automatizado</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button mat-stroked-button (click)="limpiarLienzo()" matTooltip="Restablecer bloques al estado inicial">
            <mat-icon>restart_alt</mat-icon>
            <span>Restablecer</span>
          </button>
          <button mat-raised-button color="primary" (click)="guardarPlantilla()" [disabled]="metaForm.invalid || saving()">
            <mat-icon>save</mat-icon>
            <span>{{ saving() ? 'Guardando...' : (isEditing() ? 'Actualizar Plantilla' : 'Guardar Plantilla') }}</span>
          </button>
        </div>
      </div>

      <!-- Cabecera de Metadatos de la Plantilla -->
      <mat-card class="meta-card">
        <form [formGroup]="metaForm" class="meta-form">
          <mat-form-field appearance="outline" class="meta-field-name">
            <mat-label>Nombre Oficial de la Plantilla</mat-label>
            <input matInput formControlName="nombre" placeholder="Ej. Informe Técnico Circunstanciado, Nota Interna, etc.">
            @if (metaForm.get('nombre')?.hasError('required')) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field-short">
            <mat-label>Abreviación (Sigla)</mat-label>
            <input matInput formControlName="abreviacion" placeholder="Ej. ITC, NI, M" (input)="onAbrevInput($event)">
            @if (metaForm.get('abreviacion')?.hasError('required')) {
              <mat-error>Requerido</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field-short">
            <mat-label>Formato de Hoja</mat-label>
            <mat-select formControlName="tipoHoja" (selectionChange)="onTipoHojaChange($event.value)">
              <mat-option value="Letter">Carta (21.6 x 27.9 cm)</mat-option>
              <mat-option value="Oficio">Oficio (21.6 x 33.0 cm)</mat-option>
            </mat-select>
          </mat-form-field>
        </form>
      </mat-card>

      <!-- Espacio de Trabajo en 3 Columnas: Paleta Modular + Lienzo de Estructura + Vista Previa Real -->
      <div class="workspace-grid">
        <!-- 1. Columna de Paleta de Componentes Modular -->
        <mat-card class="palette-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">category</mat-icon>
            <mat-card-title>Catálogo de Bloques</mat-card-title>
            <mat-card-subtitle>Haga clic o arrastre al lienzo</mat-card-subtitle>
          </mat-card-header>

          <div class="palette-scroll">
            <mat-accordion multi>
              @for (cat of paletteCategories; track cat.title) {
                <mat-expansion-panel [expanded]="cat.expanded" class="palette-expansion">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon class="cat-icon">{{ cat.icon }}</mat-icon>
                      <span class="cat-title">{{ cat.title }}</span>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="category-items">
                    @for (item of cat.items; track item.name) {
                      <div class="palette-item" (click)="agregarBloque(item)">
                        <div class="item-icon-box">
                          <mat-icon>{{ item.icon }}</mat-icon>
                        </div>
                        <div class="item-text">
                          <strong class="item-name">{{ item.name }}</strong>
                          <span class="item-desc">{{ item.description }}</span>
                        </div>
                        <button mat-icon-button class="item-add-btn" matTooltip="Añadir al lienzo" (click)="$event.stopPropagation(); agregarBloque(item)">
                          <mat-icon>add_circle_outline</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          </div>
        </mat-card>

        <!-- 2. Columna de Estructura del Documento (Canvas Reordenable y Editable) -->
        <mat-card class="canvas-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">view_stream</mat-icon>
            <mat-card-title>Estructura del Documento</mat-card-title>
            <mat-card-subtitle>Reordene arrastrando y edite cada bloque</mat-card-subtitle>
          </mat-card-header>

          <div
            cdkDropList
            [cdkDropListData]="canvasFields"
            (cdkDropListDropped)="onDrop($event)"
            class="canvas-list">
            
            @for (field of canvasFields; track field; let i = $index) {
              <!-- Bloque CITE (Fijo en índice 0, obligatorio) -->
              @if (field.type === 'cite') {
                <div class="canvas-item canvas-item-cite">
                  <div class="item-badge-fixed" matTooltip="El CITE y la fecha institucional son obligatorios por normativa y se generan de forma automática al ser aprobado el documento por el Jefe de Unidad">
                    <mat-icon>lock</mat-icon>
                    <span>CITE Y FECHA OFICIAL</span>
                  </div>
                  <div class="canvas-item-info">
                    <span class="cite-meta">
                      Hoja {{ field.templateOptions?.['tipoHoja'] === 'Oficio' ? 'Oficio' : 'Carta' }} • 
                      {{ field.templateOptions?.['tipoMembrete'] || 'sin membrete' }} • 
                      CITE {{ field.templateOptions?.['tipo'] || 'unidad' }}
                    </span>
                  </div>
                  <div class="canvas-item-actions">
                    <button mat-icon-button color="primary" (click)="editarCampo(field, i)" matTooltip="Configurar membrete, hoja y tipo de CITE">
                      <mat-icon>settings</mat-icon>
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Bloques Editables y Reordenables -->
                <div cdkDrag class="canvas-item" [class.item-selected]="selectedFieldIndex() === i">
                  <div class="canvas-item-handle" cdkDragHandle matTooltip="Arrastrar para reordenar">
                    <mat-icon>drag_indicator</mat-icon>
                  </div>
                  <div class="canvas-item-info" (click)="editarCampo(field, i)">
                    <div class="info-top">
                      <mat-icon class="canvas-type-icon">{{ getFieldIcon(field.type) }}</mat-icon>
                      <span class="type-badge">{{ getFieldTypeString(field.type) }}</span>
                      @if (field.templateOptions?.['required']) {
                        <span class="req-badge">Requerido</span>
                      }
                    </div>
                    <strong class="item-label-display">
                      {{ getFieldDisplayName(field) }}
                    </strong>
                  </div>
                  <div class="canvas-item-actions">
                    <button mat-icon-button color="primary" (click)="editarCampo(field, i)" matTooltip="Editar propiedades de este bloque">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="eliminarCampo(i)" matTooltip="Eliminar del documento">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              }
            } @empty {
              <div class="canvas-placeholder">
                <mat-icon>playlist_add</mat-icon>
                <p>No hay bloques en el documento. Añada componentes desde la paleta izquierda.</p>
              </div>
            }
          </div>
        </mat-card>

        <!-- 3. Columna de Vista Previa Real (Diagramación de Hoja) -->
        <mat-card class="preview-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">visibility</mat-icon>
            <mat-card-title>Vista Previa Dinámica</mat-card-title>
            <mat-card-subtitle>
              Hoja {{ metaForm.get('tipoHoja')?.value === 'Oficio' ? 'Oficio (21.6 x 33 cm)' : 'Carta (21.6 x 27.9 cm)' }}
            </mat-card-subtitle>
          </mat-card-header>

          <div class="preview-container">
            <div class="preview-sheet" [ngClass]="metaForm.get('tipoHoja')?.value === 'Oficio' ? 'sheet-oficio' : 'sheet-carta'">
              <!-- Membrete institucional si está activo -->
              @if (canvasFields[0].templateOptions?.['tipoMembrete'] === 'externo') {
                <div class="preview-header-img">
                  <img src="/assets/images/logo_cooperativa.png" alt="Membrete Oficial" class="img-header">
                </div>
              }

              <!-- Motor Formly de renderizado -->
              <form [formGroup]="previewForm">
                <formly-form
                  [form]="previewForm"
                  [fields]="previewFields"
                  [model]="previewModel">
                </formly-form>
              </form>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      max-width: 1560px;
      margin: 0 auto;
      padding: 0 12px;
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
        h2 { margin: 0; color: #0f172a; font-size: 1.45rem; font-weight: 700; }
        .subtitle { color: #64748b; font-size: 0.85rem; }
      }
      .topbar-actions {
        display: flex;
        gap: 10px;
        button {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 40px;
        }
      }
    }
    .meta-card {
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    }
    .meta-form {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .meta-field-name { flex: 2; min-width: 320px; margin-bottom: -1.25em; }
    .meta-field-short { flex: 1; min-width: 170px; margin-bottom: -1.25em; }

    .workspace-grid {
      display: grid;
      grid-template-columns: 340px 1.15fr 1.35fr;
      gap: 20px;
      align-items: start;
    }

    .palette-card, .canvas-card, .preview-card {
      border-radius: 12px;
      min-height: 640px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }

    /* PALETA */
    .palette-scroll {
      padding: 8px 12px 16px 12px;
      max-height: 75vh;
      overflow-y: auto;
    }
    .palette-expansion {
      box-shadow: none !important;
      border: 1px solid #e2e8f0;
      margin-bottom: 8px !important;
      border-radius: 8px !important;
      overflow: hidden;
      .cat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 8px; color: #0284c7; }
      .cat-title { font-weight: 600; font-size: 0.88rem; color: #1e293b; }
    }
    .category-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 6px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: #f0f9ff;
        border-color: #7dd3fc;
        transform: translateX(3px);
        .item-add-btn { color: #0284c7; }
      }
      .item-icon-box {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0f172a; }
      }
      .item-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        .item-name { font-size: 0.84rem; color: #0f172a; }
        .item-desc { font-size: 0.72rem; color: #64748b; }
      }
      .item-add-btn {
        width: 30px;
        height: 30px;
        color: #94a3b8;
        mat-icon { font-size: 20px; }
      }
    }

    /* LIENZO DE ESTRUCTURA */
    .canvas-list {
      padding: 12px;
      min-height: 480px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .canvas-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
      &:hover {
        border-color: #0284c7;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);
      }
      &.item-selected {
        border-color: #0284c7;
        background: #f0f9ff;
      }
      .canvas-item-handle {
        cursor: grab;
        color: #94a3b8;
        margin-right: 10px;
        display: flex;
      }
      .canvas-item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        .info-top {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .item-label-display {
          font-size: 0.92rem;
          color: #0f172a;
          word-break: break-word;
        }
      }
      .type-badge {
        font-size: 0.72rem;
        padding: 2px 6px;
        border-radius: 4px;
        background: #e2e8f0;
        color: #334155;
        font-weight: 700;
        text-transform: uppercase;
      }
      .req-badge {
        font-size: 0.68rem;
        padding: 1px 5px;
        border-radius: 4px;
        background: #fee2e2;
        color: #dc2626;
        font-weight: 600;
      }
      .canvas-item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    /* BLOQUE CITE OBLIGATORIO */
    .canvas-item-cite {
      background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
      border: 1.5px solid #38bdf8;
      cursor: default;
      .item-badge-fixed {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: #0284c7;
        color: #ffffff;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-right: 12px;
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
      }
      .cite-meta {
        font-size: 0.82rem;
        color: #0369a1;
        font-weight: 500;
      }
    }

    .canvas-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #94a3b8;
      text-align: center;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      mat-icon { font-size: 44px; width: 44px; height: 44px; margin-bottom: 8px; }
    }

    /* VISTA PREVIA */
    .preview-container {
      padding: 16px;
      background: #f1f5f9;
      border-radius: 8px;
      max-height: 75vh;
      overflow-y: auto;
      display: flex;
      justify-content: center;
    }
    .preview-sheet {
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 36px 44px;
      box-sizing: border-box;
      width: 100%;
      min-height: 600px;
      transition: all 0.3s ease;
      &.sheet-carta {
        max-width: 680px;
      }
      &.sheet-oficio {
        max-width: 720px;
        min-height: 750px;
      }
    }
    .preview-header-img {
      text-align: center;
      margin-bottom: 16px;
      .img-header {
        max-height: 65px;
        width: auto;
      }
    }

    .cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      border-radius: 10px;
      background: #ffffff;
      padding: 10px 14px;
      border: 1px solid #0284c7;
    }
    .cdk-drag-placeholder {
      opacity: 0.35;
      border: 2px dashed #0284c7;
    }

    @media (max-width: 1200px) {
      .workspace-grid {
        grid-template-columns: 300px 1fr;
      }
      .preview-card {
        grid-column: span 2;
      }
    }
    @media (max-width: 860px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
      .preview-card {
        grid-column: span 1;
      }
      .meta-field-name, .meta-field-short {
        width: 100% !important;
        min-width: 100% !important;
      }
    }
  `]
})
export class PlantillaEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly plantillasService = inject(PlantillasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isEditing = signal(false);
  readonly saving = signal(false);
  readonly selectedFieldIndex = signal<number | null>(null);
  plantillaId: number | null = null;

  readonly metaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    abreviacion: ['', [Validators.required]],
    tipoHoja: ['Letter', [Validators.required]]
  });

  readonly previewForm = new FormGroup({});
  readonly previewModel: any = {
    cite_header: {
      cite: 'MPT-INF-001/2026',
      fecha: '14 de Octubre de 2026'
    }
  };
  previewFields: FormlyFieldConfig[] = [];

  // Catálogo completo de componentes enriquecidos por bloques modulares
  readonly paletteCategories: PaletteCategory[] = [
    {
      title: 'Documentos Institucionales',
      icon: 'description',
      expanded: true,
      items: [
        {
          name: 'Datos Generales',
          type: 'datosGenerales',
          icon: 'assignment_ind',
          description: 'PARA, VIA, DE y REF estructurados',
          defaultConfig: {
            type: 'datosGenerales',
            key: 'datosGenerales',
            templateOptions: {
              show: { para: true, via: false, de: true, ref: true },
              labelRef: 'REF.:',
              aprobarPorDireccion: false
            }
          }
        },
        {
          name: 'Encabezado Alternativo',
          type: 'encabezado',
          icon: 'badge',
          description: 'Encabezado formal institucional para circulares o notas',
          defaultConfig: {
            type: 'encabezado',
            key: 'encabezado',
            templateOptions: {
              show: { para: true, via: false, de: true, ref: true },
              labelRef: 'REF.:'
            }
          }
        },
        {
          name: 'Asunto Oficial',
          type: 'inputt',
          icon: 'short_text',
          description: 'Campo destacado para referencia o asunto',
          defaultConfig: {
            type: 'inputt',
            key: 'asunto_documento',
            templateOptions: { label: 'Asunto del Documento', labelx: 'Asunto', required: true }
          }
        },
        {
          name: 'Clasificación de Seguridad',
          type: 'clasificacion',
          icon: 'security',
          description: 'Reservado, Confidencial, Secreto o Desclasificado',
          defaultConfig: {
            type: 'select',
            key: 'inputSelect',
            templateOptions: {
              label: 'Clasificación',
              required: true,
              showItem: true,
              options: [
                { value: 'Reservado', id: 'Reservado' },
                { value: 'Confidencial', id: 'Confidencial' },
                { value: 'Secreto', id: 'Secreto' },
                { value: 'Desclasificado', id: 'Desclasificado' }
              ]
            }
          }
        },
        {
          name: 'Cuerpo de Texto Enriquecido',
          type: 'editorTexto',
          icon: 'edit_note',
          description: 'Editor TinyMCE con formato institucional',
          defaultConfig: {
            type: 'editorTexto',
            key: 'cuerpo_principal',
            templateOptions: { label: 'Contenido del Documento', required: false }
          }
        },
        {
          name: 'Adjuntos / Archivo PDF',
          type: 'archivo',
          icon: 'attach_file',
          description: 'Carga de anexos digitales y documentos PDF de respaldo',
          defaultConfig: {
            type: 'archivo',
            key: 'archivo',
            templateOptions: { label: 'Elegir PDF', multiple: true, required: false }
          }
        },
        {
          name: 'Referencias Relacionadas',
          type: 'documentosRelacionados',
          icon: 'link',
          description: 'Vinculación de CITEs anteriores en el trámite',
          defaultConfig: {
            type: 'documentosRelacionados',
            key: 'documentosRelacionados',
            templateOptions: { label: 'Referencias:', labelw: 10, showItem: true }
          }
        },
        {
          name: 'Con Copia a (CC:)',
          type: 'ccArchivo',
          icon: 'content_copy',
          description: 'Copia informativa y archivo institucional',
          defaultConfig: {
            type: 'ccArchivo',
            key: 'ccArchivo',
            templateOptions: { label: 'CC/Archivo:', labelw: 10 }
          }
        },
        {
          name: 'Documentos a Anular',
          type: 'documentosAnular',
          icon: 'cancel',
          description: 'Selección y anulación formal de CITEs previos',
          defaultConfig: {
            type: 'documentosAnular',
            key: 'documentosAnular',
            templateOptions: { label: 'Documentos a anular:' }
          }
        },
        {
          name: 'Lista de Contactos',
          type: 'listaContactos',
          icon: 'contact_page',
          description: 'Directorio institucional de funcionarios o destinatarios',
          defaultConfig: {
            type: 'listaContactos',
            key: 'listaContactos',
            templateOptions: { label: 'Lista de Contactos' }
          }
        },
        {
          name: 'Certificación Presupuestaria',
          type: 'certificacionComprometido',
          icon: 'receipt_long',
          description: 'Asignación POA y presupuesto institucional',
          defaultConfig: {
            type: 'certificacionComprometido',
            key: 'certificacion_poa',
            templateOptions: { label: 'Certificación Presupuestaria POA' }
          }
        },
        {
          name: 'Caja Chica',
          type: 'cajachica',
          icon: 'account_balance_wallet',
          description: 'Imputación y rendición de caja chica',
          defaultConfig: {
            type: 'cajachica',
            key: 'caja_chica',
            templateOptions: { label: 'Imputación Caja Chica' }
          }
        },
        {
          name: 'Aprobación Consejo Directivo',
          type: 'aprobacionCD',
          icon: 'how_to_vote',
          description: 'Resolución y votación del Consejo Directivo',
          defaultConfig: {
            type: 'aprobacionCD',
            key: 'aprobacionCD',
            templateOptions: { label: 'Resolución de Consejo' }
          }
        }
      ]
    },
    {
      title: 'Títulos y Párrafos',
      icon: 'title',
      expanded: true,
      items: [
        {
          name: 'Título Principal',
          type: 'texto',
          icon: 'title',
          description: 'Encabezado editable principal (H1/H2)',
          defaultConfig: {
            type: 'texto',
            templateOptions: {
              label: 'TÍTULO DEL DOCUMENTO',
              tipo: 'h2',
              className: 'ap-text-center',
              mTop: true,
              mBot: true
            }
          }
        },
        {
          name: 'Subtítulo de Sección',
          type: 'subtitulo',
          icon: 'text_fields',
          description: 'Separador temático (H3/H4)',
          defaultConfig: {
            type: 'texto',
            templateOptions: {
              label: '1. ANTECEDENTES Y JUSTIFICACIÓN',
              tipo: 'h3',
              className: 'ap-text-left',
              mTop: true,
              mBot: true
            }
          }
        },
        {
          name: 'Párrafo Explicativo',
          type: 'parrafo',
          icon: 'format_align_left',
          description: 'Texto estático o consideraciones generales',
          defaultConfig: {
            type: 'texto',
            templateOptions: {
              label: 'En cumplimiento a las disposiciones vigentes y habiendo revisado los antecedentes...',
              tipo: 'p',
              className: 'ap-text-justify',
              mTop: true,
              mBot: true
            }
          }
        },
        {
          name: 'Párrafo de Saludo / Despedida',
          type: 'despedida',
          icon: 'mark_email_read',
          description: 'Cierre institucional estándar',
          defaultConfig: {
            type: 'texto',
            templateOptions: {
              label: 'Sin otro particular, saludo a usted atentamente.',
              tipo: 'p',
              className: 'ap-text-left',
              mTop: true,
              mBot: true
            }
          }
        },
        {
          name: 'Lista de Elementos',
          type: 'lista',
          icon: 'format_list_bulleted',
          description: 'Viñetas o enumeración',
          defaultConfig: {
            type: 'lista',
            key: 'lista_items',
            templateOptions: {
              label: 'Puntos tratados en la sesión:',
              tipo: 'ul',
              options: [
                { value: 'Revisión de antecedentes técnicos' },
                { value: 'Conclusiones y recomendaciones' }
              ]
            }
          }
        }
      ]
    },
    {
      title: 'Formularios y Controles',
      icon: 'tune',
      expanded: true,
      items: [
        {
          name: 'Área de Texto Multilínea (Nota / Párrafo)',
          type: 'textarea',
          icon: 'notes',
          description: 'Entrada de varias líneas o notas intermedias',
          defaultConfig: {
            type: 'textarea',
            key: 'inputTextArea',
            templateOptions: { label: '', rows: 2, grow: false, required: false }
          }
        },
        {
          name: 'Campo de Texto Simple',
          type: 'input',
          icon: 'input',
          description: 'Entrada de texto breve',
          defaultConfig: {
            type: 'input',
            templateOptions: { label: 'Nombre / Detalle', required: false }
          }
        },
        {
          name: 'Selección Desplegable',
          type: 'select',
          icon: 'arrow_drop_down_circle',
          description: 'Menú de opciones seleccionable',
          defaultConfig: {
            type: 'select',
            templateOptions: {
              label: 'Modalidad de Contratación',
              required: true,
              options: [
                { value: 'Contratación Menor', id: 'Contratación Menor' },
                { value: 'ANPE', id: 'ANPE' },
                { value: 'Licitación Pública', id: 'Licitación Pública' }
              ]
            }
          }
        },
        {
          name: 'Opción Única (Radio)',
          type: 'radio',
          icon: 'radio_button_checked',
          description: 'Selección excluyente',
          defaultConfig: {
            type: 'radio',
            templateOptions: {
              label: 'Criterio de Evaluación',
              options: [
                { value: 'Precio más bajo', id: 'Precio más bajo' },
                { value: 'Calidad y propuesta técnica', id: 'Calidad y propuesta técnica' }
              ]
            }
          }
        },
        {
          name: 'Casilla de Verificación',
          type: 'checkbox',
          icon: 'check_box',
          description: 'Confirmación Sí/No',
          defaultConfig: {
            type: 'checkbox',
            templateOptions: { label: 'Certifico la veracidad de la información' }
          }
        },
        {
          name: 'Selector de Fecha',
          type: 'datepicker',
          icon: 'calendar_today',
          description: 'Fecha calendario institucional',
          defaultConfig: {
            type: 'datepicker',
            templateOptions: { label: 'Fecha Límite de Presentación' }
          }
        }
      ]
    },
    {
      title: 'Servicios Web e Inventarios',
      icon: 'inventory_2',
      expanded: false,
      items: [
        {
          name: 'Consulta a Almacenes',
          type: 'consultaAlmacen',
          icon: 'inventory_2',
          description: 'Verificación de existencias de materiales y suministros',
          defaultConfig: {
            type: 'consultaAlmacen',
            key: 'consulta_almacen',
            templateOptions: { label: 'Consulta a Almacenes' }
          }
        },
        {
          name: 'Recuperar Entrega Almacén',
          type: 'recuperarEntregaAlmacen',
          icon: 'local_shipping',
          description: 'Comprobante y entrega de suministros registrados',
          defaultConfig: {
            type: 'recuperarEntregaAlmacen',
            key: 'entrega_almacen',
            templateOptions: { label: 'Recuperar Entrega de Almacén' }
          }
        },
        {
          name: 'Ingreso a Almacén',
          type: 'ingresoAlmacen',
          icon: 'archive',
          description: 'Comprobante de ingreso de insumos y materiales',
          defaultConfig: {
            type: 'ingresoAlmacen',
            key: 'ingreso_almacen',
            templateOptions: { label: 'Ingreso de Suministros a Almacén' }
          }
        },
        {
          name: 'Tabla de Activos Fijos',
          type: 'tablaActivos',
          icon: 'table_chart',
          description: 'Relación tabular de bienes de uso institucional',
          defaultConfig: {
            type: 'tablaActivos',
            key: 'tabla_activos',
            templateOptions: { label: 'Tabla de Activos Fijos' }
          }
        },
        {
          name: 'Ingreso de Activos Fijos',
          type: 'ingresoActivos',
          icon: 'add_business',
          description: 'Incorporación formal de bienes patrimoniales',
          defaultConfig: {
            type: 'ingresoActivos',
            key: 'ingreso_activos',
            templateOptions: { label: 'Ingreso de Activos Fijos' }
          }
        },
        {
          name: 'Baja de Activos Fijos',
          type: 'bajaActivos',
          icon: 'remove_shopping_cart',
          description: 'Disposición o desincorporación de activos',
          defaultConfig: {
            type: 'bajaActivos',
            key: 'baja_activos',
            templateOptions: { label: 'Baja de Activos Fijos' }
          }
        }
      ]
    },
    {
      title: 'Espaciado y Diagramación',
      icon: 'space_bar',
      expanded: false,
      items: [
        {
          name: 'Espaciador en Blanco',
          type: 'vacio',
          icon: 'space_bar',
          description: 'Separación vertical (en px o cm)',
          defaultConfig: {
            type: 'vacio',
            key: '0',
            templateOptions: { alto: 20, height: '0.5cm' }
          }
        },
        {
          name: 'Organizador de Columnas (Layout)',
          type: 'layout',
          icon: 'view_column',
          description: 'Estructuración modular de componentes en columnas',
          defaultConfig: {
            type: 'layout',
            key: 'layout_grid',
            templateOptions: { cols: 2 }
          }
        }
      ]
    }
  ];

  canvasFields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.plantillaId = parseInt(idParam, 10);
      this.isEditing.set(true);
      this.cargarPlantilla(this.plantillaId);
    } else {
      // Nueva plantilla: inicializa obligatoriamente con el bloque CITE oficial anclado
      this.inicializarNuevaPlantilla();
    }
  }

  inicializarNuevaPlantilla(): void {
    this.canvasFields = [
      this.crearCiteDefault(),
      {
        type: 'texto',
        templateOptions: {
          label: 'TÍTULO DEL DOCUMENTO',
          tipo: 'h2',
          className: 'ap-text-center',
          mTop: true,
          mBot: true
        }
      },
      {
        type: 'datosGenerales',
        key: 'datosGenerales',
        templateOptions: {
          show: { para: true, via: false, de: true, ref: true },
          labelRef: 'REF.:',
          aprobarPorDireccion: false
        }
      },
      {
        type: 'editorTexto',
        key: 'cuerpo',
        templateOptions: {
          label: 'Contenido del Documento'
        }
      }
    ];
    this.metaForm.patchValue({
      nombre: 'Nueva Plantilla Institucional',
      abreviacion: 'NPI',
      tipoHoja: 'Letter'
    });
    this.actualizarPreview();
  }

  crearCiteDefault(): FormlyFieldConfig {
    const hoja = this.metaForm?.get('tipoHoja')?.value || 'Letter';
    return {
      type: 'cite',
      key: 'cite_header',
      templateOptions: {
        labelCite: 'CITE: [Autogenerado al aprobar]',
        labelFecha: 'FECHA: [Fecha oficial]',
        tipoMembrete: 'sin membrete',
        tipoHoja: hoja,
        tipo: 'unidad',
        numeracionPagina: 'true'
      }
    };
  }

  cargarPlantilla(id: number): void {
    this.plantillasService.getPlantilla(id).subscribe({
      next: (res: any) => {
        const p = res.datos;
        try {
          let parsed = JSON.parse(p.plantilla || '[]');
          if (!Array.isArray(parsed) || parsed.length === 0) {
            parsed = [this.crearCiteDefault()];
          } else if (parsed[0].type !== 'cite') {
            // Asegurar que CITE siempre sea el primer bloque
            parsed.unshift(this.crearCiteDefault());
          }
          this.canvasFields = parsed;
        } catch {
          this.canvasFields = [this.crearCiteDefault()];
        }

        const th = (this.canvasFields.length > 0 && this.canvasFields[0]?.templateOptions?.['tipoHoja']) || 'Letter';
        this.metaForm.patchValue({
          nombre: p.nombre,
          abreviacion: p.abreviacion,
          tipoHoja: th
        });
        this.actualizarPreview();
      },
      error: () => {
        this.snackBar.open('Error al cargar la plantilla solicitada', 'Cerrar', { duration: 4000 });
        this.inicializarNuevaPlantilla();
      }
    });
  }

  onAbrevInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.metaForm.get('abreviacion')?.setValue(input.value, { emitEvent: false });
  }

  onTipoHojaChange(valor: string): void {
    if (this.canvasFields.length > 0 && this.canvasFields[0].type === 'cite') {
      this.canvasFields[0].templateOptions = this.canvasFields[0].templateOptions || {};
      this.canvasFields[0].templateOptions['tipoHoja'] = valor;
    }
    this.actualizarPreview();
  }

  agregarBloque(item: PaletteItem): void {
    const nuevoCampo: FormlyFieldConfig = JSON.parse(JSON.stringify(item.defaultConfig));
    const uniqueKey = `${item.type}_${Date.now()}`;
    if (!nuevoCampo.key && item.type !== 'texto') {
      nuevoCampo.key = uniqueKey;
    }

    // Insertar después de CITE
    this.canvasFields.push(nuevoCampo);
    this.actualizarPreview();

    // Abrir automáticamente el modal de edición del bloque recién insertado
    const nuevoIndex = this.canvasFields.length - 1;
    this.editarCampo(nuevoCampo, nuevoIndex);
  }

  onDrop(event: CdkDragDrop<FormlyFieldConfig[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    // CITE en posición 0 es intocable y no puede ser desplazado
    if (event.previousIndex === 0) {
      this.snackBar.open('El CITE oficial debe permanecer siempre al inicio del documento.', 'Entendido', { duration: 3000 });
      return;
    }

    const destino = Math.max(1, event.currentIndex);
    moveItemInArray(this.canvasFields, event.previousIndex, destino);
    this.actualizarPreview();
  }

  getFieldDisplayName(field: FormlyFieldConfig): string {
    const to = field.templateOptions;
    if (to?.label && to.label.trim()) return to.label;
    if (to?.['labelx'] && to['labelx'].trim()) return to['labelx'];
    const t = typeof field.type === 'string' ? field.type : '';
    switch (t) {
      case 'textarea': return `Área de Texto${field.key ? ' (' + field.key + ')' : ''}`;
      case 'archivo':
      case 'cargadorArchivos': return `Adjunto PDF${to?.label ? ': ' + to.label : ''}`;
      case 'documentosRelacionados': return 'Referencias Relacionadas';
      case 'ccArchivo': return 'Con Copia a (CC/Archivo)';
      case 'vacio': return `Espaciador (${to?.['alto'] ? to['alto'] + 'px' : (to?.['height'] || '20px')})`;
      case 'editorTexto':
      case 'editor':
      case 'editor-texto': return 'Cuerpo de Texto Enriquecido';
      case 'datosGenerales': return 'Datos Generales (PARA, DE, REF)';
      case 'encabezado': return 'Encabezado Institucional';
      case 'documentosAnular': return 'Documentos a Anular';
      case 'listaContactos': return 'Lista de Contactos';
      case 'cajachica': return 'Imputación Caja Chica';
      case 'certificacionComprometido': return 'Certificación Presupuestaria';
      case 'aprobacionCD': return 'Aprobación Consejo Directivo';
      case 'consultaAlmacen': return 'Consulta a Almacenes';
      case 'recuperarEntregaAlmacen': return 'Recuperar Entrega Almacén';
      case 'ingresoAlmacen': return 'Ingreso a Almacén';
      case 'tablaActivos': return 'Tabla de Activos Fijos';
      case 'ingresoActivos': return 'Ingreso de Activos Fijos';
      case 'bajaActivos': return 'Baja de Activos Fijos';
      case 'layout': return 'Distribución en Columnas';
    }
    if (field.key) return String(field.key);
    return String(field.type || 'Elemento sin etiqueta');
  }

  getFieldIcon(type?: any): string {
    const t = typeof type === 'string' ? type : '';
    switch (t) {
      case 'cite': return 'tag';
      case 'texto': return 'title';
      case 'subtitulo': return 'text_fields';
      case 'parrafo': return 'format_align_left';
      case 'despedida': return 'mark_email_read';
      case 'datosGenerales':
      case 'encabezado': return 'assignment_ind';
      case 'editorTexto':
      case 'editor':
      case 'editor-texto': return 'edit_note';
      case 'vacio': return 'space_bar';
      case 'inputt':
      case 'input': return 'short_text';
      case 'textarea': return 'notes';
      case 'select':
      case 'clasificacion': return 'arrow_drop_down_circle';
      case 'radio': return 'radio_button_checked';
      case 'checkbox': return 'check_box';
      case 'datepicker':
      case 'calendario': return 'calendar_today';
      case 'documentosRelacionados': return 'link';
      case 'ccArchivo': return 'content_copy';
      case 'archivo':
      case 'cargadorArchivos': return 'attach_file';
      case 'documentosAnular': return 'cancel';
      case 'listaContactos': return 'contact_page';
      case 'cajachica': return 'account_balance_wallet';
      case 'certificacionComprometido': return 'receipt_long';
      case 'aprobacionCD': return 'how_to_vote';
      case 'consultaAlmacen': return 'inventory_2';
      case 'recuperarEntregaAlmacen': return 'local_shipping';
      case 'ingresoAlmacen': return 'archive';
      case 'tablaActivos': return 'table_chart';
      case 'ingresoActivos': return 'add_business';
      case 'bajaActivos': return 'remove_shopping_cart';
      case 'layout': return 'view_column';
      default: return 'widgets';
    }
  }

  getFieldTypeString(type: any): string {
    if (!type) return '';
    if (typeof type === 'string') return type;
    if (typeof type === 'function' && type.name) {
      const n: string = type.name;
      if (n.includes('EditorTexto')) return 'editorTexto';
      if (n.includes('Cite')) return 'cite';
      if (n.includes('DatosGenerales')) return 'datosGenerales';
      if (n.includes('CcArchivo')) return 'ccArchivo';
      if (n.includes('Texto')) return 'texto';
      if (n.includes('Vacio')) return 'vacio';
      if (n.includes('Inputt') || n.includes('Input')) return 'inputt';
      if (n.includes('Relacionados')) return 'documentosRelacionados';
      if (n.includes('Archivo')) return 'archivo';
      if (n.includes('Listas') || n.includes('Lista')) return 'select';
      if (n.includes('Calendario')) return 'datepicker';
      if (n.includes('Cajachica')) return 'cajachica';
      if (n.includes('AprobacionCd')) return 'aprobacionCD';
      if (n.includes('Anular')) return 'documentosAnular';
      return n;
    }
    return String(type);
  }

  editarCampo(field: FormlyFieldConfig, index: number): void {
    this.selectedFieldIndex.set(index);
    const clonedField: FormlyFieldConfig = JSON.parse(JSON.stringify(field, (k, v) => {
      if (k === 'type' && typeof v === 'function') {
        return this.getFieldTypeString(v);
      }
      return v;
    }));
    clonedField.type = this.getFieldTypeString(clonedField.type || field.type);

    const dialogRef = this.dialog.open(BloquePropiedadesDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      data: {
        field: clonedField,
        index: index
      }
    });

    dialogRef.afterClosed().subscribe((res: FormlyFieldConfig | undefined) => {
      this.selectedFieldIndex.set(null);
      if (res) {
        this.canvasFields[index] = res;
        // Si se editó CITE y cambió tipoHoja, sincronizar el metaForm
        if (index === 0 && res.type === 'cite' && res.templateOptions?.['tipoHoja']) {
          this.metaForm.get('tipoHoja')?.setValue(res.templateOptions['tipoHoja'], { emitEvent: false });
        }
        this.actualizarPreview();
        this.snackBar.open('Propiedades del bloque actualizadas', 'Cerrar', { duration: 2500 });
      }
    });
  }

  eliminarCampo(index: number): void {
    if (index === 0 && this.canvasFields[0].type === 'cite') {
      this.snackBar.open('El CITE oficial es obligatorio y no puede eliminarse.', 'Entendido', { duration: 3000 });
      return;
    }
    this.canvasFields.splice(index, 1);
    this.actualizarPreview();
  }

  limpiarLienzo(): void {
    // Restablece conservando el bloque CITE obligatorio
    this.canvasFields = [this.crearCiteDefault()];
    this.actualizarPreview();
    this.snackBar.open('Lienzo restablecido al bloque CITE obligatorio', 'Cerrar', { duration: 3000 });
  }

  actualizarPreview(): void {
    // Clonar para forzar ciclo de detección y regeneración completa de @ngx-formly
    this.previewFields = JSON.parse(JSON.stringify(this.canvasFields));
    this.cdr.detectChanges();
  }

  guardarPlantilla(): void {
    if (this.metaForm.invalid) return;

    // Asegurar que el primer elemento sea CITE
    if (this.canvasFields.length === 0 || this.canvasFields[0].type !== 'cite') {
      this.canvasFields.unshift(this.crearCiteDefault());
    }

    this.saving.set(true);
    const val = this.metaForm.value;

    const payload: PlantillaFormly = {
      nombre: val.nombre.trim(),
      abreviacion: val.abreviacion.trim().toUpperCase(),
      plantilla: JSON.stringify(this.canvasFields),
      plantilla_valor: JSON.stringify({ inputSelect: 'Reservado' }),
      estado: 'ACTIVO'
    };

    if (this.isEditing() && this.plantillaId) {
      this.plantillasService.actualizarPlantilla(this.plantillaId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Plantilla institucional actualizada con éxito', 'Cerrar', { duration: 3500 });
          this.router.navigate(['/plantillas']);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al actualizar la plantilla', 'Cerrar', { duration: 4000 });
        }
      });
    } else {
      this.plantillasService.crearPlantilla(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Plantilla institucional creada exitosamente', 'Cerrar', { duration: 3500 });
          this.router.navigate(['/plantillas']);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.snackBar.open(err.error?.mensaje || 'Error al guardar la nueva plantilla', 'Cerrar', { duration: 4000 });
        }
      });
    }
  }
}
