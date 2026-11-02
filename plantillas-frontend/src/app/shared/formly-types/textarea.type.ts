import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FormlyModule],
  template: `
    <div class="formly-textarea-container" [ngClass]="to['className'] || ''">
      @if (to.label) {
        <label class="textarea-label">
          {{ to.label }}
          <span *ngIf="to.required" class="required-star">*</span>
        </label>
      }
      <div class="textarea-wrapper">
        @if (formControl) {
          <textarea
            [formControl]="formControl"
            [formlyAttributes]="field"
            class="custom-textarea"
            [rows]="to['rows'] || 2"
            [placeholder]="to.placeholder || ''"
            [required]="to.required || false"
            [disabled]="to.disabled || false"
          ></textarea>
        } @else {
          <textarea
            class="custom-textarea"
            [rows]="to['rows'] || 2"
            [placeholder]="to.placeholder || ''"
            [disabled]="to.disabled || false"
          ></textarea>
        }
      </div>
      @if (to.description) {
        <div class="textarea-description">{{ to.description }}</div>
      }
    </div>
  `,
  styles: [`
    .formly-textarea-container {
      margin: 8px 0;
      width: 100%;
      font-family: inherit;
    }
    .textarea-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #37474f;
      margin-bottom: 4px;
    }
    .required-star {
      color: #ef4444;
      margin-left: 2px;
    }
    .textarea-wrapper {
      width: 100%;
    }
    .custom-textarea {
      width: 100%;
      min-height: 48px;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      color: #1e293b;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      box-sizing: border-box;
      resize: vertical;
      transition: all 0.2s ease;
      &:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
      }
      &:disabled {
        background-color: #f1f5f9;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }
    .textarea-description {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
    }
  `]
})
export class FormlyFieldTextareaComponent extends FieldType<FieldTypeConfig> {}
