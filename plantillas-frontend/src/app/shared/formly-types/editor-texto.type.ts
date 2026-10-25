import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'formly-field-editor-texto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorModule],
  template: `
    <div class="editor-texto-container">
      @if (to.label) {
        <label class="editor-label">{{ to.label }}</label>
      }
      <div class="editor-wrapper">
        <editor
          [formControl]="formControl"
          [init]="tinyConfig"
          [disabled]="to.disabled || false">
        </editor>
      </div>
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
      color: #37474f;
      font-size: 0.9rem;
    }
    .editor-wrapper {
      border: 1px solid #cfd8dc;
      border-radius: 4px;
      overflow: hidden;
      background: #ffffff;
      min-height: 250px;
    }
  `]
})
export class FormlyFieldEditorTextoComponent extends FieldType<FieldTypeConfig> {
  readonly tinyConfig: Record<string, any> = {
    base_url: '/tinymce',
    suffix: '.min',
    min_height: 280,
    menubar: 'edit insert view format table tools',
    branding: false,
    statusbar: true,
    elementpath: true,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen', 'table', 'wordcount'
    ],
    toolbar:
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
      'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | table image link | removeformat fullscreen code',
    image_title: true,
    automatic_uploads: true,
    file_picker_types: 'image',
    file_picker_callback: (cb: (url: string, meta: { title: string }) => void, _value: string, _meta: Record<string, any>) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.onchange = function () {
        const file = (this as any).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          const id = 'img_' + Date.now();
          const win = window as any;
          if (win.tinymce?.activeEditor?.editorUpload?.blobCache) {
            const blobCache = win.tinymce.activeEditor.editorUpload.blobCache;
            const base64 = (reader.result as string).split(',')[1];
            const blobInfo = blobCache.create(id, file, base64);
            blobCache.add(blobInfo);
            cb(blobInfo.blobUri(), { title: file.name });
          } else {
            cb(reader.result as string, { title: file.name });
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
    images_upload_handler: (blobInfo: any) => new Promise<string>((resolve) => {
      resolve('data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64());
    }),
    table_default_attributes: {
      border: '1'
    },
    table_default_styles: {
      'width': '100%',
      'border-collapse': 'collapse'
    },
    table_responsive_width: true,
    content_style: `
      body {
        font-family: 'Open Sans', Roboto, Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #222222;
        margin: 16px 20px;
        background-color: #ffffff;
      }
      p { margin: 0 0 8px 0; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      td, th {
        border: 1px solid #b0bec5;
        padding: 6px 10px;
      }
      th {
        background-color: #f1f5f9;
        font-weight: 600;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      h1, h2, h3, h4 {
        color: #1a237e;
        margin-top: 12px;
        margin-bottom: 6px;
      }
    `
  };
}
