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
  FormlyFieldListaContactosComponent,
  FormlyFieldCajachicaComponent,
  FormlyFieldAprobacionCdComponent,
  FormlyFieldDocumentosAnularComponent
};

export const CUSTOM_FORMLY_TYPES: ConfigOption['types'] = [
  // Tipos estándar iniciales
  { name: 'texto', component: FormlyFieldTextoComponent },
  { name: 'cite', component: FormlyFieldCiteComponent },
  { name: 'datosGenerales', component: FormlyFieldDatosGeneralesComponent },
  { name: 'encabezado', component: FormlyFieldDatosGeneralesComponent },
  { name: 'editorTexto', component: FormlyFieldEditorTextoComponent },
  { name: 'vacio', component: FormlyFieldVacioComponent },

  // Tipos institucionales incorporados
  { name: 'ccArchivo', component: FormlyFieldCcArchivoComponent },
  { name: 'inputt', component: FormlyFieldInputtComponent },
  { name: 'input', component: FormlyFieldInputtComponent },
  { name: 'documentosRelacionados', component: FormlyFieldDocumentosRelacionadosComponent },
  { name: 'calendario', component: FormlyFieldCalendarioComponent },
  { name: 'datepicker', component: FormlyFieldCalendarioComponent },
  { name: 'archivo', component: FormlyFieldArchivoComponent },
  { name: 'cargadorArchivos', component: FormlyFieldArchivoComponent },
  { name: 'listas', component: FormlyFieldListasComponent },
  { name: 'lista', component: FormlyFieldListasComponent },
  { name: 'select', component: FormlyFieldListasComponent },
  { name: 'radio', component: FormlyFieldListasComponent },
  { name: 'checkbox', component: FormlyFieldTextoComponent },
  { name: 'layout', component: FormlyFieldVacioComponent },
  { name: 'editor-texto', component: FormlyFieldEditorTextoComponent },
  { name: 'editor', component: FormlyFieldEditorTextoComponent },
  { name: 'textarea', component: FormlyFieldEditorTextoComponent },
  { name: 'listaContactos', component: FormlyFieldListaContactosComponent },
  { name: 'cajachica', component: FormlyFieldCajachicaComponent },
  { name: 'certificacionComprometido', component: FormlyFieldCajachicaComponent },
  { name: 'partidas', component: FormlyFieldCajachicaComponent },
  { name: 'aprobacionCD', component: FormlyFieldAprobacionCdComponent },
  { name: 'pdfsAprobacionCD', component: FormlyFieldAprobacionCdComponent },
  { name: 'documentosAnular', component: FormlyFieldDocumentosAnularComponent },

  // Módulos especializados Almacén / Activos
  { name: 'consultaAlmacen', component: FormlyFieldTextoComponent },
  { name: 'ingresoAlmacen', component: FormlyFieldTextoComponent },
  { name: 'recuperarEntregaAlmacen', component: FormlyFieldTextoComponent },
  { name: 'consultaActivo', component: FormlyFieldTextoComponent },
  { name: 'asignacionActivo', component: FormlyFieldTextoComponent },
  { name: 'devolucionActivo', component: FormlyFieldTextoComponent },
  { name: 'tablaActivos', component: FormlyFieldTextoComponent },
  { name: 'ingresoActivos', component: FormlyFieldTextoComponent },
  { name: 'bajaActivos', component: FormlyFieldTextoComponent }
];
