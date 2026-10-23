import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SeguridadService, UsuarioAdmin, Unidad, Rol } from '../../core/services/seguridad.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <div class="user-admin-page">
      <!-- Breadcrumb Bar -->
      <div class="top-breadcrumb">
        <mat-icon class="bc-home">home</mat-icon>
        <span class="bc-sep">/</span>
        <span class="bc-current">Gestión de Usuarios</span>
      </div>

      <!-- Main Container Card -->
      <div class="admin-table-container">
        <!-- Table Top Header -->
        <div class="table-top-bar">
          <div class="left-box">
            <mat-icon class="grid-icon">grid_view</mat-icon>
            <h2>Usuarios</h2>
          </div>
          <div class="right-actions">
            <button mat-icon-button (click)="toggleFiltro()" matTooltip="Filtrar">
              <mat-icon>filter_list</mat-icon>
            </button>
            <button mat-icon-button (click)="cargarUsuarios()" matTooltip="Refrescar">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Colapsar panel">
              <mat-icon>keyboard_arrow_up</mat-icon>
            </button>
          </div>
        </div>

        <!-- Add Button Action Bar -->
        <div class="action-btn-bar">
          <button mat-fab color="primary" class="btn-add-user" (click)="abrirModalNuevo()" matTooltip="Crear Nuevo Usuario">
            <mat-icon>add</mat-icon>
          </button>
          @if (mostrarFiltro()) {
            <div class="filter-input-wrap fade-in">
              <mat-form-field appearance="outline" class="density-compact">
                <mat-label>Buscar por usuario, nombre, CI o correo...</mat-label>
                <input matInput [formControl]="filtroCtrl" placeholder="Escriba para filtrar">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
            </div>
          }
        </div>

        <!-- Progress Bar -->
        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        <!-- Table -->
        <div class="table-responsive">
          <table mat-table [dataSource]="usuariosFiltrados()" class="users-table">
            
            <!-- Acciones Column -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="th-acciones">Acciones</th>
              <td mat-cell *matCellDef="let u" class="td-acciones">
                <button mat-icon-button class="btn-action-edit" (click)="abrirModalEditar(u)" matTooltip="Editar usuario">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button class="btn-action-delete" (click)="confirmarEliminarUsuario(u)" matTooltip="Eliminar usuario">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <!-- Nombre de usuario Column -->
            <ng-container matColumnDef="usuario">
              <th mat-header-cell *matHeaderCellDef>Nombre de usuario</th>
              <td mat-cell *matCellDef="let u" class="fw-600 font-mono">{{ u.usuario }}</td>
            </ng-container>

            <!-- Nro documento de identidad Column -->
            <ng-container matColumnDef="numero_documento">
              <th mat-header-cell *matHeaderCellDef>Nro documento de identidad</th>
              <td mat-cell *matCellDef="let u">{{ u.numero_documento }}</td>
            </ng-container>

            <!-- Nombre(s) Column -->
            <ng-container matColumnDef="nombres">
              <th mat-header-cell *matHeaderCellDef>Nombre(s)</th>
              <td mat-cell *matCellDef="let u">{{ u.nombres }}</td>
            </ng-container>

            <!-- Apellidos Column -->
            <ng-container matColumnDef="apellidos">
              <th mat-header-cell *matHeaderCellDef>Apellidos</th>
              <td mat-cell *matCellDef="let u">{{ u.apellidos }}</td>
            </ng-container>

            <!-- Cargo Column -->
            <ng-container matColumnDef="cargo">
              <th mat-header-cell *matHeaderCellDef>Cargo</th>
              <td mat-cell *matCellDef="let u">{{ u.cargo || 'Sin cargo' }}</td>
            </ng-container>

            <!-- Correo electrónico Column -->
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Correo electrónico</th>
              <td mat-cell *matCellDef="let u">{{ u.email }}</td>
            </ng-container>

            <!-- Tipo de autenticación Column -->
            <ng-container matColumnDef="tipo_autenticacion">
              <th mat-header-cell *matHeaderCellDef>Tipo de autenticación</th>
              <td mat-cell *matCellDef="let u">
                <span class="auth-pill" [ngClass]="getAuthPillClass(u.tipo_autenticacion)">
                  {{ formatTipoAutenticacion(u.tipo_autenticacion) }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-table-cell" [attr.colspan]="displayedColumns.length">
                No se encontraron usuarios registrados o coincidentes con el filtro.
              </td>
            </tr>
          </table>
        </div>

        <!-- Pagination & Footer Bar -->
        <div class="table-footer-bar">
          <div class="paginator-controls">
            <span>Filas por página: 10</span>
            <span class="page-numbers">1 - {{ usuariosFiltrados().length }} de {{ usuariosFiltrados().length }}</span>
            <button mat-icon-button disabled><mat-icon>first_page</mat-icon></button>
            <button mat-icon-button disabled><mat-icon>chevron_left</mat-icon></button>
            <button mat-icon-button disabled><mat-icon>chevron_right</mat-icon></button>
            <button mat-icon-button disabled><mat-icon>last_page</mat-icon></button>
          </div>
        </div>
      </div>

      <!-- Footer branding -->
      <div class="copyright-bar">
        Desarrollado por ARMOTECH 2026. armotech.org
      </div>

      <!-- ============================================================== -->
      <!-- MODAL POPUP: EDITAR / NUEVO USUARIO (Idéntico a Captura)        -->
      <!-- ============================================================== -->
      @if (modalUsuarioVisible()) {
        <div class="modal-overlay fade-in">
          <div class="user-modal-card">
            <!-- Modal Header -->
            <div class="modal-header-bar">
              <div class="header-left">
                <mat-icon>table_chart</mat-icon>
                <span>{{ modoEdicion() ? 'Editar usuario' : 'Nuevo usuario' }}</span>
              </div>
              <button mat-icon-button (click)="cerrarModal()" class="btn-close-modal">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Modal Body: 2 Columns Layout -->
            <form [formGroup]="userForm" (ngSubmit)="guardarUsuario()" class="user-modal-form">
              <div class="modal-columns-grid">
                
                <!-- COLUMNA 1: DATOS PERSONALES -->
                <div class="modal-col-card">
                  <h3 class="col-title">Datos personales</h3>

                  <div class="form-field-group">
                    <label class="field-label-custom">Nro documento de identidad *</label>
                    <input type="text" formControlName="numero_documento" class="custom-input" placeholder="Ej: 1111111">
                  </div>

                  <div class="form-field-group">
                    <label class="field-label-custom">Nombre(s) *</label>
                    <input type="text" formControlName="nombres" class="custom-input" placeholder="Ej: system">
                  </div>

                  <div class="form-field-group">
                    <label class="field-label-custom">Apellidos *</label>
                    <input type="text" formControlName="apellidos" class="custom-input" placeholder="Ej: default">
                  </div>

                  <div class="form-field-group">
                    <label class="field-label-custom">Cargo *</label>
                    <input type="text" formControlName="cargo" class="custom-input" placeholder="Ej: Default system user">
                  </div>

                  <div class="form-field-group">
                    <label class="field-label-custom">Correo electrónico *</label>
                    <input type="email" formControlName="email" class="custom-input" placeholder="Ej: docs@marabuntarl.com">
                  </div>

                  <!-- Subtítulo Usuarios Virtuales -->
                  <div class="virtuales-sub-section">
                    <h4 class="virtual-title">Usuarios virtuales</h4>
                    <p class="virtual-hint">Gestione la delegación o vinculación de firma virtual para este usuario.</p>
                  </div>
                </div>

                <!-- COLUMNA 2: DATOS DE USUARIO -->
                <div class="modal-col-card">
                  <h3 class="col-title">Datos de usuario</h3>

                  <div class="form-field-group">
                    <label class="field-label-custom">Nombre de usuario *</label>
                    <input type="text" formControlName="usuario" class="custom-input" placeholder="Ej: j.perez">
                  </div>

                  <!-- Dropdown Tipo de Autenticación con las 3 opciones exactas -->
                  <div class="form-field-group">
                    <label class="field-label-custom">Tipo de Autenticación *</label>
                    <select formControlName="tipo_autenticacion" class="custom-select">
                      <option value="AUTHENTIK">Authentik (LDAP / OIDC)</option>
                      <option value="LOCAL">Local (Base de Datos)</option>
                      <option value="CIUDADANIA_DIGITAL">Ciudadanía Digital</option>
                    </select>
                  </div>

                  <!-- Estado -->
                  <div class="form-field-group">
                    <label class="field-label-custom">Estado *</label>
                    <select formControlName="estado" class="custom-select">
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>

                  <!-- Unidad -->
                  <div class="form-field-group">
                    <label class="field-label-custom">Unidad</label>
                    <select formControlName="fid_unidad" class="custom-select">
                      <option [ngValue]="null">-- Seleccione Unidad --</option>
                      @for (u of unidades(); track u.id_unidad) {
                        <option [value]="u.id_unidad">{{ u.sigla || u.abreviacion || 'UTEST' }} - {{ u.nombre }}</option>
                      }
                    </select>
                  </div>

                  <!-- Roles Checkboxes -->
                  <div class="roles-section-block">
                    <label class="roles-header-label">Roles</label>
                    
                    <div class="roles-checklist">
                      <!-- ADMIN -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(1)" (change)="toggleRol(1, $event.checked)" color="primary">
                          ADMIN
                        </mat-checkbox>
                      </div>

                      <!-- JEFE con ⭐ Es MAE / Director General -->
                      <div class="role-check-row row-with-mae">
                        <mat-checkbox [checked]="tieneRol(2)" (change)="toggleRol(2, $event.checked)" color="primary">
                          JEFE
                        </mat-checkbox>

                        @if (tieneRol(2)) {
                          <div class="mae-addon fade-in">
                            <mat-checkbox formControlName="es_mae" color="primary">
                              <span class="star-icon">⭐</span>
                              <strong class="mae-text">Es MAE / Director General</strong>
                            </mat-checkbox>
                          </div>
                        }
                      </div>

                      <!-- SECRETARIA -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(4)" (change)="toggleRol(4, $event.checked)" color="primary">
                          SECRETARIA
                        </mat-checkbox>
                      </div>

                      <!-- CONFIGURADOR -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(5)" (change)="toggleRol(5, $event.checked)" color="primary">
                          CONFIGURADOR
                        </mat-checkbox>
                      </div>

                      <!-- CORRESPONDENCIA -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(6)" (change)="toggleRol(6, $event.checked)" color="primary">
                          CORRESPONDENCIA
                        </mat-checkbox>
                      </div>

                      <!-- CONTACTOS -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(7)" (change)="toggleRol(7, $event.checked)" color="primary">
                          CONTACTOS
                        </mat-checkbox>
                      </div>

                      <!-- OPERADOR -->
                      <div class="role-check-row">
                        <mat-checkbox [checked]="tieneRol(3)" (change)="toggleRol(3, $event.checked)" color="primary">
                          OPERADOR
                        </mat-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="modal-bottom-actions">
                <button type="submit" mat-flat-button class="btn-modal-guardar" [disabled]="userForm.invalid || guardando()">
                  <mat-icon>check</mat-icon>
                  <span>GUARDAR</span>
                </button>
                <button type="button" mat-stroked-button (click)="cerrarModal()" class="btn-modal-cancelar">
                  <mat-icon>close</mat-icon>
                  <span>CANCELAR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL CONFIRMAR ELIMINACIÓN                                     -->
      <!-- ============================================================== -->
      @if (usuarioAEliminar()) {
        <div class="modal-overlay fade-in">
          <div class="confirm-delete-card">
            <div class="confirm-header">
              <mat-icon class="warn-icon">warning</mat-icon>
              <h3>Confirmar Eliminación de Usuario</h3>
            </div>
            <p class="confirm-msg">
              ¿Está seguro de que desea eliminar definitivamente al usuario 
              <strong>{{ usuarioAEliminar()?.usuario }}</strong> ({{ usuarioAEliminar()?.nombres }} {{ usuarioAEliminar()?.apellidos }})?
            </p>
            <p class="confirm-sub">Esta acción desvinculará sus roles, oficinas y accesos al sistema.</p>
            <div class="confirm-footer">
              <button mat-stroked-button (click)="usuarioAEliminar.set(null)">Cancelar</button>
              <button mat-flat-button color="warn" (click)="ejecutarEliminar()" [disabled]="eliminando()">
                <mat-icon>delete</mat-icon>
                <span>Eliminar Usuario</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .user-admin-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 20px 40px;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .top-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      font-size: 13.5px;
      margin-bottom: 20px;
      .bc-home { font-size: 19px; width: 19px; height: 19px; color: #64748b; }
      .bc-sep { color: #cbd5e1; }
      .bc-current { color: #334155; font-weight: 600; }
    }

    .admin-table-container {
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .table-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .left-box {
        display: flex;
        align-items: center;
        gap: 10px;
        .grid-icon { color: #475569; font-size: 22px; width: 22px; height: 22px; }
        h2 { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
      }

      .right-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        button { color: #64748b; }
      }
    }

    .action-btn-bar {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
    }

    .btn-add-user {
      background: #0284c7 !important;
      color: #ffffff !important;
      width: 44px;
      height: 44px;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);
    }

    .filter-input-wrap {
      flex: 1;
      max-width: 420px;
      mat-form-field { width: 100%; }
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;

      th.mat-header-cell {
        background: #f1f5f9;
        color: #475569;
        font-size: 12.5px;
        font-weight: 700;
        text-transform: none;
        padding: 12px 16px;
        border-bottom: 1px solid #cbd5e1;
        white-space: nowrap;
      }

      td.mat-cell {
        padding: 12px 16px;
        font-size: 13px;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
        white-space: nowrap;
      }

      tr.mat-row:hover {
        background: #f8fafc;
      }
    }

    .th-acciones, .td-acciones {
      width: 100px;
      text-align: center;
    }

    .btn-action-edit {
      color: #0284c7 !important;
    }

    .btn-action-delete {
      color: #ef4444 !important;
    }

    .auth-pill {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      background: #f1f5f9;
      color: #475569;

      &.auth-authentik {
        background: #ede9fe;
        color: #6d28d9;
      }
      &.auth-local {
        background: #e0f2fe;
        color: #0369a1;
      }
      &.auth-ciudadania {
        background: #dcfce7;
        color: #15803d;
      }
    }

    .empty-table-cell {
      text-align: center;
      padding: 36px !important;
      color: #94a3b8;
      font-style: italic;
    }

    .table-footer-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 10px 20px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;

      .paginator-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12.5px;
        color: #64748b;
        .page-numbers { font-weight: 600; color: #334155; }
      }
    }

    .copyright-bar {
      margin-top: 16px;
      text-align: right;
      font-size: 11.5px;
      color: #94a3b8;
    }

    /* ========================================= */
    /* MODAL OVERLAY & CARD (EXACTO A CAPTURA)   */
    /* ========================================= */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .user-modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 900px;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #cbd5e1;
    }

    .modal-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: #0f172a;
      color: #ffffff;
      border-top-left-radius: 11px;
      border-top-right-radius: 11px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 600;
        mat-icon { font-size: 20px; width: 20px; height: 20px; color: #38bdf8; }
      }

      .btn-close-modal {
        color: #94a3b8;
        &:hover { color: #ffffff; }
      }
    }

    .user-modal-form {
      padding: 24px;
    }

    .modal-columns-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .modal-columns-grid { grid-template-columns: 1fr; }
    }

    .modal-col-card {
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .col-title {
      margin: 0 0 6px 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label-custom {
      font-size: 12px;
      font-weight: 600;
      color: #0d9488; /* Color verde menta institucional idéntico a captura */
    }

    .custom-input, .custom-select {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13.5px;
      color: #1e293b;
      background: #ffffff;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        border-color: #0d9488;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
      }
    }

    .virtuales-sub-section {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #e2e8f0;
      .virtual-title {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
      }
      .virtual-hint {
        margin: 0;
        font-size: 11.5px;
        color: #64748b;
        line-height: 1.4;
      }
    }

    /* Roles Checklist */
    .roles-section-block {
      margin-top: 6px;
      .roles-header-label {
        font-size: 13.5px;
        font-weight: 700;
        color: #0f172a;
        display: block;
        margin-bottom: 8px;
      }
    }

    .roles-checklist {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .role-check-row {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: #1e293b;
    }

    .row-with-mae {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .mae-addon {
      display: inline-flex;
      align-items: center;
      background: #f0fdf4;
      padding: 2px 10px;
      border-radius: 6px;
      border: 1px solid #bbf7d0;

      .star-icon { font-size: 14px; margin-right: 4px; }
      .mae-text { font-size: 12px; color: #166534; font-weight: 700; }
    }

    .modal-bottom-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }

    .btn-modal-guardar {
      background: #0284c7 !important;
      color: #ffffff !important;
      padding: 0 24px !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-modal-cancelar {
      color: #475569 !important;
      border-color: #cbd5e1 !important;
      padding: 0 20px !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Modal Confirm Delete */
    .confirm-delete-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

      .confirm-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        .warn-icon { color: #ef4444; font-size: 28px; width: 28px; height: 28px; }
        h3 { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
      }

      .confirm-msg {
        font-size: 14px;
        color: #334155;
        line-height: 1.5;
        margin: 0 0 8px;
      }

      .confirm-sub {
        font-size: 12.5px;
        color: #64748b;
        margin: 0 0 20px;
      }

      .confirm-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
    }

    .fade-in {
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class UsuariosListComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = [
    'acciones',
    'usuario',
    'numero_documento',
    'nombres',
    'apellidos',
    'cargo',
    'email',
    'tipo_autenticacion'
  ];

  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly unidades = signal<Unidad[]>([]);
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly eliminando = signal(false);
  readonly mostrarFiltro = signal(false);

  readonly filtroCtrl = new FormControl('');

  // Modales
  readonly modalUsuarioVisible = signal<boolean>(false);
  readonly modoEdicion = signal<boolean>(false);
  readonly usuarioEditandoId = signal<number | null>(null);
  readonly usuarioAEliminar = signal<UsuarioAdmin | null>(null);

  // Set de roles seleccionados para el usuario actual
  readonly rolesSeleccionados = signal<Set<number>>(new Set<number>());

  readonly userForm = new FormGroup({
    numero_documento: new FormControl('', [Validators.required]),
    nombres: new FormControl('', [Validators.required]),
    apellidos: new FormControl('', [Validators.required]),
    cargo: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    usuario: new FormControl('', [Validators.required]),
    tipo_autenticacion: new FormControl<'AUTHENTIK' | 'LOCAL' | 'CIUDADANIA_DIGITAL'>('AUTHENTIK', [Validators.required]),
    estado: new FormControl<'ACTIVO' | 'INACTIVO'>('ACTIVO', [Validators.required]),
    fid_unidad: new FormControl<number | null>(null),
    es_mae: new FormControl<boolean>(false)
  });

  readonly usuariosFiltrados = computed(() => {
    const list = this.usuarios();
    const filtro = (this.filtroCtrl.value || '').toLowerCase().trim();
    if (!filtro) return list;

    return list.filter(u =>
      (u.usuario && u.usuario.toLowerCase().includes(filtro)) ||
      (u.nombres && u.nombres.toLowerCase().includes(filtro)) ||
      (u.apellidos && u.apellidos.toLowerCase().includes(filtro)) ||
      (u.numero_documento && u.numero_documento.toLowerCase().includes(filtro)) ||
      (u.email && u.email.toLowerCase().includes(filtro)) ||
      (u.cargo && u.cargo.toLowerCase().includes(filtro))
    );
  });

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarUnidades();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.seguridadService.getUsuarios().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.usuarios.set(res.datos || []);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Error al obtener la lista de usuarios.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cargarUnidades(): void {
    this.seguridadService.getUnidades(100, 1).subscribe({
      next: (res) => {
        this.unidades.set(res.datos?.resultado || []);
      }
    });
  }

  toggleFiltro(): void {
    this.mostrarFiltro.update(v => !v);
  }

  formatTipoAutenticacion(tipo?: string): string {
    if (!tipo) return 'LOCAL';
    if (tipo.toUpperCase() === 'AUTHENTIK') return 'AUTHENTIK';
    if (tipo.toUpperCase() === 'LOCAL') return 'LOCAL';
    if (tipo.toUpperCase().includes('CIUDADAN')) return 'CIUDADANÍA DIGITAL';
    return tipo;
  }

  getAuthPillClass(tipo?: string): string {
    const t = (tipo || '').toUpperCase();
    if (t === 'AUTHENTIK') return 'auth-authentik';
    if (t === 'LOCAL') return 'auth-local';
    return 'auth-ciudadania';
  }

  // ==========================================
  // MODAL CREAR / EDITAR
  // ==========================================
  abrirModalNuevo(): void {
    this.modoEdicion.set(false);
    this.usuarioEditandoId.set(null);
    this.rolesSeleccionados.set(new Set([3])); // Default OPERADOR

    this.userForm.reset({
      numero_documento: '',
      nombres: '',
      apellidos: '',
      cargo: '',
      email: '',
      usuario: '',
      tipo_autenticacion: 'AUTHENTIK',
      estado: 'ACTIVO',
      fid_unidad: null,
      es_mae: false
    });

    this.modalUsuarioVisible.set(true);
  }

  abrirModalEditar(u: UsuarioAdmin): void {
    this.modoEdicion.set(true);
    this.usuarioEditandoId.set(u.id_usuario || null);

    // Obtener los roles del usuario
    const setRoles = new Set<number>();
    if (u.usuario_rol && Array.isArray(u.usuario_rol)) {
      u.usuario_rol.forEach(ur => {
        if (ur.fid_rol) setRoles.add(ur.fid_rol);
        else if (ur.rol?.id_rol) setRoles.add(ur.rol.id_rol);
      });
    }
    this.rolesSeleccionados.set(setRoles);

    // Normalizar tipo autenticacion
    let tipoAuth: 'AUTHENTIK' | 'LOCAL' | 'CIUDADANIA_DIGITAL' = 'LOCAL';
    const t = (u.tipo_autenticacion || '').toUpperCase();
    if (t === 'AUTHENTIK') tipoAuth = 'AUTHENTIK';
    else if (t.includes('CIUDADAN')) tipoAuth = 'CIUDADANIA_DIGITAL';

    this.userForm.patchValue({
      numero_documento: u.numero_documento || '',
      nombres: u.nombres || '',
      apellidos: u.apellidos || '',
      cargo: u.cargo || '',
      email: u.email || '',
      usuario: u.usuario || '',
      tipo_autenticacion: tipoAuth,
      estado: (u.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'),
      fid_unidad: u.fid_unidad || null,
      es_mae: !!u.es_mae
    });

    this.modalUsuarioVisible.set(true);
  }

  cerrarModal(): void {
    this.modalUsuarioVisible.set(false);
    this.usuarioEditandoId.set(null);
  }

  tieneRol(idRol: number): boolean {
    return this.rolesSeleccionados().has(idRol);
  }

  toggleRol(idRol: number, checked: boolean): void {
    this.rolesSeleccionados.update(set => {
      const nuevo = new Set(set);
      if (checked) {
        nuevo.add(idRol);
      } else {
        nuevo.delete(idRol);
        if (idRol === 2) {
          this.userForm.patchValue({ es_mae: false });
        }
      }
      return nuevo;
    });
  }

  guardarUsuario(): void {
    if (this.userForm.invalid) return;

    this.guardando.set(true);
    const v = this.userForm.value;
    const rolesArray = Array.from(this.rolesSeleccionados());

    const payload: any = {
      numero_documento: v.numero_documento,
      nombres: v.nombres,
      apellidos: v.apellidos,
      cargo: v.cargo,
      email: v.email,
      usuario: v.usuario,
      tipo_autenticacion: v.tipo_autenticacion,
      estado: v.estado,
      fid_unidad: v.fid_unidad,
      es_mae: !!v.es_mae,
      roles: rolesArray
    };

    if (this.modoEdicion() && this.usuarioEditandoId()) {
      // Actualizar usuario existente
      this.seguridadService.actualizarUsuario(this.usuarioEditandoId()!, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open(`Usuario "${v.usuario}" actualizado exitosamente.`, 'Aceptar', { duration: 4000 });
          this.cargarUsuarios();
        },
        error: (err) => {
          this.guardando.set(false);
          const msg = err.error?.mensaje || 'Error al actualizar el usuario.';
          this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
        }
      });
    } else {
      // Crear nuevo usuario (con contraseña por defecto '123456')
      payload.contrasena = '123456';
      this.seguridadService.crearUsuario(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.snackBar.open(`Usuario "${v.usuario}" creado exitosamente.`, 'Aceptar', { duration: 4000 });
          this.cargarUsuarios();
        },
        error: (err) => {
          this.guardando.set(false);
          const msg = err.error?.mensaje || 'Error al crear el usuario.';
          this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
        }
      });
    }
  }

  // ==========================================
  // ELIMINAR USUARIO
  // ==========================================
  confirmarEliminarUsuario(u: UsuarioAdmin): void {
    this.usuarioAEliminar.set(u);
  }

  ejecutarEliminar(): void {
    const u = this.usuarioAEliminar();
    if (!u || !u.id_usuario) return;

    this.eliminando.set(true);
    this.seguridadService.eliminarUsuario(u.id_usuario).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.usuarioAEliminar.set(null);
        this.snackBar.open(`Usuario "${u.usuario}" eliminado correctamente.`, 'Aceptar', { duration: 4000 });
        this.cargarUsuarios();
      },
      error: (err) => {
        this.eliminando.set(false);
        const msg = err.error?.mensaje || 'Error al eliminar el usuario.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
      }
    });
  }
}
