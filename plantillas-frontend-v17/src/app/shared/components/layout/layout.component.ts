import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule
  ],
  template: `
    <div class="layout-container">
      <!-- Institutional Topbar -->
      <mat-toolbar color="primary" class="main-topbar">
        <button mat-icon-button (click)="sidenavOpen.set(!sidenavOpen())" matTooltip="Menú principal">
          <mat-icon>menu</mat-icon>
        </button>

        <a routerLink="/dashboard" class="brand-link" matTooltip="Ir al inicio">
          <mat-icon class="brand-icon">home</mat-icon>
          <span class="brand-title">PLANTILLAS Y APROBACIÓN</span>
        </a>

        <span class="flex-spacer"></span>

        <!-- Dynamic institutional greeting -->
        <div class="user-greeting">
          <span class="greeting-text">{{ greeting() }}, <strong>{{ user()?.first_name || user()?.username }}</strong></span>
          <span class="role-badge" *ngIf="user()?.cargo">{{ user()?.cargo }}</span>
        </div>

        <!-- User profile menu -->
        <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
          <div class="avatar-circle">
            {{ userInitial() }}
          </div>
          <mat-icon>arrow_drop_down</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="menu-user-info">
            <strong>{{ user()?.first_name }} {{ user()?.last_name }}</strong>
            <small>{{ user()?.email }}</small>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon>
            <span>Panel Principal</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon color="warn">logout</mat-icon>
            <span>Cerrar Sesión</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <!-- Sidenav Container -->
      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav [opened]="sidenavOpen()" mode="side" class="main-sidenav">
          <div class="sidenav-header">
            <mat-icon>folder_special</mat-icon>
            <span>Módulos del Sistema</span>
          </div>

          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active-item">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Inicio</span>
            </a>

            <!-- Dynamic database menus -->
            <ng-container *ngFor="let item of menus()">
              <div class="menu-section-label" *ngIf="item.submenu && item.submenu.length > 0">
                {{ item.label }}
              </div>

              <ng-container *ngFor="let sub of item.submenu">
                <a mat-list-item [routerLink]="'/' + sub.url" routerLinkActive="active-item">
                  <mat-icon matListItemIcon>{{ sub.icon || 'arrow_right' }}</mat-icon>
                  <span matListItemTitle>{{ sub.label }}</span>
                </a>
              </ng-container>

              <a mat-list-item *ngIf="!item.submenu || item.submenu.length === 0" [routerLink]="'/' + item.url" routerLinkActive="active-item">
                <mat-icon matListItemIcon>{{ item.icon || 'arrow_right' }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            </ng-container>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="main-content">
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
    }
    .main-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: linear-gradient(90deg, #1a237e 0%, #283593 100%);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      height: 64px;
      padding: 0 16px;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
      text-decoration: none;
      margin-left: 8px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .brand-icon {
      font-size: 24px;
    }
    .flex-spacer {
      flex: 1 1 auto;
    }
    .user-greeting {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-right: 12px;
      line-height: 1.2;
    }
    .greeting-text {
      font-size: 0.85rem;
      opacity: 0.95;
    }
    .role-badge {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 8px;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
    }
    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #ffb300;
      color: #1a237e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }
    .user-btn {
      padding: 0 4px;
    }
    .menu-user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
    }
    .sidenav-container {
      flex: 1;
      height: calc(100vh - 64px);
    }
    .main-sidenav {
      width: 260px;
      background: #ffffff;
      border-right: 1px solid #e0e0e0;
    }
    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      font-weight: 600;
      color: #5c6bc0;
      border-bottom: 1px solid #f0f0f0;
    }
    .menu-section-label {
      padding: 12px 16px 4px 16px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #9e9e9e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .active-item {
      background: rgba(63, 81, 181, 0.12) !important;
      color: #1a237e !important;
      font-weight: 600;
      border-left: 4px solid #1a237e;
    }
    .main-content {
      padding: 24px;
      background: #f4f6f9;
      overflow-y: auto;
    }
  `]
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly menus = this.authService.currentMenu;
  readonly sidenavOpen = signal(true);

  readonly userInitial = computed(() => {
    const u = this.user();
    if (!u) return 'U';
    return (u.first_name?.[0] || u.username?.[0] || 'U').toUpperCase();
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  logout(): void {
    this.authService.logout();
  }
}
