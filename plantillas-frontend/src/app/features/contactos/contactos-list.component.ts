import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface Contacto {
  id_contacto?: number;
  nombres: string;
  apellidos: string;
  cargo?: string;
  institucion?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
}

@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Directorio y Contactos Institucionales</h1>
          <p class="subtitle">Directorio de enlaces, proveedores, cooperativas fraternas e instituciones oficiales</p>
        </div>

        <button mat-raised-button class="btn-nuevo" (click)="abrirModalNuevo()">
          <mat-icon>person_add</mat-icon>
          <span>Nuevo Contacto</span>
        </button>
      </div>

      <mat-card class="table-card">
        <div class="toolbar-filter">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <input 
              matInput 
              placeholder="Buscar por nombre, cargo, institución o correo..." 
              (input)="onSearch($event)"
            >
          </mat-form-field>
          <span class="spacer"></span>
          <span class="count-badge">Total: {{ totalContactos() }}</span>
        </div>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <div class="table-responsive">
          <table mat-table [dataSource]="contactosFiltrados()" class="w-full">
            <!-- Nombre -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>NOMBRE COMPLETO</th>
              <td mat-cell *matCellDef="let c">
                <div class="user-info">
                  <div class="avatar">{{ c.nombres ? c.nombres[0] : 'C' }}</div>
                  <div>
                    <span class="user-name">{{ c.nombres }} {{ c.apellidos }}</span>
                    <span class="user-sub">{{ c.cargo || 'Sin cargo especificado' }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Institución -->
            <ng-container matColumnDef="institucion">
              <th mat-header-cell *matHeaderCellDef>INSTITUCIÓN / ENTIDAD</th>
              <td mat-cell *matCellDef="let c">
                <span class="institution-badge">{{ c.institucion || 'Particular / Externa' }}</span>
              </td>
            </ng-container>

            <!-- Teléfono -->
            <ng-container matColumnDef="telefono">
              <th mat-header-cell *matHeaderCellDef>TELÉFONO / CELULAR</th>
              <td mat-cell *matCellDef="let c">
                <span *ngIf="c.telefono" class="contact-data">
                  <mat-icon class="inline-icon">call</mat-icon> {{ c.telefono }}
                </span>
                <span *ngIf="!c.telefono" class="text-muted">-</span>
              </td>
            </ng-container>

            <!-- Correo -->
            <ng-container matColumnDef="correo">
              <th mat-header-cell *matHeaderCellDef>CORREO ELECTRÓNICO</th>
              <td mat-cell *matCellDef="let c">
                <span *ngIf="c.correo" class="contact-data">
                  <mat-icon class="inline-icon">mail</mat-icon> {{ c.correo }}
                </span>
                <span *ngIf="!c.correo" class="text-muted">-</span>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">ACCIONES</th>
              <td mat-cell *matCellDef="let c" class="text-right">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="editarContacto(c)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarContacto(c)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-cell" [attr.colspan]="displayedColumns.length">
                <mat-icon class="empty-icon">contacts</mat-icon>
                <p>No se encontraron contactos registrados o coincidentes con la búsqueda.</p>
                <button mat-stroked-button color="primary" (click)="abrirModalNuevo()">
                  <mat-icon>add</mat-icon> Registrar Primer Contacto
                </button>
              </td>
            </tr>
          </table>
        </div>
      </mat-card>

      <!-- Modal de Creación / Edición -->
      <div class="modal-backdrop" *ngIf="mostrarModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ editandoId ? 'Editar Contacto' : 'Registrar Nuevo Contacto' }}</h3>
            <button mat-icon-button (click)="cerrarModal()"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="contactoForm" (ngSubmit)="guardarContacto()">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Nombres *</label>
                  <input type="text" formControlName="nombres" class="custom-input" placeholder="Ej: Juan">
                </div>
                <div class="form-group">
                  <label>Apellidos *</label>
                  <input type="text" formControlName="apellidos" class="custom-input" placeholder="Ej: Pérez">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Institución / Entidad</label>
                  <input type="text" formControlName="institucion" class="custom-input" placeholder="Ej: SERGEOMIN / FERECOMIN">
                </div>
                <div class="form-group">
                  <label>Cargo</label>
                  <input type="text" formControlName="cargo" class="custom-input" placeholder="Ej: Director Regional">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" formControlName="correo" class="custom-input" placeholder="contacto@entidad.gob.bo">
                </div>
                <div class="form-group">
                  <label>Teléfono / Celular</label>
                  <input type="text" formControlName="telefono" class="custom-input" placeholder="Ej: 71234567">
                </div>
              </div>

              <div class="form-group">
                <label>Dirección / Ubicación</label>
                <input type="text" formControlName="direccion" class="custom-input" placeholder="Ciudad, calle, número...">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" mat-button (click)="cerrarModal()">Cancelar</button>
              <button type="submit" mat-raised-button color="primary" [disabled]="contactoForm.invalid || guardando()">
                {{ guardando() ? 'Guardando...' : 'Guardar Contacto' }}
              </button>
            </div>
          </form>
        </div>
      </div>
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
      flex-wrap: wrap;
      gap: 16px;
      h1 {
        margin: 0;
        color: #0f172a;
        font-size: 1.65rem;
        font-weight: 800;
      }
      .subtitle {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 0.88rem;
      }
    }
    .btn-nuevo {
      background: #0f2027 !important;
      color: #fff !important;
      border-radius: 20px !important;
      font-weight: 700 !important;
      padding: 0 20px !important;
      height: 42px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .table-card {
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }
    .toolbar-filter {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .search-field {
      width: 360px;
    }
    .spacer { flex: 1; }
    .count-badge {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 0.82rem;
      padding: 6px 12px;
      border-radius: 12px;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #0f2027;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .user-name {
      display: block;
      font-weight: 700;
      color: #1e293b;
      font-size: 0.92rem;
    }
    .user-sub {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
    }
    .institution-badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.8rem;
    }
    .contact-data {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #334155;
      font-size: 0.85rem;
    }
    .inline-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #94a3b8;
    }
    .text-muted { color: #94a3b8; }
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
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    }
    .modal-body {
      padding: 20px 24px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 14px;
    }
    .form-group {
      margin-bottom: 14px;
      label {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        color: #334155;
        margin-bottom: 6px;
      }
    }
    .custom-input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
      &:focus { border-color: #0f2027; }
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
  `]
})
export class ContactosListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['nombre', 'institucion', 'telefono', 'correo', 'acciones'];
  readonly contactos = signal<Contacto[]>([]);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly mostrarModal = signal(false);
  readonly filtroTexto = signal('');

  editandoId: number | null = null;
  contactoForm: FormGroup;

  constructor() {
    this.contactoForm = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      institucion: [''],
      cargo: [''],
      correo: ['', [Validators.email]],
      telefono: [''],
      direccion: ['']
    });
  }

  ngOnInit(): void {
    this.cargarContactos();
  }

  cargarContactos(): void {
    this.loading.set(true);
    this.http.get<any>('/api/v1/plantillasFormly/contacto').subscribe({
      next: (res) => {
        const datos = res?.datos?.resultado || res?.datos || [];
        this.contactos.set(Array.isArray(datos) ? datos : []);
        this.loading.set(false);
      },
      error: () => {
        this.contactos.set([]);
        this.loading.set(false);
      }
    });
  }

  contactosFiltrados(): Contacto[] {
    const txt = this.filtroTexto().toLowerCase().trim();
    if (!txt) return this.contactos();
    return this.contactos().filter(c => 
      (c.nombres || '').toLowerCase().includes(txt) ||
      (c.apellidos || '').toLowerCase().includes(txt) ||
      (c.institucion || '').toLowerCase().includes(txt) ||
      (c.cargo || '').toLowerCase().includes(txt) ||
      (c.correo || '').toLowerCase().includes(txt) ||
      (c.telefono || '').toLowerCase().includes(txt)
    );
  }

  totalContactos(): number {
    return this.contactos().length;
  }

  onSearch(event: any): void {
    this.filtroTexto.set(event.target.value || '');
  }

  abrirModalNuevo(): void {
    this.editandoId = null;
    this.contactoForm.reset();
    this.mostrarModal.set(true);
  }

  editarContacto(c: Contacto): void {
    this.editandoId = c.id_contacto || null;
    this.contactoForm.patchValue({
      nombres: c.nombres,
      apellidos: c.apellidos,
      institucion: c.institucion || '',
      cargo: c.cargo || '',
      correo: c.correo || '',
      telefono: c.telefono || '',
      direccion: c.direccion || ''
    });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardarContacto(): void {
    if (this.contactoForm.invalid) return;
    this.guardando.set(true);
    const data = this.contactoForm.value;

    if (this.editandoId) {
      this.http.put<any>(`/api/v1/plantillasFormly/contacto/${this.editandoId}`, data).subscribe({
        next: () => {
          this.snackBar.open('Contacto actualizado con éxito', 'OK', { duration: 3000 });
          this.guardando.set(false);
          this.cerrarModal();
          this.cargarContactos();
        },
        error: (err) => {
          this.snackBar.open(err.error?.mensaje || 'Error al actualizar', 'Cerrar', { duration: 3000 });
          this.guardando.set(false);
        }
      });
    } else {
      this.http.post<any>('/api/v1/plantillasFormly/contacto', data).subscribe({
        next: () => {
          this.snackBar.open('Contacto registrado con éxito', 'OK', { duration: 3000 });
          this.guardando.set(false);
          this.cerrarModal();
          this.cargarContactos();
        },
        error: (err) => {
          this.snackBar.open(err.error?.mensaje || 'Error al registrar', 'Cerrar', { duration: 3000 });
          this.guardando.set(false);
        }
      });
    }
  }

  eliminarContacto(c: Contacto): void {
    if (!c.id_contacto) return;
    if (!confirm(`¿Está seguro de eliminar el contacto "${c.nombres} ${c.apellidos}"?`)) return;

    this.http.delete<any>(`/api/v1/plantillasFormly/contacto/${c.id_contacto}`).subscribe({
      next: () => {
        this.snackBar.open('Contacto eliminado', 'OK', { duration: 3000 });
        this.cargarContactos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.mensaje || 'Error al eliminar', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
