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
      <label *ngIf="to.label" class="editor-label">{{ to.label }}</label>
      <editor
        [formControl]="formControl"
        [init]="tinyConfig"
        [disabled]="to.disabled || false">
      </editor>
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
