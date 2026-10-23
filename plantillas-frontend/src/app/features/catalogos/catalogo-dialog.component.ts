import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CatalogosService } from '../../core/services/catalogos.service';
import { DocumentosService, Documento } from '../../core/services/documentos.service';
import { SeguridadService, UsuarioAdmin } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-catalogo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-shell">
      <div class="dialog-header">
        <div class="dialog-title-row">
          <mat-icon class="header-icon">folder_special</mat-icon>
          <h2>{{ data?.id_catalogo ? 'Detalle de Catálogo Institucional' : 'Armar Nuevo Catálogo por CITEs' }}</h2>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body">
        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <!-- Datos Principales -->
        <div class="form-grid">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre del Catálogo</mat-label>
            <input matInput [(ngModel)]="nombre" placeholder="Ej. Expedientes de Contratación 2026" required [disabled]="!!data?.soloLectura">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Descripción / Finalidad</mat-label>
            <textarea matInput [(ngModel)]="descripcion" rows="2" placeholder="Describe los CITEs o la materia que reúne este catálogo" [disabled]="!!data?.soloLectura"></textarea>
          </mat-form-field>
        </div>

        <!-- Sección de Referenciación de CITEs -->
        <div class="section-box">
          <div class="section-title">
            <mat-icon>description</mat-icon>
            <strong>CITEs y Documentos Referenciados ({{ docsSeleccionados().length }})</strong>
          </div>
          <p class="section-hint">Seleccione los documentos oficiales aprobados o cerrados para integrar este catálogo:</p>

          <div class="cites-picker" *ngIf="!data?.soloLectura">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="filtroDocs" placeholder="Filtrar CITE o asunto...">
            </mat-form-field>

            <div class="docs-scroll-list">
              <div 
                *ngFor="let doc of docsDisponiblesFiltrados()" 
                class="doc-item-row"
                (click)="toggleDoc(doc)"
              >
                <mat-checkbox [checked]="isDocSelected(doc)" color="primary" (click)="$event.stopPropagation()" (change)="toggleDoc(doc)"></mat-checkbox>
                <div class="doc-item-meta">
                  <strong class="cite-text">{{ doc.nombre }}</strong>
                  <span class="ref-text">{{ doc.ref || 'Sin referencia' }} &bull; <small>{{ doc.estado }}</small></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lista de CITEs en solo lectura o resumen -->
          <div class="cites-chips-list" *ngIf="data?.soloLectura">
            <span *ngFor="let d of docsSeleccionados()" class="cite-chip">
              <mat-icon>article</mat-icon>
              <strong>{{ d.nombre || d.cite }}</strong>
            </span>
            <p *ngIf="docsSeleccionados().length === 0" class="empty-hint">Este catálogo no tiene documentos referenciados.</p>
          </div>
        </div>

        <!-- Sección de Compartición con Compañero o Superior -->
        <div class="section-box">
          <div class="section-title">
            <mat-icon>share</mat-icon>
            <strong>Compartir Catálogo con Compañeros / Jefatura ({{ usuariosSeleccionados().length }})</strong>
          </div>
          <p class="section-hint">Seleccione los funcionarios que tendrán acceso a este catálogo institucional:</p>

          <div class="users-picker" *ngIf="!data?.soloLectura">
            <div class="users-scroll-list">
              <div 
                *ngFor="let u of usuariosDisponibles()" 
                class="user-item-row"
                (click)="toggleUsuario(u)"
              >
                <mat-checkbox [checked]="isUsuarioSelected(u)" color="primary" (click)="$event.stopPropagation()" (change)="toggleUsuario(u)"></mat-checkbox>
                <div class="user-item-meta">
                  <strong>{{ u.nombres }} {{ u.apellidos }}</strong>
                  <span>{{ u.cargo || 'Funcionario' }} &bull; {{ u.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lista de usuarios en solo lectura -->
          <div class="users-chips-list" *ngIf="data?.soloLectura">
            <span *ngFor="let u of usuariosSeleccionados()" class="user-chip">
              <mat-icon>person</mat-icon>
              <strong>{{ u.nombres }} {{ u.apellidos }} ({{ u.cargo || 'Funcionario' }})</strong>
            </span>
            <p *ngIf="usuariosSeleccionados().length === 0" class="empty-hint">Catálogo de uso estrictamente personal (no compartido).</p>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button mat-dialog-close>Cerrar</button>
        <button 
          *ngIf="!data?.soloLectura" 
          mat-raised-button 
          color="primary" 
          [disabled]="guardando() || !nombre.trim()"
          (click)="guardarCatalogo()"
        >
          <mat-icon>save</mat-icon>
          <span>{{ guardando() ? 'Guardando...' : 'Crear Catálogo' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-shell {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }

    .dialog-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f2027;
      color: #ffffff;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    .dialog-title-row {
      display: flex;
      align-items: center;
      gap: 12px;

      h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
      }
    }

    .header-icon {
      color: #2dd4bf;
    }

    .close-btn {
      color: #94a3b8 !important;
    }

    .dialog-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .w-full {
      width: 100%;
    }

    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #f8fafc;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0f172a;
      font-size: 0.92rem;
      margin-bottom: 4px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #0284c7;
      }
    }

    .section-hint {
      margin: 0 0 12px 0;
      font-size: 0.78rem;
      color: #64748b;
    }

    .docs-scroll-list, .users-scroll-list {
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      margin-top: 8px;
    }

    .doc-item-row, .user-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: #f8fafc;
      }
    }

    .doc-item-meta, .user-item-meta {
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;

      .cite-text {
        color: #0f172a;
      }

      .ref-text {
        color: #64748b;
      }
    }

    .cites-chips-list, .users-chips-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .cite-chip, .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.8rem;
      color: #1e293b;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #0284c7;
      }
    }

    .empty-hint {
      margin: 0;
      font-size: 0.82rem;
      color: #94a3b8;
      font-style: italic;
    }

    .dialog-actions {
      padding: 14px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
    }
  `]
})
export class CatalogoDialogComponent implements OnInit {
  private readonly catalogosService = inject(CatalogosService);
  private readonly documentosService = inject(DocumentosService);
  private readonly seguridadService = inject(SeguridadService);
  private readonly dialogRef = inject(MatDialogRef<CatalogoDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<{ id_catalogo?: number; soloLectura?: boolean }>(MAT_DIALOG_DATA, { optional: true });

  nombre = '';
  descripcion = '';
  filtroDocs = '';
  cargando = signal(false);
  guardando = signal(false);

  todosLosDocs = signal<Documento[]>([]);
  todosLosUsuarios = signal<UsuarioAdmin[]>([]);

  docsSeleccionados = signal<any[]>([]);
  usuariosSeleccionados = signal<any[]>([]);

  ngOnInit(): void {
    if (this.data?.id_catalogo) {
      this.cargarDetalleCatalogo(this.data.id_catalogo);
    } else {
      this.cargarDatosParaSeleccion();
    }
  }

  cargarDetalleCatalogo(id: number): void {
    this.cargando.set(true);
    this.catalogosService.getCatalogoDetalle(id).subscribe({
      next: (res) => {
        this.cargando.set(false);
        const cat = res.datos;
        this.nombre = cat.nombre;
        this.descripcion = cat.descripcion || '';
        this.docsSeleccionados.set(cat.documentos || []);
        this.usuariosSeleccionados.set(cat.usuarios || []);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  cargarDatosParaSeleccion(): void {
    this.cargando.set(true);

    // 1. Cargar documentos elegibles para referenciar
    this.documentosService.getDocumentos(50, 1).subscribe({
      next: (res) => {
        const list = res.datos.resultado || [];
        // Filtrar documentos que tengan CITE oficial o estén en curso
        this.todosLosDocs.set(list.filter((d) => d.nombre && d.nombre.includes('/')));
      }
    });

    // 2. Cargar compañeros institucionales para compartir
    this.seguridadService.getUsuarios().subscribe({
      next: (res) => {
        this.cargando.set(false);
        const users: any[] = Array.isArray(res.datos) ? res.datos : [];
        this.todosLosUsuarios.set(users.filter((u: any) => u.estado === 'ACTIVO'));
      },
      error: () => this.cargando.set(false)
    });
  }

  docsDisponiblesFiltrados(): Documento[] {
    const f = this.filtroDocs.toLowerCase().trim();
    if (!f) return this.todosLosDocs();
    return this.todosLosDocs().filter((d) => {
      const cite = (d.nombre || '').toLowerCase();
      const ref = (d.ref || '').toLowerCase();
      return cite.includes(f) || ref.includes(f);
    });
  }

  usuariosDisponibles(): UsuarioAdmin[] {
    return this.todosLosUsuarios();
  }

  isDocSelected(doc: Documento): boolean {
    return this.docsSeleccionados().some((d) => d.id_documento === doc.id_documento);
  }

  toggleDoc(doc: Documento): boolean {
    const current = [...this.docsSeleccionados()];
    const index = current.findIndex((d) => d.id_documento === doc.id_documento);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(doc);
    }
    this.docsSeleccionados.set(current);
    return false;
  }

  isUsuarioSelected(u: UsuarioAdmin): boolean {
    return this.usuariosSeleccionados().some((sel) => sel.id_usuario === u.id_usuario);
  }

  toggleUsuario(u: UsuarioAdmin): boolean {
    const current = [...this.usuariosSeleccionados()];
    const index = current.findIndex((sel) => sel.id_usuario === u.id_usuario);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(u);
    }
    this.usuariosSeleccionados.set(current);
    return false;
  }

  guardarCatalogo(): void {
    if (!this.nombre.trim()) return;
    this.guardando.set(true);

    const payload = {
      nombre: this.nombre.trim(),
      descripcion: this.descripcion.trim(),
      documentos: this.docsSeleccionados().map((d) => ({ id_documento: d.id_documento })),
      usuarios: this.usuariosSeleccionados().map((u) => ({ id_usuario: u.id_usuario }))
    };

    this.catalogosService.crearCatalogo(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Catálogo institucional armado exitosamente', 'Cerrar', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open('Error al crear catálogo: ' + (err?.error?.mensaje || 'Error interno'), 'Cerrar', { duration: 4000 });
      }
    });
  }
}
