import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule],
  template: `
    <div class="formly-checkbox-wrapper" [class.disabled]="to.disabled">
      <mat-checkbox
        [formControl]="formControl"
        color="primary"
        [disabled]="to.disabled || false">
        <span class="checkbox-label">{{ to.label || to['texto'] || '' }}</span>
      </mat-checkbox>
      @if (to.description) {
        <div class="checkbox-hint">{{ to.description }}</div>
      }
    </div>
  `,
  styles: [`
    .formly-checkbox-wrapper {
      margin: 8px 0;
      display: flex;
      flex-direction: column;
    }
    .checkbox-label {
      font-size: 0.95rem;
      color: #1e293b;
      font-weight: 500;
      line-height: 1.4;
    }
    .checkbox-hint {
      font-size: 0.78rem;
      color: #64748b;
      margin-left: 32px;
      margin-top: 2px;
    }
  `]
})
export class FormlyFieldCheckboxComponent extends FieldType<FieldTypeConfig> {}
