import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-texto',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="to['className'] || ''" class="formly-texto-wrapper">
      <h1 *ngIf="to['tipo'] === 'h1'">{{ to.label }}</h1>
      <h2 *ngIf="to['tipo'] === 'h2' || !to['tipo']">{{ to.label }}</h2>
      <h3 *ngIf="to['tipo'] === 'h3'">{{ to.label }}</h3>
      <h4 *ngIf="to['tipo'] === 'h4'">{{ to.label }}</h4>
      <h5 *ngIf="to['tipo'] === 'h5'">{{ to.label }}</h5>
      <h6 *ngIf="to['tipo'] === 'h6'">{{ to.label }}</h6>
      <p *ngIf="to['tipo'] === 'p'">{{ to.label }}</p>
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
