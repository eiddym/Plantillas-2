import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-lista-contactos',
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
    <div class="contactos-renglon">
      <div 
        class="contactos-rotulo"
        [style.width.px]="(to['labelw'] && to['labelw'] > 0) ? (to['labelw'] * 10) : 120"
      >
        <span class="label-link" (click)="toggleSelector()" matTooltip="Haga clic para seleccionar contactos">
          {{ to['label'] || 'Contactos:' }}
        </span>
      </div>

      <div class="contactos-cuerpo">
        @if (mostrarSelector()) {
          <div class="selector-box">
            <div class="busqueda-wrapper">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar contacto por nombre, cargo o institución..."
                [(ngModel)]="terminoBusqueda"
                (ngModelChange)="buscarContactos($event)"
              />
              <button type="button" class="btn-close" (click)="cerrarSelector()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (resultadosBusqueda().length > 0) {
              <div class="dropdown-resultados">
                @for (c of resultadosBusqueda(); track c.id_contacto) {
                  <div class="opcion-contacto" (click)="seleccionarContacto(c)">
                    <mat-icon class="user-icon">person</mat-icon>
                    <div class="contacto-datos">
                      <span class="contacto-nombre">{{ c.grado ? c.grado + ' ' : '' }}{{ c.nombres }} {{ c.apellidos }}</span>
                      <span class="contacto-cargo">{{ c.cargo ? c.cargo + ' - ' : '' }}{{ c.sigla || c.institucion || '' }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Contactos Seleccionados -->
        <div class="chips-contactos">
          @for (c of contactosSeleccionados(); track idx; let idx = $index) {
            <div class="contacto-chip">
              <mat-icon class="chip-avatar">person</mat-icon>
              <div class="chip-text">
                <span class="chip-nombre">{{ c.grado ? c.grado + ' ' : '' }}{{ c.nombres }} {{ c.apellidos }}</span>
                @if (c.cargo || c.sigla) {
                  <span class="chip-detalle">{{ c.cargo ? c.cargo + ' - ' : '' }}{{ c.sigla || '' }}</span>
                }
              </div>
              @if (!to.disabled) {
                <button type="button" class="btn-remove" (click)="removerContacto(idx)" matTooltip="Quitar">
                  <mat-icon>clear</mat-icon>
                </button>
              }
            </div>
          } @empty {
            @if (!mostrarSelector()) {
              <div class="empty-hint" (click)="toggleSelector()">
                <mat-icon>person_add</mat-icon>
                <span>Haga clic en 'Contactos:' para añadir destinatarios externos</span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contactos-renglon {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 8px 0;
      width: 100%;
    }
    .contactos-rotulo {
      padding-top: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #37474f;
    }
    .label-link {
      cursor: pointer;
      color: #00838f;
      text-decoration: underline;
      &:hover { color: #006064; }
    }
    .contactos-cuerpo {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .selector-box {
      background: #ffffff;
      border: 1px solid #b0bec5;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 6px;
      position: relative;
      z-index: 10;
    }
    .busqueda-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 13px;
      color: #263238;
    }
    .search-icon { color: #78909c; font-size: 20px; width: 20px; height: 20px; }
    .btn-close { border: none; background: transparent; cursor: pointer; color: #78909c; }
    .dropdown-resultados {
      max-height: 180px;
      overflow-y: auto;
      margin-top: 6px;
    }
    .opcion-contacto {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      &:hover { background: #e0f2f1; color: #00695c; }
    }
    .user-icon { color: #00838f; font-size: 18px; width: 18px; height: 18px; }
    .contacto-datos { display: flex; flex-direction: column; font-size: 12px; }
    .contacto-nombre { font-weight: 600; color: #263238; }
    .contacto-cargo { font-size: 11px; color: #78909c; }
    .chips-contactos {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 32px;
    }
    .contacto-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      padding: 6px 10px;
      border-radius: 4px;
      max-width: 480px;
    }
    .chip-avatar { color: #546e7a; font-size: 18px; width: 18px; height: 18px; }
    .chip-text { flex: 1; display: flex; flex-direction: column; font-size: 12px; }
    .chip-nombre { font-weight: 600; color: #263238; }
    .chip-detalle { font-size: 10.5px; color: #78909c; }
    .btn-remove { border: none; background: transparent; cursor: pointer; color: #90a4ae; &:hover { color: #d32f2f; } }
    .empty-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #78909c;
      font-style: italic;
      cursor: pointer;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #00838f; }
    }
  `]
})
export class FormlyFieldListaContactosComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private http = inject(HttpClient);

  mostrarSelector = signal(false);
  terminoBusqueda = '';
  resultadosBusqueda = signal<any[]>([]);
  contactosSeleccionados = signal<any[]>([]);

  ngOnInit(): void {
    const val = this.formControl.value;
    if (val && val.lista && Array.isArray(val.lista)) {
      this.contactosSeleccionados.set(val.lista);
    } else if (Array.isArray(val)) {
      this.contactosSeleccionados.set(val);
    }
  }

  toggleSelector(): void {
    if (this.to.disabled) return;
    this.mostrarSelector.update(v => !v);
    if (this.mostrarSelector() && this.resultadosBusqueda().length === 0) {
      this.buscarContactos('');
    }
  }

  cerrarSelector(): void {
    this.mostrarSelector.set(false);
    this.terminoBusqueda = '';
  }

  buscarContactos(termino: string): void {
    const filterParam = termino ? `?filter=${encodeURIComponent(termino)}` : '';
    this.http.get<any>(`/api/v1/plantillasFormly/contacto${filterParam}`).subscribe({
      next: (resp) => {
        const datos = resp?.datos?.resultado || resp?.datos || [];
        this.resultadosBusqueda.set(datos);
      },
      error: () => this.resultadosBusqueda.set([])
    });
  }

  seleccionarContacto(c: any): void {
    const nuevos = [...this.contactosSeleccionados(), c];
    this.contactosSeleccionados.set(nuevos);
    this.formControl.setValue({ lista: nuevos });
    this.cerrarSelector();
  }

  removerContacto(index: number): void {
    const nuevos = [...this.contactosSeleccionados()];
    nuevos.splice(index, 1);
    this.contactosSeleccionados.set(nuevos);
    this.formControl.setValue({ lista: nuevos });
  }
}
