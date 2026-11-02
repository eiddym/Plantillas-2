import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-layout',
  standalone: true,
  imports: [CommonModule, FormlyModule],
  template: `
    <div class="formly-layout-container" [ngClass]="to['className'] || ''">
      @if (field.fieldGroup && field.fieldGroup.length > 0) {
        <div class="layout-flex-row">
          @for (subField of field.fieldGroup; track $index) {
            <div class="layout-flex-col">
              <formly-field [field]="subField"></formly-field>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .formly-layout-container {
      width: 100%;
      margin: 8px 0;
    }
    .layout-flex-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
      width: 100%;
      align-items: flex-start;
    }
    .layout-flex-col {
      flex: 1 1 0;
      min-width: 180px;
    }
    @media (max-width: 600px) {
      .layout-flex-row {
        flex-direction: column;
        gap: 8px;
      }
      .layout-flex-col {
        width: 100%;
        min-width: 100%;
      }
    }
  `]
})
export class FormlyFieldLayoutComponent extends FieldType<FieldTypeConfig> {}
