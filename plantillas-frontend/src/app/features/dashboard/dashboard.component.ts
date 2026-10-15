import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';

interface DashboardItem {
  label: string;
  url: string;
  icon: string;
  color: string;
  desc: string;
}

interface DashboardSection {
  label: string;
  icon: string;
  color: string;
  items: DashboardItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="home-shell-container">
      <!-- Encabezado de Bienvenida Institucional -->
      <header class="home-welcome-header">
        <div class="welcome-text">
          <h1>{{ saludo() }}, {{ user()?.first_name || user()?.username }}</h1>
          <p class="subtitle">{{ user()?.cargo || 'Funcionario' }} &bull; Panel de Control y Flujo Documental</p>
        </div>
        <div class="welcome-actions">
          <button mat-raised-button class="btn-nuevo-doc" routerLink="/plantillas">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Redactar Documento</span>
          </button>
        </div>
      </header>

      <!-- Secciones Dinámicas Derivadas del Perfil y Permisos en Base de Datos -->
      <main class="home-dynamic-sections">
        @for (seccion of secciones(); track seccion.label) {
          <div class="section-panel">
            <div class="section-header">
              <span class="dot" [ngClass]="'bg-' + seccion.color">
                <mat-icon>{{ seccion.icon }}</mat-icon>
              </span>
              <h2>{{ seccion.label }}</h2>
            </div>

            <div class="grid">
              @for (item of seccion.items; track item.label) {
                <div class="card" (click)="irARuta(item.url)">
                  <div class="card-top">
                    <span class="icon-badge" [ngClass]="'bg-' + item.color">
                      <mat-icon>{{ item.icon }}</mat-icon>
                    </span>
                  </div>
                  <div class="card-body">
                    <p class="card-title">{{ item.label }}</p>
                    <p class="card-sub">{{ item.desc }}</p>
                  </div>
                  <div class="card-footer-action">
                    <span>Acceder</span>
                  </div>
                </div>
              }
            </div>
          </div>
        } @empty {
          <!-- Fallback cuando no hay menús dinámicos cargados -->
          <div class="section-panel">
            <div class="section-header">
              <span class="dot bg-blue">
                <mat-icon>description</mat-icon>
              </span>
              <h2>Gestión Documental</h2>
            </div>
            <div class="grid">
              <div class="card" routerLink="/documentos">
                <div class="card-top">
                  <span class="icon-badge bg-blue"><mat-icon>description</mat-icon></span>
                </div>
                <div class="card-body">
                  <p class="card-title">Mis Documentos</p>
                  <p class="card-sub">Bandeja de redacción y seguimiento de trámites</p>
                </div>
                <div class="card-footer-action"><span>Acceder</span></div>
              </div>

              <div class="card" routerLink="/aprobacion">
                <div class="card-top">
                  <span class="icon-badge bg-orange"><mat-icon>pending_actions</mat-icon></span>
                </div>
                <div class="card-body">
                  <p class="card-title">Pendientes de Aprobación</p>
                  <p class="card-sub">Revisión y derivación de documentos en curso</p>
                </div>
                <div class="card-footer-action"><span>Acceder</span></div>
              </div>

              <div class="card" routerLink="/plantillas">
                <div class="card-top">
                  <span class="icon-badge bg-teal"><mat-icon>layers</mat-icon></span>
                </div>
                <div class="card-body">
                  <p class="card-title">Plantillas Oficiales</p>
                  <p class="card-sub">Diseñador y catálogo de formularios institucionales</p>
                </div>
                <div class="card-footer-action"><span>Acceder</span></div>
              </div>

              <div class="card" routerLink="/firmar">
                <div class="card-top">
                  <span class="icon-badge bg-green"><mat-icon>verified</mat-icon></span>
                </div>
                <div class="card-body">
                  <p class="card-title">Archivo Digital</p>
                  <p class="card-sub">Documentos formalmente aprobados y validados</p>
                </div>
                <div class="card-footer-action"><span>Acceder</span></div>
              </div>
            </div>
          </div>
        }
      </main>

      <!-- Footer Institucional de la Cooperativa -->
      <footer class="home-shell-footer">
        <p>COOPERATIVA MINERA MARABUNTA R.L. &bull; Sistema Digital de Plantillas y Aprobación 2026</p>
      </footer>
    </div>
  `,
  styles: [`
    .home-shell-container {
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Poppins', Roboto, sans-serif;
    }

    .home-welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;

      h1 {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 700;
        color: #0f2027;
        letter-spacing: -0.3px;
      }

