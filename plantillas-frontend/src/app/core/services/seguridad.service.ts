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
  abreviacion?: string;
  fid_unidad_padre?: number | null;
  estado: string;
  es_colectiva?: boolean;
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
  es_mae?: boolean;
  contrasena?: string;
  unidad?: {
    id_unidad: number;
    nombre: string;
    abreviacion?: string;
  };
  usuario_rol?: Array<{
    id_usuario_rol?: number;
    fid_rol?: number;
    rol?: { id_rol: number; nombre: string };
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

  crearUsuario(usuario: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/usuario`, usuario);
  }

  actualizarUsuario(id: number, usuario: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/usuario/${id}`, usuario);
  }

  eliminarUsuario(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/usuario/${id}`);
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

  getUsuariosVirtuales(): Observable<ApiResponse<{ total: number; resultado: any[] }>> {
    return this.http.get<ApiResponse<{ total: number; resultado: any[] }>>(`${this.baseUrl}/virtual`);
  }

  getTodosUsuariosVirtuales(): Observable<ApiResponse<{ total: number; resultado: any[] }>> {
    return this.http.get<ApiResponse<{ total: number; resultado: any[] }>>(`${this.baseUrl}/virtual/todos`);
  }

  cambiarUsuarioVirtual(idUsuario: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/virtual/cambiar/${idUsuario}`);
  }

  verificarUsuarioVirtual(): Observable<ApiResponse<{ esVirtual: boolean; nroDocumento?: string }>> {
    return this.http.get<ApiResponse<{ esVirtual: boolean; nroDocumento?: string }>>(`${this.baseUrl}/virtual/verificar`);
  }

  crearRol(rol: Partial<Rol>): Observable<ApiResponse<Rol>> {
    return this.http.post<ApiResponse<Rol>>(`${this.baseUrl}/rol`, rol);
  }

  actualizarRol(id: number, rol: Partial<Rol>): Observable<ApiResponse<Rol>> {
    return this.http.put<ApiResponse<Rol>>(`${this.baseUrl}/rol/${id}`, rol);
  }

  eliminarRol(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/rol/${id}`);
  }

  getRolMenus(idRol: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/rol/${idRol}/menu`);
  }

  actualizarRolMenus(idRol: number, payload: { rol: any; menus: any[]; menus_nuevos: number[] }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/rol/${idRol}/menu`, payload);
  }

  crearUnidad(unidad: Partial<Unidad>): Observable<ApiResponse<Unidad>> {
    return this.http.post<ApiResponse<Unidad>>(`${this.baseUrl}/unidad`, unidad);
  }

  actualizarUnidad(id: number, unidad: Partial<Unidad>): Observable<ApiResponse<Unidad>> {
    return this.http.put<ApiResponse<Unidad>>(`${this.baseUrl}/unidad/${id}`, unidad);
  }

  eliminarUnidad(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/unidad/${id}`);
  }

  fusionarUnidades(origenId: number, destinoId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/unidad/fusionar`, { origen_id: origenId, destino_id: destinoId });
  }

  getMenuRoles(idMenu: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/menu/${idMenu}/roles`);
  }

  actualizarMenuRoles(idMenu: number, roles: number[]): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/menu/${idMenu}/roles`, { roles });
  }

  eliminarMenu(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/menu/${id}`);
  }
}

