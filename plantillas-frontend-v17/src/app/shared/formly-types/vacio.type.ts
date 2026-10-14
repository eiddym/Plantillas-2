import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-vacio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="formly-vacio-spacer" [style.height.px]="to['alto'] || 20"></div>
  `,
  styles: [`
    .formly-vacio-spacer {
      width: 100%;
      min-height: 10px;
    }
  `]
})
export class FormlyFieldVacioComponent extends FieldType<FieldTypeConfig> {}
