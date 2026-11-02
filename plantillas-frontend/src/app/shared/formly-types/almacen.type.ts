import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

export interface ArticuloAlmacen {
  id?: number | string;
  codigo: string | number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  stock?: number;
}

@Component({
  selector: 'formly-field-almacen',
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
    <div class="almacen-box">
      <div class="almacen-header">
        <div class="header-info">
          <mat-icon class="almacen-icon">inventory_2</mat-icon>
          <span class="almacen-titulo">{{ to.label || 'SOLICITUD DE MATERIALES Y SUMINISTROS (ALMACÉN NSIAF)' }}</span>
        </div>
        @if (!to.disabled) {
          <div class="header-actions">
            <button 
              type="button" 
              class="btn-nsiaf-catalog" 
              (click)="toggleBuscador()"
              matTooltip="Consultar catálogo de artículos en tiempo real desde el sistema NSIAF Almacenes"
            >
              <mat-icon>search</mat-icon>
              <span>{{ mostrandoBuscador() ? 'Cerrar Catálogo' : 'Buscar en NSIAF' }}</span>
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

      <!-- Panel Buscador Directo NSIAF -->
      @if (mostrandoBuscador() && !to.disabled) {
        <div class="buscador-nsiaf-panel">
          <div class="search-bar">
            <mat-icon class="search-icon">storefront</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Escriba el nombre o código del artículo en Almacén NSIAF..."
              [(ngModel)]="filtroBusqueda"
              (ngModelChange)="buscarEnNsiaf($event)"
            />
            @if (cargando()) {
              <span class="spinner-inline">Consultando NSIAF...</span>
            }
          </div>

          @if (resultadosNsiaf().length > 0) {
            <div class="lista-resultados-nsiaf">
              @for (art of resultadosNsiaf(); track art.id || art.codigo) {
                <div class="item-nsiaf" (click)="seleccionarArticuloNsiaf(art)">
                  <div class="item-main">
                    <span class="item-codigo">[{{ art.codigo }}]</span>
                    <span class="item-desc">{{ art.descripcion }}</span>
                  </div>
                  <div class="item-meta">
                    <span class="item-unidad">{{ art.unidad }}</span>
                    @if (art.stock !== undefined) {
                      <span class="item-stock" [class.sin-stock]="art.stock <= 0">
                        Stock: {{ art.stock }}
                      </span>
                    }
                    <button type="button" class="btn-select-art">
                      <mat-icon>add_circle</mat-icon> Seleccionar
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargando() && busquedaRealizada()) {
            <div class="no-results-nsiaf">
              <span>No se encontraron artículos en el inventario NSIAF con el criterio ingresado.</span>
            </div>
          }
        </div>
      }

      <!-- Tabla de Artículos Solicitados -->
      <div class="table-responsive">
        <table class="tabla-almacen">
          <thead>
            <tr>
              <th style="width: 120px;">Código</th>
              <th>Descripción del Artículo / Suministro</th>
              <th style="width: 130px;">Unidad</th>
              <th style="width: 130px; text-align: right;">Cantidad</th>
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
                    placeholder="Ej. 30001"
                    [(ngModel)]="row.codigo"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="table-input"
                    placeholder="Descripción oficial del insumo..."
                    [(ngModel)]="row.descripcion"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="table-input"
                    placeholder="Pieza, Resma..."
                    [(ngModel)]="row.unidad"
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
                      matTooltip="Eliminar insumo"
                    >
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="to.disabled ? 4 : 5" class="empty-table-msg">
                  No se han seleccionado materiales o suministros. Use el botón "Buscar en NSIAF" o agregue una fila manual.
                </td>
              </tr>
            }
          </tbody>
          @if (filas().length > 0) {
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total Ítems Registrados:</td>
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
    .almacen-box {
      margin: 1.5rem 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      font-family: inherit;
    }

    .almacen-header {
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

    .almacen-icon {
      color: #0284c7;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .almacen-titulo {
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
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-nsiaf-catalog:hover {
      background: #0369a1;
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

    .buscador-nsiaf-panel {
      padding: 1rem 1.25rem;
      background: #f0f9ff;
      border-bottom: 1px solid #bae6fd;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #7dd3fc;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
    }

    .search-bar .search-icon {
      color: #0284c7;
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
      color: #0284c7;
      font-style: italic;
    }

    .lista-resultados-nsiaf {
      margin-top: 0.75rem;
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid #bae6fd;
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

    .item-codigo {
      font-weight: 700;
      color: #0284c7;
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

    .item-unidad {
      font-size: 0.75rem;
      background: #e2e8f0;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .item-stock {
      font-size: 0.75rem;
      font-weight: 600;
      color: #16a34a;
    }

    .item-stock.sin-stock {
      color: #dc2626;
    }

    .btn-select-art {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.25rem 0.5rem;
      background: #e0f2fe;
      color: #0369a1;
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

    .tabla-almacen {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .tabla-almacen th {
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

    .tabla-almacen td {
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
      border-color: #0284c7;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .code-input {
      font-weight: 600;
      color: #0284c7;
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
export class FormlyFieldAlmacenComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private http = inject(HttpClient);

  filas = signal<ArticuloAlmacen[]>([]);
  mostrandoBuscador = signal<boolean>(false);
  cargando = signal<boolean>(false);
  busquedaRealizada = signal<boolean>(false);
  filtroBusqueda = '';
  resultadosNsiaf = signal<ArticuloAlmacen[]>([]);

  ngOnInit(): void {
    const valorActual = this.formControl.value;
    if (valorActual && typeof valorActual === 'object') {
      if (Array.isArray(valorActual.filas)) {
        this.filas.set(valorActual.filas);
      } else if (Array.isArray(valorActual)) {
        this.filas.set(valorActual);
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
    const url = `/api/v1/almacen/consulta?filter=${query}&todos=1`;

    this.http.get<{ tipoMensaje: string; datos: any[] }>(url).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.busquedaRealizada.set(true);
        if (resp && resp.datos && Array.isArray(resp.datos)) {
          this.resultadosNsiaf.set(resp.datos.map(item => ({
            id: item.id || item.codigo,
            codigo: item.codigo || item.id,
            descripcion: item.descripcion,
            unidad: item.unidad || 'Pieza',
            cantidad: 1,
            stock: item.stock
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

  seleccionarArticuloNsiaf(art: ArticuloAlmacen): void {
    const clon = { ...art, cantidad: 1 };
    this.filas.update(lista => [...lista, clon]);
    this.actualizarValores();
  }

  agregarFilaVacia(): void {
    this.filas.update(lista => [
      ...lista,
      { codigo: '', descripcion: '', unidad: 'Pieza', cantidad: 1 }
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
      filas: this.filas(),
      total_items: this.totalItems()
    };
    this.formControl.setValue(data);
    if (this.model && this.field.key) {
      this.model[this.field.key as string] = data;
    }
  }
}

