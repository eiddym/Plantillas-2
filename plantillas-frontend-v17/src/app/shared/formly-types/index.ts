import { ConfigOption } from '@ngx-formly/core';
import { FormlyFieldTextoComponent } from './texto.type';
import { FormlyFieldCiteComponent } from './cite.type';
import { FormlyFieldDatosGeneralesComponent } from './datos-generales.type';
import { FormlyFieldEditorTextoComponent } from './editor-texto.type';
import { FormlyFieldVacioComponent } from './vacio.type';

export {
  FormlyFieldTextoComponent,
  FormlyFieldCiteComponent,
  FormlyFieldDatosGeneralesComponent,
  FormlyFieldEditorTextoComponent,
  FormlyFieldVacioComponent
};

export const CUSTOM_FORMLY_TYPES: ConfigOption['types'] = [
  { name: 'texto', component: FormlyFieldTextoComponent },
  { name: 'cite', component: FormlyFieldCiteComponent },
  { name: 'datosGenerales', component: FormlyFieldDatosGeneralesComponent },
  { name: 'editorTexto', component: FormlyFieldEditorTextoComponent },
  { name: 'vacio', component: FormlyFieldVacioComponent }
];
