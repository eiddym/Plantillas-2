import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlantillaFormly {
  id_plantilla_formly?: number;
  nombre: string;
  abreviacion: string;
  plantilla: string; // JSON string of FormlyFieldConfig[]
  plantilla_valor?: string | null;
  estado?: string;
  _usuario_creacion?: number;
  _usuario_modificacion?: number;
  _fecha_creacion?: string;
  _fecha_modificacion?: string;
}

export interface ApiResponse<T> {
  tipoMensaje: string;
  mensaje: string;
  datos: T;
}

export interface PaginatedResult<T> {
  total: number;
  resultado: T[];
}

@Injectable({
  providedIn: 'root'
})
export class PlantillasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/plantillasFormly';

  getPlantillas(limit = 10, page = 1, filter = ''): Observable<ApiResponse<PaginatedResult<PlantillaFormly>>> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', '-id_plantilla_formly');

    if (filter) {
      params = params.set('filter', filter);
    }

    return this.http.get<ApiResponse<PaginatedResult<PlantillaFormly>>>(
      `${this.baseUrl}/plantilla_formly`,
      { params }
    );
  }

  getPlantilla(id: number): Observable<ApiResponse<PlantillaFormly>> {
    return this.http.get<ApiResponse<PlantillaFormly>>(`${this.baseUrl}/plantilla_formly/${id}`);
  }

  crearPlantilla(plantilla: PlantillaFormly): Observable<ApiResponse<PlantillaFormly>> {
    return this.http.post<ApiResponse<PlantillaFormly>>(`${this.baseUrl}/plantilla_formly`, plantilla);
  }

  actualizarPlantilla(id: number, plantilla: Partial<PlantillaFormly>): Observable<ApiResponse<PlantillaFormly>> {
    return this.http.put<ApiResponse<PlantillaFormly>>(`${this.baseUrl}/plantilla_formly/${id}`, plantilla);
  }

  generarVistaPrevia(docData: any): Observable<ApiResponse<{ html: string; nombre: string }>> {
    return this.http.post<ApiResponse<{ html: string; nombre: string }>>(
      `${this.baseUrl}/generarDocumento`,
      docData
    );
  }
}
