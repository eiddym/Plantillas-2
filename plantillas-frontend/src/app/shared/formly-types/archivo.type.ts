import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { VisorPdfDialogComponent } from '../../features/visor-pdf/visor-pdf-dialog.component';

export interface ArchivoAdjunto {
  filename: string;
  filesize: number;
  base64?: string;
  filetype?: string;
  url?: string;
}

@Component({
  selector: 'formly-field-archivo',
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
    <div class="archivo-container">
      @if (to.label) {
        <div class="archivo-titulo">{{ to.label }}</div>
      }

      <div class="archivo-actions">
        @if (!to.disabled) {
          <label class="btn-subir-archivo" [class.btn-disabled]="to.disabled">
            <mat-icon>attach_file</mat-icon>
            <span>{{ to['btnText'] || 'Seleccionar Archivo PDF' }}</span>
            <input
              type="file"
              class="hidden-input"
              accept=".pdf,application/pdf"
              [multiple]="to['multiple'] || false"
              (change)="onFileSelected($event)"
            />
          </label>
        }
      </div>

      <!-- Lista de archivos adjuntos -->
      <div class="archivos-lista">
        @for (item of archivos(); track idx; let idx = $index) {
          <div class="archivo-card">
            <mat-icon class="pdf-icon" (click)="verPdf(item)">picture_as_pdf</mat-icon>
            <div class="archivo-meta" (click)="verPdf(item)" matTooltip="Ver documento">
              <span class="archivo-nombre">{{ item.filename }}</span>
              <span class="archivo-peso">{{ formatearPeso(item.filesize) }}</span>
            </div>
            @if (!to.disabled) {
              <button type="button" class="btn-eliminar" (click)="eliminarArchivo(idx)" matTooltip="Eliminar anexo">
                <mat-icon>delete_outline</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .archivo-container {
      margin: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .archivo-titulo {
      font-size: 13px;
      font-weight: 700;
      color: #37474f;
    }
    .btn-subir-archivo {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eceff1;
      border: 1px solid #b0bec5;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #37474f;
      cursor: pointer;
      width: fit-content;
      transition: all 0.2s ease;
      &:hover {
        background: #00838f;
        color: #ffffff;
        border-color: #00838f;
      }
    }
    .hidden-input { display: none; }
    .archivos-lista {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .archivo-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      padding: 6px 10px;
      border-radius: 4px;
      max-width: 500px;
    }
    .pdf-icon {
      color: #d32f2f;
      cursor: pointer;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .archivo-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      cursor: pointer;
    }
    .archivo-nombre {
      font-size: 12.5px;
      font-weight: 600;
      color: #263238;
      &:hover { color: #00838f; text-decoration: underline; }
    }
    .archivo-peso {
      font-size: 10.5px;
      color: #78909c;
    }
    .btn-eliminar {
      border: none;
      background: transparent;
      color: #b0bec5;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover { color: #d32f2f; }
    }
  `]
})
export class FormlyFieldArchivoComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private dialog = inject(MatDialog);
  archivos = signal<ArchivoAdjunto[]>([]);

  ngOnInit(): void {
    const val = this.formControl.value;
    if (Array.isArray(val)) {
      this.archivos.set(val);
    } else if (val && typeof val === 'object' && val.filename) {
      this.archivos.set([val]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const esMultiple = this.to['multiple'] || false;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const adjunto: ArchivoAdjunto = {
          filename: file.name,
          filesize: file.size,
          filetype: file.type || 'application/pdf',
          base64: base64String.split(',')[1] || base64String
        };

        if (esMultiple) {
          const nuevos = [...this.archivos(), adjunto];
          this.archivos.set(nuevos);
          this.formControl.setValue(nuevos);
        } else {
          this.archivos.set([adjunto]);
          this.formControl.setValue(adjunto);
        }
      };
      reader.readAsDataURL(file);
    });

    input.value = ''; // Reset input
  }

  eliminarArchivo(index: number): void {
    const esMultiple = this.to['multiple'] || false;
    const nuevos = [...this.archivos()];
    nuevos.splice(index, 1);
    this.archivos.set(nuevos);

    if (esMultiple) {
      this.formControl.setValue(nuevos);
    } else {
      this.formControl.setValue(nuevos[0] || null);
    }
  }

  verPdf(item: ArchivoAdjunto): void {
    let pdfUrl = item.url;
    if (!pdfUrl && item.base64) {
      pdfUrl = `data:application/pdf;base64,${item.base64}`;
    }

    this.dialog.open(VisorPdfDialogComponent, {
      width: '92vw',
      maxWidth: '1200px',
      height: '92vh',
      data: {
        titulo: item.filename,
        pdfUrl: pdfUrl
      }
    });
  }

  formatearPeso(bytes: number): string {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}
