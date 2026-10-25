import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { FormlyFieldConfig } from '@ngx-formly/core';

export interface BloqueDialogData {
  field: FormlyFieldConfig;
  index: number;
}

@Component({
  selector: 'app-bloque-propiedades-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-title">
          <mat-icon color="primary">{{ getIcon(data.field.type) }}</mat-icon>
          <div>
            <h3>Propiedades del Componente</h3>
            <span class="type-pill">{{ data.field.type }}</span>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body" [formGroup]="form">
        <!-- 1. BLOQUE CITE (ENCABEZADO INSTITUCIONAL OBLIGATORIO) -->
        @if (data.field.type === 'cite') {
          <div class="prop-section">
            <h4>Configuración de CITE y Membrete Oficial</h4>
            <p class="section-hint">El CITE y la Fecha se autogeneran institucionalmente de forma oficial tras la aprobación del Jefe de Unidad.</p>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Formato de Hoja</mat-label>
              <mat-select formControlName="tipoHoja">
                <mat-option value="Letter">Carta (21.6 x 27.9 cm)</mat-option>
                <mat-option value="Oficio">Oficio (21.6 x 33.0 cm)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Tipo de Membrete</mat-label>
              <mat-select formControlName="tipoMembrete">
                <mat-option value="sin membrete">Sin Membrete</mat-option>
                <mat-option value="externo">Membrete Oficial Externo</mat-option>
                <mat-option value="legal">Membrete Legal Institucional</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Tipo de CITE</mat-label>
              <mat-select formControlName="tipo">
                <mat-option value="unidad">CITE por Unidad Organizacional</mat-option>
                <mat-option value="general">CITE General Centralizado</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="numeracionPagina">Incluir numeración de páginas (Pág. X de Y)</mat-checkbox>
            </div>
          </div>
        }

        <!-- 2. BLOQUE TEXTO (TÍTULOS, SUBTÍTULOS Y PÁRRAFOS) -->
        @if (data.field.type === 'texto' || data.field.type === 'subtitulo' || data.field.type === 'parrafo') {
          <div class="prop-section">
            <h4>Contenido y Jerarquía del Texto</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Texto / Contenido del Encabezado</mat-label>
              <input matInput formControlName="label" placeholder="Ej. INFORME TÉCNICO, NOTA INTERNA, MEMORÁNDUM...">
            </mat-form-field>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Nivel de Encabezado</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="h1">H1 - Título Principal</mat-option>
                  <mat-option value="h2">H2 - Título Secundario</mat-option>
                  <mat-option value="h3">H3 - Subtítulo de Sección</mat-option>
                  <mat-option value="h4">H4 - Subtítulo Menor</mat-option>
                  <mat-option value="p">Párrafo Estándar</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Alineación</mat-label>
                <mat-select formControlName="className">
                  <mat-option value="ap-text-center">Centrado</mat-option>
                  <mat-option value="ap-text-left">Izquierda</mat-option>
                  <mat-option value="ap-text-right">Derecha</mat-option>
                  <mat-option value="ap-text-justify">Justificado</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="checkbox-row">
              <mat-checkbox formControlName="mTop">Margen Superior (Espacio previo)</mat-checkbox>
              <mat-checkbox formControlName="mBot">Margen Inferior (Espacio posterior)</mat-checkbox>
            </div>
          </div>
        }

        <!-- 3. BLOQUE DATOS GENERALES (PARA / VIA / DE / REF) -->
        @if (data.field.type === 'datosGenerales' || data.field.type === 'encabezado') {
          <div class="prop-section">
            <h4>Encabezado Institucional (Destinatario y Remitente)</h4>

            <div class="checkbox-col">
              <mat-checkbox formControlName="showPara" [disabled]="true">
                <strong>PARA:</strong> Destinatario Principal (Obligatorio)
              </mat-checkbox>
              <mat-checkbox formControlName="showDe" [disabled]="true">
                <strong>DE:</strong> Remitente / Elaborador (Obligatorio)
              </mat-checkbox>
              <mat-checkbox formControlName="showVia">
                <strong>VÍA:</strong> Visto Bueno Intermedio / Supervisor
              </mat-checkbox>
              <mat-checkbox formControlName="showRef">
                <strong>REF.:</strong> Asunto / Referencia del documento
              </mat-checkbox>
              <mat-checkbox formControlName="aprobarPorDireccion">
                Aprobar por Dirección Ejecutiva / MAE
              </mat-checkbox>
            </div>

            <mat-form-field appearance="outline" class="w-full mt-3">
              <mat-label>Etiqueta de Referencia</mat-label>
              <input matInput formControlName="labelRef" placeholder="Ej. REF.: ó ASUNTO:">
            </mat-form-field>
          </div>
        }

        <!-- 4. BLOQUE EDITOR TEXTO (TINYMCE / CUERPO) -->
        @if (data.field.type === 'editorTexto' || data.field.type === 'editor' || data.field.type === 'editor-texto') {
          <div class="prop-section">
            <h4>Cuerpo de Texto Enriquecido</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Título o Etiqueta de la Sección</mat-label>
              <input matInput formControlName="label" placeholder="Ej. Contenido del Documento, Antecedentes, Justificación...">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Identificador Clave (key)</mat-label>
              <input matInput formControlName="key" placeholder="Ej. cuerpo, antecedentes, conclusiones">
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
            </div>
          </div>
        }

        <!-- 5. BLOQUE ASUNTO / INPUTT -->
        @if (data.field.type === 'inputt' || data.field.type === 'input') {
          <div class="prop-section">
            <h4>Campo de Texto</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Etiqueta (Label)</mat-label>
              <input matInput formControlName="label" placeholder="Ej. Asunto, Nombre del Solicitante...">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Identificador Clave (key)</mat-label>
              <input matInput formControlName="key" placeholder="Ej. asunto, solicitante">
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
            </div>
          </div>
        }

        <!-- 6. BLOQUE ÁREA DE TEXTO (TEXTAREA) -->
        @if (data.field.type === 'textarea') {
          <div class="prop-section">
            <h4>Área de Texto Multilínea</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Etiqueta</mat-label>
              <input matInput formControlName="label">
            </mat-form-field>

            <div class="grid-2">
              <mat-form-field appearance="outline">
                <mat-label>Filas Visibles (Altura)</mat-label>
                <input matInput type="number" formControlName="rows" min="1" max="20">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Identificador Clave (key)</mat-label>
                <input matInput formControlName="key">
              </mat-form-field>
            </div>

            <div class="checkbox-row">
              <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
            </div>
          </div>
        }

        <!-- 7. BLOQUE SELECT / RADIO (OPCIONES DINÁMICAS) -->
        @if (data.field.type === 'select' || data.field.type === 'radio' || data.field.type === 'clasificacion') {
          <div class="prop-section">
            <h4>Selector de Opciones ({{ data.field.type }})</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Etiqueta</mat-label>
              <input matInput formControlName="label">
            </mat-form-field>

            <div class="checkbox-row mb-3">
              <mat-checkbox formControlName="required">Selección Requerida</mat-checkbox>
              <mat-checkbox formControlName="showItem">Mostrar en PDF</mat-checkbox>
            </div>

            <div class="opciones-manager">
              <label class="opciones-label">Opciones Disponibles:</label>
              <div class="opciones-add">
                <input #nuevaOpcionInput class="opcion-input" placeholder="Nueva opción..." (keydown.enter)="agregarOpcion(nuevaOpcionInput)">
                <button type="button" mat-flat-button color="primary" (click)="agregarOpcion(nuevaOpcionInput)">
                  <mat-icon>add</mat-icon> Añadir
                </button>
              </div>

              <div class="opciones-list">
                @for (op of opcionesList; track $index) {
                  <div class="opcion-item">
                    <span>{{ op }}</span>
                    <button type="button" mat-icon-button color="warn" (click)="removerOpcion($index)">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                } @empty {
                  <span class="sin-opciones">No hay opciones registradas. Añada una arriba.</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- 8. BLOQUE ESPACIADOR (VACÍO) -->
        @if (data.field.type === 'vacio') {
          <div class="prop-section">
            <h4>Espaciador en Blanco</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Altura del Espacio (px)</mat-label>
              <input matInput type="number" formControlName="alto" min="5" max="200" step="5">
              <span matSuffix>px</span>
            </mat-form-field>
          </div>
        }

        <!-- 9. BLOQUES COMPLEMENTARIOS (FECHA, REFERENCIAS, ETC.) -->
        @if (data.field.type === 'datepicker' || data.field.type === 'calendario' || data.field.type === 'documentosRelacionados' || data.field.type === 'ccArchivo' || data.field.type === 'cajachica' || data.field.type === 'certificacionComprometido' || data.field.type === 'checkbox') {
          <div class="prop-section">
            <h4>Configuración del Componente</h4>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Etiqueta / Título</mat-label>
              <input matInput formControlName="label">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Identificador Clave (key)</mat-label>
              <input matInput formControlName="key">
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
            </div>
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" (click)="guardar()">
          <mat-icon>check</mat-icon> Aplicar Cambios
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 24px;
      min-width: 480px;
      max-width: 580px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      .header-title {
        display: flex;
        align-items: center;
        gap: 12px;
        h3 { margin: 0; color: #1a237e; font-size: 1.25rem; font-weight: 700; }
        .type-pill {
          display: inline-block;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 12px;
          background: #e3f2fd;
          color: #1976d2;
          font-weight: 600;
        }
      }
    }
    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
    }
    .prop-section {
      h4 {
        margin: 0 0 12px 0;
        color: #263238;
        font-size: 1rem;
        font-weight: 600;
      }
      .section-hint {
        font-size: 0.85rem;
        color: #546e7a;
        margin-top: -6px;
        margin-bottom: 16px;
        line-height: 1.4;
      }
    }
    .w-full { width: 100%; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .checkbox-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    .checkbox-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .mt-3 { margin-top: 12px; }
    .mb-3 { margin-bottom: 12px; }

    .opciones-manager {
      margin-top: 8px;
      .opciones-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #455a64;
        display: block;
        margin-bottom: 6px;
      }
      .opciones-add {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        .opcion-input {
          flex: 1;
          height: 38px;
          padding: 0 12px;
          border: 1px solid #b0bec5;
          border-radius: 6px;
          font-size: 0.9rem;
          &:focus {
            outline: none;
            border-color: #1976d2;
          }
        }
      }
      .opciones-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 160px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 8px;
        background: #fafafa;
      }
      .opcion-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 10px;
        background: #ffffff;
        border: 1px solid #eceff1;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      .sin-opciones {
        color: #90a4ae;
        font-size: 0.85rem;
        text-align: center;
        padding: 10px;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class BloquePropiedadesDialogComponent implements OnInit {
  form!: FormGroup;
  opcionesList: string[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<BloquePropiedadesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: BloqueDialogData
  ) {}

  ngOnInit(): void {
    const to = (this.data.field.templateOptions || {}) as any;
    const key = (this.data.field.key as string) || '';

    // Cargar opciones si es select o radio
    if (to.options && Array.isArray(to.options)) {
      this.opcionesList = to.options.map((o: any) => typeof o === 'string' ? o : (o.value || o.id || ''));
    } else if (this.data.field.type === 'clasificacion') {
      this.opcionesList = ['Reservado', 'Confidencial', 'Secreto', 'Público'];
    }

    this.form = this.fb.group({
      label: [to.label || to.labelx || ''],
      key: [key],
      required: [!!to.required],
      tipo: [to.tipo || 'h2'],
      className: [to.className || 'ap-text-center'],
      mTop: [to.mTop !== false],
      mBot: [to.mBot !== false],
      rows: [to.rows || 3],
      alto: [to.alto || 20],
      showItem: [to.showItem !== false],
      // Datos Generales específicos
      showPara: [true],
      showDe: [true],
      showVia: [to.show?.via ?? false],
      showRef: [to.show?.ref ?? true],
      aprobarPorDireccion: [to.aprobarPorDireccion ?? false],
      labelRef: [to.labelRef || 'REF.:'],
      // CITE específicos
      tipoHoja: [to.tipoHoja || 'Letter'],
      tipoMembrete: [to.tipoMembrete || 'sin membrete'],
      numeracionPagina: [to.numeracionPagina === 'true' || to.numeracionPagina === true]
    });
  }

  getIcon(type?: any): string {
    const t = typeof type === 'string' ? type : '';
    switch (t) {
      case 'cite': return 'tag';
      case 'texto': return 'title';
      case 'subtitulo': return 'text_fields';
      case 'parrafo': return 'format_align_left';
      case 'datosGenerales':
      case 'encabezado': return 'assignment_ind';
      case 'editorTexto':
      case 'editor': return 'edit_note';
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
      case 'cajachica': return 'account_balance_wallet';
      case 'certificacionComprometido': return 'receipt_long';
      default: return 'widgets';
    }
  }

  agregarOpcion(input: HTMLInputElement): void {
    const val = input.value.trim();
    if (val && !this.opcionesList.includes(val)) {
      this.opcionesList.push(val);
      input.value = '';
    }
  }

  removerOpcion(index: number): void {
    this.opcionesList.splice(index, 1);
  }

  guardar(): void {
    const val = this.form.value;
    const field = this.data.field;
    field.templateOptions = field.templateOptions || {};

    if (val.key) {
      field.key = val.key;
    }

    if (field.type === 'cite') {
      field.templateOptions['tipoHoja'] = val.tipoHoja;
      field.templateOptions['tipoMembrete'] = val.tipoMembrete;
      field.templateOptions['tipo'] = val.tipo;
      field.templateOptions['numeracionPagina'] = val.numeracionPagina ? 'true' : 'false';
    } else if (field.type === 'texto' || field.type === 'subtitulo' || field.type === 'parrafo') {
      field.templateOptions.label = val.label;
      field.templateOptions['tipo'] = val.tipo;
      field.templateOptions['className'] = val.className;
      field.templateOptions['mTop'] = val.mTop;
      field.templateOptions['mBot'] = val.mBot;
    } else if (field.type === 'datosGenerales' || field.type === 'encabezado') {
      field.templateOptions['show'] = {
        para: true,
        de: true,
        via: val.showVia,
        ref: val.showRef
      };
      field.templateOptions['labelRef'] = val.labelRef;
      field.templateOptions['aprobarPorDireccion'] = val.aprobarPorDireccion;
    } else if (field.type === 'select' || field.type === 'radio' || field.type === 'clasificacion') {
      field.templateOptions.label = val.label;
      field.templateOptions['required'] = val.required;
      field.templateOptions['showItem'] = val.showItem;
      field.templateOptions['options'] = this.opcionesList.map(op => ({ value: op, id: op }));
    } else if (field.type === 'vacio') {
      field.templateOptions['alto'] = val.alto;
      field.templateOptions['height'] = `${val.alto}px`;
    } else {
      field.templateOptions.label = val.label;
      field.templateOptions['required'] = val.required;
      if (val.rows) field.templateOptions['rows'] = val.rows;
    }

    this.dialogRef.close(field);
  }
}
