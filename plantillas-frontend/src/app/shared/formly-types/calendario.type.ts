import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-calendario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FormlyModule],
  template: `
    <div class="calendario-container">
      @if (to.label) {
        <label class="calendario-label">{{ to.label }}</label>
      }
      <div class="calendario-input-wrapper">
        <input
          type="date"
          [formControl]="formControl"
          [formlyAttributes]="field"
          class="calendario-input"
          [min]="to['minDate'] || ''"
          [max]="to['maxDate'] || ''"
          [required]="to.required || false"
          [disabled]="to.disabled || false"
        />
      </div>
      @if (showError) {
        <div class="calendario-error">Debe ingresar una fecha válida</div>
      }
    </div>
  `,
  styles: [`
    .calendario-container {
      margin: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .calendario-label {
      font-size: 13px;
      font-weight: 600;
      color: #37474f;
    }
    .calendario-input-wrapper {
      position: relative;
      max-width: 220px;
    }
    .calendario-input {
      width: 100%;
      height: 36px;
      padding: 6px 10px;
      border: 1px solid #cfd8dc;
      border-radius: 4px;
      font-family: inherit;
      font-size: 13px;
      color: #263238;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s ease;
      &:focus {
        border-color: #00838f;
        box-shadow: 0 0 0 1px #00838f;
      }
      &:disabled {
        background: #f5f5f5;
        color: #90a4ae;
        cursor: not-allowed;
      }
    }
    .calendario-error {
      font-size: 11px;
      color: #d32f2f;
    }
  `]
})
export class FormlyFieldCalendarioComponent extends FieldType<FieldTypeConfig> {}
