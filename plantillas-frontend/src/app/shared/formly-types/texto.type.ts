import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-texto',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="formly-texto-wrapper" 
      [class]="(to && to['className']) || ''"
      [style.text-align]="getAlignment()"
      [style.margin-top.px]="to?.['mTop'] ? 14 : 4"
      [style.margin-bottom.px]="to?.['mBot'] ? 14 : 4"
    >
      @switch (to?.['tipo']) {
        @case ('h1') {
          <h1 class="texto-h1">{{ to?.label || to?.['texto'] || '' }}</h1>
        }
        @case ('h2') {
          <h2 class="texto-h2">{{ to?.label || to?.['texto'] || '' }}</h2>
        }
        @case ('h3') {
          <h3 class="texto-h3">{{ to?.label || to?.['texto'] || '' }}</h3>
        }
        @case ('h4') {
          <h4 class="texto-h4">{{ to?.label || to?.['texto'] || '' }}</h4>
        }
        @case ('h5') {
          <h5 class="texto-h5">{{ to?.label || to?.['texto'] || '' }}</h5>
        }
        @case ('h6') {
          <h6 class="texto-h6">{{ to?.label || to?.['texto'] || '' }}</h6>
        }
        @case ('p') {
          <p class="texto-p">{{ to?.label || to?.['texto'] || '' }}</p>
        }
        @default {
          <h2 class="texto-h2">{{ to?.label || to?.['texto'] || '' }}</h2>
        }
      }
    </div>
  `,
  styles: [`
    .formly-texto-wrapper {
      width: 100%;
      box-sizing: border-box;

      .texto-h1 {
        font-size: 1.55rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.01em;
        line-height: 1.25;
      }
      .texto-h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1a237e;
        margin: 0;
        letter-spacing: -0.01em;
        line-height: 1.3;
      }
      .texto-h3 {
        font-size: 1.05rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        line-height: 1.35;
      }
      .texto-h4 {
        font-size: 0.95rem;
        font-weight: 700;
        color: #334155;
        margin: 0;
      }
      .texto-h5 {
        font-size: 0.88rem;
        font-weight: 600;
        color: #475569;
        margin: 0;
      }
      .texto-h6 {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        margin: 0;
      }
      .texto-p {
        font-size: 0.95rem;
        font-weight: 400;
        color: #334155;
        line-height: 1.6;
        margin: 0;
      }
    }

    .align-left { text-align: left !important; }
    .align-center { text-align: center !important; }
    .align-right { text-align: right !important; }
    .align-justify { text-align: justify !important; }
  `]
})
export class FormlyFieldTextoComponent extends FieldType<FieldTypeConfig> {
  getAlignment(): string {
    const to = this.to || {};
    const raw = String(to['alineacion'] || to['align'] || to['className'] || '').toLowerCase();
    if (raw.includes('center')) return 'center';
    if (raw.includes('right')) return 'right';
    if (raw.includes('justify')) return 'justify';
    if (raw.includes('left')) return 'left';
    return (to['tipo'] === 'p') ? 'justify' : 'center';
  }
}
