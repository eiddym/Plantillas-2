import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-texto',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="to['className'] || ''" class="formly-texto-wrapper">
      @switch (to['tipo']) {
        @case ('h1') { <h1>{{ to.label }}</h1> }
        @case ('h3') { <h3>{{ to.label }}</h3> }
        @case ('h4') { <h4>{{ to.label }}</h4> }
        @case ('h5') { <h5>{{ to.label }}</h5> }
        @case ('h6') { <h6>{{ to.label }}</h6> }
        @case ('p') { <p>{{ to.label }}</p> }
        @default { <h2>{{ to.label }}</h2> }
      }
    </div>
  `,
  styles: [`
    .formly-texto-wrapper {
      margin: 12px 0;
      h1, h2, h3, h4, h5, h6, p {
        margin: 0;
        color: #1a237e;
      }
      &.ap-text-center {
        text-align: center;
      }
      &.ap-text-right {
        text-align: right;
      }
    }
  `]
})
export class FormlyFieldTextoComponent extends FieldType<FieldTypeConfig> {}
