import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { HttpClient } from '@angular/common/http';
import { PlantillaFormly, PlantillasService } from '../../core/services/plantillas.service';
import { normalizarEsquemaFormly } from '../../shared/utils/formly-normalizer';

interface PaletteItem {
  name: string;
  type: string;
  icon: string;
  category: string;
  defaultConfig: Partial<FormlyFieldConfig>;
}

@Component({
  selector: 'app-plantilla-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
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
            <h2>{{ isEditing() ? 'Editar Plantilla: ' + (metaForm.get('nombre')?.value || '') : 'Diseñador de Plantilla' }}</h2>
            <span class="subtitle">Lienzo interactivo con validación de esquema y previsualización en vivo</span>
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
            @if (metaForm.get('nombre')?.hasError('required')) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field-short">
            <mat-label>Abreviación (Sigla Automática)</mat-label>
            <input matInput formControlName="abreviacion" readonly placeholder="Ej. ITC">
            <mat-hint>Calculada sin conectores</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Unidades Asignadas (Vacío = Todas)</mat-label>
            <mat-select formControlName="unidades_permitidas" multiple>
              @for (un of unidadesDisponibles(); track un.id_unidad) {
                <mat-option [value]="un.id_unidad">{{ un.nombre }} ({{ un.abreviacion }})</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Usuarios Específicos (Vacío = Todos)</mat-label>
            <mat-select formControlName="usuarios_permitidos" multiple>
              @for (usr of usuariosDisponibles(); track usr.id_usuario) {
                <mat-option [value]="usr.id_usuario">{{ usr.nombres }} {{ usr.apellidos }} ({{ usr.cargo }})</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="meta-checks-group" style="display:flex; flex-direction:column; gap:4px; justify-content:center;">
            <mat-checkbox formControlName="es_difusion_global" color="primary">
              <strong>Plantilla de Difusión Global (PARA = A Todo el Personal)</strong>
            </mat-checkbox>
            @if (metaForm.get('es_difusion_global')?.value) {
              <mat-checkbox formControlName="requiere_aprobacion_mae" color="primary">
                <span>Si la envía una unidad subordinada, exigir aprobación invisible de su MAE</span>
              </mat-checkbox>
            }
          </div>
        </form>
      </mat-card>

      <!-- Barra de Modos de Visualización y Control de Paleta -->
      <div class="workspace-view-controls">
        <div class="view-controls-left">
          <button 
            type="button" 
            mat-button 
            class="btn-toggle-paleta" 
            (click)="togglePaleta()" 
            [matTooltip]="paletaColapsada() ? 'Expandir barra de componentes' : 'Colapsar barra de componentes para ganar espacio'"
          >
            <mat-icon>{{ paletaColapsada() ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left' }}</mat-icon>
            <span>{{ paletaColapsada() ? 'Expandir Paleta' : 'Colapsar Paleta' }}</span>
          </button>
        </div>

        <div class="view-mode-tabs">
          <button 
            type="button" 
            class="mode-btn" 
            [class.active]="modoVistaLayout() === 'completa'" 
            (click)="setModoVista('completa')"
            matTooltip="Ver Lienzo y Vista Previa Lado a Lado"
          >
            <mat-icon>view_column</mat-icon>
            <span>Vista Dividida</span>
          </button>
          <button 
            type="button" 
            class="mode-btn" 
            [class.active]="modoVistaLayout() === 'estructura'" 
            (click)="setModoVista('estructura')"
            matTooltip="Solo Lienzo de Estructura"
          >
            <mat-icon>view_stream</mat-icon>
            <span>Solo Estructura</span>
          </button>
          <button 
            type="button" 
            class="mode-btn" 
            [class.active]="modoVistaLayout() === 'preview'" 
            (click)="setModoVista('preview')"
            matTooltip="Solo Vista Previa del Documento"
          >
            <mat-icon>visibility</mat-icon>
            <span>Solo Vista Previa</span>
          </button>
        </div>
      </div>

      <!-- Workspace: Palette + Canvas + Live Preview -->
      <div 
        class="workspace-grid"
        [class.paleta-colapsada]="paletaColapsada()"
        [class.modo-estructura]="modoVistaLayout() === 'estructura'"
        [class.modo-preview]="modoVistaLayout() === 'preview'"
      >
        <!-- Palette Column -->
        <mat-card class="palette-card" [hidden]="modoVistaLayout() === 'preview'" [class.compacta]="paletaColapsada()">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">widgets</mat-icon>
            <mat-card-title *ngIf="!paletaColapsada()">Componentes</mat-card-title>
            <mat-card-subtitle *ngIf="!paletaColapsada()">Haga clic o arrastre al lienzo</mat-card-subtitle>
          </mat-card-header>

          <div
            cdkDropList
            #paletteList="cdkDropList"
            [cdkDropListData]="paletteItems"
            [cdkDropListConnectedTo]="[canvasList]"
            class="palette-list"
            [class.compacta]="paletaColapsada()">
            @for (item of paletteItems; track item.name) {
              <div 
                cdkDrag 
                class="palette-item"
                [class.compacta]="paletaColapsada()"
                (click)="agregarDirecto(item)"
                [matTooltip]="paletaColapsada() ? item.name + ' (' + item.category + ')' : 'Haga clic para agregar al final del documento'"
              >
                <mat-icon class="item-icon">{{ item.icon }}</mat-icon>
                <div class="item-text" *ngIf="!paletaColapsada()">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-category">{{ item.category }}</span>
                </div>
                <mat-icon class="add-indicator" *ngIf="!paletaColapsada()">add_circle_outline</mat-icon>
              </div>
            }
          </div>
        </mat-card>

        <!-- Canvas Column -->
        <mat-card class="canvas-card" [hidden]="modoVistaLayout() === 'preview'">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">view_stream</mat-icon>
            <mat-card-title>Estructura del Documento</mat-card-title>
            <mat-card-subtitle>Seleccione para editar propiedades o reordene</mat-card-subtitle>
          </mat-card-header>

          <div
            cdkDropList
            #canvasList="cdkDropList"
            [cdkDropListData]="canvasFields"
            (cdkDropListDropped)="onDrop($event)"
            class="canvas-list">
            @for (field of canvasFields; track field; let i = $index) {
              <div 
                cdkDrag 
                class="canvas-item"
                [class.selected]="selectedFieldIndex() === i"
                (click)="seleccionarCampo(i)"
              >
                <div class="canvas-item-handle" cdkDragHandle (click)="$event.stopPropagation()">
                  <mat-icon>drag_indicator</mat-icon>
                </div>
                <div class="canvas-item-info">
                  <span class="type-badge">{{ field.type }}</span>
                  <strong>{{ field.templateOptions?.label || field.templateOptions?.['labelx'] || field.key || field.type }}</strong>
                </div>
                <div class="canvas-item-actions">
                  <button mat-icon-button (click)="duplicarCampo(i, $event)" matTooltip="Duplicar">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminarCampo(i, $event)" matTooltip="Eliminar">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="canvas-placeholder">
                <mat-icon>drag_indicator</mat-icon>
                <p>Arrastre componentes desde la paleta izquierda o haga clic sobre ellos para comenzar.</p>
              </div>
            }
          </div>

          <!-- Inspector / Propiedades del campo seleccionado -->
          @if (selectedFieldIndex() !== null && canvasFields[selectedFieldIndex()!]) {
            <div class="field-inspector">
              <div class="inspector-header">
                <h4>
                  <mat-icon>tune</mat-icon>
                  Propiedades: {{ canvasFields[selectedFieldIndex()!].type }}
                </h4>
                <button mat-icon-button (click)="selectedFieldIndex.set(null)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="inspector-body">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Etiqueta / Título del Campo</mat-label>
                  <input
                    matInput
                    [ngModel]="canvasFields[selectedFieldIndex()!].templateOptions?.label || ''"
                    (ngModelChange)="actualizarPropiedad('label', $event)"
                  />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width" *ngIf="canvasFields[selectedFieldIndex()!].type !== 'vacio' && canvasFields[selectedFieldIndex()!].type !== 'texto'">
                  <mat-label>Texto de Ayuda / Marcador (Placeholder)</mat-label>
                  <input
                    matInput
                    [ngModel]="canvasFields[selectedFieldIndex()!].templateOptions?.placeholder || ''"
                    (ngModelChange)="actualizarPropiedad('placeholder', $event)"
                  />
                </mat-form-field>

                <div class="inspector-row" *ngIf="canvasFields[selectedFieldIndex()!].type === 'texto' || canvasFields[selectedFieldIndex()!].type === 'parrafo'">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Jerarquía Tipográfica</mat-label>
                    <mat-select
                      [ngModel]="canvasFields[selectedFieldIndex()!].templateOptions?.['tipo'] || 'h2'"
                      (ngModelChange)="actualizarPropiedad('tipo', $event)"
                    >
                      <mat-option value="h1">Título Principal (H1)</mat-option>
                      <mat-option value="h2">Subtítulo Institucional (H2)</mat-option>
                      <mat-option value="h3">Encabezado de Sección (H3)</mat-option>
                      <mat-option value="h4">Subencabezado Nivel 4 (H4)</mat-option>
                      <mat-option value="h5">Subencabezado Nivel 5 (H5)</mat-option>
                      <mat-option value="h6">Epígrafe / Subtítulo Menor (H6)</mat-option>
                      <mat-option value="p">Párrafo de Texto (P)</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="inspector-row" *ngIf="canvasFields[selectedFieldIndex()!].type === 'texto' || canvasFields[selectedFieldIndex()!].type === 'parrafo'">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Alineación del Texto</mat-label>
                    <mat-select
                      [ngModel]="getCampoAlineacion(canvasFields[selectedFieldIndex()!])"
                      (ngModelChange)="actualizarAlineacion($event)"
                    >
                      <mat-option value="left">
                        <mat-icon style="vertical-align: middle; margin-right: 6px; font-size: 18px; width: 18px; height: 18px;">format_align_left</mat-icon>
                        Alinear a la Izquierda
                      </mat-option>
                      <mat-option value="center">
                        <mat-icon style="vertical-align: middle; margin-right: 6px; font-size: 18px; width: 18px; height: 18px;">format_align_center</mat-icon>
                        Centrado
                      </mat-option>
                      <mat-option value="right">
                        <mat-icon style="vertical-align: middle; margin-right: 6px; font-size: 18px; width: 18px; height: 18px;">format_align_right</mat-icon>
                        Alinear a la Derecha
                      </mat-option>
                      <mat-option value="justify">
                        <mat-icon style="vertical-align: middle; margin-right: 6px; font-size: 18px; width: 18px; height: 18px;">format_align_justify</mat-icon>
                        Justificado
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="inspector-checkboxes">
                  <mat-checkbox
                    [ngModel]="canvasFields[selectedFieldIndex()!].templateOptions?.required || false"
                    (ngModelChange)="actualizarPropiedad('required', $event)"
                    *ngIf="canvasFields[selectedFieldIndex()!].type !== 'vacio' && canvasFields[selectedFieldIndex()!].type !== 'texto'"
                  >
                    Campo Obligatorio
                  </mat-checkbox>
                </div>
              </div>
            </div>
          }
        </mat-card>

        <!-- Preview Column -->
        <mat-card class="preview-card" [hidden]="modoVistaLayout() === 'estructura'">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">visibility</mat-icon>
            <mat-card-title>Vista Previa del Documento</mat-card-title>
            <mat-card-subtitle>Diagramación en tiempo real</mat-card-subtitle>
          </mat-card-header>

          <div class="preview-content">
            <div class="pagina-documento">
              <!-- Cabecera Institucional Fija con CITE y Fecha (si el esquema no incluye cite explícito) -->
              @if (!tieneCampoCite()) {
                <div class="preview-fixed-header">
                  <span class="preview-cite">CITE: [Autogenerado al aprobar]</span>
                  <span class="preview-fecha">FECHA: [Fecha oficial]</span>
                </div>
                <div class="preview-header-line"></div>
              }

              @if (mostrarPreview && previewFields.length > 0) {
                <form [formGroup]="previewForm">
                  <formly-form
                    [form]="previewForm"
                    [fields]="previewFields"
                    [model]="previewModel">
                  </formly-form>
                </form>
              } @else {
                <div class="preview-placeholder">Agregue componentes para ver la vista previa.</div>
              }
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
      padding: 0 8px;
    }
    .preview-fixed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0 10px 0;
      font-weight: 700;
      font-size: 0.95rem;
      color: #0f172a;
      .preview-cite { font-family: monospace; color: #1e293b; }
      .preview-fecha { color: #475569; font-size: 0.88rem; }
    }
    .preview-header-line {
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 16px;
    }
    .pagina-documento {
      background: #ffffff;
      padding: 24px 20px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      min-height: 480px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
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
        h2 { margin: 0; color: #1a237e; font-size: 1.45rem; }
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

    .workspace-view-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-toggle-paleta {
      font-weight: 600;
      color: #334155;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 0 12px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      &:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    }

    .view-mode-tabs {
      display: inline-flex;
      background: #e2e8f0;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }

    .mode-btn {
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: #0f172a;
      }

      &.active {
        background: #ffffff;
        color: #0f2027;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }

    .workspace-grid {
      display: grid;
      grid-template-columns: 250px minmax(300px, 1fr) minmax(340px, 1.15fr);
      gap: 16px;
      align-items: start;
      transition: grid-template-columns 0.25s ease;

      &.paleta-colapsada {
        grid-template-columns: 60px minmax(320px, 1fr) minmax(360px, 1.15fr);
      }

      &.modo-estructura {
        grid-template-columns: 250px 1fr;
        &.paleta-colapsada {
          grid-template-columns: 60px 1fr;
        }
      }

      &.modo-preview {
        grid-template-columns: 1fr;
        max-width: 900px;
        margin: 0 auto;
      }
    }

    .palette-card, .canvas-card, .preview-card {
      border-radius: 12px;
      min-height: 600px;
    }

    .palette-card.compacta {
      padding: 4px;
      mat-card-header {
        padding: 8px 4px;
        justify-content: center;
      }
    }

    .palette-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 650px;
      overflow-y: auto;

      &.compacta {
        padding: 6px 2px;
        align-items: center;
      }
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: grab;
      font-weight: 500;
      color: #37474f;
      transition: background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      position: relative;

      &.compacta {
        padding: 10px 6px;
        justify-content: center;
        width: 100%;
        .item-icon {
          margin: 0;
        }
      }
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        .add-indicator { color: #16a34a; }
      }
      .item-icon { color: #0284c7; font-size: 20px; width: 20px; height: 20px; }
      .item-text {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .item-name { font-size: 13px; font-weight: 600; color: #1e293b; }
      .item-category { font-size: 10.5px; color: #64748b; text-transform: uppercase; }
      .add-indicator { color: #94a3b8; font-size: 18px; width: 18px; height: 18px; }
    }

    .canvas-list {
      padding: 12px;
      min-height: 250px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .canvas-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 20px;
      color: #94a3b8;
      text-align: center;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
    }
    .canvas-item {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        border-color: #94a3b8;
      }
      &.selected {
        border-color: #0284c7;
        background-color: #f0f9ff;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
      }
      .canvas-item-handle {
        cursor: grab;
        color: #94a3b8;
        margin-right: 6px;
        display: flex;
      }
      .canvas-item-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        strong {
          font-size: 12.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
      .type-badge {
        font-size: 0.72rem;
        background: #e0f2fe;
        color: #0369a1;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .canvas-item-actions {
        display: flex;
        button { width: 32px; height: 32px; }
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }
    }

    .field-inspector {
      margin: 12px;
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      animation: fadeIn 0.2s ease;
      .inspector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        h4 {
          margin: 0;
          font-size: 13.5px;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
          mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0284c7; }
        }
        button { width: 28px; height: 28px; }
      }
      .full-width {
        width: 100%;
        margin-bottom: -1em;
      }
      .inspector-checkboxes {
        margin-top: 10px;
      }
    }

    .preview-content {
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      min-height: 400px;
    }
    .preview-card {
      position: sticky;
      top: 16px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }

    .preview-placeholder {
      padding: 40px 10px;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1100px) {
      .workspace-grid {
        grid-template-columns: 60px minmax(280px, 1fr) minmax(320px, 1.15fr);
      }
      .palette-item .item-text, 
      .palette-item .add-indicator, 
      .palette-card mat-card-subtitle,
      .palette-card mat-card-title {
        display: none;
      }
      .palette-list {
        padding: 6px 2px;
        align-items: center;
      }
      .palette-item {
        padding: 10px 6px;
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .workspace-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlantillaEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly plantillasService = inject(PlantillasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditing = signal(false);
  readonly saving = signal(false);
  readonly selectedFieldIndex = signal<number | null>(null);
  readonly modoVistaLayout = signal<'completa' | 'estructura' | 'preview'>('completa');
  readonly paletaColapsada = signal<boolean>(false);
  readonly unidadesDisponibles = signal<any[]>([]);
  readonly usuariosDisponibles = signal<any[]>([]);
  plantillaId: number | null = null;

  togglePaleta(): void {
    this.paletaColapsada.update(v => !v);
  }

  setModoVista(modo: 'completa' | 'estructura' | 'preview'): void {
    this.modoVistaLayout.set(modo);
  }

  tieneCampoCite(): boolean {
    return (this.canvasFields || []).some(f => f?.type === 'cite');
  }

  readonly metaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    abreviacion: ['', [Validators.required]],
    es_difusion_global: [false],
    requiere_aprobacion_mae: [true],
    unidades_permitidas: [[]],
    usuarios_permitidos: [[]]
  });

  previewForm = new FormGroup({});
  previewModel: Record<string, any> = {};
  previewFields: FormlyFieldConfig[] = [];

  readonly paletteItems: PaletteItem[] = [
    {
      name: 'Datos Generales (PARA / DE / REF)',
      type: 'datosGenerales',
      category: 'Cabecera',
      icon: 'badge',
      defaultConfig: {
        type: 'datosGenerales',
        key: 'datosGenerales',
        templateOptions: { show: { para: true, via: true, de: true, ref: true } }
      }
    },
    {
      name: 'Título Institucional',
      type: 'texto',
      category: 'Tipografía',
      icon: 'title',
      defaultConfig: {
        type: 'texto',
        key: 'titulo',
        templateOptions: { label: 'TÍTULO DEL DOCUMENTO', tipo: 'h2', className: 'ap-text-center' }
      }
    },
    {
      name: 'Párrafo de Texto',
      type: 'parrafo',
      category: 'Tipografía',
      icon: 'segment',
      defaultConfig: {
        type: 'parrafo',
        key: 'parrafo',
        templateOptions: { label: 'Texto descriptivo o cláusula institucional...', tipo: 'p', className: 'ap-text-justify' }
      }
    },
    {
      name: 'Editor Enriquecido (TinyMCE)',
      type: 'editorTexto',
      category: 'Redacción',
      icon: 'format_align_left',
      defaultConfig: {
        type: 'editorTexto',
        key: 'cuerpo',
        templateOptions: { label: 'Cuerpo Principal del Documento' }
      }
    },
    {
      name: 'Campo de Texto Corto (Input)',
      type: 'inputt',
      category: 'Campos',
      icon: 'edit_note',
      defaultConfig: {
        type: 'inputt',
        key: 'campoTexto',
        templateOptions: { labelx: 'DETALLE:', labelw: 15, placeholder: 'Ingrese dato...' }
      }
    },
    {
      name: 'Área de Texto (Textarea)',
      type: 'textarea',
      category: 'Campos',
      icon: 'notes',
      defaultConfig: {
        type: 'textarea',
        key: 'observaciones',
        templateOptions: { label: 'Observaciones y consideraciones adicionales', rows: 3 }
      }
    },
    {
      name: 'Selección Desplegable (Select)',
      type: 'select',
      category: 'Campos',
      icon: 'arrow_drop_down_circle',
      defaultConfig: {
        type: 'select',
        key: 'clasificacion',
        templateOptions: {
          label: 'Clasificación Oficial',
          options: [
            { label: 'Reservado', value: 'Reservado' },
            { label: 'Confidencial', value: 'Confidencial' },
            { label: 'Público', value: 'Público' }
          ]
        }
      }
    },
    {
      name: 'Casilla de Verificación (Checkbox)',
      type: 'checkbox',
      category: 'Campos',
      icon: 'check_box',
      defaultConfig: {
        type: 'checkbox',
        key: 'confirmacion',
        templateOptions: { label: 'Acepto y declaro conformidad institucional' }
      }
    },
    {
      name: 'Selector de Fecha (Datepicker)',
      type: 'calendario',
      category: 'Campos',
      icon: 'event',
      defaultConfig: {
        type: 'calendario',
        key: 'fechaLimite',
        templateOptions: { label: 'Fecha Límite / Cumplimiento' }
      }
    },
    {
      name: 'Anexos y Adjuntos (PDF)',
      type: 'archivo',
      category: 'Archivos',
      icon: 'attach_file',
      defaultConfig: {
        type: 'archivo',
        key: 'archivoAdjunto',
        templateOptions: { label: 'Documentos Adjuntos de Respaldo', multiple: true }
      }
    },
    {
      name: 'Con Copia / Archivo (CC)',
      type: 'ccArchivo',
      category: 'Cierre',
      icon: 'mark_email_read',
      defaultConfig: {
        type: 'ccArchivo',
        key: 'ccArchivo',
        templateOptions: { label: 'CC/Archivo:' }
      }
    },
    {
      name: 'Referencias / Doc. Relacionados',
      type: 'documentosRelacionados',
      category: 'Trazabilidad',
      icon: 'link',
      defaultConfig: {
        type: 'documentosRelacionados',
        key: 'documentosRelacionados',
        templateOptions: { label: 'Referencias:' }
      }
    },
    {
      name: 'Contenedor 2 Columnas (Layout)',
      type: 'layout',
      category: 'Estructura',
      icon: 'view_column',
      defaultConfig: {
        type: 'layout',
        key: 'columnas',
        fieldGroup: [
          { type: 'inputt', key: 'col1', templateOptions: { labelx: 'COLUMNA 1:', labelw: 15 } },
          { type: 'inputt', key: 'col2', templateOptions: { labelx: 'COLUMNA 2:', labelw: 15 } }
        ]
      }
    },
    {
      name: 'Espaciador en Blanco',
      type: 'vacio',
      category: 'Estructura',
      icon: 'space_bar',
      defaultConfig: {
        type: 'vacio',
        templateOptions: { alto: 20 }
      }
    },
    {
      name: 'Partidas Presupuestarias (Caja Chica)',
      type: 'cajachica',
      category: 'Financiero',
      icon: 'account_balance_wallet',
      defaultConfig: {
        type: 'cajachica',
        key: 'cajachica',
        templateOptions: { label: 'ASIGNACIÓN PRESUPUESTARIA / PARTIDAS' }
      }
    },
    {
      name: 'Materiales y Suministros (Almacén NSIAF)',
      type: 'consultaAlmacen',
      category: 'Inventario',
      icon: 'inventory_2',
      defaultConfig: {
        type: 'consultaAlmacen',
        key: 'consultaAlmacen',
        templateOptions: { label: 'SOLICITUD DE MATERIALES Y SUMINISTROS (ALMACÉN NSIAF)' }
      }
    },
    {
      name: 'Activos Fijos (NSIAF)',
      type: 'tablaActivos',
      category: 'Inventario',
      icon: 'devices',
      defaultConfig: {
        type: 'tablaActivos',
        key: 'tablaActivos',
        templateOptions: { label: 'GESTIÓN Y ASIGNACIÓN DE ACTIVOS FIJOS (NSIAF)' }
      }
    },
    {
      name: 'Documentos a Anular',
      type: 'documentosAnular',
      category: 'Trazabilidad',
      icon: 'cancel',
      defaultConfig: {
        type: 'documentosAnular',
        key: 'documentosAnular',
        templateOptions: { label: 'DOCUMENTOS A ANULAR / INVALIDAR' }
      }
    },
    {
      name: 'Contactos Externos',
      type: 'listaContactos',
      category: 'Cabecera',
      icon: 'contacts',
      defaultConfig: {
        type: 'listaContactos',
        key: 'listaContactos',
        templateOptions: { label: 'DESTINATARIO EXTERNO:' }
      }
    }
  ];

  canvasFields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
    this.http.get<any>('/api/v1/seguridad/unidad?limit=200').subscribe({
      next: (r) => this.unidadesDisponibles.set(r?.datos?.resultado || []),
      error: () => {}
    });
    this.http.get<any>('/api/v1/seguridad/usuario?limit=200').subscribe({
      next: (r) => this.usuariosDisponibles.set(r?.datos?.resultado || []),
      error: () => {}
    });

    // Generación automática de sigla/abreviación omitiendo conectores en español
    this.metaForm.get('nombre')?.valueChanges.subscribe(nom => {
      const sigla = this.generarSiglaSinConectores(nom || '');
      this.metaForm.get('abreviacion')?.setValue(sigla, { emitEvent: false });
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.plantillaId = parseInt(idParam, 10);
      this.isEditing.set(true);
      this.cargarPlantilla(this.plantillaId);
    } else {
      // Precarga institucional por defecto en lienzo nuevo
      this.canvasFields = [
        {
          type: 'datosGenerales',
          key: 'datosGenerales',
          templateOptions: { show: { para: true, via: true, de: true, ref: true } }
        },
        {
          type: 'texto',
          key: 'titulo',
          templateOptions: { label: 'INFORME INSTITUCIONAL', tipo: 'h2', className: 'ap-text-center' }
        },
        {
          type: 'editorTexto',
          key: 'cuerpo',
          templateOptions: { label: 'Contenido del Documento' }
        },
        {
          type: 'ccArchivo',
          key: 'ccArchivo',
          templateOptions: { label: 'CC/Archivo:' }
        }
      ];
      this.actualizarPreview();
    }
  }

  generarSiglaSinConectores(texto: string): string {
    if (!texto) return '';
    const conectores = new Set([
      'de', 'del', 'la', 'las', 'los', 'el', 'en', 'para', 'por', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'sin', 'sobre'
    ]);
    const palabras = texto
      .trim()
      .split(/\s+/)
      .filter(p => p.length > 0 && !conectores.has(p.toLowerCase()));

    return palabras
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  }

  cargarPlantilla(id: number): void {
    this.plantillasService.getPlantilla(id).subscribe({
      next: (res) => {
        const p = res.datos;
        try {
          const raw = JSON.parse(p.plantilla || '[]');
          this.canvasFields = Array.isArray(raw) ? raw : [];
        } catch {
          this.canvasFields = [];
        }

        let unidPerm: number[] = [];
        let usrPerm: number[] = [];
        try { unidPerm = JSON.parse(p.unidades_permitidas || '[]'); } catch {}
        try { usrPerm = JSON.parse(p.usuarios_permitidos || '[]'); } catch {}

        this.metaForm.patchValue({
          nombre: p.nombre,
          abreviacion: p.abreviacion || this.generarSiglaSinConectores(p.nombre),
          es_difusion_global: !!p.es_difusion_global,
          requiere_aprobacion_mae: p.requiere_aprobacion_mae !== false,
          unidades_permitidas: Array.isArray(unidPerm) ? unidPerm : [],
          usuarios_permitidos: Array.isArray(usrPerm) ? usrPerm : []
        });

        this.actualizarPreview();
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
      this.selectedFieldIndex.set(event.currentIndex);
    }
    this.actualizarPreview();
  }

  agregarDirecto(item: PaletteItem): void {
    const newField: FormlyFieldConfig = JSON.parse(JSON.stringify(item.defaultConfig));
    this.canvasFields.push(newField);
    this.selectedFieldIndex.set(this.canvasFields.length - 1);
    this.actualizarPreview();
  }

  seleccionarCampo(index: number): void {
    this.selectedFieldIndex.set(index);
  }

  duplicarCampo(index: number, event: Event): void {
    event.stopPropagation();
    const copia = JSON.parse(JSON.stringify(this.canvasFields[index]));
    this.canvasFields.splice(index + 1, 0, copia);
    this.selectedFieldIndex.set(index + 1);
    this.actualizarPreview();
  }

  eliminarCampo(index: number, event: Event): void {
    event.stopPropagation();
    const f = this.canvasFields[index];
    const type = f?.type;
    const label = (f?.templateOptions?.label || f?.templateOptions?.['labelx'] || '').toLowerCase();
    if (type === 'ccArchivo' || label.includes('clasificaci')) {
      this.snackBar.open('Este componente es indivisible y obligatorio para auditoría institucional.', 'Entendido', { duration: 4000 });
      return;
    }
    this.canvasFields.splice(index, 1);
    if (this.selectedFieldIndex() === index) {
      this.selectedFieldIndex.set(null);
    } else if (this.selectedFieldIndex() !== null && this.selectedFieldIndex()! > index) {
      this.selectedFieldIndex.update(v => v! - 1);
    }
    this.actualizarPreview();
  }

  limpiarLienzo(): void {
    // Limpia el lienzo preservando los componentes indivisibles de auditoría
    this.canvasFields = [
      {
        type: 'select',
        key: 'inputSelect',
        templateOptions: {
          label: 'Clasificación',
          multiple: false,
          labelProp: 'value',
          valueProp: 'id',
          showItem: true,
          options: [
            { value: 'Reservado', id: 'Reservado' },
            { value: 'Secreto', id: 'Secreto' },
            { value: 'Confidencial', id: 'Confidencial' },
            { value: 'Desclasificado', id: 'Desclasificado' }
          ],
          disabled: false,
          required: true
        }
      },
      {
        type: 'ccArchivo',
        key: 'ccArchivo',
        templateOptions: { label: 'CC/Archivo:' }
      }
    ];
    this.selectedFieldIndex.set(null);
    this.actualizarPreview();
  }

  actualizarPropiedad(prop: string, val: any): void {
    const idx = this.selectedFieldIndex();
    if (idx === null || !this.canvasFields[idx]) return;

    if (!this.canvasFields[idx].templateOptions) {
      this.canvasFields[idx].templateOptions = {};
    }
    this.canvasFields[idx].templateOptions![prop] = val;
    this.actualizarPreview();
  }

  mostrarPreview = true;

  getCampoAlineacion(field: FormlyFieldConfig): string {
    const to = field?.templateOptions || {};
    const raw = (to['alineacion'] || to['align'] || to['className'] || '').toLowerCase();
    if (raw.includes('left')) return 'left';
    if (raw.includes('right')) return 'right';
    if (raw.includes('justify')) return 'justify';
    if (raw.includes('center')) return 'center';
    return to['tipo'] === 'p' ? 'justify' : 'center';
  }

  actualizarAlineacion(align: string): void {
    const idx = this.selectedFieldIndex();
    if (idx === null || !this.canvasFields[idx]) return;
    if (!this.canvasFields[idx].templateOptions) {
      this.canvasFields[idx].templateOptions = {};
    }
    this.canvasFields[idx].templateOptions!['alineacion'] = align;
    this.canvasFields[idx].templateOptions!['className'] = `ap-text-${align}`;
    this.actualizarPreview();
  }

  actualizarPreview(): void {
    this.mostrarPreview = false;
    this.previewForm = new FormGroup({});
    this.previewModel = {};
    this.previewFields = normalizarEsquemaFormly(
      JSON.parse(JSON.stringify(this.canvasFields)),
      this.previewModel
    );
    setTimeout(() => {
      this.mostrarPreview = true;
    });
  }

  guardarPlantilla(): void {
    if (this.metaForm.invalid) return;

    this.saving.set(true);

    // Asegurar que guardamos el esquema perfectamente saneado y normalizado
    const esquemaNormalizado = normalizarEsquemaFormly(
      JSON.parse(JSON.stringify(this.canvasFields)),
      {}
    );

    const payload: PlantillaFormly = {
      nombre: this.metaForm.value.nombre,
      abreviacion: this.metaForm.value.abreviacion || this.generarSiglaSinConectores(this.metaForm.value.nombre),
      plantilla: JSON.stringify(esquemaNormalizado),
      es_difusion_global: !!this.metaForm.value.es_difusion_global,
      requiere_aprobacion_mae: !!this.metaForm.value.requiere_aprobacion_mae,
      unidades_permitidas: JSON.stringify(this.metaForm.value.unidades_permitidas || []),
      usuarios_permitidos: JSON.stringify(this.metaForm.value.usuarios_permitidos || [])
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
