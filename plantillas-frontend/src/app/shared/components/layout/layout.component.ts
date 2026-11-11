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

        <!-- VISTA HOME (isHomePage): Perfil & Título Panel de Control -->
        <ng-container *ngIf="isHomePage()">
          <div class="home-topbar-brand" (click)="irAPerfil()" title="Mi Perfil" style="cursor: pointer;">
            <div class="home-avatar-circle">
              <img *ngIf="user()?.foto" [src]="user()?.foto" alt="Avatar" class="avatar-circle-img">
              <span *ngIf="!user()?.foto">{{ userInitial() }}</span>
            </div>
            <div class="home-brand-text">
              <span class="user-handle">{{ user()?.username || 'usuario' }}</span>
              <span class="panel-subtitle">{{ user()?.cargo || 'Gestión documental' }}</span>
            </div>
          </div>
        </ng-container>

        <span class="flex-spacer"></span>

        <!-- Acciones a la derecha (Bandeja pendiente, Pantalla Completa, Menú Opciones) -->
        <div class="topbar-right-actions">
          <button 
            mat-icon-button 
            (click)="toggleFullScreen()" 
            matTooltip="Pantalla completa"
            class="topbar-icon-btn action-hide-mobile"
          >
            <mat-icon>{{ isFullScreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
          </button>

          <a
            mat-icon-button
            routerLink="/aprobacion"
            matTooltip="Bandeja de pendientes"
            class="topbar-icon-btn"
          >
            <mat-icon class="inbox-shortcut-icon">inbox</mat-icon>
          </a>

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
          <div class="sidebar-user-card" (click)="irAPerfil()" title="Mi Perfil" style="cursor: pointer;">
            <div class="sidebar-user-avatar">
              <img *ngIf="user()?.foto" [src]="user()?.foto" alt="Avatar" class="sidebar-avatar-img">
              <span *ngIf="!user()?.foto">{{ userInitial() }}</span>
            </div>
            <div class="sidebar-user-info">
              <h4 class="sidebar-user-name">
                {{ user()?.first_name ? (user()?.first_name + ' ' + (user()?.last_name || '')) : (user()?.username || 'Usuario institucional') }}
              </h4>
              <p class="sidebar-user-email">{{ user()?.email || 'Sin correo institucional' }}</p>
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
      background: var(--paper-canvas);
      font-family: var(--font-ui);
    }

    /* TOPBAR MODERNO */
    .main-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--petrol-gradient);
      color: #ffffff;
      height: 56px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--gold);
      box-shadow: 0 4px 16px rgba(11, 36, 42, 0.18);
    }

    .topbar-icon-btn.mat-mdc-icon-button {
      color: #ffffff;
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 21px;
        width: 21px;
        height: 21px;
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
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: calc(100vw - 160px);
    }

    .breadcrumb-separator {
      color: rgba(255, 255, 255, 0.45);
      font-size: 1rem;
      font-weight: 400;
      flex-shrink: 0;
    }

    .breadcrumb-title {
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* HOME TOPBAR */
    .home-topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .home-avatar-circle {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #d6a84f 0%, #b38222 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(214, 168, 79, 0.3);
    }

    .avatar-circle-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .home-brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .user-handle {
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
    }

    .panel-subtitle {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.72);
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

    .inbox-shortcut-icon {
      color: rgba(255, 255, 255, 0.88);
    }

    /* NAVBAR USER OPTIONS MENU */
    .navbar-user-options-menu {
      min-width: 210px;
      padding: 4px 0;
      border-radius: 8px;
    }

    .user-menu-item {
      height: 42px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      &:hover {
        background-color: var(--paper-canvas);
      }
    }

    .user-menu-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 12px;
      color: var(--ink-muted);
    }

    .user-menu-text {
      font-size: 0.86rem;
      font-weight: 500;
      color: var(--ink);
      font-family: var(--font-ui);
    }

    /* SIDENAV CONTAINER */
    .sidenav-container {
      flex: 1;
      height: calc(100vh - 56px);
      background: var(--paper-canvas);
    }

    .sidenav-container.no-sidenav {
      background: var(--paper-canvas);
    }

    /* DARK INSTITUTIONAL SIDENAV */
    .dark-institutional-sidenav {
      width: 266px;
      background: linear-gradient(180deg, #0b242a 0%, #10353d 100%);
      color: rgba(255, 255, 255, 0.88);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
    }

    .sidebar-brand-header {
      padding: 15px 20px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .sidebar-logo-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #ffffff;
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.04em;
    }

    .sidebar-logo-icon {
      color: var(--gold);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .close-sidebar-btn.mat-mdc-icon-button {
      color: rgba(255, 255, 255, 0.7);
    }

    .sidebar-user-card {
      padding: 20px 16px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: rgba(0, 0, 0, 0.14);
    }

    .sidebar-user-avatar {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      background: var(--gold);
      color: #ffffff;
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.22);
      position: relative;
      flex-shrink: 0;
    }

    .sidebar-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .sidebar-user-name {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
    }

    .sidebar-user-email {
      margin: 3px 0 0 0;
      font-size: 0.76rem;
      color: rgba(255, 255, 255, 0.65);
    }

    .sidebar-divider.mat-divider {
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    /* SCROLLABLE MENU ACCORDION */
    .sidebar-nav-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;
      -webkit-overflow-scrolling: touch;
    }

    .menu-category-header {
      padding: 11px 18px;
      display: flex;
      align-items: center;
      gap: 11px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.78rem;
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
      color: var(--gold);
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
      background: rgba(0, 0, 0, 0.16);
      padding: 4px 0;
    }

    .subitem-link {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 18px 9px 34px;
      color: rgba(255, 255, 255, 0.72);
      text-decoration: none;
      font-size: 0.83rem;
      font-weight: 500;
      border-left: 3px solid transparent;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
        .subitem-icon {
          color: var(--gold);
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
      background: linear-gradient(90deg, rgba(14, 116, 144, 0.34), rgba(214, 168, 79, 0.14));
      color: #f8e5b5;
      font-weight: 700;
      border-left-color: var(--gold);
      .subitem-icon {
        color: #f8e5b5;
      }
    }

    .sidebar-footer {
      padding: 12px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.58);
      text-align: center;
    }

    /* MAIN CONTENT */
    .main-content {
      padding: 24px;
      background: var(--paper-canvas);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .main-content-home {
      padding: 24px 28px;
      background: var(--paper-canvas);
    }

    /* RESPONSIVE */
    @media (max-width: 860px) {
      .main-topbar {
        padding: 0 8px;
        height: 52px;
        gap: 6px;
      }
      .topbar-icon-btn.mat-mdc-icon-button {
        width: 36px;
        height: 36px;
      }
      .topbar-home-btn {
        padding: 4px;
      }
      .breadcrumb-container {
        flex: 1 1 auto;
        min-width: 0;
        max-width: none;
      }
      .breadcrumb-title {
        font-size: 0.84rem;
      }
      .home-topbar-brand {
        flex: 1 1 auto;
        min-width: 0;
        gap: 8px;
      }
      .user-handle {
        font-size: 0.86rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .action-hide-mobile {
        display: none;
      }
      .panel-subtitle {
        display: none;
      }
      .main-content {
        padding: 10px 8px;
      }
      .main-content-home {
        padding: 12px 10px;
      }
      .sidenav-container {
        height: calc(100vh - 52px);
      }
      .dark-institutional-sidenav.mat-drawer {
        width: min(84vw, 280px);
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

  // Categorías de menú expandidas en el sidebar
  readonly expandedGroups = signal<Record<string, boolean>>({
    'CONFIGURACIÓN': true,
    'ADMINISTRACIÓN': true,
    'DOCUMENTOS': true,
    'CATALOGOS': true,
    'ARCHIVO': true,
    'VENTANILLA ÚNICA': true,
    'VENTANILLA': true
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
