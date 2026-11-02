import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { VisorPdfDialogComponent } from '../../features/visor-pdf/visor-pdf-dialog.component';

@Component({
  selector: 'formly-field-documentos-relacionados',
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
    <div class="docs-relacionados-renglon">
      <div 
        class="docs-rel-rotulo"
        [style.width.px]="(to['labelw'] && to['labelw'] > 0) ? (to['labelw'] * 10) : 120"
      >
        <span class="label-link" (click)="toggleSelector()" matTooltip="Haga clic para asociar documentos">
          {{ to['label'] || 'Referencias:' }}
        </span>
      </div>

      <div class="docs-rel-cuerpo">
        @if (mostrarSelector()) {
          <div class="selector-box">
            <div class="busqueda-input-wrapper">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar documento por CITE o número..."
                [(ngModel)]="terminoBusqueda"
                (ngModelChange)="buscarDocumentos($event)"
                (keyup.enter)="buscarDocumentos(terminoBusqueda)"
              />
              <button type="button" class="btn-close" (click)="cerrarSelector()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            @if (resultadosBusqueda().length > 0) {
              <div class="dropdown-resultados">
                @for (doc of resultadosBusqueda(); track doc.id_documento) {
                  <div class="opcion-doc" (click)="seleccionarDocumento(doc)">
                    <mat-icon class="doc-icon">description</mat-icon>
                    <div class="doc-info">
                      <span class="doc-nombre">{{ doc.nombre }}</span>
                      @if (doc.fecha) {
                        <span class="doc-fecha">{{ doc.fecha | date:'dd/MM/yyyy' }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else if (busquedaRealizada() && terminoBusqueda.trim().length >= 3 && !buscando()) {
              <div class="no-resultados">
                <span>No se encontró ningún documento con el CITE tecleado</span>
              </div>
            }
          </div>
        }

        <!-- Lista de documentos ya seleccionados -->
        <div class="chips-documentos">
          @for (d of documentosSeleccionados(); track d.id_documento; let idx = $index) {
            <div class="doc-badge">
              <mat-icon class="badge-icon" (click)="verPdf(d)">picture_as_pdf</mat-icon>
              <span class="badge-nombre" (click)="verPdf(d)" matTooltip="Ver documento oficial">
                {{ d.nombre }}
              </span>
              @if (!to.disabled) {
                <button type="button" class="btn-remove" (click)="removerDocumento(idx)" matTooltip="Quitar">
                  <mat-icon>clear</mat-icon>
                </button>
              }
            </div>
          } @empty {
            @if (!mostrarSelector()) {
              <div class="empty-hint" (click)="toggleSelector()">
                <mat-icon>add_link</mat-icon>
                <span>Haga clic en 'Referencias:' para vincular documentos o antecedentes</span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .docs-relacionados-renglon {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 8px 0;
      width: 100%;
    }
    .docs-rel-rotulo {
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
    .docs-rel-cuerpo {
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
    .busqueda-input-wrapper {
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
    .btn-close {
      border: none; background: transparent; cursor: pointer; color: #78909c;
      display: flex; align-items: center; justify-content: center;
      &:hover { color: #d32f2f; }
    }
    .dropdown-resultados {
      max-height: 180px;
      overflow-y: auto;
      margin-top: 6px;
      border-top: 1px solid #eceff1;
    }
    .opcion-doc {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      &:hover { background: #e0f2f1; color: #00695c; }
    }
    .doc-icon { color: #00838f; font-size: 18px; width: 18px; height: 18px; }
    .doc-info { display: flex; flex-direction: column; font-size: 12px; }
    .doc-nombre { font-weight: 600; color: #263238; }
    .doc-fecha { font-size: 10px; color: #78909c; }
    .chips-documentos {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 32px;
      align-items: center;
    }
    .doc-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eceff1;
      border: 1px solid #cfd8dc;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 12px;
      color: #37474f;
    }
    .badge-icon {
      color: #d32f2f;
      font-size: 16px;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .badge-nombre {
      font-weight: 600;
      cursor: pointer;
      &:hover { text-decoration: underline; color: #00838f; }
    }
    .btn-remove {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      color: #90a4ae;
      display: flex;
      align-items: center;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { color: #d32f2f; }
    }
    .empty-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #78909c;
      font-style: italic;
      cursor: pointer;
      padding: 4px 0;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #00838f; }
    }
    .no-resultados {
      padding: 10px 12px;
      font-size: 12px;
      color: #78909c;
      text-align: center;
      font-style: italic;
    }
  `]
})
export class FormlyFieldDocumentosRelacionadosComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);

  mostrarSelector = signal(false);
  terminoBusqueda = '';
  buscando = signal(false);
  busquedaRealizada = signal(false);
  resultadosBusqueda = signal<any[]>([]);
  documentosSeleccionados = signal<any[]>([]);

  ngOnInit(): void {
    const val = this.formControl?.value;
    if (Array.isArray(val)) {
      this.documentosSeleccionados.set(val);
    } else if (val) {
      this.documentosSeleccionados.set([val]);
    }
  }

  toggleSelector(): void {
    if (this.to.disabled) return;
    const nuevo = !this.mostrarSelector();
    this.mostrarSelector.set(nuevo);
    this.terminoBusqueda = '';
    this.resultadosBusqueda.set([]);
    this.busquedaRealizada.set(false);
    this.buscando.set(false);
  }

  cerrarSelector(): void {
    this.mostrarSelector.set(false);
    this.terminoBusqueda = '';
    this.resultadosBusqueda.set([]);
    this.busquedaRealizada.set(false);
    this.buscando.set(false);
  }

  buscarDocumentos(termino: string): void {
    const query = (termino || '').trim();

    // Regla estricta: NO buscar ni mostrar documentos si no se ha tecleado un CITE (mínimo 3 caracteres)
    if (!query || query.length < 3) {
      this.resultadosBusqueda.set([]);
      this.busquedaRealizada.set(false);
      this.buscando.set(false);
      return;
    }

    this.buscando.set(true);
    this.busquedaRealizada.set(true);

    const filterParam = `&filter=${encodeURIComponent(query)}&searchPro=1&tipoBus=campo&campoSel=nombre`;
    const url = `/api/v1/plantillasFormly/documento?fields=id_documento,nombre,fecha&estado=APROBADO,CERRADO,DERIVADO&page=1&order=-fecha&limit=15${filterParam}`;
    this.http.get<any>(url).subscribe({
      next: (resp) => {
        if ((this.terminoBusqueda || '').trim() !== query) return;

        const docs = resp?.datos?.resultado || [];
        const actuales = this.documentosSeleccionados().map(d => d.id_documento);
        const filtrados = docs
          .filter((d: any) => d.nombre && d.nombre !== 'BORRADOR' && !actuales.includes(d.id_documento))
          .filter((d: any) => d.nombre.toLowerCase().includes(query.toLowerCase()));

        this.resultadosBusqueda.set(filtrados);
        this.buscando.set(false);
      },
      error: () => {
        this.resultadosBusqueda.set([]);
        this.buscando.set(false);
      }
    });
  }

  seleccionarDocumento(doc: any): void {
    const nuevos = [...this.documentosSeleccionados(), doc];
    this.documentosSeleccionados.set(nuevos);
    if (this.formControl) this.formControl.setValue(nuevos);
    this.cerrarSelector();
  }

  removerDocumento(index: number): void {
    const nuevos = [...this.documentosSeleccionados()];
    nuevos.splice(index, 1);
    this.documentosSeleccionados.set(nuevos);
    if (this.formControl) this.formControl.setValue(nuevos);
  }

  verPdf(doc: any): void {
    if (!doc.id_documento) return;
    this.dialog.open(VisorPdfDialogComponent, {
      width: '92vw',
      maxWidth: '1200px',
      height: '92vh',
      data: {
        titulo: doc.nombre || 'Documento Relacionado',
        docCite: doc.nombre,
        pdfUrl: `/api/v1/plantillasFormly/documento/${doc.id_documento}/pdf`
      }
    });
  }
}
