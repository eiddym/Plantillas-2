import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedResult } from './plantillas.service';

export interface Documento {
  id_documento?: number;
  nombre: string;
  tipo?: string;
  grupo?: number;
  estado: string;
  de?: string;
  para?: string;
  via?: string;
  ref?: string;
  clasificacion?: 'ORDINARIO' | 'RESERVADO' | 'CONFIDENCIAL' | 'SECRETO';
  clasificacion_mae?: boolean;
  contenido?: any;
  plantilla?: any;
  plantilla_valor?: string;
  fid_plantilla?: number;
  sw?: any;
  firmaron?: any[];
  firmante_actual?: number;
  _usuario_creacion?: number;
  _usuario_modificacion?: number;
  _fecha_creacion?: string;
  _fecha_modificacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/plantillasFormly';

  getDocumentos(limit = 10, page = 1, estado = '', filter = ''): Observable<ApiResponse<PaginatedResult<Documento>>> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', '-id_documento');

    if (estado) {
      params = params.set('estado', estado);
    }
    if (filter) {
      params = params.set('filter', filter);
    }

    return this.http.get<ApiResponse<PaginatedResult<Documento>>>(
      `${this.baseUrl}/documento`,
      { params }
    );
  }

  getDocumento(id: number): Observable<ApiResponse<Documento>> {
    return this.http.get<ApiResponse<Documento>>(`${this.baseUrl}/documento/${id}`);
  }

  crearDocumento(doc: Partial<Documento>): Observable<ApiResponse<Documento>> {
    return this.http.post<ApiResponse<Documento>>(`${this.baseUrl}/documento`, doc);
  }

  actualizarDocumento(id: number, doc: Partial<Documento>): Observable<ApiResponse<Documento>> {
    return this.http.put<ApiResponse<Documento>>(`${this.baseUrl}/documento/${id}`, doc);
  }

  obtenerVistaPreviaHtml(idDocumento: number): Observable<ApiResponse<{ html: string; nombre: string }>> {
    return this.http.get<ApiResponse<{ html: string; nombre: string }>>(`${this.baseUrl}/documento/${idDocumento}/preview`);
  }

  generarPdfDocumento(cite: string, force = false): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/documentoPDF`, { cite, force }, { responseType: 'blob' });
  }

  getDocumentosParaFirmar(limit = 10, page = 1, filter = ''): Observable<ApiResponse<PaginatedResult<Documento>>> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('order', '-id_documento');

    if (filter) {
      params = params.set('filter', filter);
    }

    return this.http.get<ApiResponse<PaginatedResult<Documento>>>('/api/v1/documento/firmar', { params });
  }
}
