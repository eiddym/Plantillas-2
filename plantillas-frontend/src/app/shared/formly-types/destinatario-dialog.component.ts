import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';

export interface DestinatarioDialogData {
  mode: 'PARA' | 'CO_REMITENTE' | 'COPIA_UNIDAD';
  currentUser: any;
  usuarios: any[];
  unidades: any[];
}

@Component({
  selector: 'app-destinatario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule
  ],
  template: `
    <div class="destinatario-dialog">
      <div class="dialog-header">
        <div class="header-icon" [class.icon-co]="data.mode === 'CO_REMITENTE'" [class.icon-cc]="data.mode === 'COPIA_UNIDAD'">
          <mat-icon>{{ data.mode === 'PARA' ? 'person_search' : (data.mode === 'COPIA_UNIDAD' ? 'domain' : 'group_add') }}</mat-icon>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title>
            {{ data.mode === 'PARA' ? 'Seleccionar Destinatario (PARA)' : (data.mode === 'COPIA_UNIDAD' ? 'Designar Unidad Con Copia a (CC)' : 'Agregar Co-Participante (DE)') }}
          </h2>
          <p class="header-subtitle">
            <span *ngIf="data.mode === 'PARA' && isCurrentUserJefeOrMae()">
              <strong>Regla Jerárquica:</strong> Listando exclusivamente autoridades pares (Jefes/MAE) y jefes de unidades dependientes.
            </span>
            <span *ngIf="data.mode === 'PARA' && !isCurrentUserJefeOrMae()">
              <strong>Conducto Regular:</strong> Seleccione la autoridad de destino. El sistema asignará el VÍA institucional de forma automática.
            </span>
            <span *ngIf="data.mode === 'CO_REMITENTE'">
              <strong>Firma Conjunta:</strong> Listando compañeros de su misma unidad ({{ getUnidadNombre(data.currentUser?.fid_unidad) }}) y de igual rango.
            </span>
            <span *ngIf="data.mode === 'COPIA_UNIDAD'">
              <strong>Copia Informativa Oficial (CC):</strong> La unidad designada recibirá una copia oficial directa del documento final cuando genere su CITE.
            </span>
          </p>
        </div>
      </div>

      <div class="search-bar-row">
        <mat-form-field appearance="outline" class="w-full">
          <mat-icon matPrefix>search</mat-icon>
          <input 
            matInput 
            [(ngModel)]="busqueda" 
            [placeholder]="data.mode === 'COPIA_UNIDAD' ? 'Buscar por nombre o sigla de la unidad...' : 'Buscar por nombre, cargo o unidad...'"
            autocomplete="off"
          >
          <button *ngIf="busqueda" mat-icon-button matSuffix (click)="busqueda = ''">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <div class="user-list-container">
        @if (data.mode === 'COPIA_UNIDAD') {
          @if (unidadesFiltradas().length === 0) {
            <div class="empty-state">
              <mat-icon>domain_disabled</mat-icon>
              <p>No se encontraron unidades disponibles con ese criterio de búsqueda.</p>
            </div>
          } @else {
            <div class="user-card-list">
              @for (un of unidadesFiltradas(); track un.id_unidad) {
                <div class="user-card card-unidad-cc" (click)="seleccionarUnidad(un)">
                  <div class="avatar-circle avatar-unidad-cc">
                    {{ un.abreviacion || un.nombre?.substring(0, 2)?.toUpperCase() || 'UN' }}
                  </div>
                  <div class="user-info">
                    <div class="user-name">
                      {{ un.nombre }}
                    </div>
                    <div class="user-cargo">
                      {{ un.descripcion || 'Unidad Organizacional' }}
                    </div>
                    <div class="user-tags">
                      <span class="tag-unit">
                        <mat-icon>business</mat-icon>
                        Sigla: {{ un.abreviacion || 'S/S' }}
                      </span>
                      <span class="tag-role tag-cc-badge">
                        UNIDAD INSTITUCIONAL
                      </span>
                    </div>
                  </div>
                  <button mat-flat-button class="btn-select btn-cc-select">
                    Designar CC
                  </button>
                </div>
              }
            </div>
          }
        } @else {
          @if (usuariosFiltrados().length === 0) {
            <div class="empty-state">
              <mat-icon>person_off</mat-icon>
              <p>No se encontraron usuarios disponibles que cumplan el criterio jerárquico.</p>
            </div>
          } @else {
            <div class="user-card-list">
              @if (data.mode === 'PARA') {
                <div class="user-card card-broadcast" (click)="seleccionarTodos()">
                  <div class="avatar-circle avatar-broadcast">
                    <mat-icon>campaign</mat-icon>
                  </div>
                  <div class="user-info">
                    <div class="user-name text-broadcast">
                      A TODO EL PERSONAL / TODAS LAS UNIDADES
                    </div>
                    <div class="user-cargo">
                      Circular Institucional / Difusión General a Todos los Usuarios
                    </div>
                    <div class="user-tags">
                      <span class="tag-unit tag-broadcast">
                        <mat-icon>groups</mat-icon>
                        Envío masivo a todos los usuarios activos
                      </span>
                    </div>
                  </div>
                  <button mat-flat-button class="btn-select btn-broadcast">
                    Seleccionar
                  </button>
                </div>
              }
              @for (u of usuariosFiltrados(); track u.id_usuario) {
                <div class="user-card" (click)="seleccionar(u)">
                  <div class="avatar-circle">
                    {{ getInitials(u.nombres, u.apellidos) }}
                  </div>
                  <div class="user-info">
                    <div class="user-name">
                      {{ u.nombres }} {{ u.apellidos }}
                    </div>
                    <div class="user-cargo">
                      {{ u.cargo }}
                    </div>
                    <div class="user-tags">
                      <span class="tag-unit">
                        <mat-icon>business</mat-icon>
                        {{ getUnidadSigla(u.fid_unidad) }} - {{ getUnidadNombre(u.fid_unidad) }}
                      </span>
                      <span class="tag-role" [class.tag-jefe]="esJefe(u)" [class.tag-mae]="esMae(u)">
                        {{ getRolPrincipal(u) }}
                      </span>
                    </div>
                  </div>
                  <button mat-flat-button class="btn-select">
                    Seleccionar
                  </button>
                </div>
              }
            </div>
          }
        }
      </div>

      <div mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="cancelar()">Cancelar</button>
      </div>
    </div>
  `,
  styles: [`
    .destinatario-dialog {
      min-width: 520px;
      max-width: 680px;
      font-family: 'Plus Jakarta Sans', 'Poppins', sans-serif;
    }
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 18px 20px 10px 20px;
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
      }
      .header-subtitle {
        margin: 4px 0 0 0;
        font-size: 0.82rem;
        color: #475569;
        line-height: 1.4;
      }
    }
    .header-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eff6ff;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      &.icon-co {
        background: #f0fdf4;
        color: #16a34a;
      }
      &.icon-cc {
        background: #fdf4ff;
        color: #9333ea;
      }
    }
    .search-bar-row {
      padding: 8px 20px 0 20px;
      .w-full {
        width: 100%;
      }
    }
    .user-list-container {
      max-height: 380px;
      overflow-y: auto;
      padding: 0 20px;
      margin-bottom: 12px;
    }
    .user-card-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .user-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: #f8fafc;
        border-color: #3b82f6;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      }
    }
    .avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0f2027;
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.88rem;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1;
      min-width: 0;
    }
    .user-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.92rem;
    }
    .user-cargo {
      font-size: 0.82rem;
      color: #475569;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag-unit {
      font-size: 0.72rem;
      background: #f1f5f9;
      color: #334155;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
      }
    }
    .tag-role {
      font-size: 0.7rem;
      font-weight: 700;
      background: #e2e8f0;
      color: #475569;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      &.tag-jefe {
        background: #dbeafe;
        color: #1e40af;
      }
      &.tag-mae {
        background: #fef3c7;
        color: #92400e;
      }
    }
    .btn-select {
      background: #0f2027 !important;
      color: #ffffff !important;
      font-size: 0.78rem !important;
      padding: 0 14px !important;
      height: 32px !important;
      border-radius: 16px !important;
    }
    .card-broadcast {
      border: 2px dashed #0284c7 !important;
      background: #f0f9ff !important;
      &:hover {
        background: #e0f2fe !important;
        border-color: #0369a1 !important;
      }
    }
    .avatar-broadcast {
      background: #0284c7 !important;
      color: #ffffff !important;
      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }
    .text-broadcast {
      color: #0369a1 !important;
      font-weight: 800 !important;
    }
    .tag-broadcast {
      background: #bae6fd !important;
      color: #0369a1 !important;
      font-weight: 600;
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }
    .btn-broadcast {
      background: #0284c7 !important;
      color: #ffffff !important;
    }
    .card-unidad-cc {
      border-left: 4px solid #9333ea !important;
      &:hover {
        border-color: #9333ea !important;
        background: #faf5ff !important;
      }
    }
    .avatar-unidad-cc {
      background: #581c87 !important;
      color: #f3e8ff !important;
      font-size: 0.8rem !important;
    }
    .tag-cc-badge {
      background: #f3e8ff !important;
      color: #7e22ce !important;
      font-weight: 700;
    }
    .btn-cc-select {
      background: #7e22ce !important;
      color: #ffffff !important;
      &:hover {
        background: #6b21a8 !important;
      }
    }
    .empty-state {
      text-align: center;
      padding: 30px;
      color: #64748b;
      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #94a3b8;
      }
      p {
        margin: 8px 0 0 0;
        font-size: 0.88rem;
      }
    }
    .dialog-actions {
      padding: 10px 20px 16px 20px;
    }
  `]
})
export class DestinatarioDialogComponent implements OnInit {
  busqueda = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DestinatarioDialogData,
    private dialogRef: MatDialogRef<DestinatarioDialogComponent>
  ) {}

  ngOnInit(): void {}

  isCurrentUserJefeOrMae(): boolean {
    const u = this.data.currentUser;
    if (!u) return false;
    if (u.es_mae) return true;
    const roles: any[] = u.roles || [];
    return roles.some((r: any) => {
      const nom = (r.rol?.nombre || r.nombre || '').toUpperCase();
      return nom === 'JEFE' || nom === 'MAE' || nom === 'ADMIN';
    });
  }

  esJefe(u: any): boolean {
    const roles = u.usuario_rol || [];
    return roles.some((r: any) => (r.rol?.nombre || '').toUpperCase() === 'JEFE');
  }

  esMae(u: any): boolean {
    return (u.cargo || '').toUpperCase().includes('MAE') || (u.cargo || '').toUpperCase().includes('DIRECTORA GENERAL');
  }

  getRolPrincipal(u: any): string {
    if (this.esMae(u)) return 'MAE';
    if (this.esJefe(u)) return 'JEFE';
    const roles = u.usuario_rol || [];
    if (roles.length > 0) return roles[0].rol?.nombre || 'OPERADOR';
    return 'USUARIO';
  }

  getUnidadNombre(fid_unidad?: number): string {
    if (!fid_unidad) return '';
    const un = (this.data.unidades || []).find((x) => x.id_unidad === fid_unidad);
    return un ? un.nombre : `Unidad ${fid_unidad}`;
  }

  getUnidadSigla(fid_unidad?: number): string {
    if (!fid_unidad) return '';
    const un = (this.data.unidades || []).find((x) => x.id_unidad === fid_unidad);
    return un ? (un.abreviacion || un.nombre) : '';
  }

  getInitials(nombres: string, apellidos: string): string {
    const n = (nombres || '').trim().charAt(0);
    const a = (apellidos || '').trim().charAt(0);
    return (n + a).toUpperCase() || 'U';
  }

  usuariosFiltrados(): any[] {
    const curr = this.data.currentUser || {};
    const currId = curr.id || curr.id_usuario;
    const currUnidad = curr.fid_unidad || curr.id_unidad;
    const isJefe = this.isCurrentUserJefeOrMae();

    // Identificar si la unidad del usuario actual es colectiva
    const currUnidadObj = (this.data.unidades || []).find((un: any) => un.id_unidad === currUnidad);
    const esUnidadColectiva = currUnidadObj?.es_colectiva === true;

    let list = (this.data.usuarios || []).filter((u) => u.id_usuario !== currId);

    if (this.data.mode === 'PARA') {
      if (esUnidadColectiva) {
        // REGLA UNIDAD COLECTIVA:
        // Los miembros (socios) pueden despachar directamente a cualquier Jefatura de Destino
        // (Consejo de Administración, Tribunal de Honor, MAE, etc.)
        list = list.filter((u) => {
          return this.esJefe(u) || this.esMae(u);
        });
      } else if (isJefe) {
        // REGLA PARA ROL JEFE / MAE:
        // Puede elegir a otros Jefes/MAE, a dependientes de su propia unidad,
        // Y TAMBIÉN a miembros pertenecientes a unidades colectivas (Socios / Asociados)
        list = list.filter((u) => {
          const uEsJefeOMae = this.esJefe(u) || this.esMae(u);
          if (uEsJefeOMae) return true;

          // Dependiente de su misma unidad
          if (u.fid_unidad === currUnidad) return true;

          // Pertenece a una unidad colectiva
          const uUnidad = (this.data.unidades || []).find((un: any) => un.id_unidad === u.fid_unidad);
          if (uUnidad?.es_colectiva === true) return true;

          return false;
        });
      } else {
        // REGLA PARA OPERADOR O SUBORDINADO DE UNIDAD ESTÁNDAR:
        // Puede elegir a su Jefe Inmediato o a otros Jefes / MAE (con VÍA obligatorio hacia arriba)
        list = list.filter((u) => {
          const uEsJefeOMae = this.esJefe(u) || this.esMae(u);
          return uEsJefeOMae;
        });
      }
    } else if (this.data.mode === 'CO_REMITENTE') {
      // Regla para DE (Trámites Conjuntos):
      // Restringido estrictamente a usuarios de su misma unidad
      list = list.filter((u) => {
        const mismaUnidad = u.fid_unidad === currUnidad;
        if (!mismaUnidad) return false;

        if (esUnidadColectiva) return true;

        // Mismo rango (si curr es operador, u debe ser operador; si curr es jefe, u jefe)
        const uEsJefe = this.esJefe(u);
        return isJefe ? uEsJefe : !uEsJefe;
      });
    }

    // Filtro por texto de búsqueda
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      list = list.filter((u) => {
        const full = `${u.nombres || ''} ${u.apellidos || ''} ${u.cargo || ''} ${this.getUnidadNombre(u.fid_unidad)}`.toLowerCase();
        return full.includes(q);
      });
    }

    return list;
  }

  seleccionar(u: any): void {
    this.dialogRef.close(u);
  }

  seleccionarUnidad(un: any): void {
    this.dialogRef.close({
      id_unidad: un.id_unidad,
      nombre: un.nombre,
      abreviacion: un.abreviacion
    });
  }

  unidadesFiltradas(): any[] {
    let list = (this.data.unidades || []).filter((u) => u.estado === 'ACTIVO' || !u.estado || u.estado !== 'INACTIVO');
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      list = list.filter((u) => {
        const full = `${u.nombre || ''} ${u.abreviacion || ''} ${u.descripcion || ''}`.toLowerCase();
        return full.includes(q);
      });
    }
    return list;
  }

  seleccionarTodos(): void {
    const usuariosActivos = (this.data.usuarios || []).filter(u => u.estado === 'ACTIVO' || u.estado !== 'INACTIVO');
    const ids = usuariosActivos.map(u => Number(u.id_usuario)).filter(id => id > 0);
    this.dialogRef.close({
      id_usuario: 'TODOS',
      todos: true,
      todos_ids: ids,
      nombres: 'A TODO EL PERSONAL',
      apellidos: '',
      cargo: 'Todas las Unidades y Usuarios'
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
