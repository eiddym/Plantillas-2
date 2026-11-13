import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

let editorInstanceCounter = 0;

@Component({
  selector: 'formly-field-editor-texto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, EditorModule],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: '/tinymce/tinymce.min.js' }
  ],
  template: `
    <div class="editor-texto-container">
      @if (to?.label) {
        <label class="editor-label">
          {{ to?.label }}
          <span *ngIf="to?.required" class="required-star">*</span>
        </label>
      }
      <div class="editor-wrapper">
        @if (formControl) {
          <editor
            [formControl]="formControl"
            [init]="tinyConfig"
            [disabled]="to?.disabled || false">
          </editor>
        } @else {
          <div class="editor-placeholder-wrapper">
            <textarea
              class="editor-fallback-textarea"
              [placeholder]="to?.placeholder || 'Redacte aquí el contenido del documento...'"
              [disabled]="to?.disabled || false"
            ></textarea>
          </div>
        }
      </div>
      @if (to?.description) {
        <div class="editor-hint">{{ to?.description }}</div>
      }
    </div>
  `,
  styles: [`
    .editor-texto-container {
      margin-bottom: 20px;
      width: 100%;
    }
    .editor-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 700;
      color: #1e293b;
      font-size: 0.92rem;
    }
    .required-star {
      color: #ef4444;
      margin-left: 2px;
    }
    .editor-wrapper {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      min-height: 240px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: border-color 0.2s ease;
      &:focus-within {
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
      }
    }
    .editor-placeholder-wrapper {
      padding: 12px;
    }
    .editor-fallback-textarea {
      width: 100%;
      min-height: 200px;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      color: #1e293b;
    }
    .editor-hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
    }
  `]
})
export class FormlyFieldEditorTextoComponent extends FieldType<FieldTypeConfig> implements OnInit {
  uniqueEditorId = `tinymce_inst_${++editorInstanceCounter}`;

  readonly tinyConfig: Record<string, any> = {
    license_key: 'gpl',
    promotion: false,
    branding: false,
    base_url: '/tinymce',
    suffix: '.min',
    language: 'es',
    language_url: '/tinymce/langs/es.js',
    min_height: 350,
    height: 400,
    menubar: 'edit insert view format table tools',
    statusbar: true,
    elementpath: true,
    object_resizing: true, // Habilita mover, achicar y agrandar imágenes y tablas con el puntero
    resize_img_proportional: true,
    paste_data_images: true, // Permite pegar capturas y fotos directo desde portapapeles
    automatic_uploads: true,
    image_advtab: true,
    image_uploadtab: true,
    image_title: true,
    image_caption: true,
    image_dimensions: true,
    setup: (editor: any) => {
      editor.on('init', () => {
        try {
          if (editor.mode && typeof editor.mode.set === 'function') {
            editor.mode.set('design');
          }
        } catch {
          // ignore
        }
      });
    },
    file_picker_types: 'image',
    file_picker_callback: (callback: (url: string, meta?: any) => void, _value: any, meta: any) => {
      if (meta.filetype === 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml');
        input.onchange = function () {
          const file = (this as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function () {
              const base64 = reader.result as string;
              callback(base64, {
                title: file.name,
                alt: file.name
              });
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    },
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen', 'table', 'wordcount', 'quickbars'
    ],
    toolbar:
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | table link image | removeformat | charmap | code fullscreen',
    font_size_formats: '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 24pt 36pt',
    font_family_formats:
      'Open Sans=Open Sans,sans-serif; ' +
      'Arial=arial,helvetica,sans-serif; ' +
      'Roboto=roboto,sans-serif; ' +
      'Times New Roman=times new roman,times,serif; ' +
      'Courier New=courier new,courier,monospace',
    table_default_attributes: {
      border: '1'
    },
    table_default_styles: {
      'width': '100%',
      'border-collapse': 'collapse'
    },
    table_responsive_width: true,
    table_appearance_options: true,
    table_grid: true,
    table_resize_bars: true,
    table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablecellprops tablerowprops',
    quickbars_selection_toolbar: 'bold italic underline | quicklink h2 h3 blockquote',
    quickbars_insert_toolbar: 'quickimage quicktable',
    images_upload_handler: (blobInfo: any) => {
      return new Promise<string>((resolve) => {
        const base64 = 'data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64();
        resolve(base64);
      });
    },
    content_style: `
      body {
        font-family: 'Open Sans', Roboto, Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.45;
        color: #1e293b;
        margin: 16px 20px;
        background-color: #ffffff;
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      p, div, span, h1, h2, h3, h4, h5, h6, li {
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
      }
      p { margin: 0 0 10px 0; }
      img {
        max-width: 100% !important;
        height: auto !important;
        cursor: pointer;
        display: block;
        margin: 10px auto;
        box-sizing: border-box;
      }
      img[data-mce-selected] {
        outline: 2px solid #0284c7;
      }
      figure {
        max-width: 100% !important;
        margin: 10px auto;
      }
      table {
        max-width: 100% !important;
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
        table-layout: auto;
      }
      td, th {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
        font-size: 10pt;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }
      th {
        background-color: #f1f5f9;
        font-weight: 700;
      }
      h1, h2, h3, h4 {
        color: #0f172a;
        margin-top: 14px;
        margin-bottom: 6px;
        overflow-wrap: break-word;
      }
      pre, code {
        white-space: pre-wrap !important;
        word-break: break-all !important;
      }
    `
  };

  ngOnInit(): void {
    if (this.to['minHeight']) {
      this.tinyConfig['min_height'] = this.to['minHeight'];
    }
  }
}
