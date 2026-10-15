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
import { AuthService } from '../../../core/auth/auth.service';

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
    MatDividerModule
  ],
  template: `
    <div class="layout-container" [class.is-home-view]="isHomePage()">
      <!-- Topbar Institucional -->
      <mat-toolbar class="main-topbar">
        <!-- VISTA INTERNA (!isHomePage): Menú Hamburguesa + Home + Breadcrumb -->
        <ng-container *ngIf="!isHomePage()">
          <button 
            mat-icon-button 
            (click)="toggleSidenav()" 
            matTooltip="Menú lateral" 
            class="topbar-icon-btn menu-toggle-btn"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <a routerLink="/dashboard" class="topbar-home-btn" matTooltip="Ir al inicio / Dashboard">
            <mat-icon>home</mat-icon>
          </a>

          <div class="breadcrumb-container">
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-title">{{ currentSectionTitle() }}</span>
          </div>
        </ng-container>

        <!-- VISTA HOME (isHomePage): Perfil & Título Panel de Control (Imagen 2) -->
        <ng-container *ngIf="isHomePage()">
          <div class="home-topbar-brand">
            <div class="home-avatar-circle">
              {{ userInitial() }}
            </div>
            <div class="home-brand-text">
              <span class="user-handle">.{{ user()?.username || 'system' }}</span>
              <span class="panel-subtitle">{{ user()?.cargo || 'Default system user' }} - panel de control</span>
            </div>
          </div>
        </ng-container>

        <span class="flex-spacer"></span>

        <!-- Acciones a la derecha (Pantalla Completa, Notificaciones, Menú Opciones) -->
        <div class="topbar-right-actions">
          <button 
            mat-icon-button 
            (click)="toggleFullScreen()" 
            matTooltip="Pantalla completa"
            class="topbar-icon-btn action-hide-mobile"
          >
            <mat-icon>{{ isFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
          </button>

          <button 
            mat-icon-button 
            matTooltip="Notificaciones" 
            class="topbar-icon-btn"
          >
            <mat-icon class="bell-icon">notifications</mat-icon>
            <span class="notification-indicator"></span>
          </button>

          <!-- Menú de opciones de usuario (Imagen 1 Prod: Mi cuenta / Perfil, Cambio de usuario, Salir) -->
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
              <mat-icon class="user-menu-icon">sync</mat-icon>
              <span class="user-menu-text">Cambio de usuario</span>
            </button>
            <button mat-menu-item (click)="logout()" class="user-menu-item">
              <mat-icon class="user-menu-icon">power_settings_new</mat-icon>
              <span class="user-menu-text">Salir</span>
            </button>
          </mat-menu>
        </div>
      </mat-toolbar>

      <!-- Sidenav Container -->
      <mat-sidenav-container class="sidenav-container" [class.no-sidenav]="isHomePage()">
        <!-- Sidenav izquierda (Activo solo en páginas internas) -->
        <mat-sidenav 
          *ngIf="!isHomePage()"
          [opened]="sidenavOpen()" 
          [mode]="isMobile() ? 'over' : 'side'" 
          (closed)="sidenavOpen.set(false)"
          class="dark-institutional-sidenav"
        >
          <!-- Cabecera del Sidebar: Logo PLANTILLAS (Imagen 3) -->
          <div class="sidebar-brand-header">
            <a routerLink="/dashboard" class="sidebar-logo-link">
              <mat-icon class="sidebar-logo-icon">home</mat-icon>
              <span class="sidebar-logo-text">PLANTILLAS</span>
            </a>
            <span class="flex-spacer"></span>
            <button *ngIf="isMobile()" mat-icon-button (click)="sidenavOpen.set(false)" class="close-sidebar-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Card de Usuario en el Sidebar (Imagen 3) -->
          <div class="sidebar-user-card">
            <div class="sidebar-user-avatar">
              {{ userInitial() }}
            </div>
            <div class="sidebar-user-info">
              <h4 class="sidebar-user-name">
                {{ user()?.first_name ? (user()?.first_name + ' ' + (user()?.last_name || '')) : (user()?.username || 'system default') }}
              </h4>
              <p class="sidebar-user-email">{{ user()?.email || 'docs@marabuntarl.com' }}</p>
            </div>
          </div>

          <mat-divider class="sidebar-divider"></mat-divider>

          <!-- Menú Dinámico Agrupado en Acordeón (Imagen 3) -->
          <div class="sidebar-nav-scroll">
            <div class="sidebar-menu-accordion">
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

        <!-- Contenido Principal -->
        <mat-sidenav-content class="main-content" [class.main-content-home]="isHomePage()">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .layout-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f1f5f9;
      font-family: 'Plus Jakarta Sans', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* TOPBAR INSTITUCIONAL (Imagen 2 & Imagen 3) */
    .main-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f2027; /* Petróleo oscuro institucional */
      color: #ffffff;
      height: 56px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .topbar-icon-btn {
      color: #ffffff !important;
      width: 40px;
      height: 40px;
      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .topbar-home-btn {
      color: #ffffff;
      display: flex;
      align-items: center;
      text-decoration: none;
      padding: 6px;
      border-radius: 6px;
      transition: background 0.15s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.1);
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
    }

    .breadcrumb-separator {
      color: #64748b;
      font-size: 1.1rem;
      font-weight: 300;
    }

    .breadcrumb-title {
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* HOME TOPBAR (Imagen 2: .system Default system user - panel de control) */
    .home-topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .home-avatar-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #2dd4bf; /* Teal brillante */
      color: #042f2e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .home-brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .user-handle {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.2px;
    }

    .panel-subtitle {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .flex-spacer {
      flex: 1 1 auto;
    }

    .topbar-right-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    }

    .bell-icon {
      color: #cbd5e1;
    }

    .notification-indicator {
      position: absolute;
      top: 10px;
      right: 56px;
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      border: 1.5px solid #0f2027;
    }

    /* NAVBAR USER OPTIONS MENU (Imagen 1 Prod Antiguo) */
    .navbar-user-options-menu {
      min-width: 210px !important;
      padding: 4px 0 !important;
      border-radius: 4px !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    }

    .user-menu-item {
      height: 42px !important;
      display: flex !important;
      align-items: center !important;
      padding: 0 16px !important;
      transition: background 0.15s ease !important;

      &:hover {
        background-color: #f1f5f9 !important;
      }
    }

    .user-menu-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      margin-right: 12px !important;
      color: #334155 !important;
    }

    .user-menu-text {
      font-size: 13.5px !important;
      font-weight: 500 !important;
      color: #1e293b !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }

    /* SIDENAV CONTAINER */
    .sidenav-container {
      flex: 1;
      height: calc(100vh - 56px);
      background: #eef1f4;
    }

    .sidenav-container.no-sidenav {
      background: #f8fafc;
    }

    /* DARK INSTITUTIONAL SIDENAV (Imagen 3) */
    .dark-institutional-sidenav {
      width: 270px;
      background: #0f2027; /* Petróleo oscuro profundo */
      color: #cbd5e1;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
    }

    .sidebar-brand-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sidebar-logo-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: 0.8px;
    }

    .sidebar-logo-icon {
      color: #22d3ee; /* Cyan */
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .close-sidebar-btn {
      color: #94a3b8 !important;
    }

    /* CARD DE USUARIO EN EL SIDEBAR (Imagen 3) */
    .sidebar-user-card {
      padding: 24px 16px 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
    }

    .sidebar-user-avatar {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: #ffffff;
      font-size: 1.8rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(20, 184, 166, 0.3);
      margin-bottom: 12px;
    }

    .sidebar-user-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.3px;
    }

    .sidebar-user-email {
      margin: 4px 0 0 0;
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .sidebar-divider {
      border-top-color: rgba(255, 255, 255, 0.08) !important;
    }

    /* SCROLLABLE MENU ACCORDION */
    .sidebar-nav-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;
      -webkit-overflow-scrolling: touch;
    }

    .menu-category-header {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      color: #e2e8f0;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }
    }

    .category-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #22d3ee;
    }

    .category-title {
      flex: 1;
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }

    .category-subitems {
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.15);
      padding: 4px 0;
    }

    .subitem-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px 10px 36px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.84rem;
      font-weight: 500;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
        .subitem-icon {
          color: #22d3ee;
        }
      }
    }

    .subitem-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #64748b;
      transition: color 0.15s ease;
    }

    .subitem-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .active-subitem {
      background: rgba(34, 211, 238, 0.12) !important;
      color: #22d3ee !important;
      font-weight: 700;
      border-left: 3px solid #22d3ee;
      .subitem-icon {
        color: #22d3ee !important;
      }
    }

    .sidebar-footer {
      padding: 14px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.72rem;
      color: #64748b;
      text-align: center;
    }

    /* MAIN CONTENT */
    .main-content {
      padding: 24px;
      background: #eef1f4;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .main-content-home {
      padding: 24px 28px;
      background: #f4f6f8;
    }

    /* RESPONSIVE */
    @media (max-width: 860px) {
      .main-topbar {
        padding: 0 10px;
        height: 52px;
      }
      .action-hide-mobile {
        display: none !important;
      }
      .panel-subtitle {
        display: none;
      }
      .main-content {
        padding: 14px 10px;
      }
      .main-content-home {
        padding: 14px 10px;
      }
      .sidenav-container {
        height: calc(100vh - 52px);
      }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

  private bpSub?: Subscription;
  private routerSub?: Subscription;

  readonly user = this.authService.currentUser;
  readonly menus = this.authService.currentMenu;

  readonly currentUrl = signal<string>(this.router.url);
  readonly isMobile = signal(false);
  readonly sidenavOpen = signal(false);
  readonly isFullScreen = signal(false);

  // Categorías de menú expandidas en el sidebar
  readonly expandedGroups = signal<Record<string, boolean>>({
    'CONFIGURACIÓN': true,
    'ADMINISTRACIÓN': true,
    'DOCUMENTOS': true,
    'CATALOGOS': true,
    'ARCHIVO': true
  });

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
    if (url.startsWith('/profile') || url.startsWith('/cuenta')) return 'Profile';
    if (url.startsWith('/documentos')) return 'Documentos';
    if (url.startsWith('/plantillas')) return 'Plantillas';
    if (url.startsWith('/aprobacion')) return 'Documentos Pendientes';
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
      'ARCHIVO': 'archive'
    };

    const subIconMap: Record<string, string> = {
      'plantillas': 'layers',
      'contactos': 'person',
      'usuario': 'group',
      'rol': 'security',
      'menu': 'menu',
      'unidad': 'business',
      'documentos': 'description',
      'aprobacion': 'access_time',
      'firmar': 'edit',
      'aprobar_documento': 'fingerprint',
      'impresion': 'print',
      'archivo': 'archive',
      'monitoreo': 'speed',
      'catalogos': 'folder',
      'compartidos': 'share'
    };

    return rawMenus.map((padre) => {
      const label = padre.label.toUpperCase();
      const parentIcon = iconMap[label] || padre.icon || 'folder';

      const items = (padre.submenu && padre.submenu.length > 0)
        ? padre.submenu.map((s) => ({
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

    // Ajustar apertura de sidenav según la ruta inicial
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

      // Si navegamos al Home, desaparecer sidebar
      if (this.isHomePage()) {
        this.sidenavOpen.set(false);
      } else {
        // En vista interna: en desktop abierto, en móvil cerrado por defecto
        if (!this.isMobile()) {
          this.sidenavOpen.set(true);
        } else {
          this.sidenavOpen.set(false);
        }
      }
    });

    // Observar breakpoints responsivos
    this.bpSub = this.breakpointObserver.observe(['(max-width: 860px)']).subscribe((state) => {
      const mobile = state.matches;
      this.isMobile.set(mobile);

      if (this.isHomePage()) {
        this.sidenavOpen.set(false);
      } else {
        if (mobile) {
          this.sidenavOpen.set(false);
        } else {
          this.sidenavOpen.set(true);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
    this.routerSub?.unsubscribe();
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
    this.authService.logout();
  }

  logout(): void {
    this.authService.logout();
  }
}
