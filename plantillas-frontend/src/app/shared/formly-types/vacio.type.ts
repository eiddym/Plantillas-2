import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-vacio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="formly-vacio-spacer" 
      [style.height]="getSpacerHeight()"
    ></div>
  `,
  styles: [`
    .formly-vacio-spacer {
      width: 100%;
      min-height: 8px;
    }
  `]
})
export class FormlyFieldVacioComponent extends FieldType<FieldTypeConfig> {
  getSpacerHeight(): string {
    const opts: any = this.to || {};
    if (opts.style && opts.style.height) {
      return String(opts.style.height);
    }
    if (opts.height) {
      const val = String(opts.height).trim();
      return val.endsWith('cm') || val.endsWith('px') || val.endsWith('rem') ? val : `${val}cm`;
    }
    if (opts.alto) {
      const val = String(opts.alto).trim();
      return val.endsWith('px') || val.endsWith('cm') ? val : `${val}px`;
    }
    return '16px';
  }
}
