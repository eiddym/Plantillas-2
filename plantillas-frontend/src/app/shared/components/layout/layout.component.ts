import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
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
        <button mat-icon-button (click)="sidenavOpen.set(!sidenavOpen())" matTooltip="Menú principal" class="menu-toggle-btn">
          <mat-icon>menu</mat-icon>
        </button>

        <a routerLink="/dashboard" class="brand-link" matTooltip="Ir al inicio">
          <mat-icon class="brand-icon">home</mat-icon>
          <span class="brand-title">
            <span class="brand-long">PLANTILLAS Y APROBACIÓN</span>
            <span class="brand-short">DOCS MARABUNTA</span>
          </span>
        </a>

        <span class="flex-spacer"></span>

        <!-- Dynamic institutional greeting (Desktop only) -->
        <div class="user-greeting">
          <span class="greeting-text">{{ greeting() }}, <strong>{{ user()?.first_name || user()?.username }}</strong></span>
          <span class="role-badge" *ngIf="user()?.cargo">{{ user()?.cargo }}</span>
        </div>

        <!-- User profile menu -->
        <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
          <div class="avatar-circle">
            {{ userInitial() }}
          </div>
          <mat-icon class="user-dropdown-arrow">arrow_drop_down</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="menu-user-info">
            <strong>{{ user()?.first_name }} {{ user()?.last_name }}</strong>
            <small>{{ user()?.email }}</small>
            <span class="mobile-role-text" *ngIf="user()?.cargo">{{ user()?.cargo }}</span>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/dashboard" (click)="onNavItemClick()">
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
        <mat-sidenav 
          [opened]="sidenavOpen()" 
          [mode]="isMobile() ? 'over' : 'side'" 
          (closed)="sidenavOpen.set(false)"
          class="main-sidenav"
        >
          <div class="sidenav-header">
            <mat-icon>folder_special</mat-icon>
            <span>Módulos del Sistema</span>
            <span class="flex-spacer"></span>
            <button *ngIf="isMobile()" mat-icon-button (click)="sidenavOpen.set(false)" class="close-sidenav-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active-item" (click)="onNavItemClick()">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Inicio</span>
            </a>

            <!-- Dynamic database menus -->
            <ng-container *ngFor="let item of menus()">
              <div class="menu-section-label" *ngIf="item.submenu && item.submenu.length > 0">
                {{ item.label }}
              </div>

              <ng-container *ngFor="let sub of item.submenu">
                <a mat-list-item [routerLink]="'/' + sub.url" routerLinkActive="active-item" (click)="onNavItemClick()">
                  <mat-icon matListItemIcon>{{ sub.icon || 'arrow_right' }}</mat-icon>
                  <span matListItemTitle>{{ sub.label }}</span>
                </a>
              </ng-container>

              <a mat-list-item *ngIf="!item.submenu || item.submenu.length === 0" [routerLink]="'/' + item.url" routerLinkActive="active-item" (click)="onNavItemClick()">
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
      overflow: hidden;
    }
    .main-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: linear-gradient(135deg, #0f2027 0%, #15303c 50%, #203a43 100%);
      color: #ffffff;
      box-shadow: 0 3px 12px rgba(15, 32, 39, 0.25);
      height: 60px;
      padding: 0 16px;
      display: flex;
      align-items: center;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ffffff;
      text-decoration: none;
      margin-left: 8px;
      font-weight: 700;
      letter-spacing: 0.6px;
      font-family: 'Poppins', sans-serif;
    }
    .brand-icon {
      font-size: 24px;
      color: #00e5ff;
    }
    .brand-short {
      display: none;
    }
    .flex-spacer {
      flex: 1 1 auto;
    }
    .user-greeting {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-right: 14px;
      line-height: 1.25;
    }
    .greeting-text {
      font-size: 0.85rem;
      font-weight: 500;
      color: #ffffff;
    }
    .role-badge {
      font-size: 0.7rem;
      background: rgba(0, 229, 255, 0.15);
      color: #00e5ff;
      border: 1px solid rgba(0, 229, 255, 0.3);
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #4fd1c5;
      color: #0b3a35;
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .user-btn {
      padding: 0 4px;
    }
    .menu-user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
    }
    .mobile-role-text {
      font-size: 0.75rem;
      color: #0284c7;
      font-weight: 600;
      margin-top: 4px;
    }
    .sidenav-container {
      flex: 1;
      height: calc(100vh - 60px);
    }
    .main-sidenav {
      width: 280px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
    }
    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      font-weight: 700;
      font-size: 0.88rem;
      color: #0f2027;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      mat-icon {
        color: #0284c7;
      }
    }
    .menu-section-label {
      padding: 14px 20px 6px 20px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .active-item {
      background: #f0fdf4 !important;
      color: #0f2027 !important;
      font-weight: 700;
      border-left: 4px solid #00b8d4;
      mat-icon {
        color: #00b8d4 !important;
      }
    }
    .main-content {
      padding: 24px;
      background: #eef1f4;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* RESPONSIVE BREAKPOINTS (Mobile & Tablet) */
    @media (max-width: 860px) {
      .main-topbar {
        padding: 0 10px;
        height: 56px;
      }
      .brand-long {
        display: none;
      }
      .brand-short {
        display: inline;
        font-size: 1.05rem;
      }
      .user-greeting {
        display: none;
      }
      .user-dropdown-arrow {
        display: none;
      }
      .main-content {
        padding: 12px 10px;
      }
      .sidenav-container {
        height: calc(100vh - 56px);
      }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private bpSub?: Subscription;

  readonly user = this.authService.currentUser;
  readonly menus = this.authService.currentMenu;
  readonly isMobile = signal(false);
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

  ngOnInit(): void {
    this.bpSub = this.breakpointObserver.observe(['(max-width: 860px)']).subscribe((state) => {
      const mobile = state.matches;
      this.isMobile.set(mobile);
      if (mobile) {
        this.sidenavOpen.set(false);
      } else {
        this.sidenavOpen.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }

  onNavItemClick(): void {
    if (this.isMobile()) {
      this.sidenavOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
