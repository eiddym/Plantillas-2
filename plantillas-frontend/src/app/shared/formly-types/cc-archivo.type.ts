import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'formly-field-cc-archivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FormlyModule],
  template: `
    <div class="cc-archivo-container">
      @if (to['label']) {
        <div class="cc-label">{{ to['label'] }}</div>
      }
      <textarea
        [formControl]="formControl"
        [formlyAttributes]="field"
        class="cc-textarea"
        [placeholder]="to.placeholder || 'Cc.: archivo'"
        rows="2"
      ></textarea>
    </div>
  `,
  styles: [`
    .cc-archivo-container {
      margin-top: 16px;
      margin-bottom: 8px;
    }
    .cc-label {
      font-size: 11px;
      font-weight: 600;
      color: #546e7a;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cc-textarea {
      width: 100%;
      min-height: 38px;
      font-family: inherit;
      font-size: 10.5px;
      line-height: 13px;
      color: #37474f;
      background: transparent;
      border: 1px dashed #cfd8dc;
      border-radius: 4px;
      padding: 6px 8px;
      resize: vertical;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      &:focus {
        outline: none;
        border-color: #00838f;
        background-color: #fafafa;
      }
    }
  `]
})
export class FormlyFieldCcArchivoComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    if (!this.formControl.value) {
      const user = this.authService.currentUser();
      let abreviacion = '';
      if (user) {
        const u = user as any;
        const nombreCompleto = `${u.first_name || u.nombres || ''} ${u.last_name || u.apellidos || ''}`.trim();
        abreviacion = this.generarAbreviacion(nombreCompleto);
      }
      const valorInicial = abreviacion ? `${abreviacion}\nCc.: archivo` : 'Cc.: archivo';
      this.formControl.setValue(valorInicial, { emitEvent: false });
    }
  }

  private generarAbreviacion(cadena: string): string {
    const limpia = cadena.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
    const palabras = limpia.toUpperCase().split(' ').filter(Boolean);
    return palabras.map(p => p[0]).join('');
  }
}
