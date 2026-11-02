import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'formly-field-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="formly-select-container" [ngClass]="to['className'] || ''">
      <label *ngIf="to.label" class="select-label">
        {{ to.label }}
        <span *ngIf="to.required" class="required-star">*</span>
      </label>
      <div class="select-wrapper">
        @if (formControl) {
          <select 
            [formControl]="formControl" 
            class="custom-select"
            [disabled]="to.disabled || false"
          >
            <option [ngValue]="null" *ngIf="to.placeholder">
              {{ to.placeholder }}
            </option>
            <option *ngFor="let opt of getNormalizedOptions()" [ngValue]="opt.value">
              {{ opt.label }}
            </option>
          </select>
        } @else {
          <select 
            class="custom-select"
            [disabled]="to.disabled || false"
          >
            <option [ngValue]="null" *ngIf="to.placeholder">
              {{ to.placeholder }}
            </option>
            <option *ngFor="let opt of getNormalizedOptions()" [ngValue]="opt.value">
              {{ opt.label }}
            </option>
          </select>
        }
        <div class="select-arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div *ngIf="to.description" class="select-description">{{ to.description }}</div>
    </div>
  `,
  styles: [`
    .formly-select-container {
      margin: 10px 0;
      font-family: inherit;
    }

    .select-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .required-star {
      color: #ef4444;
      margin-left: 2px;
    }

    .select-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }

    .custom-select {
      width: 100%;
      height: 40px;
      padding: 8px 36px 8px 12px;
      font-size: 0.9rem;
      color: #1e293b;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      transition: all 0.2s ease;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;

      &:focus {
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }

      &:disabled {
        background-color: #f1f5f9;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }

    .select-arrow {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .select-description {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
    }
  `]
})
export class FormlyFieldSelectComponent extends FieldType<FieldTypeConfig> {
  getNormalizedOptions(): SelectOption[] {
    const rawOpts = this.to.options || this.to['opciones'] || [];
    let list: any[] = [];

    if (Array.isArray(rawOpts)) {
      list = rawOpts;
    } else if (rawOpts && typeof rawOpts === 'object') {
      list = Object.values(rawOpts);
    }

    return list.map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { label: String(item), value: item };
      }
      if (item && typeof item === 'object') {
        const val = item.value !== undefined ? item.value : (item.id !== undefined ? item.id : item.valor);
        const lab = item.label || item.nombre || item.name || val;
        return { label: String(lab), value: val };
      }
      return { label: String(item), value: item };
    });
  }
}
