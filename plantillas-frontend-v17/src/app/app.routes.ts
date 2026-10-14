import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'verificar',
    loadComponent: () =>
      import('./features/auth/verificar/verificar.component').then((m) => m.VerificarComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'plantillas',
        loadComponent: () =>
          import('./features/editor-plantillas/plantillas-list.component').then(
            (m) => m.PlantillasListComponent
          )
      },
      {
        path: 'plantillas/nuevo',
        loadComponent: () =>
          import('./features/editor-plantillas/plantilla-editor.component').then(
            (m) => m.PlantillaEditorComponent
          )
      },
      {
        path: 'plantillas/:id/editar',
        loadComponent: () =>
          import('./features/editor-plantillas/plantilla-editor.component').then(
            (m) => m.PlantillaEditorComponent
          )
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/documentos/documentos-list.component').then(
            (m) => m.DocumentosListComponent
          )
      },
      {
        path: 'aprobacion',
        loadComponent: () =>
          import('./features/documentos/documentos-list.component').then(
            (m) => m.DocumentosListComponent
          )
      },
      {
        path: 'firmar',
        loadComponent: () =>
          import('./features/documentos/documentos-list.component').then(
            (m) => m.DocumentosListComponent
          )
      },
      {
        path: 'archivo',
        loadComponent: () =>
          import('./features/documentos/documentos-list.component').then(
            (m) => m.DocumentosListComponent
          )
      },
      {
        path: 'usuario',
        loadComponent: () =>
          import('./features/administracion/usuarios-list.component').then(
            (m) => m.UsuariosListComponent
          )
      },
      {
        path: 'rol',
        loadComponent: () =>
          import('./features/administracion/roles-list.component').then(
            (m) => m.RolesListComponent
          )
      },
      {
        path: 'unidad',
        loadComponent: () =>
          import('./features/administracion/unidades-list.component').then(
            (m) => m.UnidadesListComponent
          )
      },
      {
        path: 'menu',
        redirectTo: 'dashboard'
      },
      {
        path: 'catalogos',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
