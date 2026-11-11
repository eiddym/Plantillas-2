import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentosService } from '../../core/services/documentos.service';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
}

export interface VersionArchivo {
  version: number;
  nombre_archivo: string;
  ruta: string;
  fecha: string;
  usuario: string;
  observacion: string;
}

export interface DocumentoArchivo {
  id_documento: number;
  nombre: string;
  nombre_plantilla: string;
  abreviacion?: string;
  categoria_institucional?: string;
  clasificacion?: string;
  origen_canal?: string;
  origen_radicacion?: string;
  codigo_hoja_ruta?: string;
  etiquetas?: string[];
  referencia?: string;
  estado: string;
  es_institucional?: boolean;
  versiones?: VersionArchivo[];
  _fecha_creacion?: string;
  fecha?: string;
  usuario_creacion?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    cargo?: string;
    fid_unidad?: number;
    unidad?: {
      id_unidad: number;
      nombre: string;
      abreviacion: string;
      fid_unidad_padre?: number;
    };
  };
  plantilla_valor?: string;
  archivo_adjunto?: string;
  archivo_base64?: string;
}

export interface UnidadArchivo {
  id_unidad: number;
  nombre: string;
  abreviacion: string;
  fid_unidad_padre?: number;
  es_unidad_padre?: boolean;
  total_documentos: number;
  total_con_hijos?: number;
  documentos: DocumentoArchivo[];
  agrupado_por_tipo: Record<string, DocumentoArchivo[]>;
  agrupado_por_clasificacion?: Record<string, DocumentoArchivo[]>;
  sub_unidades?: UnidadArchivo[];
}

