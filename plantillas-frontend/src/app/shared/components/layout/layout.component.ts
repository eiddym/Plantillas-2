import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription, filter } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CambioUsuarioDialogComponent } from '../cambio-usuario-dialog/cambio-usuario-dialog.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule
  ],
  template: `
    <div class="layout-container" [class.is-home-view]="isHomePage()">
      <!-- Sidenav Container de Altura Completa con Fondo Esmeralda Profundo y Gradiente -->
      <mat-sidenav-container class="sidenav-container" [class.no-sidenav]="isHomePage()">
        
        <!-- Sidenav izquierda (Oculto en Inicio/Home, activo solo al navegar a una opción del menú) -->
        <mat-sidenav 
          *ngIf="!isHomePage()"
          [opened]="sidenavOpen()" 
          [mode]="isMobile() ? 'over' : 'side'" 
          (closed)="sidenavOpen.set(false)"
          class="dark-institutional-sidenav"
        >
          <!-- Cabecera del Sidebar: Logo estilo Emerald 24 -->
          <div class="sidebar-brand-header">
            <a routerLink="/dashboard" class="sidebar-logo-link">
              <div class="sidebar-brand-mark">
                <mat-icon class="sidebar-logo-icon">description</mat-icon>
              </div>
              <span class="sidebar-logo-text">plantillas</span>
            </a>
            <span class="flex-spacer"></span>
            <button *ngIf="isMobile()" mat-icon-button (click)="sidenavOpen.set(false)" class="close-sidebar-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Selector de Usuario en cápsula (Pill como Virellan & Co. en Emerald 24) -->
          <div class="sidebar-user-card" (click)="irAPerfil()" title="Mi Perfil">
            <div class="sidebar-user-avatar">
              <img *ngIf="user()?.foto" [src]="user()?.foto" alt="Avatar" class="sidebar-avatar-img">
              <span *ngIf="!user()?.foto">{{ userInitial() }}</span>
            </div>
            <div class="sidebar-user-info">
              <h4 class="sidebar-user-name">
                {{ user()?.first_name ? (user()?.first_name + ' ' + (user()?.last_name || '')) : (user()?.username || 'Usuario institucional') }}
              </h4>
              <p class="sidebar-user-email">{{ user()?.cargo || 'Acceso institucional' }}</p>
            </div>
            <mat-icon class="sidebar-user-chevron">unfold_more</mat-icon>
          </div>

          <!-- Menú Dinámico Agrupado en Acordeón -->
          <div class="sidebar-nav-scroll">
            <div class="sidebar-menu-accordion">
              <!-- Enlace directo Inicio estilo Home de Emerald 24 -->
              <a 
                routerLink="/dashboard" 
                routerLinkActive="active-subitem" 
                class="subitem-link sidebar-home-pill"
                (click)="onNavItemClick()"
              >
                <mat-icon class="subitem-icon">dashboard</mat-icon>
                <span class="subitem-text">Inicio</span>
              </a>

              <ng-container *ngFor="let group of menuGroups()">
                <!-- Encabezado de Categoría / Sección -->
                <div class="menu-category-header" (click)="toggleGroup(group.label)">
                  <mat-icon class="category-icon">{{ group.icon }}</mat-icon>
                  <span class="category-title">{{ group.label }}</span>
                  <mat-icon class="expand-icon">
                    {{ isGroupExpanded(group.label) ? 'keyboard_arrow_down' : 'keyboard_arrow_right' }}
                  </mat-icon>
                </div>

                <!-- Submenús Hijos -->
                <div class="category-subitems" *ngIf="isGroupExpanded(group.label)">
                  <ng-container *ngFor="let sub of group.items">
                    <a 
                      [routerLink]="'/' + sub.url" 
                      routerLinkActive="active-subitem" 
                      (click)="onNavItemClick()" 
                      class="subitem-link"
                    >
                      <mat-icon class="subitem-icon">{{ sub.icon || 'arrow_right' }}</mat-icon>
                      <span class="subitem-text">{{ sub.label }}</span>
                    </a>
                  </ng-container>
                </div>
              </ng-container>
            </div>
          </div>

          <!-- Footer del Sidebar -->
          <div class="sidebar-footer">
            <small>Cooperativa Minera Marabunta R.L.</small>
          </div>
        </mat-sidenav>

        <!-- Viewport Principal: Gran Lienzo Blanco Flotante (In-Set Canvas) -->
        <mat-sidenav-content class="main-viewport">
          <div class="canvas-floating-card" [class.canvas-home-card]="isHomePage()">
            
            <!-- Barra superior integrada dentro del lienzo -->
            <header class="integrated-topbar">
              <button 
                *ngIf="!isHomePage() && (isMobile() || !sidenavOpen())" 
                mat-icon-button 
                (click)="toggleSidenav()" 
                matTooltip="Menú lateral" 
                class="topbar-icon-btn menu-toggle-btn"
              >
                <mat-icon>menu</mat-icon>
              </button>

              <div class="breadcrumb-container">
                <a routerLink="/dashboard" class="breadcrumb-home-link" matTooltip="Ir al inicio / Dashboard">
                  <mat-icon>home</mat-icon>
                </a>
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-title">{{ currentSectionTitle() }}</span>
              </div>

              <span class="flex-spacer"></span>

              <!-- Acciones a la derecha (Pantalla Completa, Menú Opciones) -->
              <div class="topbar-right-actions">
                <button 
                  mat-icon-button 
                  (click)="toggleFullScreen()" 
                  matTooltip="Pantalla completa"
                  class="topbar-icon-btn action-hide-mobile"
                >
                  <mat-icon>{{ isFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                </button>

                <!-- Menú de opciones de usuario -->
                <button 
                  mat-icon-button 
                  [matMenuTriggerFor]="optionsMenu" 
                  matTooltip="Opciones de usuario" 
                  class="topbar-icon-btn"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>

                <mat-menu #optionsMenu="matMenu" xPosition="before" class="navbar-user-options-menu">
                  <button mat-menu-item routerLink="/profile" class="user-menu-item">
                    <mat-icon class="user-menu-icon">account_circle</mat-icon>
                    <span class="user-menu-text">Mi cuenta / Perfil</span>
                  </button>
                  <button mat-menu-item (click)="cambiarUsuario()" class="user-menu-item">
                    <mat-icon class="user-menu-icon">switch_account</mat-icon>
                    <span class="user-menu-text">Cambiar usuario / Perfil</span>
                  </button>
                  <button mat-menu-item (click)="logout()" class="user-menu-item">
                    <mat-icon class="user-menu-icon">power_settings_new</mat-icon>
                    <span class="user-menu-text">Salir</span>
                  </button>
                </mat-menu>
              </div>
            </header>

            <!-- Área de scroll del contenido de la página -->
            <main class="canvas-scroll-body">
              <router-outlet></router-outlet>
            </main>

          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    /* CONTENEDOR CON GRADIENTE ESMERALDA VERTICAL (FOTO 2 — MÁS CLARO HACIA ABAJO) */
    .layout-container {
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: linear-gradient(180deg, #022419 0%, #053b29 32%, #0b563e 56%, #1c7054 74%, #3a886d 86%, #62a389 93%, #8bbda6 97%, #add2bf 100%);
      font-family: var(--font-ui);
    }

    .sidenav-container {
      flex: 1;
      height: 100vh;
      background: transparent !important;
    }

    /* DARK INSTITUTIONAL SIDENAV EMERALD 24 CON GRADIENTE HACIA CLARO (FOTO 2) */
    .dark-institutional-sidenav {
      width: 270px;
      height: 100vh;
      background: linear-gradient(180deg, #022419 0%, #053b29 32%, #0b563e 56%, #1c7054 74%, #3a886d 86%, #62a389 93%, #8bbda6 97%, #add2bf 100%) !important;
      color: rgba(255, 255, 255, 0.92);
      border-right: none;
      display: flex;
      flex-direction: column;
      box-shadow: none;
    }

    .sidebar-brand-header {
      padding: 22px 20px 14px;
      display: flex;
      align-items: center;
    }

    .sidebar-logo-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .sidebar-brand-mark {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(52, 211, 153, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-logo-icon {
      color: #34d399;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sidebar-logo-text {
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      text-transform: lowercase;
    }

    .close-sidebar-btn.mat-mdc-icon-button {
      color: rgba(255, 255, 255, 0.7);
    }

    /* SELECTOR DE PERFIL PILL EN SIDEBAR */
    .sidebar-user-card {
      margin: 6px 14px 12px;
      padding: 9px 14px;
      display: flex;
      flex-direction: row;
      align-items: center;
      text-align: left;
      gap: 11px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      transition: background 0.15s ease, border-color 0.15s ease;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.24);
      }
    }

    .sidebar-user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #059669;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.3);
      flex-shrink: 0;
    }

    .sidebar-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .sidebar-user-info {
      flex: 1;
      min-width: 0;
    }

    .sidebar-user-name {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-user-email {
      margin: 1px 0 0 0;
      font-size: 0.69rem;
      color: rgba(255, 255, 255, 0.65);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-user-chevron {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255, 255, 255, 0.6);
      flex-shrink: 0;
    }

    /* SCROLLABLE MENU ACCORDION */
    .sidebar-nav-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
      -webkit-overflow-scrolling: touch;
    }

    .sidebar-home-pill {
      margin-bottom: 8px !important;
    }

    .menu-category-header {
      padding: 9px 14px;
      margin: 2px 10px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.88);
      font-size: 0.77rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
      }
    }

    .category-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #34d399;
    }

    .category-title {
      flex: 1;
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255, 255, 255, 0.5);
    }

    .category-subitems {
      display: flex;
      flex-direction: column;
      background: transparent;
      padding: 2px 0 6px 0;
    }

    .subitem-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px 8px 26px;
      margin: 2px 10px;
      border-radius: 9999px;
      color: rgba(255, 255, 255, 0.74);
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 500;
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        .subitem-icon {
          color: #34d399;
        }
      }
    }

    .subitem-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.52);
      transition: color 0.15s ease;
    }

    .subitem-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .active-subitem.subitem-link {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      .subitem-icon {
        color: #34d399;
      }
    }

    .sidebar-footer {
      padding: 14px 18px;
      font-size: 0.72rem;
      color: #043324;
      font-weight: 700;
      text-align: center;
    }

    /* VIEWPORT Y GRAN LIENZO FLOTANTE BLANCO (IN-SET CANVAS EMERALD 24) */
    .main-viewport {
      flex: 1;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: transparent !important;
    }

    .canvas-floating-card {
      flex: 1;
      margin: 14px 18px 18px 0;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .canvas-floating-card.canvas-home-card {
      margin: 14px 18px 18px 18px;
    }

    .integrated-topbar {
      height: 60px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .topbar-icon-btn.mat-mdc-icon-button {
      color: #475569;
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: #f1f5f9;
        color: #044e3b;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .breadcrumb-container {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .breadcrumb-home-link {
      color: #64748b;
      display: flex;
      align-items: center;
      text-decoration: none;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s ease, background 0.15s ease;

      &:hover {
        color: #059669;
        background: #ecfdf5;
      }

      mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
      }
    }

    .breadcrumb-separator {
      color: #cbd5e1;
      font-size: 1rem;
      font-weight: 400;
    }

    .breadcrumb-title {
      color: #0f172a;
      font-size: 0.94rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .home-topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .home-avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #059669;
      color: #ffffff;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
    }

    .avatar-circle-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-handle {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0f172a;
      display: block;
    }

    .panel-subtitle {
      font-size: 0.74rem;
      color: #64748b;
      display: block;
    }

    .flex-spacer {
      flex: 1 1 auto;
    }

    .topbar-right-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .inbox-shortcut-icon {
      color: #475569;
    }

    .navbar-user-options-menu {
      min-width: 210px;
      padding: 4px 0;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    }

    .user-menu-item {
      height: 42px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      &:hover {
        background-color: #f8fafc;
      }
    }

    .user-menu-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 12px;
      color: #64748b;
    }

    .user-menu-text {
      font-size: 0.86rem;
      font-weight: 500;
      color: #0f172a;
      font-family: var(--font-ui);
    }

    /* ÁREA DE SCROLL DEL LIENZO BLANCO */
    .canvas-scroll-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
      background: #ffffff;
      -webkit-overflow-scrolling: touch;
    }

    /* RESPONSIVE */
    @media (max-width: 860px) {
      .canvas-floating-card {
        margin: 0;
        border-radius: 0;
      }
      .canvas-floating-card.canvas-home-card {
        margin: 0;
        border-radius: 0;
      }
      .integrated-topbar {
        padding: 0 12px;
        height: 52px;
      }
      .canvas-scroll-body {
        padding: 12px 10px;
      }
      .action-hide-mobile {
        display: none;
      }
      .panel-subtitle {
        display: none;
      }
      .dark-institutional-sidenav.mat-drawer {
        width: min(84vw, 280px);
        background: #032b1f !important;
      }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private bpSub?: Subscription;
  private routerSub?: Subscription;

  readonly user = this.authService.currentUser;
  readonly menus = this.authService.currentMenu;

  readonly currentUrl = signal<string>(this.router.url);
  readonly isMobile = signal(false);
  readonly sidenavOpen = signal(false);
  readonly isFullScreen = signal(false);

  // Categorías de menú expandidas en el sidebar (cerradas por defecto, solo se abre la sección activa)
  readonly expandedGroups = signal<Record<string, boolean>>({});

  // Determinar si estamos en el Home/Dashboard
  readonly isHomePage = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return url === '' || url === '/' || url === '/dashboard';
  });

  readonly userInitial = computed(() => {
    const u = this.user();
    if (!u) return 'S';
    return (u.first_name?.[0] || u.username?.[0] || 'S').toUpperCase();
  });

  // Título de la sección activa para el breadcrumb de páginas internas
  readonly currentSectionTitle = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    if (url === '/dashboard' || url === '/' || url === '') return 'Inicio';
    if (url.startsWith('/profile') || url.startsWith('/cuenta')) return 'Mi perfil';
    if (url.startsWith('/documentos')) return 'Documentos';
    if (url.startsWith('/plantillas')) return 'Plantillas';
    if (url.startsWith('/aprobacion')) return 'Pendientes';
    if (url.startsWith('/firmar')) return 'Firmar';
    if (url.startsWith('/archivo')) return 'Archivo';
    if (url.startsWith('/usuario')) return 'Usuarios';
    if (url.startsWith('/rol')) return 'Roles';
    if (url.startsWith('/unidad')) return 'Unidades';
    if (url.startsWith('/menu')) return 'Menús';
    if (url.startsWith('/catalogos')) return 'Catálogos';
    if (url.startsWith('/compartidos')) return 'Catálogos Compartidos';
    if (url.startsWith('/contactos')) return 'Contactos';
    if (url.startsWith('/impresion')) return 'Imprimir Documentos';
    if (url.startsWith('/monitoreo')) return 'Monitoreo';
    if (url.startsWith('/ventanilla/externa')) return 'Ventanilla Externa';
    if (url.startsWith('/ventanilla/interna')) return 'Ventanilla Interna';
    if (url.startsWith('/ventanilla')) return 'Ventanilla Única';
    return 'Sección';
  });

  // Mapeo estructurado de grupos de menús para el sidebar
  readonly menuGroups = computed(() => {
    const rawMenus = this.menus() || [];
    const iconMap: Record<string, string> = {
      'CONFIGURACIÓN': 'build',
      'ADMINISTRACIÓN': 'settings',
      'DOCUMENTOS': 'folder',
      'CATALOGOS': 'folder_shared',
      'ARCHIVO': 'archive',
      'VENTANILLA ÚNICA': 'inbox',
      'VENTANILLA': 'inbox'
    };

    const subIconMap: Record<string, string> = {
      'plantillas': 'layers',
      'contactos': 'person',
      'usuario': 'group',
      'rol': 'security',
      'menu': 'menu',
      'unidad': 'business',
      'documentos': 'description',
      'aprobacion': 'low_priority',
      'firmar': 'edit',
      'aprobar_documento': 'fingerprint',
      'impresion': 'print',
      'archivo': 'archive',
      'archivo/general': 'public',
      'archivo/unidad': 'domain',
      'archivo/institucional': 'verified',
      'monitoreo': 'speed',
      'catalogos': 'folder',
      'compartidos': 'share',
      'ventanilla/externa': 'cloud_download',
      'ventanilla/interna': 'edit_document',
      'ventanilla-unica': 'inbox',
      'admin/firma': 'verified'
    };

    // Si la sesión guardada en localStorage es anterior a la migración de menús,
    // garantizamos paridad total con todos los submódulos institucionales
    const enrichedMenus = JSON.parse(JSON.stringify(rawMenus));
    
    // 1. Archivo: construir submenús según jerarquía estricta (General, Unidad, Institucional)
    const uActual: any = this.user() || {};
    const cargoUsuario = String(uActual.cargo || '').trim();
    const esMaeOAdmin = this.authService.isMae() || this.authService.hasRole('ADMIN') || this.authService.hasRole('MAE') || /\b(mae|presidente|directora?\s+general)\b/i.test(cargoUsuario);
    const esSecretaria = this.authService.hasRole('SECRETARIA') || /\bsecretar(ia|io|ía)\b/i.test(cargoUsuario);
    const esJefeOSubjefe = this.authService.hasRole('JEFE') || /\b(jefe|subjefe|sub\s*jefe|responsable|director|directora|presidente|presidenta|gerente|encargado|encargada|coordinador|coordinadora)\b/i.test(cargoUsuario);

    const archivoRawGroup = rawMenus.find((m: any) => m.label?.toUpperCase() === 'ARCHIVO' || m.id_menu === 35);
    const submenusBackend: any[] = Array.isArray(archivoRawGroup?.submenu) ? archivoRawGroup.submenu : [];
    const tieneSubmenuExplicito = (ruta: string, idMenu: number) =>
      submenusBackend.some((s: any) => s.id_menu === idMenu || (s.url || '').toLowerCase() === ruta);

    const puedeVerGeneral = esMaeOAdmin || esSecretaria || tieneSubmenuExplicito('archivo/general', 37);
    const puedeVerUnidad = esMaeOAdmin || esJefeOSubjefe || tieneSubmenuExplicito('archivo/unidad', 38);

    const submenusArchivoPermitidos: Array<{ label: string; url: string; icon: string }> = [];
    if (puedeVerGeneral) {
      submenusArchivoPermitidos.push({ label: 'ARCHIVO GENERAL', url: 'archivo/general', icon: 'public' });
    }
    if (puedeVerUnidad) {
      submenusArchivoPermitidos.push({ label: 'ARCHIVO DE UNIDAD', url: 'archivo/unidad', icon: 'domain' });
    }
    // Archivo Institucional es visible para TODO el personal sin excepción
    submenusArchivoPermitidos.push({ label: 'ARCHIVO INSTITUCIONAL', url: 'archivo/institucional', icon: 'verified' });

    const archivoGroup = enrichedMenus.find((m: any) => m.label?.toUpperCase() === 'ARCHIVO');
    if (archivoGroup) {
      archivoGroup.submenu = submenusArchivoPermitidos;
    } else {
      enrichedMenus.push({
        label: 'ARCHIVO',
        icon: 'archive',
        submenu: submenusArchivoPermitidos
      });
    }

    // 2. Ventanilla Única: únicamente visible para usuarios con rol CORRESPONDENCIA o ADMIN
    const puedeVerVentanilla = this.authService.hasRole('ADMIN') || this.authService.hasRole('CORRESPONDENCIA');
    const vIdx = enrichedMenus.findIndex((m: any) => 
      m.label?.toUpperCase() === 'VENTANILLA ÚNICA' || 
      m.label?.toUpperCase() === 'VENTANILLA' ||
      m.id_menu === 26 || m.id_menu === 27 || m.id_menu === 28 ||
      m.url?.toLowerCase().startsWith('ventanilla')
    );

    if (!puedeVerVentanilla) {
      if (vIdx !== -1) {
        enrichedMenus.splice(vIdx, 1);
      }
    } else {
      if (vIdx !== -1) {
        const ventanillaGroup = enrichedMenus[vIdx];
        if (!ventanillaGroup.submenu || ventanillaGroup.submenu.length === 0) {
          ventanillaGroup.submenu = [
            { label: 'VENTANILLA EXTERNA', url: 'ventanilla/externa', icon: 'cloud_download' },
            { label: 'VENTANILLA INTERNA', url: 'ventanilla/interna', icon: 'edit_document' }
          ];
        }
      } else {
        enrichedMenus.push({
          label: 'VENTANILLA ÚNICA',
          icon: 'inbox',
          submenu: [
            { label: 'VENTANILLA EXTERNA', url: 'ventanilla/externa', icon: 'cloud_download' },
            { label: 'VENTANILLA INTERNA', url: 'ventanilla/interna', icon: 'edit_document' }
          ]
        });
      }
    }

    // 3. Administración: asegurar Método de Firma
    const adminGroup = enrichedMenus.find((m: any) => m.label?.toUpperCase() === 'ADMINISTRACIÓN');
    if (adminGroup && adminGroup.submenu) {
      const tieneFirma = adminGroup.submenu.some((s: any) => s.url === 'admin/firma' || s.label?.toUpperCase().includes('FIRMA'));
      if (!tieneFirma) {
        adminGroup.submenu.push({ label: 'MÉTODO DE FIRMA', url: 'admin/firma', icon: 'verified' });
      }
    }

    // 4. Documentos: asegurar En Curso y Aprobar con CD
    const docsGroup = enrichedMenus.find((m: any) => m.label?.toUpperCase() === 'DOCUMENTOS');
    if (docsGroup && docsGroup.submenu) {
      if (!docsGroup.submenu.some((s: any) => s.url === 'en_curso')) {
        docsGroup.submenu.push({ label: 'EN CURSO', url: 'en_curso', icon: 'autorenew' });
      }
      if (!docsGroup.submenu.some((s: any) => s.url === 'aprobar_documento')) {
        docsGroup.submenu.push({ label: 'APROBAR CON CD', url: 'aprobar_documento', icon: 'fingerprint' });
      }
    }

    return enrichedMenus.map((padre: any) => {
      const label = (padre.label || '').toUpperCase();
      const parentIcon = iconMap[label] || padre.icon || 'folder';

      const items = (padre.submenu && padre.submenu.length > 0)
        ? padre.submenu.map((s: any) => ({
            label: s.label,
            url: s.url,
            icon: subIconMap[s.url] || s.icon || 'arrow_right'
          }))
        : [{
            label: padre.label,
            url: padre.url || 'dashboard',
            icon: subIconMap[padre.url] || padre.icon || 'arrow_right'
          }];

      return {
        label: padre.label,
        icon: parentIcon,
        items
      };
    });
  });

  ngOnInit(): void {
    // Sincronizar ruta inicial
    this.currentUrl.set(this.router.url);

    // Abrir únicamente la categoría del menú correspondiente a la sección actual
    this.syncExpandedGroupWithRoute(this.router.url);

    // Ajustar apertura de sidenav según la ruta inicial: oculto en Home/Inicio
    if (this.isHomePage()) {
      this.sidenavOpen.set(false);
    } else {
      this.sidenavOpen.set(!this.isMobile());
    }

    // Escuchar cambios de navegación
    this.routerSub = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const newUrl = event.urlAfterRedirects || event.url;
      this.currentUrl.set(newUrl);

      // Si navegamos al Home, ocultar sidebar; en rutas internas abrirlo en desktop
      if (this.isHomePage()) {
        this.sidenavOpen.set(false);
      } else {
        this.sidenavOpen.set(!this.isMobile());
        // Expandir solo el grupo de la nueva ruta navegada
        this.syncExpandedGroupWithRoute(newUrl);
      }
    });

    // Observar breakpoints responsivos
    this.bpSub = this.breakpointObserver.observe(['(max-width: 860px)']).subscribe((state) => {
      const mobile = state.matches;
      this.isMobile.set(mobile);
      if (this.isHomePage()) {
        this.sidenavOpen.set(false);
      } else {
        this.sidenavOpen.set(!mobile);
      }
    });
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  /**
   * Obtiene la categoría/grupo padre en el sidebar que contiene la ruta especificada
   */
  private getActiveGroupForUrl(url: string): string | null {
    const cleanUrl = url.split('?')[0].split('#')[0].replace(/^\//, '').toLowerCase();
    if (!cleanUrl || cleanUrl === 'dashboard') return null;

    const groups = this.menuGroups();
    for (const group of groups) {
      const match = group.items.some((item: any) => {
        const itemUrl = (item.url || '').replace(/^\//, '').toLowerCase();
        if (!itemUrl) return false;
        return cleanUrl === itemUrl || cleanUrl.startsWith(itemUrl + '/') || itemUrl.startsWith(cleanUrl + '/');
      });
      if (match) {
        return group.label;
      }
    }
    return null;
  }

  /**
   * Sincroniza los grupos expandidos dejando abierto únicamente el grupo de la ruta actual
   */
  private syncExpandedGroupWithRoute(url: string): void {
    const activeGroup = this.getActiveGroupForUrl(url);
    if (activeGroup) {
      this.expandedGroups.set({ [activeGroup]: true });
    } else {
      this.expandedGroups.set({});
    }
  }

  toggleSidenav(): void {
    this.sidenavOpen.set(!this.sidenavOpen());
  }

  toggleGroup(groupLabel: string): void {
    const current = { ...this.expandedGroups() };
    current[groupLabel] = !current[groupLabel];
    this.expandedGroups.set(current);
  }

  isGroupExpanded(groupLabel: string): boolean {
    return !!this.expandedGroups()[groupLabel];
  }

  onNavItemClick(): void {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }

  toggleFullScreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullScreen.set(true);
    } else {
      document.exitFullscreen().catch(() => {});
      this.isFullScreen.set(false);
    }
  }

  cambiarUsuario(): void {
    this.dialog.open(CambioUsuarioDialogComponent, {
      width: '540px',
      panelClass: 'custom-dialog-container',
      backdropClass: 'blur-backdrop'
    });
  }

  logout(): void {
    this.authService.logout();
  }

  irAPerfil(): void {
    this.router.navigate(['/profile']);
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }
}
