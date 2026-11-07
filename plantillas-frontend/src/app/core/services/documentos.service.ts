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
  nombre_plantilla?: string;
  plantilla_valor?: string;
  fid_plantilla?: number;
  sw?: any;
  firmaron?: any[];
  firmante_actual?: number;
  [key: string]: any;
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

  getDocumentos(limit = 10, page = 1, estado = '', filter = '', bandeja = ''): Observable<ApiResponse<PaginatedResult<Documento>>> {
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
    if (bandeja) {
      params = params.set('bandeja', bandeja);
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

  eliminarDocumento(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/documento/${id}`);
  }

  enviarDocumento(id: number, doc: Partial<Documento>): Observable<ApiResponse<Documento>> {
    const payload = {
      ...doc,
      sw: { enviado: false, enviar: true }
    };
    return this.http.put<ApiResponse<Documento>>(`${this.baseUrl}/documento/${id}`, payload);
  }

  aprobarDocumento(id: number, payload: { derivar?: boolean; usuario_derivar?: number; observaciones?: string } = {}): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/documento/${id}/aprobar`, payload);
  }

  derivarDocumento(id: number, payload: { destino: number; observaciones: string }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/documento/${id}/derivar`, payload);
  }

  rechazarDocumento(id: number, payload: { observaciones: string; observado_por: string }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/documento/${id}/rechazar`, payload);
  }

  recibirDocumento(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/documento/${id}/recibir`, {});
  }

  obtenerVistaPreviaHtml(idOrCite: number | string): Observable<ApiResponse<{ html: string | null; nombre: string; estado?: string; tipoHoja?: string; esPdf?: boolean; pdfUrl?: string; id_documento?: number }>> {
    return this.http.get<ApiResponse<{ html: string | null; nombre: string; estado?: string; tipoHoja?: string; esPdf?: boolean; pdfUrl?: string; id_documento?: number }>>(`${this.baseUrl}/documento/${encodeURIComponent(idOrCite)}/preview`);
  }

  desclasificarDocumento(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/documento/${id}/desclasificar`, {});
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