@Component({
  selector: 'app-archivo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule
  ],
  templateUrl: './archivo.component.html',
  styleUrl: './archivo.component.scss'
})
export class ArchivoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private readonly documentosService = inject(DocumentosService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('visorViewport') visorViewport?: ElementRef<HTMLElement>;
  @ViewChild('pdfCanvas') pdfCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvasWrapper') pdfCanvasWrapper?: ElementRef<HTMLElement>;

  // Visor Local Embebido (Split Screen con Hoja Física a Escala Real)
  readonly docSeleccionado = signal<DocumentoArchivo | null>(null);
  readonly urlPdfSegura = signal<SafeResourceUrl | null>(null);
  readonly htmlVisorSeguro = signal<SafeHtml | null>(null);
  readonly cargandoVisor = signal<boolean>(false);
  readonly errorVisor = signal<string | null>(null);
  readonly tipoHojaVisor = signal<'Letter' | 'Oficio'>('Letter');
  readonly orientacionHojaVisor = signal<'Vertical' | 'Horizontal'>('Vertical');
  readonly escalaVisor = signal<number>(0.6);
  readonly modoEscalaVisor = signal<'fit' | 'custom'>('fit');
  readonly porcentajeEscalaVisor = computed(() => Math.round(this.escalaVisor() * 100));

  // Estado del Visor Canvas Nativo (PDF.js sin iframe ni descarga)
  readonly esModoPdfCanvas = signal<boolean>(false);
  readonly totalPaginasPdf = signal<number>(1);
  readonly paginaActualPdf = signal<number>(1);
  readonly zoomPdfFactor = signal<number>(1.0);
  readonly porcentajeZoomPdf = computed(() => Math.round(this.zoomPdfFactor() * 100));
  readonly listaPaginasPdf = computed(() => {
    const total = this.totalPaginasPdf();
    return Array.from({ length: total }, (_, i) => i + 1);
  });
  private loadedPdfDocument: any = null;
  private renderTaskEnCurso: any = null;

  readonly canonicalWidthVisor = computed(() => {
    const baseLong = this.tipoHojaVisor() === 'Oficio' ? 1248 : 1056;
    return this.orientacionHojaVisor() === 'Horizontal' ? baseLong : 816;
  });

  readonly canonicalHeightVisor = computed(() => {
    const baseLong = this.tipoHojaVisor() === 'Oficio' ? 1248 : 1056;
    return this.orientacionHojaVisor() === 'Horizontal' ? 816 : baseLong;
  });

  readonly scaledWidthVisor = computed(() => Math.round(this.canonicalWidthVisor() * this.escalaVisor()));
  readonly scaledHeightVisor = computed(() => Math.round(this.canonicalHeightVisor() * this.escalaVisor()));

  private currentObjectUrl: string | null = null;
  archivoPdfBase64: string | null = null;

  readonly nivelActivo = signal<'general' | 'unidad' | 'institucional' | 'estadisticas'>('institucional');
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly permisosServidor = signal<any | null>(null);

  // Datos de Archivo General y Filtros por Etiquetas (Unidad, Tipo, Clasificación, Origen, Tags)
  readonly unidadesGeneral = signal<UnidadArchivo[]>([]);
  readonly docsGeneral = signal<DocumentoArchivo[]>([]);
  readonly tiposDisponiblesGeneral = signal<string[]>([]);
  readonly etiquetasDisponiblesGeneral = signal<Array<{ tag: string; total: number }>>([]);
  readonly tipoFiltroGeneral = signal<string>('TODOS');
  readonly unidadFiltroGeneral = signal<number | 'TODAS'>('TODAS');
  readonly clasificacionFiltroGeneral = signal<string>('TODAS');
  readonly origenFiltroGeneral = signal<string>('TODOS');
  readonly etiquetaFiltroGeneral = signal<string>('TODAS');
  readonly filtroGeneralCtrl = new FormControl('');

  readonly origenesFiltroOpciones = [
    { val: 'TODOS', label: 'Todos' },
    { val: 'FLUJO_INTERNO', label: 'Flujo Interno' },
    { val: 'VENTANILLA_EXTERNA', label: 'Ventanilla Externa' },
    { val: 'VENTANILLA_INTERNA', label: 'Ventanilla Interna' },
    { val: 'INSTITUCIONAL', label: 'Institucional' }
  ];

  readonly facetsAbierto = signal<boolean>(false);
  toggleFacetsMobile(): void {
    this.facetsAbierto.update(v => !v);
  }

  // Datos de Archivo de Unidad
  readonly dataUnidadActual = signal<any | null>(null);
  readonly tipoFiltroUnidad = signal<string>('TODOS');

  // Datos de Archivo Institucional
  readonly docsInstitucionales = signal<DocumentoArchivo[]>([]);

  // Datos de Estadísticas
  readonly estadisticasData = signal<any | null>(null);

  // Modales y Edición de Etiquetas
  readonly mostrarModalCarga = signal<boolean>(false);
  readonly docAVersionar = signal<DocumentoArchivo | null>(null);
  readonly docVersionesVer = signal<DocumentoArchivo | null>(null);
  readonly docAEtiquetar = signal<DocumentoArchivo | null>(null);
  readonly etiquetasEdicion = signal<string[]>([]);
  readonly clasificacionEdicion = signal<string>('Reservado');
  readonly nuevaEtiquetaCtrl = new FormControl('');
  readonly nombreArchivoCarga = signal<string | null>(null);
  readonly nombreArchivoVersion = signal<string | null>(null);

  readonly etiquetasSugeridasList = [
    'Normativa',
    'Urgente',
    'Auditoría',
    'Contratos',
    'Operaciones Mineras',
    'Finanzas / Contabilidad',
    'Recursos Humanos',
    'Consejo Administración',
    'Consejo Vigilancia',
    'Legal / Jurídico'
  ];

  readonly cargaForm = new FormGroup({
    nombre_documento: new FormControl('', [Validators.required]),
    sigla: new FormControl('', [Validators.required]),
    anio: new FormControl(new Date().getFullYear(), [Validators.required]),
    categoria: new FormControl('Documento Institucional'),
    descripcion: new FormControl('', [Validators.required]),
    observacion: new FormControl(''),
    difundir_todos: new FormControl(true)
  });

  readonly citeCalculadoPreview = signal<string>('MARABUNTA/DOC/1/2026');

  readonly sugerenciasInstitucionales: any[] = [];

  readonly versionForm = new FormGroup({
    observacion: new FormControl('', [Validators.required])
  });

  readonly columnasGenerales = ['cite', 'tipo', 'ref', 'unidad', 'fecha', 'acciones'];
  readonly columnasInstitucionales = ['cite', 'documento', 'ref', 'categoria', 'version', 'fecha', 'acciones'];

  readonly totalDocsGeneral = computed(() => this.docsGeneral().length);
  readonly totalDocsUnidad = computed(() => this.dataUnidadActual()?.total_documentos || 0);

  readonly docsGeneralesFiltrados = computed(() => {
    let list = this.docsGeneral();
    const tipo = this.tipoFiltroGeneral();
    const unidad = this.unidadFiltroGeneral();
    const clasif = this.clasificacionFiltroGeneral();
    const origen = this.origenFiltroGeneral();
    const tag = this.etiquetaFiltroGeneral();
    const query = (this.filtroGeneralCtrl.value || '').toLowerCase().trim();

    if (unidad !== 'TODAS') {
      list = list.filter(d => Number(d.usuario_creacion?.fid_unidad) === Number(unidad));
    }
    if (tipo !== 'TODOS') {
      list = list.filter(d => (d.nombre_plantilla || '').trim() === tipo);
    }
    if (clasif !== 'TODAS') {
      list = list.filter(d => (d.clasificacion || 'Reservado').trim() === clasif);
    }
    if (origen !== 'TODOS') {
      list = list.filter(d => (d.origen_canal || 'FLUJO_INTERNO') === origen);
    }
    if (tag !== 'TODAS') {
      list = list.filter(d => Array.isArray(d.etiquetas) && d.etiquetas.includes(tag));
    }
    if (query) {
      list = list.filter(d =>
        (d.nombre && d.nombre.toLowerCase().includes(query)) ||
        (d.referencia && d.referencia.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.nombres && d.usuario_creacion.nombres.toLowerCase().includes(query)) ||
        (d.usuario_creacion?.apellidos && d.usuario_creacion.apellidos.toLowerCase().includes(query)) ||
        (Array.isArray(d.etiquetas) && d.etiquetas.some(t => t.toLowerCase().includes(query)))
      );
    }

    return list;
  });

  readonly docsUnidadFiltrados = computed(() => {
    const data = this.dataUnidadActual();
    if (!data || !data.documentos_propios) return [];

    const tipo = this.tipoFiltroUnidad();
    if (tipo === 'TODOS') return data.documentos_propios;

    return data.documentos_propios.filter((d: any) => (d.nombre_plantilla || '').trim() === tipo);
  });

  readonly docsUnidadCopiaFiltrados = computed(() => {
    const data = this.dataUnidadActual();
    if (!data || !data.documentos_copia) return [];

    const tipo = this.tipoFiltroUnidad();
    if (tipo === 'TODOS') return data.documentos_copia;

    return data.documentos_copia.filter((d: any) => (d.nombre_plantilla || '').trim() === tipo);
  });

  ngOnInit(): void {
    // Determinar pestaña inicial según permisos locales antes de consultar al servidor
    if (this.puedeVerGeneral()) {
      this.nivelActivo.set('general');
    } else if (this.puedeVerUnidad()) {
      this.nivelActivo.set('unidad');
    } else {
      this.nivelActivo.set('institucional');
    }

    this.route.params.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'general' && this.puedeVerGeneral()) {
        this.nivelActivo.set('general');
      } else if (tipo === 'unidad' && this.puedeVerUnidad()) {
        this.nivelActivo.set('unidad');
      } else if (tipo === 'institucional') {
        this.nivelActivo.set('institucional');
      } else if (tipo === 'estadisticas' && this.puedeVerEstadisticas()) {
        this.nivelActivo.set('estadisticas');
      }
      this.cargarDatos();
    });

    this.cargarPermisosArchivo();
  }

  cargarPermisosArchivo(): void {
    this.http.get<any>('/api/v1/archivo/permisos').subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.permisosServidor.set(res.datos);
          const actual = this.nivelActivo();
          if (actual === 'general' && !this.puedeVerGeneral()) {
            this.cambiarNivel(this.puedeVerUnidad() ? 'unidad' : 'institucional');
          } else if (actual === 'unidad' && !this.puedeVerUnidad()) {
            this.cambiarNivel('institucional');
          }
        }
      },
      error: () => {}
    });
  }

  cambiarNivel(nivel: 'general' | 'unidad' | 'institucional' | 'estadisticas'): void {
    if (nivel === 'general' && !this.puedeVerGeneral()) return;
    if (nivel === 'unidad' && !this.puedeVerUnidad()) return;
    this.cerrarVisor();
    this.nivelActivo.set(nivel);
    this.cargarDatos();
  }

  cargarDatos(): void {
    const nivel = this.nivelActivo();
    if (nivel === 'general') {
      this.cargarArchivoGeneral();
    } else if (nivel === 'unidad') {
      this.cargarArchivoUnidad();
    } else if (nivel === 'institucional') {
      this.cargarArchivoInstitucional();
    } else if (nivel === 'estadisticas') {
      this.cargarEstadisticas();
    }
  }

  cargarArchivoGeneral(): void {
    if (!this.puedeVerGeneral()) return;
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/general').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO' && res.datos) {
          this.unidadesGeneral.set(res.datos.unidades || []);
          this.docsGeneral.set(res.datos.documentos || []);
          this.tiposDisponiblesGeneral.set(res.datos.tipos_disponibles || []);
          this.etiquetasDisponiblesGeneral.set(res.datos.etiquetas_disponibles || []);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al consultar archivo general', 'Cerrar', { duration: 3500 });
      }
    });
  }

  cargarArchivoUnidad(): void {
    if (!this.puedeVerUnidad()) return;
    this.cargando.set(true);
    const user = this.authService.currentUser() as any;
    const unidadId = user?.fid_unidad || 1;

    this.http.get<any>(`/api/v1/archivo/unidad/${unidadId}`).subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.dataUnidadActual.set(res.datos);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al consultar archivo de la unidad', 'Cerrar', { duration: 3500 });
      }
    });
  }

  cargarArchivoInstitucional(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/institucional').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.docsInstitucionales.set(res.datos?.resultado || []);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar archivo institucional', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarEstadisticas(): void {
    this.cargando.set(true);
    this.http.get<any>('/api/v1/archivo/estadisticas').subscribe({
      next: (res) => {
        this.cargando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          this.estadisticasData.set(res.datos);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al consultar estadísticas de archivo y ventanilla', 'Cerrar', { duration: 3000 });
      }
    });
  }

  filtrarTipoGeneral(tipo: string): void {
    this.tipoFiltroGeneral.set(tipo);
  }

  tieneFiltrosActivosGeneral(): boolean {
    return (
      this.unidadFiltroGeneral() !== 'TODAS' ||
      this.tipoFiltroGeneral() !== 'TODOS' ||
      this.clasificacionFiltroGeneral() !== 'TODAS' ||
      this.origenFiltroGeneral() !== 'TODOS' ||
      this.etiquetaFiltroGeneral() !== 'TODAS' ||
      Boolean((this.filtroGeneralCtrl.value || '').trim())
    );
  }

  limpiarFiltrosGeneral(): void {
    this.unidadFiltroGeneral.set('TODAS');
    this.tipoFiltroGeneral.set('TODOS');
    this.clasificacionFiltroGeneral.set('TODAS');
    this.origenFiltroGeneral.set('TODOS');
    this.etiquetaFiltroGeneral.set('TODAS');
    this.filtroGeneralCtrl.setValue('');
  }

  contarDocsPorTipo(tipo: string): number {
    return this.docsGeneral().filter(d => (d.nombre_plantilla || '').trim() === tipo).length;
  }

  private tieneSubmenuMenu(ruta: string, idMenu: number): boolean {
    const menus = this.authService.currentMenu() || [];
    const arch = menus.find((m: any) => m.label?.toUpperCase() === 'ARCHIVO' || m.id_menu === 35);
    const subs: any[] = Array.isArray(arch?.submenu) ? arch.submenu : [];
    return subs.some((s: any) => s.id_menu === idMenu || (s.url || '').toLowerCase() === ruta);
  }

  puedeVerGeneral(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.ver_archivo_general === 'boolean') return srv.ver_archivo_general;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      /\bsecretar(ia|io|ía)\b/i.test(cargo) ||
      this.tieneSubmenuMenu('archivo/general', 37)
    );
  }

  puedeVerUnidad(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.ver_archivo_unidad === 'boolean') return srv.ver_archivo_unidad;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('JEFE') ||
      /\b(jefe|subjefe|sub\s*jefe|responsable|director|directora|presidente|presidenta|gerente|encargado|encargada|coordinador|coordinadora)\b/i.test(cargo) ||
      this.tieneSubmenuMenu('archivo/unidad', 38)
    );
  }

  puedeVerEstadisticas(): boolean {
    return (
      this.puedeVerGeneral() ||
      this.puedeVerUnidad() ||
      this.authService.hasRole('CORRESPONDENCIA')
    );
  }

  /**
   * Elevar un documento existente a Archivo Institucional:
   * EXCLUSIVO para Jefe de Unidad Padre o MAE (y Admin).
   */
  puedePromover(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.promover_a_institucional === 'boolean') return srv.promover_a_institucional;
    if (this.esAdminOMae()) return true;
    const esJefe = this.authService.hasRole('JEFE');
    const dataU = this.dataUnidadActual();
    if (dataU && typeof dataU.es_unidad_padre === 'boolean') {
      return esJefe && dataU.es_unidad_padre;
    }
    return esJefe;
  }

  /**
   * Cargar un documento externo a Archivo Institucional:
   * EXCLUSIVO para MAE o Secretaría (y Admin).
   */
  puedeCargarExternoInstitucional(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.cargar_externo_institucional === 'boolean') return srv.cargar_externo_institucional;
    const u: any = this.authService.currentUser() || {};
    const cargo = String(u.cargo || '');
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      /\bsecretar(ia|io|ía)\b/i.test(cargo)
    );
  }

  puedeEtiquetar(): boolean {
    const srv = this.permisosServidor()?.permisos;
    if (srv && typeof srv.etiquetar_documentos === 'boolean') return srv.etiquetar_documentos;
    return this.puedeVerGeneral() || this.puedeVerUnidad();
  }

  puedeVersionar(): boolean {
    return (
      this.esAdminOMae() ||
      this.authService.hasRole('SECRETARIA') ||
      this.puedePromover()
    );
  }

  esAdminOMae(): boolean {
    return (
      this.authService.hasRole('ADMIN') ||
      this.authService.hasRole('MAE') ||
      this.authService.isMae()
    );
  }

  abrirModalEtiquetas(doc: DocumentoArchivo): void {
    this.docAEtiquetar.set(doc);
    this.etiquetasEdicion.set(Array.isArray(doc.etiquetas) ? [...doc.etiquetas] : []);
    this.clasificacionEdicion.set(doc.clasificacion || 'Reservado');
    this.nuevaEtiquetaCtrl.setValue('');
  }

  cerrarModalEtiquetas(): void {
    this.docAEtiquetar.set(null);
  }

  toggleEtiquetaEdicion(tag: string): void {
    const actual = [...this.etiquetasEdicion()];
    const idx = actual.indexOf(tag);
    if (idx >= 0) {
      actual.splice(idx, 1);
    } else {
      actual.push(tag);
    }
    this.etiquetasEdicion.set(actual);
  }

  agregarEtiquetaCustom(): void {
    const val = (this.nuevaEtiquetaCtrl.value || '').replace(/^#+/, '').trim();
    if (!val) return;
    const actual = [...this.etiquetasEdicion()];
    if (!actual.includes(val)) {
      actual.push(val);
      this.etiquetasEdicion.set(actual);
    }
    this.nuevaEtiquetaCtrl.setValue('');
  }

  guardarEtiquetasDoc(): void {
    const doc = this.docAEtiquetar();
    if (!doc) return;
    this.guardando.set(true);
    this.http.post<any>(`/api/v1/archivo/etiquetas/${doc.id_documento}`, {
      etiquetas: this.etiquetasEdicion(),
      clasificacion: this.clasificacionEdicion()
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.tipoMensaje === 'EXITO') {
          doc.etiquetas = res.datos?.etiquetas || this.etiquetasEdicion();
          doc.clasificacion = res.datos?.clasificacion || this.clasificacionEdicion();
          this.snackBar.open('Clasificación y etiquetas actualizadas correctamente', 'Aceptar', { duration: 3000 });
          this.cerrarModalEtiquetas();
          this.cargarDatos();
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al guardar etiquetas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  promoverAInstitucional(doc: DocumentoArchivo): void {
    if (!confirm(`¿Desea promover el documento ${doc.nombre} a Archivo Institucional Oficial? Será visible para toda la entidad.`)) {
      return;
    }

    this.http.post<any>(`/api/v1/archivo/promover/${doc.id_documento}`, {
      categoria: doc.nombre_plantilla || 'Documento Oficial Promovido'
    }).subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO') {
          this.snackBar.open(`¡Documento ${doc.nombre} promovido a Archivo Institucional!`, 'Aceptar', { duration: 4000 });
          doc.es_institucional = true;
          this.cargarArchivoInstitucional();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al promover documento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  seleccionarSugerencia(sug: any): void {
    this.cargaForm.patchValue({
      nombre_documento: sug.nombre,
      sigla: sug.sigla,
      categoria: sug.cat,
      descripcion: sug.desc
    });
    this.actualizarProximoCite();
  }

  derivarSiglaFront(nombre: string): string {
    if (!nombre) return 'DOC';
    const clean = nombre.trim();
    const lower = clean.toLowerCase();
    if (lower.includes('personalidad jur') || lower.includes('personeria jur') || lower.includes('personería jur')) return 'PJ';
    if (lower.includes('reglamento interno') && lower.includes('personal')) return 'RIP';
    if (lower.includes('reglamento interno') && lower.includes('trabajo')) return 'RIT';
    if (lower.includes('estatuto')) return 'EO';
    if (lower.includes('codigo de etica') || lower.includes('código de ética')) return 'CE';
    if (lower.includes('manual') && (lower.includes('funciones') || lower.includes('organizacion') || lower.includes('organización'))) return 'MOF';
    if (lower.includes('plan operativo')) return 'POA';
    if (lower.includes('plan estrategico') || lower.includes('plan estratégico')) return 'PEI';
    if (lower.includes('resolucion de directorio') || lower.includes('resolución de directorio')) return 'RD';
    if (lower.includes('convenio')) return 'CI';

    const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'para', 'a', 'con', 'por', 'sobre', 'al', 'o', 'e', 'un', 'una']);
    const palabras = clean
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 0 && !stopwords.has(p.toLowerCase()));
    if (palabras.length === 0) return 'DOC';
    if (palabras.length === 1) return palabras[0].substring(0, 3).toUpperCase();
    return palabras.map(p => p[0].toUpperCase()).join('');
  }

  onNombreDocumentoChange(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = this.derivarSiglaFront(nom);
    this.cargaForm.get('sigla')?.setValue(sig, { emitEvent: false });
    this.actualizarProximoCite();
  }

  onSiglaChange(): void {
    const raw = this.cargaForm.get('sigla')?.value || '';
    const sigUpper = raw.toUpperCase();
    if (raw !== sigUpper) {
      this.cargaForm.get('sigla')?.setValue(sigUpper, { emitEvent: false });
    }
    this.actualizarProximoCite();
  }

  onAnioChange(): void {
    this.actualizarProximoCite();
  }

  actualizarProximoCite(): void {
    const nom = this.cargaForm.get('nombre_documento')?.value || '';
    const sig = (this.cargaForm.get('sigla')?.value || this.derivarSiglaFront(nom) || 'DOC').toUpperCase();
    const anio = this.cargaForm.get('anio')?.value || new Date().getFullYear();

    this.http.get<any>(`/api/v1/archivo/institucional/proximo-cite?nombre=${encodeURIComponent(nom)}&sigla=${encodeURIComponent(sig)}&anio=${anio}`)
      .subscribe({
        next: (res) => {
          if (res.tipoMensaje === 'EXITO' && res.datos?.cite) {
            this.citeCalculadoPreview.set(res.datos.cite.toUpperCase());
          } else {
            this.citeCalculadoPreview.set(`MARABUNTA/${sig}/1/${anio}`);
          }
        },
        error: () => {
          this.citeCalculadoPreview.set(`MARABUNTA/${sig}/1/${anio}`);
        }
      });
  }

  copiarCite(cite: string): void {
    if (!cite) return;
    navigator.clipboard.writeText(cite).then(() => {
      this.snackBar.open(`¡CITE "${cite}" copiado al portapapeles!`, 'Aceptar', { duration: 3000 });
    }).catch(() => {
      this.snackBar.open(`CITE: ${cite}`, 'Cerrar', { duration: 4000 });
    });
  }

  obtenerTituloDoc(d: any): string {
    if (!d) return 'Documento Oficial';
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        if (parsed.nombre_documento) return parsed.nombre_documento;
      } catch {}
    }
    return d.nombre_plantilla || d.categoria_institucional || 'Documento Oficial';
  }

  obtenerDescripcionDoc(d: any): string {
    if (!d) return 'Sin descripción registrada';
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        if (parsed.descripcion) return parsed.descripcion;
        if (parsed.ref) return parsed.ref;
      } catch {}
    }
    return d.referencia || 'Documento oficial en custodia institucional';
  }

  abrirModalCarga(): void {
    this.cargaForm.reset({
      nombre_documento: '',
      sigla: '',
      anio: new Date().getFullYear(),
      categoria: 'Documento Institucional',
      descripcion: '',
      observacion: '',
      difundir_todos: true
    });
    this.nombreArchivoCarga.set(null);
    this.archivoPdfBase64 = null;
    this.actualizarProximoCite();
    this.mostrarModalCarga.set(true);
  }

  cerrarModalCarga(): void {
    this.mostrarModalCarga.set(false);
  }

  onArchivoSeleccionado(e: any): void {
    const f = e.target.files?.[0];
    if (f) {
      this.nombreArchivoCarga.set(f.name);
      const reader = new FileReader();
      reader.onload = () => {
        this.archivoPdfBase64 = reader.result as string;
      };
      reader.readAsDataURL(f);
    }
  }

  guardarDocumentoInstitucional(): void {
    if (this.cargaForm.invalid) return;

    this.guardando.set(true);
    const v = this.cargaForm.value;
    const user = this.authService.currentUser() as any;
    const siglaUpper = (v.sigla || 'DOC').toUpperCase();

    this.http.post<any>('/api/v1/archivo/institucional/cargar', {
      nombre_documento: v.nombre_documento,
      sigla: siglaUpper,
      anio: v.anio,
      categoria: v.categoria || 'Documento Institucional',
      descripcion: v.descripcion,
      observacion: v.observacion,
      nombre_archivo: this.nombreArchivoCarga() || `${siglaUpper}_v1.pdf`,
      archivo_base64: this.archivoPdfBase64,
      archivo_adjunto: this.archivoPdfBase64,
      url_archivo: `/public/documentos/${this.citeCalculadoPreview().toUpperCase().replace(/\//g, '_')}.pdf`,
      difundir_todos: !!v.difundir_todos,
      audit_usuario: user
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.cerrarModalCarga();
        const citeAsignado = (res.datos?.nombre || this.citeCalculadoPreview()).toUpperCase();
        this.snackBar.open(`¡Documento emitido y difundido con CITE: ${citeAsignado}!`, 'Aceptar', { duration: 5000 });
        this.cargarArchivoInstitucional();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al cargar documento institucional', 'Cerrar', { duration: 4000 });
      }
    });
  }

  difundirGlobalmente(doc: DocumentoArchivo): void {
    if (!confirm(`¿Desea difundir el documento ${doc.nombre} a los correos de todos los usuarios y al Grupo Institucional de WhatsApp?`)) {
      return;
    }
    this.http.post<any>(`/api/v1/archivo/difundir/${doc.id_documento}`, {}).subscribe({
      next: (res) => {
        this.snackBar.open(res.mensaje || `Difusión global ejecutada para ${doc.nombre}`, 'Aceptar', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al ejecutar difusión global', 'Cerrar', { duration: 3500 });
      }
    });
  }

  abrirModalVersionar(doc: DocumentoArchivo): void {
    this.docAVersionar.set(doc);
    this.versionForm.reset();
    this.nombreArchivoVersion.set(null);
  }

  cerrarModalVersionar(): void {
    this.docAVersionar.set(null);
  }

  onArchivoVersionSeleccionado(e: any): void {
    const f = e.target.files?.[0];
    if (f) {
      this.nombreArchivoVersion.set(f.name);
    }
  }

  guardarNuevaVersion(): void {
    const d = this.docAVersionar();
    if (!d || this.versionForm.invalid) return;

    this.guardando.set(true);
    const obs = this.versionForm.value.observacion;
    const nextVer = this.obtenerVersionActual(d) + 1;

    this.http.post<any>(`/api/v1/archivo/versionar/${d.id_documento}`, {
      observacion: obs,
      nombre_archivo: this.nombreArchivoVersion() || `${d.nombre}_v${nextVer}.pdf`,
      url_archivo: `/api/v1/documento/${d.id_documento}/pdf?v=${nextVer}`
    }).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.cerrarModalVersionar();
        this.snackBar.open(`¡Nueva versión v${nextVer} registrada en la trazabilidad!`, 'Aceptar', { duration: 4000 });
        this.cargarArchivoInstitucional();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.mensaje || 'Error al versionar archivo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  verVersiones(doc: DocumentoArchivo): void {
    this.docVersionesVer.set(doc);
  }

  cerrarVersiones(): void {
    this.docVersionesVer.set(null);
  }

  obtenerVersionActual(doc: DocumentoArchivo): number {
    if (doc.versiones && Array.isArray(doc.versiones) && doc.versiones.length > 0) {
      return doc.versiones[doc.versiones.length - 1].version;
    }
    return 1;
  }

  verDetalle(doc: DocumentoArchivo): void {
    this.verVersiones(doc);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.docSeleccionado() && this.modoEscalaVisor() === 'fit') {
      this.recalcularEscalaFitVisor();
    }
    if (this.esModoPdfCanvas() && this.loadedPdfDocument) {
      this.renderizarPaginaActualPdf();
    }
  }

  recalcularEscalaFitVisor(): void {
    if (this.modoEscalaVisor() !== 'fit') return;
    const vp = this.visorViewport?.nativeElement;
    if (!vp) return;
    const availW = vp.clientWidth;
    if (!availW) return;

    // Estandarización exacta: el contenido ocupa todo el ancho útil del visor (restando los 24px de padding lateral)
    const innerWidth = Math.max(availW - 24, 260);
    const canW = this.canonicalWidthVisor();
    let fit = innerWidth / canW;
    fit = Math.max(0.3, Math.min(fit, 1.4));
    fit = Math.round(fit * 1000) / 1000;

    this.escalaVisor.set(fit);
    this.cdr.markForCheck();
  }

  ajustarZoomVisor(delta: number): void {
    this.modoEscalaVisor.set('custom');
    if (this.esModoPdfCanvas()) {
      const actual = this.zoomPdfFactor();
      const nuevo = Math.max(0.4, Math.min(+(actual + delta).toFixed(2), 2.2));
      this.zoomPdfFactor.set(nuevo);
      this.renderizarPaginaActualPdf();
      this.cdr.markForCheck();
      return;
    }
    const actual = this.escalaVisor();
    const nuevo = Math.max(0.25, Math.min(+(actual + delta).toFixed(2), 1.8));
    this.escalaVisor.set(nuevo);
    this.cdr.markForCheck();
  }

  setModoFitVisor(): void {
    this.modoEscalaVisor.set('fit');
    if (this.esModoPdfCanvas()) {
      this.zoomPdfFactor.set(1.0);
      this.renderizarPaginaActualPdf();
      this.cdr.markForCheck();
      return;
    }
    this.recalcularEscalaFitVisor();
  }

  tienePlantillaFormly(doc: any): boolean {
    if (!doc || !doc.plantilla) return false;
    try {
      const p = typeof doc.plantilla === 'string' ? JSON.parse(doc.plantilla) : doc.plantilla;
      return Array.isArray(p) && p.length > 0;
    } catch {
      return false;
    }
  }

  seleccionarDocumento(doc: DocumentoArchivo): void {
    if (!doc || !doc.id_documento) return;
    this.docSeleccionado.set(doc);
    this.cargandoVisor.set(true);
    this.errorVisor.set(null);
    this.htmlVisorSeguro.set(null);
    this.urlPdfSegura.set(null);
    this.esModoPdfCanvas.set(false);

    if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setTimeout(() => {
        const el = document.querySelector('.visor-embebido-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    // 1. Si no tiene plantilla Formly interactiva (documento PDF escaneado / institucional subido)
    const tieneFormly = this.tienePlantillaFormly(doc);
    if (!tieneFormly) {
      // Streaming progresivo directo con PDF.js vía HTTP Range (Carga instantánea de página 1)
      this.cargarPdfEnCanvas(`/api/v1/documento/${doc.id_documento}/pdf`);
      return;
    }

    // 2. Documento interactivo redactado en Formly
    this.cargarPreviewHtml(doc);
  }

  cargarPreviewHtml(doc: DocumentoArchivo): void {
    this.documentosService.obtenerVistaPreviaHtml(doc.id_documento || doc.nombre).subscribe({
      next: (res) => {
        if (res.datos?.esPdf || (!res.datos?.html && res.datos?.pdfUrl)) {
          const pdfUrl = res.datos?.pdfUrl || `/api/v1/documento/${doc.id_documento}/pdf`;
          this.cargarPdfEnCanvas(pdfUrl);
          return;
        }

        this.cargandoVisor.set(false);
        this.esModoPdfCanvas.set(false);
        if (res.datos?.tipoHoja === 'Oficio' || res.datos?.tipoHoja === 'Legal') {
          this.tipoHojaVisor.set('Oficio');
        } else {
          this.tipoHojaVisor.set('Letter');
        }
        const orientacion = (res.datos as any)?.orientacion;
        if (orientacion === 'Horizontal' || orientacion === 'Landscape' || orientacion === 'horizontal') {
          this.orientacionHojaVisor.set('Horizontal');
        } else {
          this.orientacionHojaVisor.set('Vertical');
        }
        const html = res.datos?.html || '<p class="text-muted">No se pudo cargar la visualización del documento.</p>';
        this.htmlVisorSeguro.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.cdr.markForCheck();
        setTimeout(() => this.recalcularEscalaFitVisor(), 40);
      },
      error: () => {
        this.cargandoVisor.set(false);
        this.errorVisor.set('No se pudo cargar la visualización del documento.');
        this.cdr.markForCheck();
      }
    });
  }

  async cargarPdfEnCanvas(src: any): Promise<void> {
    try {
      this.cargandoVisor.set(true);
      this.errorVisor.set(null);
      this.esModoPdfCanvas.set(true);
      this.urlPdfSegura.set(null);
      this.htmlVisorSeguro.set(null);
      this.zoomPdfFactor.set(1.0);
      this.modoEscalaVisor.set('fit');

      if (this.renderTaskEnCurso) {
        try { this.renderTaskEnCurso.cancel(); } catch {}
        this.renderTaskEnCurso = null;
      }

      const docParam: any = typeof src === 'string'
        ? { url: src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true }
        : (src && src.url
            ? { ...src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true }
            : { data: src, cMapUrl: '/assets/pdfjs/cmaps/', cMapPacked: true });

      const loadingTask = pdfjsLib.getDocument(docParam);
      const pdfDoc = await loadingTask.promise;
      this.loadedPdfDocument = pdfDoc;
      this.totalPaginasPdf.set(pdfDoc.numPages || 1);
      this.paginaActualPdf.set(1);
      this.cargandoVisor.set(false);
      this.cdr.detectChanges();

      setTimeout(() => {
        this.renderizarPaginaActualPdf();
      }, 30);
    } catch (err: any) {
      console.error('Error cargando documento PDF con PDF.js:', err);
      this.cargandoVisor.set(false);
      this.esModoPdfCanvas.set(false);
      this.errorVisor.set('No se pudo procesar el archivo PDF para previsualización.');
      this.cdr.markForCheck();
    }
  }

  irAPaginaPdf(num: number): void {
    if (!this.loadedPdfDocument) return;
    const total = this.totalPaginasPdf();
    if (num < 1 || num > total || num === this.paginaActualPdf()) return;
    this.paginaActualPdf.set(num);
    this.cdr.markForCheck();
    setTimeout(() => {
      this.renderizarPaginaActualPdf();
    }, 20);
  }

  async renderizarPaginaActualPdf(): Promise<void> {
    if (!this.loadedPdfDocument) return;
    const canvasEl = this.pdfCanvas?.nativeElement || (document.getElementById('pdf-canvas-principal') as HTMLCanvasElement);
    if (!canvasEl) {
      setTimeout(() => this.renderizarPaginaActualPdf(), 50);
      return;
    }

    if (this.renderTaskEnCurso) {
      try { this.renderTaskEnCurso.cancel(); } catch {}
      this.renderTaskEnCurso = null;
    }

    try {
      const pageNum = this.paginaActualPdf();
      const page = await this.loadedPdfDocument.getPage(pageNum);

      const wrapper = this.pdfCanvasWrapper?.nativeElement || canvasEl.parentElement;
      const availableWidth = wrapper ? Math.max(wrapper.clientWidth, 260) : 600;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const esHorizontal = unscaledViewport.width > unscaledViewport.height;
      const rawRatio = esHorizontal
        ? (unscaledViewport.width / unscaledViewport.height)
        : (unscaledViewport.height / unscaledViewport.width);

      // Estandarización estricta a los dos únicos formatos institucionales: CARTA (1.2941) y OFICIO (1.5294)
      const esOficio = rawRatio > 1.41;
      this.orientacionHojaVisor.set(esHorizontal ? 'Horizontal' : 'Vertical');
      this.tipoHojaVisor.set(esOficio ? 'Oficio' : 'Letter');
      this.cdr.markForCheck();

      const stdRatio = esOficio ? (1248 / 816) : (1056 / 816);
      const targetWidth = Math.round(availableWidth * this.zoomPdfFactor());
      const targetHeight = Math.round(esHorizontal ? (targetWidth / stdRatio) : (targetWidth * stdRatio));

      const effectiveScale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale: effectiveScale });

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

      canvasEl.width = Math.floor(viewport.width * dpr);
      canvasEl.height = Math.floor(viewport.height * dpr);
      canvasEl.style.width = `${targetWidth}px`;
      canvasEl.style.height = `${targetHeight}px`;

      const context = canvasEl.getContext('2d', { alpha: false });
      if (!context) return;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      this.renderTaskEnCurso = page.render(renderContext);
      await this.renderTaskEnCurso.promise;
      this.renderTaskEnCurso = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Error al renderizar página PDF en canvas:', err);
      }
    }
  }

  reintentarCargaVisor(): void {
    const doc = this.docSeleccionado();
    if (doc) {
      this.seleccionarDocumento(doc);
    }
  }

  cerrarVisor(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    if (this.renderTaskEnCurso) {
      try { this.renderTaskEnCurso.cancel(); } catch {}
      this.renderTaskEnCurso = null;
    }
    this.loadedPdfDocument = null;
    this.docSeleccionado.set(null);
    this.esModoPdfCanvas.set(false);
    this.urlPdfSegura.set(null);
    this.htmlVisorSeguro.set(null);
    this.cargandoVisor.set(false);
    this.errorVisor.set(null);
  }

  verDocEnVisor(doc: any): void {
    if (!doc) return;
    this.cerrarVersiones();
    this.seleccionarDocumento(doc);
  }

  verPdf(doc: any): void {
    if (!doc) return;
    this.seleccionarDocumento(doc);
  }

  descargarPdf(doc: any): void {
    this.verPdf(doc);
  }

  descargarArchivoFisico(doc: any): void {
    if (!doc || !doc.id_documento) return;
    if (this.currentObjectUrl) {
      const a = document.createElement('a');
      a.href = this.currentObjectUrl;
      a.download = `${doc.nombre || 'documento'}.pdf`;
      a.click();
      return;
    }
    this.http.get(`/api/v1/documento/${doc.id_documento}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.nombre || 'documento'}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.snackBar.open('Error al descargar archivo PDF', 'Cerrar', { duration: 3000 });
      }
    });
  }

  obtenerReferencia(d: any): string {
    if (!d) return 'Sin Referencia';
    if (d.referencia) return d.referencia;
    if (d.plantilla_valor) {
      try {
        const parsed = typeof d.plantilla_valor === 'string' ? JSON.parse(d.plantilla_valor) : d.plantilla_valor;
        return parsed.ref || parsed.asunto || parsed.referencia || 'Documento Oficial Concluido';
      } catch {
        return 'Documento Oficial Concluido';
      }
    }
    return 'Documento Oficial Concluido';
  }

  formatearFecha(f?: string): string {
    if (!f) return '-';
    try {
      const d = new Date(f);
      return d.toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return f;
    }
  }

  obtenerClaves(obj?: Record<string, any>): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
