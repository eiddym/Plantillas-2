import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-cite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cite-container" [class.cite-externo]="to['tipoMembrete'] === 'externo'">
      <div class="cite-left">
        <span class="cite-text" *ngIf="formControl.value?.cite">{{ formControl.value.cite }}</span>
        <span class="cite-placeholder" *ngIf="!formControl.value?.cite">{{ to['labelCite'] || 'CITE: [Autogenerado]' }}</span>
      </div>
      <div class="cite-right">
        <span class="fecha-text" *ngIf="formControl.value?.fecha">{{ formControl.value.fecha }}</span>
        <span class="fecha-placeholder" *ngIf="!formControl.value?.fecha">{{ to['labelFecha'] || 'FECHA: [Fecha actual]' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .cite-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 8px 0;
      margin-bottom: 16px;
      border-bottom: 1px dashed #cfd8dc;
      font-size: 0.95rem;
      font-weight: 500;
      &.cite-externo {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
    .cite-placeholder, .fecha-placeholder {
      color: #90a4ae;
      font-style: italic;
    }
    .cite-text, .fecha-text {
      color: #263238;
      font-weight: 600;
    }
  `]
})
export class FormlyFieldCiteComponent extends FieldType<FieldTypeConfig> {}
