import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

export interface FilaPresupuesto {
  partida: string;
  descripcion: string;
  monto: number;
}

@Component({
  selector: 'formly-field-cajachica',
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
    <div class="presupuesto-box">
      <div class="presupuesto-header">
        <span class="presupuesto-titulo">{{ to.label || 'ASIGNACIÓN PRESUPUESTARIA / PARTIDAS' }}</span>
        @if (!to.disabled) {
          <button type="button" class="btn-add-row" (click)="agregarFila()" matTooltip="Agregar partida presupuestaria">
            <mat-icon>add</mat-icon>
            <span>Añadir Partida</span>
          </button>
        }
      </div>

      <div class="table-responsive">
        <table class="tabla-presupuesto">
          <thead>
            <tr>
              <th style="width: 140px;">Partida</th>
              <th>Descripción / Detalle del Gasto</th>
              <th style="width: 140px; text-align: right;">Monto (Bs.)</th>
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
                    class="table-input"
                    placeholder="Ej. 25600"
                    [(ngModel)]="row.partida"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    class="table-input"
                    placeholder="Detalle de imputación..."
                    [(ngModel)]="row.descripcion"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    class="table-input input-monto"
                    placeholder="0.00"
                    [(ngModel)]="row.monto"
                    (ngModelChange)="actualizarValores()"
                    [disabled]="to.disabled || false"
                  />
                </td>
                @if (!to.disabled) {
                  <td class="text-center">
                    <button type="button" class="btn-delete" (click)="eliminarFila(idx)" matTooltip="Eliminar fila">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="to.disabled ? 3 : 4" class="empty-table-msg">
                  No se han registrado partidas presupuestarias.
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="fila-total">
              <td colspan="2" class="total-label">TOTAL GENERAL (Bs.):</td>
              <td class="total-monto">{{ totalGeneral() | number:'1.2-2' }}</td>
              @if (!to.disabled) {
                <td></td>
              }
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .presupuesto-box {
      margin: 16px 0;
      border: 1px solid #cfd8dc;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }
    .presupuesto-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #eceff1;
      border-bottom: 1px solid #cfd8dc;
    }
    .presupuesto-titulo {
      font-size: 12.5px;
      font-weight: 700;
      color: #37474f;
      letter-spacing: 0.5px;
    }
    .btn-add-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #00838f;
      color: #ffffff;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: #006064; }
    }
    .table-responsive { width: 100%; overflow-x: auto; }
    .tabla-presupuesto {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      th {
        background: #f5f5f5;
        color: #546e7a;
        font-weight: 600;
        padding: 8px 10px;
        border-bottom: 1px solid #cfd8dc;
        text-align: left;
      }
      td {
        padding: 6px 10px;
        border-bottom: 1px solid #eceff1;
      }
    }
    .table-input {
      width: 100%;
      height: 30px;
      border: 1px solid #cfd8dc;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: inherit;
      font-size: 12px;
      color: #263238;
      box-sizing: border-box;
      outline: none;
      &:focus { border-color: #00838f; }
    }
    .input-monto { text-align: right; font-weight: 600; }
    .btn-delete {
      border: none;
      background: transparent;
      color: #b0bec5;
      cursor: pointer;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #d32f2f; }
    }
    .empty-table-msg {
      text-align: center;
      color: #90a4ae;
      padding: 16px;
      font-style: italic;
    }
    .fila-total {
      background: #fafafa;
      font-weight: 700;
      border-top: 2px solid #b0bec5;
    }
    .total-label { text-align: right; color: #37474f; }
    .total-monto { text-align: right; color: #00838f; font-size: 13px; }
    .text-center { text-align: center; }
  `]
})
export class FormlyFieldCajachicaComponent extends FieldType<FieldTypeConfig> implements OnInit {
  filas = signal<FilaPresupuesto[]>([]);
  totalGeneral = signal<number>(0);

  ngOnInit(): void {
    const val = this.formControl.value;
    if (val && Array.isArray(val.rows)) {
      this.filas.set(val.rows);
      this.totalGeneral.set(Number(val.monto_total) || 0);
    } else if (Array.isArray(val)) {
      this.filas.set(val);
      this.calcularTotal();
    }
  }

  agregarFila(): void {
    const nueva: FilaPresupuesto = { partida: '', descripcion: '', monto: 0 };
    const actual = [...this.filas(), nueva];
    this.filas.set(actual);
    this.actualizarValores();
  }

  eliminarFila(index: number): void {
    const actual = [...this.filas()];
    actual.splice(index, 1);
    this.filas.set(actual);
    this.actualizarValores();
  }

  actualizarValores(): void {
    this.calcularTotal();
    const payload = {
      tipo: this.to['tipo'] || 'COMPROMETIDO',
      rows: this.filas(),
      monto_total: this.totalGeneral()
    };
    this.formControl.setValue(payload);
  }

  private calcularTotal(): void {
    const tot = this.filas().reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
    this.totalGeneral.set(tot);
  }
}
