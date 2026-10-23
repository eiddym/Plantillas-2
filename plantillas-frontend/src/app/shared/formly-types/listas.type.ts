import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-listas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="listas-container" [ngClass]="to['className'] || ''">
      @if (to.label) {
        <div class="listas-titulo">{{ to.label }}</div>
      }
      @if (to['tipo'] === 'ol') {
        <ol class="listas-ol">
          @for (item of getOpciones(); track $index) {
            <li>{{ item }}</li>
          }
        </ol>
      } @else {
        <ul class="listas-ul">
          @for (item of getOpciones(); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .listas-container {
      margin: 8px 0;
      color: #263238;
      font-size: 13px;
      line-height: 20px;
    }
    .listas-titulo {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .listas-ul, .listas-ol {
      margin: 4px 0 8px 24px;
      padding: 0;
    }
    .ap-text-right { text-align: right; }
    .ap-text-center { text-align: center; }
    .ap-text-justify { text-align: justify; }
  `]
})
export class FormlyFieldListasComponent extends FieldType<FieldTypeConfig> {
  getOpciones(): string[] {
    const opts = this.to['options'] || this.formControl.value;
    if (Array.isArray(opts)) {
      return opts.map(o => typeof o === 'string' ? o : (o.label || o.nombre || JSON.stringify(o)));
    }
    return [];
  }
}
