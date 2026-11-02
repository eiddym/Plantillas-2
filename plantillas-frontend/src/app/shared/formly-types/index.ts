import { ConfigOption } from '@ngx-formly/core';
import { FormlyFieldTextoComponent } from './texto.type';
import { FormlyFieldCiteComponent } from './cite.type';
import { FormlyFieldDatosGeneralesComponent } from './datos-generales.type';
import { FormlyFieldEditorTextoComponent } from './editor-texto.type';
import { FormlyFieldVacioComponent } from './vacio.type';
import { FormlyFieldCcArchivoComponent } from './cc-archivo.type';
import { FormlyFieldInputtComponent } from './inputt.type';
import { FormlyFieldDocumentosRelacionadosComponent } from './documentos-relacionados.type';
import { FormlyFieldCalendarioComponent } from './calendario.type';
import { FormlyFieldArchivoComponent } from './archivo.type';
import { FormlyFieldListasComponent } from './listas.type';
import { FormlyFieldListaContactosComponent } from './lista-contactos.type';
import { FormlyFieldCajachicaComponent } from './cajachica.type';
import { FormlyFieldAprobacionCdComponent } from './aprobacion-cd.type';
import { FormlyFieldDocumentosAnularComponent } from './documentos-anular.type';
import { FormlyFieldSelectComponent } from './select.type';
import { FormlyFieldTextareaComponent } from './textarea.type';
import { FormlyFieldLayoutComponent } from './layout.type';
import { FormlyFieldCheckboxComponent } from './checkbox.type';
import { FormlyFieldAlmacenComponent } from './almacen.type';
import { FormlyFieldActivosComponent } from './activos.type';

export {
  FormlyFieldTextoComponent,
  FormlyFieldCiteComponent,
  FormlyFieldDatosGeneralesComponent,
  FormlyFieldEditorTextoComponent,
  FormlyFieldVacioComponent,
  FormlyFieldCcArchivoComponent,
  FormlyFieldInputtComponent,
  FormlyFieldDocumentosRelacionadosComponent,
  FormlyFieldCalendarioComponent,
  FormlyFieldArchivoComponent,
  FormlyFieldListasComponent,
  FormlyFieldSelectComponent,
  FormlyFieldListaContactosComponent,
  FormlyFieldCajachicaComponent,
  FormlyFieldAprobacionCdComponent,
  FormlyFieldDocumentosAnularComponent,
  FormlyFieldTextareaComponent,
  FormlyFieldLayoutComponent,
  FormlyFieldCheckboxComponent,
  FormlyFieldAlmacenComponent,
  FormlyFieldActivosComponent
};

export const CUSTOM_FORMLY_TYPES: ConfigOption['types'] = [
  // Tipos estándar iniciales
  { name: 'texto', component: FormlyFieldTextoComponent, wrappers: [] },
  { name: 'parrafo', component: FormlyFieldTextoComponent, wrappers: [] },
  { name: 'cite', component: FormlyFieldCiteComponent, wrappers: [] },
  { name: 'datosGenerales', component: FormlyFieldDatosGeneralesComponent, wrappers: [] },
  { name: 'encabezado', component: FormlyFieldDatosGeneralesComponent, wrappers: [] },
  { name: 'editorTexto', component: FormlyFieldEditorTextoComponent, wrappers: [] },
  { name: 'editor-texto', component: FormlyFieldEditorTextoComponent, wrappers: [] },
  { name: 'editor', component: FormlyFieldEditorTextoComponent, wrappers: [] },
  { name: 'vacio', component: FormlyFieldVacioComponent, wrappers: [] },

  // Campos de entrada de texto
  { name: 'inputt', component: FormlyFieldInputtComponent, wrappers: [] },
  { name: 'input', component: FormlyFieldInputtComponent, wrappers: [] },
  { name: 'textarea', component: FormlyFieldTextareaComponent, wrappers: [] },
  { name: 'inputTextArea', component: FormlyFieldTextareaComponent, wrappers: [] },

  // Contenedores y estructura
  { name: 'layout', component: FormlyFieldLayoutComponent, wrappers: [] },

  // Selección y listas
  { name: 'select', component: FormlyFieldSelectComponent, wrappers: [] },
  { name: 'inputSelect', component: FormlyFieldSelectComponent, wrappers: [] },
  { name: 'radio', component: FormlyFieldSelectComponent, wrappers: [] },
  { name: 'checkbox', component: FormlyFieldCheckboxComponent, wrappers: [] },
  { name: 'inputCheckBox', component: FormlyFieldCheckboxComponent, wrappers: [] },
  { name: 'listas', component: FormlyFieldListasComponent, wrappers: [] },
  { name: 'lista', component: FormlyFieldListasComponent, wrappers: [] },
  { name: 'listaContactos', component: FormlyFieldListaContactosComponent, wrappers: [] },

  // Fecha y archivos
  { name: 'calendario', component: FormlyFieldCalendarioComponent, wrappers: [] },
  { name: 'datepicker', component: FormlyFieldCalendarioComponent, wrappers: [] },
  { name: 'archivo', component: FormlyFieldArchivoComponent, wrappers: [] },
  { name: 'cargadorArchivos', component: FormlyFieldArchivoComponent, wrappers: [] },
  { name: 'ccArchivo', component: FormlyFieldCcArchivoComponent, wrappers: [] },
  { name: 'documentosRelacionados', component: FormlyFieldDocumentosRelacionadosComponent, wrappers: [] },

  // Módulos especializados institucionales
  { name: 'cajachica', component: FormlyFieldCajachicaComponent, wrappers: [] },
  { name: 'certificacionComprometido', component: FormlyFieldCajachicaComponent, wrappers: [] },
  { name: 'partidas', component: FormlyFieldCajachicaComponent, wrappers: [] },
  { name: 'aprobacionCD', component: FormlyFieldAprobacionCdComponent, wrappers: [] },
  { name: 'pdfsAprobacionCD', component: FormlyFieldAprobacionCdComponent, wrappers: [] },
  { name: 'documentosAnular', component: FormlyFieldDocumentosAnularComponent, wrappers: [] },

  // Módulos especializados Almacén / Activos conectados a NSIAF
  { name: 'consultaAlmacen', component: FormlyFieldAlmacenComponent, wrappers: [] },
  { name: 'ingresoAlmacen', component: FormlyFieldAlmacenComponent, wrappers: [] },
  { name: 'recuperarEntregaAlmacen', component: FormlyFieldAlmacenComponent, wrappers: [] },
  { name: 'consultaActivo', component: FormlyFieldActivosComponent, wrappers: [] },
  { name: 'asignacionActivo', component: FormlyFieldActivosComponent, wrappers: [] },
  { name: 'devolucionActivo', component: FormlyFieldActivosComponent, wrappers: [] },
  { name: 'tablaActivos', component: FormlyFieldActivosComponent, wrappers: [] },
  { name: 'ingresoActivos', component: FormlyFieldActivosComponent, wrappers: [] },
  { name: 'bajaActivos', component: FormlyFieldActivosComponent, wrappers: [] }
];
