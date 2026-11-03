import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { AuthService } from '../../core/auth/auth.service';
import { DestinatarioDialogComponent } from './destinatario-dialog.component';

@Component({
  selector: 'formly-field-datos-generales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <div class="hoja-datos-generales">
      <!-- Section warning if not visible in print -->
      @if (to?.['showItem'] === false) {
        <div class="warning-banner">
          <mat-icon>visibility_off</mat-icon>
          Esta sección no se mostrará al imprimir en PDF oficial.
        </div>
      }

      <!-- FILA: PARA -->
      @if (to?.['show']?.para !== false) {
        <div class="renglon-documental">
          <div class="rotulo-clickable" (click)="abrirModalDestinatario()" matTooltip="Haga clic para cambiar destinatario">
            <span class="rotulo-texto">PARA:</span>
          </div>
          <div class="contenido-documental">
            @if (paraSeleccionado()) {
              <div class="destinatario-badge" [class.badge-broadcast]="paraSeleccionado()?.todos">
                @if (paraSeleccionado()?.todos) {
                  <mat-icon class="broadcast-icon">campaign</mat-icon>
                }
                <span class="nombre-persona">{{ paraSeleccionado()?.nombres }} {{ paraSeleccionado()?.apellidos }}</span>
                @if (paraSeleccionado()?.cargo) {
                  <span class="cargo-persona"> - {{ paraSeleccionado()?.cargo }}</span>
                }
                <button 
                  type="button" 
                  class="btn-inline-change" 
                  (click)="abrirModalDestinatario()" 
                  matTooltip="Cambiar destinatario"
                >
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            } @else {
              <div class="alerta-seleccion-para" (click)="abrirModalDestinatario()">
                <mat-icon class="pulse-icon">touch_app</mat-icon>
                <span class="alerta-texto">Debe elegir una opción haciendo clic en PARA</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- FILA: VÍA (AUTOMÁTICA INTELIGENTE) -->
      @if (to?.['show']?.via) {
        <div class="renglon-documental">
          <div class="rotulo-col">
            <span class="rotulo-texto">VÍA:</span>
          </div>
          <div class="contenido-documental">
            @if (viasCalculadas().length > 0) {
              <div class="vias-list">
                @for (v of viasCalculadas(); track v.id_usuario; let idx = $index) {
                  <div class="via-item">
                    <span class="via-idx" *ngIf="viasCalculadas().length > 1">{{ idx + 1 }}.</span>
                    <span class="nombre-persona">{{ v.nombres }} {{ v.apellidos }}</span>
                    <span class="cargo-persona"> - {{ v.cargo }}</span>
                    <span class="tag-auto-via">Conducto Regular</span>
                  </div>
                }
              </div>
            } @else {
              <span class="texto-atenuado">
                [Vía no requerida para este nivel jerárquico o pendiente de selección de PARA]
              </span>
            }
          </div>
        </div>
      }

      <!-- FILA: DE (REMITENTE INAMOVIBLE + CO-PARTICIPANTES) -->
      @if (to?.['show']?.de !== false) {
        <div class="renglon-documental">
          <div class="rotulo-col">
            <span class="rotulo-texto">DE:</span>
          </div>
          <div class="contenido-documental">
            <!-- Remitente Principal Inamovible -->
            <div class="remitente-principal">
              <span class="nombre-persona">{{ remitentePrincipal()?.nombres }} {{ remitentePrincipal()?.apellidos }}</span>
              <span class="cargo-persona"> - {{ remitentePrincipal()?.cargo }}</span>
              <span class="tag-fijo" matTooltip="Remitente principal inamovible (titular de la sesión)">
                <mat-icon>lock</mat-icon> Titular
              </span>
            </div>

            <!-- Co-participantes agregados para firma conjunta -->
            @for (co of coRemitentes(); track co.id_usuario || $index) {
              <div class="co-remitente-item">
                <span class="nombre-persona">{{ co.nombres }} {{ co.apellidos }}</span>
                <span class="cargo-persona"> - {{ co.cargo }}</span>
                <span class="tag-co-remitente">Firma Conjunta</span>
                <button 
                  type="button" 
                  class="btn-remove-co" 
                  (click)="quitarCoRemitente(co.id_usuario)" 
                  matTooltip="Quitar participante conjunto"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }

            <!-- Botón sutil para agregar compañero de misma unidad y rango -->
            <div class="co-remitente-action">
              <button 
                type="button" 
                class="btn-agregar-coparticipante" 
                (click)="abrirModalCoRemitente()"
              >
                <mat-icon>group_add</mat-icon>
                <span>+ Agregar participante conjunto</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- FILA: CON COPIA A (CC) - DESIGNACIÓN DE UNIDADES -->
      <div class="renglon-documental">
        <div class="rotulo-col">
          <span class="rotulo-texto">CC:</span>
        </div>
        <div class="contenido-documental">
          <!-- Unidades designadas para recibir copia oficial -->
          @for (cp of copiasSeleccionadas(); track cp.id_unidad || $index) {
            <div class="copia-unidad-item">
              <span class="nombre-persona">{{ cp.nombre }}</span>
              @if (cp.abreviacion) {
                <span class="cargo-persona"> ({{ cp.abreviacion }})</span>
              }
              <span class="tag-copia-cc">Copia Oficial</span>
              <button 
                type="button" 
                class="btn-remove-co" 
                (click)="quitarCopia(cp.id_unidad)" 
                matTooltip="Quitar unidad en copia"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }

          <!-- Botón para designar unidad en copia -->
          <div class="co-remitente-action">
            <button 
              type="button" 
              class="btn-agregar-coparticipante btn-agregar-cc" 
              (click)="abrirModalCopia()"
            >
              <mat-icon>domain_add</mat-icon>
              <span>+ Con Copia a Unidad (CC)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- FILA: REF. (TIPOGRÁFICO EDITABLE DIRECTO EN HOJA) -->
      @if (to?.['show']?.ref !== false) {
        <div class="renglon-documental renglon-ref">
          <div class="rotulo-col">
            <span class="rotulo-texto">REF.:</span>
          </div>
          <div class="contenido-documental">
            <input 
              type="text" 
              class="ref-input-hoja" 
              [ngModel]="referenciaTexto()"
              (ngModelChange)="onRefChange($event)"
              placeholder="Describa el asunto o referencia del documento..."
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .hoja-datos-generales {
      padding: 10px 0 20px 0;
      margin-bottom: 15px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
    }
    .warning-banner {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #b45309;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
    .renglon-documental {
      display: flex;
      align-items: flex-start;
      padding: 7px 0;
      border-bottom: 1px dotted #cbd5e1;
      line-height: 1.5;
      &:last-child {
        border-bottom: none;
      }
    }
    .renglon-ref {
      align-items: center;
    }
    .rotulo-col, .rotulo-clickable {
      width: 85px;
      flex-shrink: 0;
      font-weight: 800;
      color: #0f172a;
      font-size: 0.94rem;
      letter-spacing: 0.5px;
    }
    .rotulo-clickable {
      cursor: pointer;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
      &:hover {
        color: #1e40af;
        text-decoration: underline;
      }
    }
    .contenido-documental {
      flex: 1;
      font-size: 0.94rem;
    }
    .nombre-persona {
      font-weight: 700;
      color: #0f172a;
    }
    .cargo-persona {
      color: #475569;
      font-weight: 500;
    }
    .destinatario-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      &.badge-broadcast {
        background: #f0f9ff;
        border: 1.5px dashed #0284c7;
        padding: 4px 10px;
        border-radius: 6px;
        .nombre-persona {
          color: #0284c7;
          font-weight: 800;
        }
        .broadcast-icon {
          color: #0284c7;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
    .btn-inline-change {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      &:hover {
        color: #2563eb;
        background: #eff6ff;
      }
    }
    .alerta-seleccion-para {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #dc2626;
      font-weight: 700;
      font-size: 0.88rem;
      background: #fef2f2;
      border: 1px dashed #f87171;
      padding: 4px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      &:hover {
        background: #fee2e2;
        border-color: #ef4444;
        transform: translateX(2px);
      }
    }
    .vias-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .via-item, .remitente-principal, .co-remitente-item {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .via-idx {
      font-weight: 700;
      color: #64748b;
    }
    .tag-auto-via {
      font-size: 0.68rem;
      background: #eff6ff;
      color: #2563eb;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tag-fijo {
      font-size: 0.68rem;
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      mat-icon {
        font-size: 11px;
        width: 11px;
        height: 11px;
      }
    }
    .tag-co-remitente {
      font-size: 0.68rem;
      background: #f0fdf4;
      color: #16a34a;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .copia-unidad-item {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .tag-copia-cc {
      font-size: 0.68rem;
      background: #f3e8ff;
      color: #7e22ce;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 10px;
      text-transform: uppercase;
    }
    .btn-agregar-cc {
      color: #7e22ce !important;
      &:hover {
        background: #faf5ff !important;
        color: #6b21a8 !important;
      }
    }
    .btn-remove-co {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      &:hover {
        color: #ef4444;
        background: #fee2e2;
      }
    }
    .co-remitente-action {
      margin-top: 4px;
    }
    .btn-agregar-coparticipante {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      color: #0284c7;
      font-size: 0.78rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
      &:hover {
        background: #f0f9ff;
        color: #0369a1;
        text-decoration: underline;
      }
    }
    .ref-input-hoja {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.94rem;
      font-weight: 600;
      color: #0f172a;
      padding: 4px 6px;
      border-radius: 4px;
      outline: none;
      transition: background 0.2s, box-shadow 0.2s;
      &::placeholder {
        color: #94a3b8;
        font-weight: normal;
        font-style: italic;
      }
      &:focus {
        background: #f8fafc;
        box-shadow: 0 0 0 1.5px #3b82f6;
      }
    }
    .texto-atenuado {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.88rem;
    }
  `]
})
export class FormlyFieldDatosGeneralesComponent extends FieldType<FieldTypeConfig> implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  // Estados reactivos internos
  readonly paraSeleccionado = signal<any | null>(null);
  readonly viasCalculadas = signal<any[]>([]);
  readonly remitentePrincipal = signal<any | null>(null);
  readonly coRemitentes = signal<any[]>([]);
  readonly copiasSeleccionadas = signal<any[]>([]);
  readonly referenciaTexto = signal<string>('');

  private usuariosCache: any[] = [];
  private unidadesCache: any[] = [];

  ngOnInit(): void {
    this.cargarDatosJerarquicos();
    this.inicializarRemitenteYValores();
  }

  private cargarDatosJerarquicos(): void {
    // Cargar usuarios
    this.http.get<any>('/api/v1/seguridad/usuario_rol/').subscribe({
      next: (res) => {
        this.usuariosCache = res.datos || [];
        // Re-evaluar VÍA con el cache listo
        this.recalcularVia();
      },
      error: () => {}
    });

    // Cargar unidades
    this.http.get<any>('/api/v1/seguridad/unidad').subscribe({
      next: (res) => {
        this.unidadesCache = res.datos?.resultado || res.datos || [];
        this.hidratarCopiasSiEsNecesario();
        this.recalcularVia();
      },
      error: () => {}
    });
  }

  private hidratarCopiasSiEsNecesario(): void {
    const list = this.copiasSeleccionadas();
    if (!list || list.length === 0 || this.unidadesCache.length === 0) return;
    const actualizadas = list.map((item: any) => {
      const uId = Number(item?.id_unidad ?? item?.id ?? item);
      const match = this.unidadesCache.find((u) => u.id_unidad === uId);
      return match
        ? { id_unidad: match.id_unidad, nombre: match.nombre, abreviacion: match.abreviacion }
        : item;
    });
    this.copiasSeleccionadas.set(actualizadas);
  }

  private inicializarRemitenteYValores(): void {
    const curr: any = this.authService.currentUser();
    if (curr) {
      this.remitentePrincipal.set({
        id_usuario: curr.id || curr.id_usuario,
        nombres: curr.first_name || curr.nombres,
        apellidos: curr.last_name || curr.apellidos,
        cargo: curr.cargo,
        fid_unidad: curr.fid_unidad || curr.id_unidad
      });
    }

    // Hidratar desde el formControl.value existente si ya tenía datos
    const val = this.formControl?.value || {};
    if (val.para) {
      this.paraSeleccionado.set(val.para);
    }
    if (val.via) {
      this.viasCalculadas.set(Array.isArray(val.via) ? val.via : [val.via]);
    }
    if (val.copia) {
      const arr = Array.isArray(val.copia) ? val.copia : [val.copia];
      this.copiasSeleccionadas.set(arr);
      this.hidratarCopiasSiEsNecesario();
    }
    if (val.de) {
      if (Array.isArray(val.de)) {
        if (val.de.length > 0 && !this.remitentePrincipal()) {
          this.remitentePrincipal.set(val.de[0]);
        }
        if (val.de.length > 1) {
          this.coRemitentes.set(val.de.slice(1));
        }
      } else if (typeof val.de === 'object' && !this.remitentePrincipal()) {
        this.remitentePrincipal.set(val.de);
      }
    }
    if (val.ref) {
      this.referenciaTexto.set(val.ref);
    }

    setTimeout(() => this.emitirValores(false), 0);
  }

  abrirModalDestinatario(): void {
    const dialogRef = this.dialog.open(DestinatarioDialogComponent, {
      width: '620px',
      data: {
        mode: 'PARA',
        currentUser: this.getCurrentUserFull(),
        usuarios: this.usuariosCache,
        unidades: this.unidadesCache
      }
    });

    dialogRef.afterClosed().subscribe((dest) => {
      if (dest) {
        this.paraSeleccionado.set(dest);
        if (dest.todos && this.model) {
          if (this.model['inputt_1'] !== undefined || this.model['inputt_1'] === '') {
            this.model['inputt_1'] = 'A TODO EL PERSONAL';
          }
        }
        this.recalcularVia();
        this.emitirValores(true);
      }
    });
  }

  abrirModalCoRemitente(): void {
    const dialogRef = this.dialog.open(DestinatarioDialogComponent, {
      width: '620px',
      data: {
        mode: 'CO_REMITENTE',
        currentUser: this.getCurrentUserFull(),
        usuarios: this.usuariosCache,
        unidades: this.unidadesCache
      }
    });

    dialogRef.afterClosed().subscribe((co) => {
      if (co) {
        // Evitar duplicados
        const exists = this.coRemitentes().some((x) => x.id_usuario === co.id_usuario);
        if (!exists) {
          this.coRemitentes.update((list) => [...list, co]);
          this.emitirValores(true);
        }
      }
    });
  }

  quitarCoRemitente(id_usuario: number): void {
    this.coRemitentes.update((list) => list.filter((x) => x.id_usuario !== id_usuario));
    this.emitirValores(true);
  }

  abrirModalCopia(): void {
    const dialogRef = this.dialog.open(DestinatarioDialogComponent, {
      width: '620px',
      data: {
        mode: 'COPIA_UNIDAD',
        currentUser: this.getCurrentUserFull(),
        usuarios: this.usuariosCache,
        unidades: this.unidadesCache
      }
    });

    dialogRef.afterClosed().subscribe((unidad) => {
      if (unidad && unidad.id_unidad) {
        const exists = this.copiasSeleccionadas().some((x) => x.id_unidad === unidad.id_unidad);
        if (!exists) {
          this.copiasSeleccionadas.update((list) => [...list, unidad]);
          this.emitirValores(true);
        }
      }
    });
  }

  quitarCopia(id_unidad: number): void {
    this.copiasSeleccionadas.update((list) => list.filter((x) => x.id_unidad !== id_unidad));
    this.emitirValores(true);
  }

  onRefChange(val: string): void {
    this.referenciaTexto.set(val);
    this.emitirValores(true);
  }

  private recalcularVia(): void {
    const dest = this.paraSeleccionado();
    if (!dest) {
      this.viasCalculadas.set([]);
      return;
    }

    if (dest.todos || dest.id_usuario === 'TODOS') {
      this.viasCalculadas.set([]);
      this.emitirValores();
      return;
    }

    const curr = this.getCurrentUserFull();
    const isJefe = this.isUserJefeOrMae(curr);

    // EJE 5 - Si es JEFE o MAE, el VÍA generalmente no se requiere
    if (isJefe) {
      this.viasCalculadas.set([]);
      this.emitirValores();
      return;
    }

    // EJE 5 - Si es OPERADOR o subordinado:
    const currUnidadId = curr.fid_unidad || curr.id_unidad;
    const destUnidadId = dest.fid_unidad;

    // Buscar la unidad del usuario actual
    const currUnidad = this.unidadesCache.find((u) => u.id_unidad === currUnidadId);

    // NUEVA REGLA: Si la unidad es COLECTIVA (Socios / Asociados), NO se busca jefe interno ni VÍA
    // El socio despacha directamente a la unidad / jefatura de destino
    if (currUnidad?.es_colectiva) {
      this.viasCalculadas.set([]);
      this.emitirValores(false);
      return;
    }

    // Identificar Jefe Inmediato y Jefe de Unidad Mayor
    const vias: any[] = [];
    
    // 1. Jefe Inmediato (Jefe de su misma unidad)
    let jefeInmediato = this.usuariosCache.find(
      (u) => u.fid_unidad === currUnidadId && this.isUserJefe(u) && u.id_usuario !== curr.id_usuario
    );

    // Si la subunidad no tiene jefe propio, el jefe inmediato es el jefe de la unidad padre
    let jefeUnidadMayor: any = null;
    if (currUnidad?.fid_unidad_padre) {
      jefeUnidadMayor = this.usuariosCache.find(
        (u) => u.fid_unidad === currUnidad.fid_unidad_padre && this.isUserJefe(u)
      );
    }

    if (!jefeInmediato && jefeUnidadMayor) {
      jefeInmediato = jefeUnidadMayor;
    }

    // CASO A: Misma unidad mayor (ej. se dirige a su Jefe de Unidad / Director)
    if (destUnidadId === currUnidadId || destUnidadId === currUnidad?.fid_unidad_padre) {
      if (jefeInmediato && jefeInmediato.id_usuario !== dest.id_usuario) {
        vias.push(jefeInmediato);
      }
    } else {
      // CASO B: Unidad externa o MAE
      // En VÍA se agregan automáticamente tanto su Jefe Inmediato como su Jefe de Unidad Mayor
      if (jefeInmediato && jefeInmediato.id_usuario !== dest.id_usuario) {
        vias.push(jefeInmediato);
      }
      if (
        jefeUnidadMayor && 
        jefeUnidadMayor.id_usuario !== dest.id_usuario && 
        !vias.some((v) => v.id_usuario === jefeUnidadMayor.id_usuario)
      ) {
        vias.push(jefeUnidadMayor);
      }
    }

    this.viasCalculadas.set(vias);
    this.emitirValores(false);
  }

  private emitirValores(emitir = false): void {
    const todosDe = [this.remitentePrincipal(), ...this.coRemitentes()].filter(Boolean);
    const value = {
      para: this.paraSeleccionado(),
      via: this.viasCalculadas(),
      de: todosDe,
      copia: this.copiasSeleccionadas(),
      ref: this.referenciaTexto()
    };
    if (this.formControl) {
      this.formControl.setValue(value, { emitEvent: emitir });
    }
  }

  private getCurrentUserFull(): any {
    const authUser: any = this.authService.currentUser() || {};
    const authRoles: any[] = this.authService.currentRoles() || [];
    return {
      ...authUser,
      id_usuario: authUser.id || authUser.id_usuario,
      roles: authRoles
    };
  }

  private isUserJefeOrMae(u: any): boolean {
    if (!u) return false;
    if (u.es_mae) return true;
    const roles = u.roles || u.usuario_rol || [];
    return roles.some((r: any) => {
      const nom = (r.rol?.nombre || r.nombre || '').toUpperCase();
      return nom === 'JEFE' || nom === 'MAE' || nom === 'ADMIN';
    });
  }

  private isUserJefe(u: any): boolean {
    if (!u) return false;
    if (u.es_mae) return true;
    const roles: any[] = u.usuario_rol || u.roles || [];
    const tieneRolJefe = roles.some((r: any) => {
      const nom = (r.rol?.nombre || r.nombre || '').toUpperCase();
      return nom === 'JEFE' || nom === 'ADMIN';
    });
    if (tieneRolJefe) return true;
    const cargo = (u.cargo || '').toUpperCase();
    return cargo.includes('JEFE') || cargo.includes('DIRECTOR') || cargo.includes('RESPONSABLE') || cargo.includes('GERENTE');
  }
}