      .subtitle {
        margin: 4px 0 0 0;
        color: #64748b;
        font-size: 0.88rem;
      }
    }

    .btn-nuevo-doc {
      background-color: #0f2027 !important;
      color: #ffffff !important;
      border-radius: 24px !important;
      padding: 0 20px !important;
      height: 44px !important;
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      box-shadow: 0 4px 12px rgba(15, 32, 39, 0.25) !important;
      transition: all 0.2s ease !important;

      &:hover {
        background-color: #1e293b !important;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(15, 32, 39, 0.35) !important;
      }

      mat-icon {
        color: #00e5ff;
      }
    }

    .home-dynamic-sections {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(15, 32, 39, 0.04);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .dot {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        flex-shrink: 0;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: #ffffff;
        }
      }

      h2 {
        font-size: 0.92rem;
        font-weight: 700;
        margin: 0;
        color: #0f2027;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1px;
      background: #e2e8f0;
    }

    .card {
      background: #ffffff;
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: background 0.18s ease, transform 0.18s ease;

      &:hover {
        background: #f8fafc;
        transform: translateY(-1px);

        .card-footer-action {
          color: #0284c7;
        }
      }
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ffffff;
      }
    }

    /* Clases cromáticas de la paleta original */
    .bg-blue { background: #0284c7; }
    .bg-teal { background: #0d9488; }
    .bg-green { background: #059669; }
    .bg-slate { background: #1e293b; }
    .bg-purple { background: #7c3aed; }
    .bg-orange { background: #ea580c; }
    .bg-indigo { background: #4f46e5; }

    .card-body {
      flex: 1;
    }

    .card-title {
      font-size: 0.92rem;
      font-weight: 700;
      margin: 0;
      color: #0f2027;
      line-height: 1.3;
    }

    .card-sub {
      font-size: 0.8rem;
      color: #64748b;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .card-footer-action {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      transition: color 0.18s ease;
      display: flex;
      align-items: center;
    }

    .home-shell-footer {
      margin-top: 40px;
      padding: 24px 0;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      p {
        margin: 0;
        font-size: 0.78rem;
        color: #94a3b8;
        font-weight: 500;
        letter-spacing: 0.4px;
      }
    }

    @media (max-width: 768px) {
      .home-welcome-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.currentUser;
  private readonly menus = this.authService.currentMenu;

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  private readonly parentMetaMap: Record<string, { color: string; icon: string }> = {
    'DOCUMENTOS': { color: 'blue', icon: 'description' },
    'CATALOGOS': { color: 'teal', icon: 'folder' },
    'ADMINISTRACIÓN': { color: 'green', icon: 'settings' },
    'CONFIGURACIÓN': { color: 'purple', icon: 'build' },
    'ARCHIVO': { color: 'slate', icon: 'archive' }
  };

  private readonly itemMetaMap: Record<string, { icon: string; color: string; desc: string }> = {
    'documentos': { icon: 'description', color: 'blue', desc: 'Mis documentos redactados y en trámite' },
    'aprobacion': { icon: 'access_time', color: 'orange', desc: 'Bandeja de revisión y derivación de documentos' },
    'firmar': { icon: 'edit', color: 'purple', desc: 'Documentos pendientes de firma digital' },
    'aprobar_documento': { icon: 'fingerprint', color: 'indigo', desc: 'Aprobación y certificación digital' },
    'impresion': { icon: 'print', color: 'blue', desc: 'Impresión oficial de documentos' },
    'archivo': { icon: 'archive', color: 'slate', desc: 'Archivo digital emitido' },
    'catalogos': { icon: 'folder', color: 'teal', desc: 'Tablas de datos y catálogos institucionales' },
    'compartidos': { icon: 'share', color: 'teal', desc: 'Catálogos compartidos de la entidad' },
    'usuario': { icon: 'group', color: 'green', desc: 'Gestión y permisos de usuarios' },
    'rol': { icon: 'security', color: 'purple', desc: 'Perfiles de seguridad y roles' },
    'menu': { icon: 'menu', color: 'orange', desc: 'Administración de accesos y menús' },
    'unidad': { icon: 'business', color: 'blue', desc: 'Estructura y organigrama institucional' },
    'plantillas': { icon: 'layers', color: 'teal', desc: 'Diseñador de formularios y plantillas' },
    'contactos': { icon: 'person', color: 'indigo', desc: 'Directorio del personal institucional' }
  };

  readonly secciones = computed<DashboardSection[]>(() => {
    const menuList = this.menus() || [];
    const result: DashboardSection[] = [];

    for (const padre of menuList) {
      if (padre.submenu && padre.submenu.length > 0) {
        const items: DashboardItem[] = [];
        for (const sub of padre.submenu) {
          const meta = this.itemMetaMap[sub.url] || {
            icon: sub.icon || 'arrow_right',
            color: 'blue',
            desc: `Acceso a ${sub.label}`
          };
          items.push({
            label: sub.label,
            url: sub.url,
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc
          });
        }
        if (items.length > 0) {
          const parentMeta = this.parentMetaMap[padre.label.toUpperCase()] || {
            color: 'blue',
            icon: padre.icon || 'folder'
          };
          result.push({
            label: padre.label,
            icon: parentMeta.icon,
            color: parentMeta.color,
            items
          });
        }
      } else {
        const meta = this.itemMetaMap[padre.url] || {
          icon: padre.icon || 'archive',
          color: 'slate',
          desc: `Módulo oficial ${padre.label}`
        };
        const parentMeta = this.parentMetaMap[padre.label.toUpperCase()] || {
          color: meta.color,
          icon: meta.icon
        };
        result.push({
          label: padre.label,
          icon: parentMeta.icon,
          color: parentMeta.color,
          items: [{
            label: padre.label,
            url: padre.url || 'archivo',
            icon: meta.icon,
            color: meta.color,
            desc: meta.desc
          }]
        });
      }
    }

    return result;
  });

  irARuta(url: string): void {
    if (url) {
      this.router.navigate(['/' + url]);
    }
  }
}
