import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-datos-generales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <div class="datos-generales-box">
      <!-- Section warning if not visible in print -->
      @if (to['showItem'] === false) {
        <div class="warning-banner">
          Esta sección no se mostrará al imprimir en PDF.
        </div>
      }

      @if (to['show']?.para !== false) {
        <div class="field-row">
          <span class="label-col">PARA:</span>
          <div class="val-col">
            @if (formControl.value?.para?.nombres) {
              <span class="user-name">
                {{ formControl.value.para.nombres }} {{ formControl.value.para.apellidos }}
                <span class="user-cargo">({{ formControl.value.para.cargo }})</span>
              </span>
            } @else {
              <span class="placeholder-text">
                [Seleccionar destinatario / Autoridad destino]
              </span>
            }
          </div>
        </div>
      }

      @if (to['show']?.via) {
        <div class="field-row">
          <span class="label-col">VÍA:</span>
          <div class="val-col">
            @if (formControl.value?.via?.nombres) {
              <span class="user-name">
                {{ formControl.value.via.nombres }} {{ formControl.value.via.apellidos }}
                <span class="user-cargo">({{ formControl.value.via.cargo }})</span>
              </span>
            } @else {
              <span class="placeholder-text">
                [Vía de revisión / Jefe inmediato]
              </span>
            }
          </div>
        </div>
      }

      @if (to['show']?.de !== false) {
        <div class="field-row">
          <span class="label-col">DE:</span>
          <div class="val-col">
            @if (formControl.value?.de?.nombres) {
              <span class="user-name">
                {{ formControl.value.de.nombres }} {{ formControl.value.de.apellidos }}
                <span class="user-cargo">({{ formControl.value.de.cargo }})</span>
              </span>
            } @else {
              <span class="placeholder-text">
                [Remitente del documento]
              </span>
            }
          </div>
        </div>
      }

      @if (to['show']?.ref !== false) {
        <div class="field-row">
          <span class="label-col">REF.:</span>
          <div class="val-col">
            @if (formControl.value?.ref) {
              <span class="ref-text">{{ formControl.value.ref }}</span>
            } @else {
              <span class="placeholder-text">
                [Referencia o Asunto del documento]
              </span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .datos-generales-box {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      background: #fafafa;
    }
    .warning-banner {
      background: #fff8e1;
      color: #f57f17;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-bottom: 12px;
      text-align: center;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
      &:last-child {
        border-bottom: none;
      }
    }
    .label-col {
      width: 80px;
      font-weight: 700;
      color: #37474f;
      font-size: 0.9rem;
    }
    .val-col {
      flex: 1;
      font-size: 0.95rem;
    }
    .user-name {
      font-weight: 600;
      color: #263238;
    }
    .user-cargo {
      color: #546e7a;
      font-weight: normal;
      margin-left: 6px;
    }
    .ref-text {
      font-weight: 600;
      color: #1a237e;
      text-transform: uppercase;
    }
    .placeholder-text {
      color: #90a4ae;
      font-style: italic;
    }
  `]
})
export class FormlyFieldDatosGeneralesComponent extends FieldType<FieldTypeConfig> {}
