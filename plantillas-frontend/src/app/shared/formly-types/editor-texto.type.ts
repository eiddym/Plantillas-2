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
      @defer (on viewport; prefetch on idle) {
        <editor
          [formControl]="formControl"
          [init]="tinyConfig"
          [disabled]="to.disabled || false">
        </editor>
      } @placeholder {
        <div class="editor-skeleton">
          <div class="skeleton-header">
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill"></span>
          </div>
          <div class="skeleton-body">Cargando editor de texto enriquecido (TinyMCE)...</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .editor-texto-container {
      margin-bottom: 20px;
    }
    .editor-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #37474f;
      font-size: 0.9rem;
    }
    .editor-skeleton {
      border: 1px dashed #b0bec5;
      border-radius: 4px;
      background: #fafafa;
      padding: 16px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      .skeleton-header {
        display: flex;
        gap: 8px;
        .skeleton-pill {
          width: 60px;
          height: 24px;
          background: #e0e0e0;
          border-radius: 4px;
        }
      }
      .skeleton-body {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #78909c;
        font-style: italic;
      }
    }
  `]
})
export class FormlyFieldEditorTextoComponent extends FieldType<FieldTypeConfig> {
  readonly tinyConfig = {
    base_url: '/tinymce',
    suffix: '.min',
    height: 380,
    menubar: true,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar:
      'undo redo | formatselect | bold italic underline | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | table | removeformat | code',
    content_style: 'body { font-family: Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.6; }'
  };
}
