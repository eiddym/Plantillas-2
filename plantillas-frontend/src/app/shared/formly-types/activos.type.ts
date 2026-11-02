import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

export interface ActivoFijoItem {
  id?: number | string;
  barcode: string;
  codigo?: string;
  descripcion: string;
  marca?: string;
  modelo?: string;
  color?: string;
  precio?: string | number;
  cuenta?: string;
  ci?: string;
  cantidad?: number;
}

@Component({
  selector: 'formly-field-activos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="activos-box">
      <div class="activos-header">
        <div class="header-info">
          <mat-icon class="activos-icon">devices</mat-icon>
          <span class="activos-titulo">{{ to.label || 'GESTIÓN Y ASIGNACIÓN DE ACTIVOS FIJOS (NSIAF)' }}</span>
        </div>
        @if (!to.disabled) {
          <div class="header-actions">
            <button 
              type="button" 
              class="btn-nsiaf-catalog" 
              (click)="toggleBuscador()"
              matTooltip="Consultar activos fijos registrados en el sistema NSIAF"
            >
              <mat-icon>search</mat-icon>
              <span>{{ mostrandoBuscador() ? 'Cerrar Consulta' : 'Buscar en NSIAF' }}</span>
            </button>
            <button 
              type="button" 
              class="btn-add-manual" 
              (click)="agregarFilaVacia()"
              matTooltip="Agregar renglón para llenado manual"
            >
              <mat-icon>add</mat-icon>
              <span>Fila Manual</span>
            </button>
          </div>
        }
      </div>

      <!-- Configuración Operativa del Formulario de Activos -->
      <div class="activos-subbar">
        <div class="tipo-op-group">
          <label class="subbar-label">Tipo de Operación:</label>
          <select 
            class="subbar-select" 
            [(ngModel)]="tipoOperacion" 
            (ngModelChange)="actualizarValores()"
            [disabled]="to.disabled || false"
          >
            <option value="ASIGNACION">Asignación de Activos</option>
            <option value="DEVOLUCION">Devolución / Entrega de Activos</option>
            <option value="BAJA">Baja de Activos Fijos</option>
            <option value="INGRESO">Ingreso / Reingreso</option>
          </select>
        </div>

        <div class="motivo-input-group">
          <input
            type="text"
            class="subbar-input"
            placeholder="Motivo o justificación de la asignación/movimiento..."
            [(ngModel)]="motivo"
            (ngModelChange)="actualizarValores()"
            [disabled]="to.disabled || false"
          />
        </div>
      </div>

      <!-- Panel Buscador Directo NSIAF Activos -->
      @if (mostrandoBuscador() && !to.disabled) {
        <div class="buscador-nsiaf-panel">
          <div class="search-bar">
            <mat-icon class="search-icon">qr_code_scanner</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Buscar por código de barras (ej. ADSIB-12400-0001), descripción o marca..."
              [(ngModel)]="filtroBusqueda"
              (ngModelChange)="buscarEnNsiaf($event)"
            />
            @if (cargando()) {
              <span class="spinner-inline">Consultando NSIAF Activos...</span>
            }
          </div>

          @if (resultadosNsiaf().length > 0) {
            <div class="lista-resultados-nsiaf">
              @for (act of resultadosNsiaf(); track act.id || act.barcode) {
                <div class="item-nsiaf" (click)="seleccionarActivoNsiaf(act)">
                  <div class="item-main">
                    <span class="item-barcode">[{{ act.barcode }}]</span>
                    <span class="item-desc">{{ act.descripcion }}</span>
                  </div>
                  <div class="item-meta">
                    @if (act.marca || act.modelo) {
                      <span class="item-brand">{{ act.marca }} {{ act.modelo }}</span>
                    }
                    @if (act.cuenta) {
                      <span class="item-cuenta">{{ act.cuenta }}</span>
                    }
                    <button type="button" class="btn-select-act">
                      <mat-icon>add_circle</mat-icon> Seleccionar
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargando() && busquedaRealizada()) {
            <div class="no-results-nsiaf">
              <span>No se encontraron activos fijos en el inventario NSIAF con el criterio ingresado.</span>
            </div>
          }
        </div>
      }

      <!-- Tabla de Activos Fijos -->
      <div class="table-responsive">
        <table class="tabla-activos">
          <thead>
            <tr>
              <th style="width: 170px;">Código / Barcode</th>
              <th>Descripción del Activo Fijo</th>
              <th style="width: 160px;">Marca / Modelo</th>
              <th style="width: 100px; text-align: right;">Cantidad</th>
              @if (!to.disabled) {
                <th style="width: 48px;"></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of filas(); track idx; let idx = $index) {
              <tr>
                <td>
                  <input
                    type="text"
                    class="table-input code-input"
                    placeholder="Ej. ADSIB-12400-0001"
                    [(ngModel)]="row.barcode"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="table-input"
                    placeholder="Descripción técnica del equipo o mobiliario..."
                    [(ngModel)]="row.descripcion"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="table-input"
                    placeholder="Marca y modelo..."
                    [(ngModel)]="row.marca"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    class="table-input text-right"
                    placeholder="1"
                    [(ngModel)]="row.cantidad"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                @if (!to.disabled) {
                  <td class="text-center">
                    <button 
                      type="button" 
                      class="btn-delete" 
                      (click)="eliminarFila(idx)" 
                      matTooltip="Eliminar activo"
                    >
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="to.disabled ? 4 : 5" class="empty-table-msg">
                  No se han seleccionado activos fijos. Use el botón "Buscar en NSIAF" o agregue una fila manual.
                </td>
              </tr>
            }
          </tbody>
          @if (filas().length > 0) {
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total Activos Fijos:</td>
                <td class="total-value text-right">{{ totalItems() }}</td>
                @if (!to.disabled) {
                  <td></td>
                }
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  `,
  styles: [`
    .activos-box {
      margin: 1.5rem 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      font-family: inherit;
    }

    .activos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .activos-icon {
      color: #0f766e;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .activos-titulo {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.025em;
      text-transform: uppercase;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-nsiaf-catalog {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      background: #0f766e;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-nsiaf-catalog:hover {
      background: #115e59;
    }

    .btn-nsiaf-catalog mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-add-manual {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.75rem;
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-add-manual:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .btn-add-manual mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .activos-subbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.65rem 1.25rem;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .tipo-op-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .subbar-label {
      font-size: 0.775rem;
      font-weight: 600;
      color: #475569;
    }

    .subbar-select {
      padding: 0.3rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #0f172a;
      background: #ffffff;
    }

    .motivo-input-group {
      flex: 1;
      min-width: 250px;
    }

    .subbar-input {
      width: 100%;
      padding: 0.3rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
    }

    .buscador-nsiaf-panel {
      padding: 1rem 1.25rem;
      background: #f0fdfa;
      border-bottom: 1px solid #99f6e4;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #5eead4;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
    }

    .search-bar .search-icon {
      color: #0f766e;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-bar .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.875rem;
      color: #0f172a;
    }

    .spinner-inline {
      font-size: 0.75rem;
      color: #0f766e;
      font-style: italic;
    }

    .lista-resultados-nsiaf {
      margin-top: 0.75rem;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      background: #ffffff;
    }

    .item-nsiaf {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0.9rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.15s;
    }

    .item-nsiaf:last-child {
      border-bottom: none;
    }

    .item-nsiaf:hover {
      background: #f8fafc;
    }

    .item-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .item-barcode {
      font-weight: 700;
      color: #0f766e;
      font-size: 0.825rem;
    }

    .item-desc {
      color: #1e293b;
      font-size: 0.875rem;
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .item-brand {
      font-size: 0.75rem;
      background: #e2e8f0;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .item-cuenta {
      font-size: 0.75rem;
      color: #64748b;
    }

    .btn-select-act {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.25rem 0.5rem;
      background: #ccfbf1;
      color: #0f766e;
      border: none;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .no-results-nsiaf {
      margin-top: 0.75rem;
      padding: 0.75rem;
      text-align: center;
      color: #64748b;
      font-size: 0.825rem;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .tabla-activos {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .tabla-activos th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 0.65rem 0.9rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tabla-activos td {
      padding: 0.5rem 0.9rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .table-input {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 0.875rem;
      color: #1e293b;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    .table-input:hover {
      border-color: #cbd5e1;
      background: #ffffff;
    }

    .table-input:focus {
      outline: none;
      border-color: #0f766e;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
    }

    .code-input {
      font-weight: 600;
      color: #0f766e;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.2rem;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-delete:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    .btn-delete mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .empty-table-msg {
      text-align: center;
      padding: 2rem !important;
      color: #94a3b8;
      font-style: italic;
    }

    .total-label {
      font-weight: 600;
      color: #475569;
      text-align: right;
      padding: 0.75rem 0.9rem;
      background: #f8fafc;
    }

    .total-value {
      font-weight: 700;
      color: #0f172a;
      padding: 0.75rem 0.9rem;
      background: #f8fafc;
    }
  `]
})
export class FormlyFieldActivosComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private http = inject(HttpClient);

  filas = signal<ActivoFijoItem[]>([]);
  tipoOperacion = 'ASIGNACION';
  motivo = '';
  mostrandoBuscador = signal<boolean>(false);
  cargando = signal<boolean>(false);
  busquedaRealizada = signal<boolean>(false);
  filtroBusqueda = '';
  resultadosNsiaf = signal<ActivoFijoItem[]>([]);

  ngOnInit(): void {
    const valorActual = this.formControl.value;
    if (valorActual && typeof valorActual === 'object') {
      if (Array.isArray(valorActual.filas)) {
        this.filas.set(valorActual.filas);
      }
      if (valorActual.tipoFormularioSeleccionado) {
        this.tipoOperacion = valorActual.tipoFormularioSeleccionado;
      }
      if (valorActual.motivo) {
        this.motivo = valorActual.motivo;
      }
    }

    // Inicializar modelo con estructura compatible con el backend y el motor PDF
    this.actualizarValores();
  }

  toggleBuscador(): void {
    this.mostrandoBuscador.update(v => !v);
    if (this.mostrandoBuscador() && this.resultadosNsiaf().length === 0) {
      this.buscarEnNsiaf('');
    }
  }

  buscarEnNsiaf(filtro: string): void {
    this.cargando.set(true);
    const query = encodeURIComponent(filtro.trim());
    const url = `/api/v1/activos/consulta?filter=${query}`;

    this.http.get<{ tipoMensaje: string; datos: any[] }>(url).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.busquedaRealizada.set(true);
        if (resp && resp.datos && Array.isArray(resp.datos)) {
          this.resultadosNsiaf.set(resp.datos.map(item => ({
            id: item.id,
            barcode: item.barcode || item.codigo || `ACT-${item.id}`,
            descripcion: item.description || item.descripcion,
            marca: item.marca || '',
            modelo: item.modelo || '',
            color: item.color || '',
            precio: item.precio || 0,
            cuenta: item.cuenta || '',
            ci: item.ci || '',
            cantidad: 1
          })));
        } else {
          this.resultadosNsiaf.set([]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.busquedaRealizada.set(true);
        this.resultadosNsiaf.set([]);
      }
    });
  }

  seleccionarActivoNsiaf(act: ActivoFijoItem): void {
    const clon = { ...act, cantidad: 1 };
    this.filas.update(lista => [...lista, clon]);
    this.actualizarValores();
  }

  agregarFilaVacia(): void {
    this.filas.update(lista => [
      ...lista,
      { barcode: '', descripcion: '', marca: '', cantidad: 1 }
    ]);
    this.actualizarValores();
  }

  eliminarFila(idx: number): void {
    this.filas.update(lista => lista.filter((_, i) => i !== idx));
    this.actualizarValores();
  }

  totalItems(): number {
    return this.filas().reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0);
  }

  actualizarValores(): void {
    const data = {
      tipoFormularioSeleccionado: this.tipoOperacion,
      motivo: this.motivo,
      filas: this.filas(),
      total_items: this.totalItems()
    };
    this.formControl.setValue(data);
    if (this.model && this.field.key) {
      this.model[this.field.key as string] = data;
    }
  }
}

