import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Documento, DocumentosService } from '../../core/services/documentos.service';
import { AuthService } from '../../core/auth/auth.service';
import { VisorPdfDialogComponent } from '../visor-pdf/visor-pdf-dialog.component';
import { NuevoDocumentoDialogComponent } from './nuevo-documento-dialog.component';
import { HistorialDocumentoDialogComponent } from './historial-documento-dialog.component';

@Component({
  selector: 'app-documentos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>{{ headerTitle() }}</h1>
          <p class="subtitle">{{ headerSubtitle() }}</p>
        </div>

        <button 
          *ngIf="modoVista() === 'documentos'" 
          mat-raised-button 
          class="btn-nuevo" 
          (click)="abrirNuevoDocumento()"
        >
          <mat-icon>post_add</mat-icon>
          <span>Nuevo Documento</span>
        </button>
      </div>

      <mat-card class="table-card">
        <!-- Tabs de filtro por estado (Ocultos en bandeja de firmar) -->
        <mat-tab-group *ngIf="modoVista() !== 'firmar'" (selectedTabChange)="onTabChange($event.index)">
          <ng-container *ngIf="modoVista() === 'documentos'">
            <mat-tab label="Todos los Documentos"></mat-tab>
            <mat-tab label="Nuevos / Borrador"></mat-tab>
            <mat-tab label="En Curso / Derivados"></mat-tab>
            <mat-tab label="Aprobados"></mat-tab>
            <mat-tab label="Cerrados / Archivo"></mat-tab>
          </ng-container>

          <ng-container *ngIf="modoVista() === 'derivados'">
            <mat-tab label="Trámites Derivados"></mat-tab>
            <mat-tab label="En Curso"></mat-tab>
            <mat-tab label="Revisados"></mat-tab>
          </ng-container>

          <ng-container *ngIf="modoVista() === 'impresion'">
            <mat-tab label="Todos los Listos para Impresión"></mat-tab>
            <mat-tab label="Aprobados"></mat-tab>
            <mat-tab label="Cerrados / Oficiales"></mat-tab>
          </ng-container>

          <ng-container *ngIf="modoVista() === 'en_curso'">
            <mat-tab label="Todos en Curso"></mat-tab>
            <mat-tab label="Borradores (NUEVO)"></mat-tab>
            <mat-tab label="Derivados"></mat-tab>
          </ng-container>

          <ng-container *ngIf="modoVista() === 'aprobar_documento'">
            <mat-tab label="Pendientes de Aprobación"></mat-tab>
            <mat-tab label="Aprobados"></mat-tab>
          </ng-container>
        </mat-tab-group>

        <!-- Filtros y Búsqueda -->
        <div class="toolbar-filter">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input 
              matInput 
              (keyup)="onFilterChange($event)" 
              [placeholder]="modoVista() === 'firmar' ? 'Buscar CITE de documento para firmar...' : 'Buscar por CITE, asunto, remitente o destinatario...'"
            >
          </mat-form-field>

          <span class="toolbar-spacer"></span>

          <!-- Mensaje informativo para la bandeja de firmar -->
          <div *ngIf="modoVista() === 'firmar'" class="firmar-info-badge">
            <mat-icon>verified_user</mat-icon>
            <span>Solo documentos con CITE aprobados por jefatura</span>
          </div>

          <!-- Mensaje informativo de restricción para impresión -->
          <div *ngIf="modoVista() === 'impresion'" class="impresion-role-badge" [class.badge-allowed]="esSecretariaOMae()">
            <mat-icon>{{ esSecretariaOMae() ? 'check_circle' : 'lock' }}</mat-icon>
            <span>{{ esSecretariaOMae() ? 'Rol Secretaría Habilitado para Impresión' : 'Impresión y Descarga Exclusiva de Secretaría' }}</span>
          </div>
        </div>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="documentos()" class="w-full">
            <!-- CITE / Documento Column -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>CITE / DOCUMENTO</th>
              <td mat-cell *matCellDef="let d">
                <span class="doc-cite">{{ d.nombre }}</span>
                <span class="doc-meta">{{ d.ref || 'Trámite oficial en curso' }}</span>
              </td>
            </ng-container>

            <!-- Participantes Column -->
            <ng-container matColumnDef="participantes">
              <th mat-header-cell *matHeaderCellDef>PARTICIPANTES</th>
              <td mat-cell *matCellDef="let d">
                <div class="participantes-col">
                  <span><strong>De:</strong> {{ d.de || 'Funcionario Solicitante' }}</span>
                  <span><strong>Para:</strong> {{ d.para || 'Jefatura de Área' }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Clasificación Column -->
            <ng-container matColumnDef="clasificacion">
              <th mat-header-cell *matHeaderCellDef>CLASIFICACIÓN</th>
              <td mat-cell *matCellDef="let d">
                <span class="badge-tag" [ngClass]="getClasificacionClass(d.clasificacion)">
                  {{ d.clasificacion || 'ORDINARIO' }}
                </span>
              </td>
            </ng-container>

            <!-- Estado Column -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>ESTADO</th>
              <td mat-cell *matCellDef="let d">
                <span class="badge-tag" [ngClass]="getEstadoClass(d.estado)">
                  {{ d.estado }}
                </span>
              </td>
            </ng-container>

            <!-- Fecha Column -->
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef>FECHA</th>
              <td mat-cell *matCellDef="let d">
                {{ d.fecha || (d._fecha_creacion | date:'dd/MM/yyyy') }}
              </td>
            </ng-container>

            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">ACCIONES</th>
              <td mat-cell *matCellDef="let d" class="text-right">
                <!-- ACCIÓN PARA BANDEJA DE FIRMAR -->
                <ng-container *ngIf="modoVista() === 'firmar'">
                  <button mat-raised-button color="primary" class="btn-firmar-action" (click)="abrirWorkbench(d)">
                    <mat-icon>fingerprint</mat-icon>
                    <span>Firmar</span>
                  </button>
                  <button mat-icon-button (click)="verPdf(d)" matTooltip="Vista previa PDF">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="verHistorial(d)" matTooltip="Trazabilidad y Flujo" class="btn-history-action">
                    <mat-icon>history</mat-icon>
                  </button>
                </ng-container>

                <!-- ACCIÓN PARA BANDEJA DE IMPRESIÓN (ROL SECRETARÍA) -->
                <ng-container *ngIf="modoVista() === 'impresion'">
                  <button 
                    *ngIf="esSecretariaOMae()" 
                    mat-raised-button 
                    class="btn-imprimir-action" 
                    (click)="verPdf(d)"
                  >
                    <mat-icon>print</mat-icon>
                    <span>Imprimir / Descargar</span>
                  </button>
                  <button mat-icon-button (click)="verHistorial(d)" matTooltip="Trazabilidad y Flujo" class="btn-history-action">
                    <mat-icon>history</mat-icon>
                  </button>
                  <span *ngIf="!esSecretariaOMae()" class="locked-action" matTooltip="Solo secretaría puede imprimir o descargar este documento oficial">
                    <mat-icon>lock</mat-icon> Bloqueado
                  </span>
                </ng-container>

                <!-- ACCIÓN PARA BANDEJAS REGULARES -->
                <ng-container *ngIf="modoVista() !== 'firmar' && modoVista() !== 'impresion'">
                  <button mat-icon-button (click)="abrirWorkbench(d)" matTooltip="Editar / Revisar">
                    <mat-icon>edit_note</mat-icon>
                  </button>
                  <button mat-icon-button (click)="verPdf(d)" matTooltip="Ver Documento">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="verHistorial(d)" matTooltip="Trazabilidad y Flujo" class="btn-history-action">
                    <mat-icon>history</mat-icon>
                  </button>
                  <button 
                    *ngIf="puedePromover() && d.estado === 'CERRADO'" 
                    mat-icon-button 
                    (click)="promoverAInstitucional(d)" 
                    matTooltip="Promover a Archivo Institucional Oficial"
                    style="color: #f59e0b"
                  >
                    <mat-icon>verified</mat-icon>
                  </button>
                </ng-container>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <!-- Fila Vacía -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-cell" [attr.colspan]="displayedColumns.length">
                <mat-icon class="empty-icon">{{ modoVista() === 'firmar' ? 'done_all' : 'folder_open' }}</mat-icon>
                <p *ngIf="modoVista() === 'firmar'">No tiene documentos cerrados pendientes de su firma en este momento.</p>
                <p *ngIf="modoVista() !== 'firmar'">No se encontraron documentos en esta bandeja.</p>
              </td>
            </tr>
          </table>
        </div>

        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPageChange($event)"
          showFirstLastButtons
        >
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1240px;
      margin: 0 auto;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;

      h1 {
        margin: 0;
        color: #0f172a;
        font-size: 1.65rem;
        font-weight: 800;
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 0.88rem;
      }
    }

    .btn-nuevo {
      background: #0f2027 !important;
      color: #ffffff !important;
      border-radius: 20px !important;
      font-weight: 700 !important;
      height: 42px !important;
      padding: 0 20px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 12px rgba(15, 32, 39, 0.2) !important;
    }

    .table-card {
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .toolbar-filter {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .search-field {
      width: 360px;
      font-size: 0.88rem;
    }

    .toolbar-spacer {
      flex: 1 1 auto;
    }

    .firmar-info-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .impresion-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .badge-allowed {
      background: #ecfdf5 !important;
      color: #059669 !important;
      border-color: #a7f3d0 !important;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    table {
      width: 100%;
      min-width: 660px;

      th.mat-mdc-header-cell {
        background-color: #0f2027 !important;
        color: #ffffff !important;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 14px 16px;
      }

      td.mat-mdc-cell {
        font-size: 0.86rem;
        padding: 12px 16px;
      }
    }

    .doc-cite {
      display: block;
      color: #0f2027;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
    }

    .doc-meta {
      display: block;
      color: #64748b;
      font-size: 0.8rem;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .participantes-col {
      display: flex;
      flex-direction: column;
      font-size: 0.84rem;
      gap: 2px;
      color: #334155;
    }

    .badge-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .badge-ordinario { background: #e0f2fe; color: #0369a1; }
    .badge-reservado { background: #fef3c7; color: #92400e; }
    .badge-confidencial { background: #f3e8ff; color: #7e22ce; }
    .badge-secreto { background: #fee2e2; color: #b91c1c; }

    .badge-nuevo { background: #e0f2fe; color: #0284c7; }
    .badge-derivado { background: #fff7ed; color: #ea580c; }
    .badge-aprobado { background: #ecfdf5; color: #059669; }
    .badge-cerrado { background: #f1f5f9; color: #475569; }

    .btn-firmar-action {
      background: #7c3aed !important;
      color: #ffffff !important;
      border-radius: 18px !important;
      font-weight: 700 !important;
      font-size: 0.82rem !important;
      padding: 0 16px !important;
      height: 36px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin-right: 4px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .btn-history-action {
      color: #0d5c63 !important;
      &:hover {
        background-color: rgba(13, 92, 99, 0.08) !important;
      }
    }

    .btn-imprimir-action {
      background: #0284c7 !important;
      color: #ffffff !important;
      border-radius: 18px !important;
      font-weight: 700 !important;
      font-size: 0.82rem !important;
      padding: 0 16px !important;
      height: 36px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .locked-action {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 600;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #cbd5e1;
      }
    }

    .text-right { text-align: right; }

    .empty-cell {
      text-align: center;
      padding: 40px !important;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }

    @media (max-width: 768px) {
      .toolbar-filter {
        flex-direction: column;
        align-items: stretch;
      }
      .search-field {
        width: 100%;
      }
    }
  `]
})
export class DocumentosListComponent implements OnInit {
  private readonly documentosService = inject(DocumentosService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authService.currentUser;
  readonly displayedColumns = ['nombre', 'participantes', 'clasificacion', 'estado', 'fecha', 'acciones'];
  readonly documentos = signal<Documento[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly loading = signal(false);

  puedePromover(): boolean {
    return this.authService.hasRole('JEFE') || 
           this.authService.hasRole('MAE') || 
           this.authService.hasRole('ADMIN') || 
           this.authService.isMae();
  }

  promoverAInstitucional(d: Documento): void {
    if (!confirm(`¿Desea promover el documento ${d.nombre} a Archivo Institucional Oficial? Pasará a formar parte del fondo documental corporativo.`)) {
      return;
    }

    this.http.post<any>(`/api/v1/archivo/promover/${d.id_documento}`, {
      categoria: (d as any).nombre_plantilla || 'Documento Oficial Concluido'
    }).subscribe({
      next: (res) => {
        if (res.tipoMensaje === 'EXITO') {
          this.snackBar.open(`¡Documento ${d.nombre} promovido a Archivo Institucional con éxito!`, 'Aceptar', { duration: 4000 });
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al promover documento a institucional', 'Cerrar', { duration: 3500 });
      }
    });
  }

  private currentEstado = '';
  private searchFilter = '';

  readonly currentUrl = signal<string>(this.router.url);

  readonly modoVista = computed<'documentos' | 'derivados' | 'firmar' | 'impresion' | 'en_curso' | 'aprobar_documento'>(() => {
    const url = this.currentUrl();
    if (url.includes('/firmar')) return 'firmar';
    if (url.includes('/aprobacion')) return 'derivados';
    if (url.includes('/impresion')) return 'impresion';
    if (url.includes('/en_curso')) return 'en_curso';
    if (url.includes('/aprobar_documento')) return 'aprobar_documento';
    return 'documentos';
  });

  readonly headerTitle = computed(() => {
    switch (this.modoVista()) {
      case 'firmar': return 'Documentos para Firma Digital';
      case 'derivados': return 'Bandeja de Derivados';
      case 'impresion': return 'Imprimir Documentos Oficiales';
      case 'en_curso': return 'Documentos En Curso';
      case 'aprobar_documento': return 'Aprobación Documental';
      default: return 'Bandeja Documental';
    }
  });

  readonly headerSubtitle = computed(() => {
    switch (this.modoVista()) {
      case 'firmar': return 'Trámites cerrados y aprobados con CITE oficial que esperan su firma en la cadena de flujo';
      case 'derivados': return 'Bandeja de documentos derivados y en revisión de flujo institucional';
      case 'impresion': return 'Bandeja oficial de expedición física e impresión certificada (Secretaría)';
      case 'en_curso': return 'Trámites y borradores en redacción y elaboración activa';
      case 'aprobar_documento': return 'Trámites pendientes de visto bueno y aprobación por Jefatura o Dirección General';
      default: return 'Gestión, redacción y seguimiento de trámites';
    }
  });

  readonly esSecretariaOMae = computed(() => {
    const u = this.user();
    if (!u) return false;
    if (u.es_mae || this.authService.isMae() || this.authService.hasRole('ADMIN') || this.authService.hasRole('SUPERADMIN')) return true;
    const cargo = (u.cargo || '').toLowerCase();
    if (cargo.includes('secretari') || cargo.includes('recepcion') || cargo.includes('correspondencia')) return true;
    return this.authService.hasRole('SECRETARIA');
  });

  private readonly estadoTabsDocumentos = ['', 'NUEVO', 'DERIVADO', 'APROBADO', 'CERRADO'];
  private readonly estadoTabsDerivados = ['DERIVADO', 'EN CURSO', 'APROBADO'];
  private readonly estadoTabsImpresion = ['', 'APROBADO', 'CERRADO'];
  private readonly estadoTabsEnCurso = ['NUEVO,DERIVADO', 'NUEVO', 'DERIVADO'];
  private readonly estadoTabsAprobar = ['DERIVADO', 'APROBADO'];

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.loading.set(true);

    if (this.modoVista() === 'firmar') {
      this.documentosService
        .getDocumentosParaFirmar(this.pageSize(), this.pageIndex() + 1, this.searchFilter)
        .subscribe({
          next: (res) => {
            this.loading.set(false);
            const data = res.datos;
            this.documentos.set(data.resultado || []);
            this.total.set(data.total || 0);
          },
          error: () => {
            this.loading.set(false);
          }
        });
    } else {
      let estadoFiltro = this.currentEstado;
      if (this.modoVista() === 'derivados' && !estadoFiltro) {
        estadoFiltro = 'DERIVADO';
      } else if (this.modoVista() === 'impresion' && !estadoFiltro) {
        estadoFiltro = 'APROBADO,CERRADO';
      } else if (this.modoVista() === 'en_curso' && !estadoFiltro) {
        estadoFiltro = 'NUEVO';
      } else if (this.modoVista() === 'aprobar_documento' && !estadoFiltro) {
        estadoFiltro = 'DERIVADO';
      }

      this.documentosService
        .getDocumentos(this.pageSize(), this.pageIndex() + 1, estadoFiltro, this.searchFilter)
        .subscribe({
          next: (res) => {
            this.loading.set(false);
            const data = res.datos;
            this.documentos.set(data.resultado || []);
            this.total.set(data.total || 0);
          },
          error: () => {
            this.loading.set(false);
          }
        });
    }
  }

  onTabChange(tabIndex: number): void {
    if (this.modoVista() === 'documentos') {
      this.currentEstado = this.estadoTabsDocumentos[tabIndex] || '';
    } else if (this.modoVista() === 'derivados') {
      this.currentEstado = this.estadoTabsDerivados[tabIndex] || 'DERIVADO';
    } else if (this.modoVista() === 'impresion') {
      this.currentEstado = this.estadoTabsImpresion[tabIndex] || '';
    } else if (this.modoVista() === 'en_curso') {
      this.currentEstado = this.estadoTabsEnCurso[tabIndex] || 'NUEVO,DERIVADO';
    } else if (this.modoVista() === 'aprobar_documento') {
      this.currentEstado = this.estadoTabsAprobar[tabIndex] || 'DERIVADO';
    }
    this.pageIndex.set(0);
    this.cargarDocumentos();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.cargarDocumentos();
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchFilter = input.value.trim();
    this.pageIndex.set(0);
    this.cargarDocumentos();
  }

  abrirWorkbench(doc: Documento): void {
    if (doc.id_documento) {
      this.router.navigate(['/documentos', doc.id_documento]);
    }
  }

  verPdf(doc: Documento): void {
    if (!doc.nombre) return;
    this.dialog.open(VisorPdfDialogComponent, {
      width: '85vw',
      maxWidth: '1200px',
      data: {
        titulo: `${doc.nombre} - ${doc.ref || 'Documento Oficial'}`,
        docCite: doc.nombre
      }
    });
  }

  verHistorial(doc: any): void {
    if (!doc || !doc.id_documento) return;
    this.dialog.open(HistorialDocumentoDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: {
        id_documento: doc.id_documento,
        nombre: doc.nombre,
        ref: doc.ref || doc.referencia,
        nombre_plantilla: doc.nombre_plantilla
      }
    });
  }

  getClasificacionClass(clasificacion?: string): string {
    switch (clasificacion) {
      case 'RESERVADO': return 'badge-reservado';
      case 'CONFIDENCIAL': return 'badge-confidencial';
      case 'SECRETO': return 'badge-secreto';
      default: return 'badge-ordinario';
    }
  }

  abrirNuevoDocumento(): void {
    const dialogRef = this.dialog.open(NuevoDocumentoDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      disableClose: false
    });
    dialogRef.afterClosed().subscribe((nuevoDoc) => {
      if (nuevoDoc) {
        this.cargarDocumentos();
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'NUEVO': return 'badge-nuevo';
      case 'DERIVADO': return 'badge-derivado';
      case 'APROBADO': return 'badge-aprobado';
      default: return 'badge-cerrado';
    }
  }
}
