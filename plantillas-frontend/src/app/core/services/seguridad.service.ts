import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedResult } from './plantillas.service';

export interface Rol {
  id_rol?: number;
  nombre: string;
  descripcion?: string;
  peso?: number;
  estado: string;
}

export interface Unidad {
  id_unidad?: number;
  nombre: string;
  descripcion?: string;
  sigla?: string;
  estado: string;
}

export interface UsuarioAdmin {
  id_usuario?: number;
  usuario: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  email: string;
  numero_documento: string;
  estado: string;
  tipo_autenticacion?: string;
  fid_unidad?: number;
  usuario_rol?: Array<{
    id_usuario_rol: number;
    rol: { id_rol: number; nombre: string };
  }>;
}

export interface MenuAdmin {
  id_menu?: number;
  fid_menu_padre?: number | null;
  nombre: string;
  descripcion?: string;
  orden: number;
  ruta: string;
  icono?: string;
  estado: string;
  _fecha_creacion?: string;
  _fecha_modificacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeguridadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/seguridad';

  getUsuarios(): Observable<ApiResponse<UsuarioAdmin[]>> {
    return this.http.get<ApiResponse<UsuarioAdmin[]>>(`${this.baseUrl}/usuario`);
  }

  getRoles(limit = 20, page = 1): Observable<ApiResponse<PaginatedResult<Rol>>> {
    const params = new HttpParams().set('limit', limit.toString()).set('page', page.toString());
    return this.http.get<ApiResponse<PaginatedResult<Rol>>>(`${this.baseUrl}/rol`, { params });
  }

  getUnidades(limit = 20, page = 1): Observable<ApiResponse<PaginatedResult<Unidad>>> {
    const params = new HttpParams().set('limit', limit.toString()).set('page', page.toString());
    return this.http.get<ApiResponse<PaginatedResult<Unidad>>>(`${this.baseUrl}/unidad`, { params });
  }

  getMenus(): Observable<ApiResponse<PaginatedResult<MenuAdmin>>> {
    return this.http.get<ApiResponse<PaginatedResult<MenuAdmin>>>(`${this.baseUrl}/menu`);
  }

  crearMenu(menu: MenuAdmin): Observable<ApiResponse<MenuAdmin>> {
    return this.http.post<ApiResponse<MenuAdmin>>(`${this.baseUrl}/menu`, menu);
  }

  actualizarMenu(id: number, menu: Partial<MenuAdmin>): Observable<ApiResponse<MenuAdmin>> {
    return this.http.put<ApiResponse<MenuAdmin>>(`${this.baseUrl}/menu/${id}`, menu);
  }
}
