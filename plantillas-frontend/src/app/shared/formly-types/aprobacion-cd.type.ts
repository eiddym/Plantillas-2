import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-aprobacion-cd',
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
    <div class="aprobacion-cd-banner">
      <div class="banner-header">
        <mat-icon class="cd-icon">verified_user</mat-icon>
        <div class="banner-info">
          <span class="banner-title">{{ to.label || 'Aprobación mediante Ciudadanía Digital' }}</span>
          <span class="banner-sub">Los documentos anexos adjuntos serán remitidos para validación formal con token / credencial de Ciudadanía Digital.</span>
        </div>
      </div>

      @if (!to.disabled) {
        <label class="btn-adjuntar-cd">
          <mat-icon>upload_file</mat-icon>
          <span>Adjuntar PDF para Aprobación Digital</span>
          <input
            type="file"
            class="hidden-input"
            accept=".pdf,application/pdf"
            multiple
            (change)="onFileSelected($event)"
          />
        </label>
      }

      <div class="cd-archivos-lista">
        @for (item of archivos(); track idx; let idx = $index) {
          <div class="cd-archivo-row">
            <mat-icon class="pdf-icon">picture_as_pdf</mat-icon>
            <span class="cd-archivo-name">{{ item.filename }}</span>
            <span class="cd-archivo-size">({{ (item.filesize / 1024).toFixed(1) }} KB)</span>
            @if (!to.disabled) {
              <button type="button" class="btn-del" (click)="eliminar(idx)" matTooltip="Eliminar">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .aprobacion-cd-banner {
      margin: 16px 0;
      padding: 12px 16px;
      background: #e0f2f1;
      border: 1px solid #80cbc4;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .banner-header { display: flex; align-items: center; gap: 10px; }
    .cd-icon { color: #00796b; font-size: 28px; width: 28px; height: 28px; }
    .banner-info { display: flex; flex-direction: column; }
    .banner-title { font-size: 13.5px; font-weight: 700; color: #004d40; }
    .banner-sub { font-size: 11.5px; color: #00695c; }
    .btn-adjuntar-cd {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #00796b;
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      width: fit-content;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: #004d40; }
    }
    .hidden-input { display: none; }
    .cd-archivos-lista { display: flex; flex-direction: column; gap: 4px; }
    .cd-archivo-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #b2dfdb;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .pdf-icon { color: #d32f2f; font-size: 16px; width: 16px; height: 16px; }
    .cd-archivo-name { font-weight: 600; color: #263238; flex: 1; }
    .cd-archivo-size { color: #78909c; font-size: 11px; }
    .btn-del {
      border: none; background: transparent; color: #90a4ae; cursor: pointer;
      display: flex; align-items: center;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { color: #d32f2f; }
    }
  `]
})
export class FormlyFieldAprobacionCdComponent extends FieldType<FieldTypeConfig> implements OnInit {
  archivos = signal<any[]>([]);

  ngOnInit(): void {
    const val = this.formControl.value;
    if (Array.isArray(val)) {
      this.archivos.set(val);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const adjunto = {
          filename: file.name,
          filesize: file.size,
          filetype: file.type || 'application/pdf',
          base64: base64String.split(',')[1] || base64String
        };
        const nuevos = [...this.archivos(), adjunto];
        this.archivos.set(nuevos);
        this.formControl.setValue(nuevos);
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  eliminar(index: number): void {
    const nuevos = [...this.archivos()];
    nuevos.splice(index, 1);
    this.archivos.set(nuevos);
    this.formControl.setValue(nuevos);
  }
}
