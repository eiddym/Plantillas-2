import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-inputt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FormlyModule],
  template: `
    <div class="inputt-renglon">
      <div 
        class="inputt-rotulo" 
        [style.width.px]="(to['labelw'] && to['labelw'] > 0) ? (to['labelw'] * 10) : null"
        [style.min-width.px]="(to['labelw'] && to['labelw'] > 0) ? (to['labelw'] * 10) : 100"
        [class.align-right]="to['alineacion']?.includes('right')"
        [class.align-left]="to['alineacion']?.includes('left') || !to['alineacion']"
      >
        <span>{{ to['labelx'] || to.label || 'CAMPO:' }}</span>
      </div>
      <div class="inputt-cuerpo">
        <textarea
          [formControl]="formControl"
          [formlyAttributes]="field"
          class="inputt-textarea"
          [placeholder]="to.placeholder || ''"
          rows="1"
          [required]="to.required || false"
        ></textarea>
        @if (showError) {
          <div class="inputt-error">Debe llenar este campo obligatorio</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .inputt-renglon {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 8px 0;
      width: 100%;
    }
    .inputt-rotulo {
      font-size: 13px;
      font-weight: 700;
      color: #37474f;
      padding-top: 6px;
      white-space: nowrap;
      &.align-right { text-align: right; }
      &.align-left { text-align: left; }
    }
    .inputt-cuerpo {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .inputt-textarea {
      width: 100%;
      min-height: 32px;
      font-family: inherit;
      font-size: 13px;
      line-height: 18px;
      color: #263238;
      background: transparent;
      border: 1px solid #cfd8dc;
      border-radius: 4px;
      padding: 6px 10px;
      resize: vertical;
      box-sizing: border-box;
      transition: all 0.2s ease;
      &:focus {
        outline: none;
        border-color: #00838f;
        box-shadow: 0 0 0 1px #00838f;
      }
    }
    .inputt-error {
      color: #d32f2f;
      font-size: 11px;
      margin-top: 2px;
    }
  `]
})
export class FormlyFieldInputtComponent extends FieldType<FieldTypeConfig> {}
