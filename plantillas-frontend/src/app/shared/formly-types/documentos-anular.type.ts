import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-documentos-anular',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <div class="anular-box">
      <div class="anular-header">
        <mat-icon class="warn-icon">warning_amber</mat-icon>
        <div class="anular-info">
          <span class="anular-title">{{ to.label || 'Documentos a Anular' }}</span>
          <span class="anular-desc">Seleccione los CITEs o documentos que quedarán formalmente anulados al aprobar este trámite.</span>
        </div>
      </div>

      @if (!to.disabled) {
        <div class="search-bar">
          <input
            type="text"
            class="search-input"
            placeholder="Buscar documento propio para anular..."
            [(ngModel)]="busqueda"
            (ngModelChange)="buscar($event)"
          />
        </div>

        @if (resultados().length > 0) {
          <div class="resultados-dropdown">
            @for (doc of resultados(); track doc.id_documento) {
              <div class="resultado-item" (click)="agregar(doc)">
                <mat-icon>block</mat-icon>
                <span>{{ doc.nombre }} - {{ doc.fecha | date:'dd/MM/yyyy' }}</span>
              </div>
            }
          </div>
        }
      }

      <div class="anulados-chips">
        @for (item of seleccionados(); track item.id_documento; let idx = $index) {
          <div class="anulado-chip">
            <mat-icon class="chip-icon">block</mat-icon>
            <span class="chip-cite">{{ item.nombre }}</span>
            @if (!to.disabled) {
              <button type="button" class="btn-remove" (click)="remover(idx)">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .anular-box {
      margin: 12px 0;
      padding: 10px 14px;
      background: #fff3e0;
      border: 1px solid #ffe0b2;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .anular-header { display: flex; align-items: center; gap: 8px; }
    .warn-icon { color: #e65100; font-size: 24px; width: 24px; height: 24px; }
    .anular-info { display: flex; flex-direction: column; }
    .anular-title { font-size: 13px; font-weight: 700; color: #bf360c; }
    .anular-desc { font-size: 11px; color: #e65100; }
    .search-input {
      width: 100%;
      height: 32px;
      padding: 4px 8px;
      border: 1px solid #ffcc80;
      border-radius: 4px;
      font-size: 12px;
      box-sizing: border-box;
      outline: none;
      background: #ffffff;
      &:focus { border-color: #e65100; }
    }
    .resultados-dropdown {
      max-height: 140px;
      overflow-y: auto;
      background: #ffffff;
      border: 1px solid #ffcc80;
      border-radius: 4px;
    }
    .resultado-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #e65100; }
      &:hover { background: #ffe0b2; }
    }
    .anulados-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .anulado-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #ffb74d;
      padding: 3px 8px;
      border-radius: 14px;
      font-size: 11.5px;
      font-weight: 600;
      color: #bf360c;
    }
    .chip-icon { font-size: 14px; width: 14px; height: 14px; color: #d32f2f; }
    .btn-remove {
      border: none; background: transparent; cursor: pointer; color: #90a4ae;
      display: flex; align-items: center;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { color: #d32f2f; }
    }
  `]
})
export class FormlyFieldDocumentosAnularComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private http = inject(HttpClient);

  busqueda = '';
  resultados = signal<any[]>([]);
  seleccionados = signal<any[]>([]);

  ngOnInit(): void {
    const val = this.formControl.value;
    if (Array.isArray(val)) {
      this.seleccionados.set(val);
    }
  }

  buscar(term: string): void {
    if (!term || term.length < 2) {
      this.resultados.set([]);
      return;
    }
    const url = `/api/v1/plantillasFormly/documento?fields=id_documento,nombre,fecha&estado=APROBADO,CERRADO&filter=${encodeURIComponent(term)}&searchPro=1&tipoBus=campo&campoSel=nombre&limit=10`;
    this.http.get<any>(url).subscribe({
      next: (resp) => {
        const docs = resp?.datos?.resultado || [];
        const ids = this.seleccionados().map(s => s.id_documento);
        this.resultados.set(docs.filter((d: any) => !ids.includes(d.id_documento)));
      },
      error: () => this.resultados.set([])
    });
  }

  agregar(doc: any): void {
    const nuevos = [...this.seleccionados(), doc];
    this.seleccionados.set(nuevos);
    this.formControl.setValue(nuevos);
    this.busqueda = '';
    this.resultados.set([]);
  }

  remover(index: number): void {
    const nuevos = [...this.seleccionados()];
    nuevos.splice(index, 1);
    this.seleccionados.set(nuevos);
    this.formControl.setValue(nuevos);
  }
}
