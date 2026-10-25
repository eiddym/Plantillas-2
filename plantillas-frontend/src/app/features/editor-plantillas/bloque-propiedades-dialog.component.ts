import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
          <mat-icon color="primary" class="header-icon">{{ getIcon(normalizedType) }}</mat-icon>
          <div>
            <h3>Propiedades del Componente</h3>
            <span class="type-pill">{{ normalizedType || 'Personalizado' }}</span>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close matTooltip="Cerrar ventana">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      @if (form) {
        <div class="dialog-body" [formGroup]="form">
          <!-- 1. BLOQUE CITE (ENCABEZADO INSTITUCIONAL OBLIGATORIO) -->
          @if (isType('cite')) {
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
          } @else if (isType('texto', 'subtitulo', 'parrafo', 'despedida')) {
            <!-- 2. BLOQUE TEXTO (TÍTULOS, SUBTÍTULOS Y PÁRRAFOS) -->
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
          } @else if (isType('datosGenerales', 'encabezado')) {
            <!-- 3. BLOQUE DATOS GENERALES (PARA / VIA / DE / REF) -->
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
          } @else if (isType('editorTexto', 'editor', 'editor-texto', 'textarea')) {
            <!-- 4. BLOQUE ÁREA DE TEXTO / EDITOR TEXTO ENRIQUECIDO (TinyMCE) -->
            <div class="prop-section">
              <h4>Área de Texto y Contenido Enriquecido</h4>
              <p class="section-hint">Editor institucional con soporte de centrado/alineación, inserción de tablas e imágenes.</p>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Título o Etiqueta de la Sección (Opcional)</mat-label>
                <input matInput formControlName="label" placeholder="Ej. Contenido del Documento, Observaciones o dejar vacío">
              </mat-form-field>

              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Identificador Clave (key)</mat-label>
                  <input matInput formControlName="key" placeholder="cuerpo ó inputTextArea">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Filas / Altura Inicial</mat-label>
                  <input matInput type="number" formControlName="rows" min="1" max="30">
                </mat-form-field>
              </div>

              <div class="checkbox-row">
                <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
                <mat-checkbox formControlName="grow">Autoexpandir según contenido (grow)</mat-checkbox>
              </div>
            </div>
          } @else if (isType('archivo', 'cargadorArchivos')) {
            <!-- 5. BLOQUE ADJUNTOS / ARCHIVO PDF -->
            <div class="prop-section">
              <h4>Carga de Adjuntos y Archivos PDF</h4>
              <p class="section-hint">Permite al redactor anexar documentos PDF y respaldos digitales al trámite oficial.</p>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Texto del Botón / Etiqueta</mat-label>
                <input matInput formControlName="label" placeholder="Ej. Elegir PDF, Anexo, Adjuntar Respaldo...">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Identificador Clave (key)</mat-label>
                <input matInput formControlName="key" placeholder="archivo">
              </mat-form-field>

              <div class="checkbox-row">
                <mat-checkbox formControlName="multiple">Permitir selección de múltiples archivos PDF</mat-checkbox>
                <mat-checkbox formControlName="required">Adjunto Obligatorio</mat-checkbox>
              </div>
            </div>
          } @else if (isType('documentosRelacionados', 'ccArchivo')) {
            <!-- 6. BLOQUE REFERENCIAS RELACIONADAS Y CC/ARCHIVO -->
            <div class="prop-section">
              <h4>{{ isType('documentosRelacionados') ? 'Referencias y CITEs Relacionados' : 'Con Copia a (CC:)' }}</h4>
              <p class="section-hint">{{ isType('documentosRelacionados') ? 'Vinculación de trámites y antecedentes anteriores.' : 'Distribución informativa de copias y archivo institucional.' }}</p>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Etiqueta Oficial</mat-label>
                <input matInput formControlName="label" placeholder="Ej. Referencias: o CC/Archivo:">
              </mat-form-field>

              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Identificador Clave (key)</mat-label>
                  <input matInput formControlName="key">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Ancho de Etiqueta (labelw)</mat-label>
                  <input matInput type="number" formControlName="labelw" min="5" max="30">
                </mat-form-field>
              </div>

              <div class="checkbox-row">
                <mat-checkbox formControlName="showItem">Mostrar en visualización y PDF</mat-checkbox>
              </div>
            </div>
          } @else if (isType('select', 'radio', 'clasificacion', 'inputSelect')) {
            <!-- 7. BLOQUE SELECT / RADIO (OPCIONES DINÁMICAS) -->
            <div class="prop-section">
              <h4>Selector de Opciones ({{ normalizedType }})</h4>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Etiqueta</mat-label>
                <input matInput formControlName="label">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Identificador Clave (key)</mat-label>
                <input matInput formControlName="key" placeholder="inputSelect">
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
          } @else if (isType('vacio')) {
            <!-- 8. BLOQUE ESPACIADOR (VACÍO) -->
            <div class="prop-section">
              <h4>Espaciador en Blanco</h4>

              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Altura (px)</mat-label>
                  <input matInput type="number" formControlName="alto" min="5" max="200" step="5">
                  <span matSuffix>px</span>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>O Medida CSS (ej. 0.5cm)</mat-label>
                  <input matInput formControlName="heightStr" placeholder="0.5cm">
                </mat-form-field>
              </div>
            </div>
          } @else if (isType('consultaAlmacen', 'recuperarEntregaAlmacen', 'ingresoAlmacen', 'tablaActivos', 'ingresoActivos', 'bajaActivos', 'documentosAnular', 'listaContactos', 'aprobacionCD')) {
            <!-- 9. BLOQUES DE ALMACÉN, ACTIVOS Y ESPECIALIZADOS -->
            <div class="prop-section">
              <h4>Módulo Especializado ({{ normalizedType }})</h4>

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
                <mat-checkbox formControlName="showItem">Mostrar en PDF</mat-checkbox>
              </div>
            </div>
          } @else if (isType('datepicker', 'calendario', 'cajachica', 'certificacionComprometido', 'checkbox', 'lista', 'listas', 'input', 'inputt', 'layout')) {
            <!-- 10. BLOQUES COMPLEMENTARIOS (FECHA, PRESUPUESTO, CAJA CHICA, CHECKBOX, INPUT) -->
            <div class="prop-section">
              <h4>Configuración de Componente ({{ normalizedType }})</h4>

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
                <mat-checkbox formControlName="showItem">Mostrar en PDF</mat-checkbox>
              </div>
            </div>
          } @else {
            <!-- 11. FALLBACK UNIVERSAL (GARANTIZA QUE NINGÚN COMPONENTE QUEDE EN BLANCO) -->
            <div class="prop-section">
              <h4>Propiedades Generales ({{ normalizedType || 'Componente' }})</h4>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Etiqueta / Nombre Visible</mat-label>
                <input matInput formControlName="label" placeholder="Título o etiqueta">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Identificador Clave (key)</mat-label>
                <input matInput formControlName="key" placeholder="variable_id">
              </mat-form-field>

              <div class="checkbox-row">
                <mat-checkbox formControlName="required">Campo Requerido</mat-checkbox>
                <mat-checkbox formControlName="showItem">Mostrar en PDF</mat-checkbox>
              </div>
            </div>
          }
        </div>
      }

      <div class="dialog-actions">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" (click)="guardar()">
          <mat-icon class="btn-icon">check</mat-icon> Aplicar Cambios
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 24px;
      min-width: 500px;
      max-width: 620px;
      min-height: 400px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: #ffffff;
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
        .header-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #1976d2;
        }
        h3 { margin: 0; color: #1a237e; font-size: 1.25rem; font-weight: 700; }
        .type-pill {
          display: inline-block;
          font-size: 0.75rem;
          padding: 3px 10px;
          border-radius: 12px;
          background: #e3f2fd;
          color: #1565c0;
          font-weight: 600;
        }
      }
    }
    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      min-height: 260px;
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
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      .btn-icon {
        margin-right: 6px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
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
  ) {
    this.initForm();
  }

  get normalizedType(): string {
    const raw = this.data?.field?.type;
    if (!raw) return '';
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'function' && (raw as any).name) {
      const n: string = (raw as any).name;
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
    return String(raw);
  }

  isType(...types: string[]): boolean {
    const curr = this.normalizedType.toLowerCase();
    return types.some(t => t.trim().toLowerCase() === curr);
  }

  ngOnInit(): void {
    if (!this.form) {
      this.initForm();
    }
  }

  private initForm(): void {
    const to = (this.data?.field?.templateOptions || {}) as any;
    const key = (this.data?.field?.key as string) || '';

    // Cargar opciones si es select o radio
    if (to.options && Array.isArray(to.options)) {
      this.opcionesList = to.options.map((o: any) => typeof o === 'string' ? o : (o.value || o.id || ''));
    } else if (this.isType('clasificacion')) {
      this.opcionesList = ['Reservado', 'Confidencial', 'Secreto', 'Desclasificado'];
    }

    this.form = this.fb.group({
      label: [to.label !== undefined ? to.label : (to.labelx || '')],
      key: [key],
      required: [!!to.required],
      tipo: [to.tipo || 'h2'],
      className: [to.className || 'ap-text-center'],
      mTop: [to.mTop !== false],
      mBot: [to.mBot !== false],
      rows: [to.rows || 2],
      grow: [to.grow === true],
      multiple: [to.multiple !== false],
      labelw: [to.labelw || 10],
      alto: [to.alto || 20],
      heightStr: [to.height || '20px'],
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
    const t = typeof type === 'string' ? type.toLowerCase() : '';
    switch (t) {
      case 'cite': return 'tag';
      case 'texto': return 'title';
      case 'subtitulo': return 'text_fields';
      case 'parrafo': return 'format_align_left';
      case 'despedida': return 'mark_email_read';
      case 'datosgenerales':
      case 'encabezado': return 'assignment_ind';
      case 'editortexto':
      case 'editor':
      case 'editor-texto': return 'edit_note';
      case 'vacio': return 'space_bar';
      case 'inputt':
      case 'input': return 'short_text';
      case 'textarea': return 'notes';
      case 'select':
      case 'clasificacion':
      case 'inputselect': return 'arrow_drop_down_circle';
      case 'radio': return 'radio_button_checked';
      case 'checkbox': return 'check_box';
      case 'datepicker':
      case 'calendario': return 'calendar_today';
      case 'documentosrelacionados': return 'link';
      case 'ccarchivo': return 'content_copy';
      case 'archivo':
      case 'cargadorarchivos': return 'attach_file';
      case 'documentosanular': return 'cancel';
      case 'listacontactos': return 'contact_page';
      case 'cajachica': return 'account_balance_wallet';
      case 'certificacioncomprometido': return 'receipt_long';
      case 'aprobacioncd': return 'how_to_vote';
      case 'consultaalmacen': return 'inventory_2';
      case 'recuperarentregaalmacen': return 'local_shipping';
      case 'ingresoalmacen': return 'archive';
      case 'tablaactivos': return 'table_chart';
      case 'ingresoactivos': return 'add_business';
      case 'bajaactivos': return 'remove_shopping_cart';
      case 'layout': return 'view_column';
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

    // Normalizar type para que siempre sea string limpio
    field.type = this.normalizedType || field.type;

    if (val.key !== undefined) {
      field.key = val.key;
    }

    if (this.isType('cite')) {
      field.templateOptions['tipoHoja'] = val.tipoHoja;
      field.templateOptions['tipoMembrete'] = val.tipoMembrete;
      field.templateOptions['tipo'] = val.tipo;
      field.templateOptions['numeracionPagina'] = val.numeracionPagina ? 'true' : 'false';
    } else if (this.isType('texto', 'subtitulo', 'parrafo', 'despedida')) {
      field.templateOptions.label = val.label;
      field.templateOptions['tipo'] = val.tipo;
      field.templateOptions['className'] = val.className;
      field.templateOptions['mTop'] = val.mTop;
      field.templateOptions['mBot'] = val.mBot;
    } else if (this.isType('datosGenerales', 'encabezado')) {
      field.templateOptions['show'] = {
        para: true,
        de: true,
        via: val.showVia,
        ref: val.showRef
      };
      field.templateOptions['labelRef'] = val.labelRef;
      field.templateOptions['aprobarPorDireccion'] = val.aprobarPorDireccion;
    } else if (this.isType('archivo', 'cargadorArchivos')) {
      field.templateOptions.label = val.label;
      field.templateOptions['multiple'] = val.multiple;
      field.templateOptions['required'] = val.required;
    } else if (this.isType('editorTexto', 'editor', 'editor-texto', 'textarea')) {
      field.templateOptions.label = val.label;
      field.templateOptions['rows'] = val.rows;
      field.templateOptions['grow'] = val.grow;
      field.templateOptions['required'] = val.required;
    } else if (this.isType('documentosRelacionados', 'ccArchivo')) {
      field.templateOptions.label = val.label;
      field.templateOptions['labelw'] = val.labelw;
      field.templateOptions['showItem'] = val.showItem;
    } else if (this.isType('select', 'radio', 'clasificacion', 'inputSelect')) {
      field.templateOptions.label = val.label;
      field.templateOptions['required'] = val.required;
      field.templateOptions['showItem'] = val.showItem;
      field.templateOptions['options'] = this.opcionesList.map(op => ({ value: op, id: op }));
    } else if (this.isType('vacio')) {
      field.templateOptions['alto'] = val.alto;
      field.templateOptions['height'] = val.heightStr || `${val.alto}px`;
    } else {
      field.templateOptions.label = val.label;
      field.templateOptions['required'] = val.required;
      field.templateOptions['showItem'] = val.showItem;
      if (val.rows) field.templateOptions['rows'] = val.rows;
    }

    this.dialogRef.close(field);
  }
}
