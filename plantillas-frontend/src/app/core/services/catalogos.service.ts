import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedResult } from './plantillas.service';
import { AuthService } from '../auth/auth.service';

export interface CatalogoItem {
  id_catalogo?: number;
  nombre: string;
  descripcion?: string;
  estado: string;
  propietario?: number;
  _usuario_creacion?: number;
  _fecha_creacion?: string;
  _fecha_modificacion?: string;
  documentos?: any[];
  usuarios?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = '/api/v1/plantillasFormly/catalogo';

  private get userId(): number {
    return this.authService.currentUser()?.id || 1;
  }

  getMisCatalogos(filter = ''): Observable<ApiResponse<PaginatedResult<CatalogoItem>>> {
    let params = new HttpParams();
    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<ApiResponse<PaginatedResult<CatalogoItem>>>(
      `${this.baseUrl}/${this.userId}/miscatalogos`,
      { params }
    );
  }

  getCompartidos(filter = ''): Observable<ApiResponse<PaginatedResult<CatalogoItem>>> {
    let params = new HttpParams();
    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<ApiResponse<PaginatedResult<CatalogoItem>>>(
      `${this.baseUrl}/${this.userId}/compartidos`,
      { params }
    );
  }

  getCatalogoDetalle(idCatalogo: number): Observable<ApiResponse<CatalogoItem>> {
    return this.http.get<ApiResponse<CatalogoItem>>(`${this.baseUrl}/${idCatalogo}`);
  }

  crearCatalogo(datos: {
    nombre: string;
    descripcion?: string;
    documentos: Array<{ id_documento: number }>;
    usuarios: Array<{ id_usuario: number }>;
  }): Observable<ApiResponse<{ id_catalogo: number }>> {
    return this.http.post<ApiResponse<{ id_catalogo: number }>>(this.baseUrl, datos);
  }

  actualizarCatalogo(
    idCatalogo: number,
    datos: {
      nombre: string;
      descripcion?: string;
      documentos?: Array<{ id_documento: number }>;
      usuarios?: Array<{ id_usuario: number }>;
    }
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${idCatalogo}`, datos);
  }

  eliminarCatalogo(idCatalogo: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${idCatalogo}/miscatalogos`);
  }
}
