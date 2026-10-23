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
    }
  `]
})
export class FormlyFieldEditorTextoComponent extends FieldType<FieldTypeConfig> {
  readonly tinyConfig = {
    base_url: '/tinymce',
    suffix: '.min',
    min_height: 320,
    menubar: false,
    branding: false,
    statusbar: true,
    elementpath: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen', 'table', 'wordcount'
    ],
    toolbar:
      'undo redo | blocks | bold italic underline strikethrough | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | table link | removeformat | code',
    table_default_attributes: {
      border: '1'
    },
    table_default_styles: {
      'width': '100%',
      'border-collapse': 'collapse'
    },
    content_style: `
      body {
        font-family: 'Open Sans', Roboto, Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.35;
        color: #222222;
        margin: 20px 25px;
        background-color: #ffffff;
      }
      p { margin: 0 0 8px 0; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      td, th {
        border: 1px solid #bdbdbd;
        padding: 6px 8px;
      }
      h1, h2, h3, h4 {
        color: #1a237e;
        margin-top: 12px;
        margin-bottom: 6px;
      }
    `
  };
}
