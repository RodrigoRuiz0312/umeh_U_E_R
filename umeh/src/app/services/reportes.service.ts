import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InsumoReporte {
  tipo: string;
  id_insumo: number;
  nombre_insumo: string;
  unidad: string;
  cantidad_total: number;
  costo_unitario: number;
  subtotal_total: number;
  num_consultas: number;
}

export interface ReporteInsumosDiarios {
  fecha: string;
  insumos: InsumoReporte[];
  totalesPorTipo: {
    medicamento: number;
    material: number;
    mat_general: number;
    procedimiento: number;
  };
  totalInsumos: number;
  costoConsultas: number;
  costoExtras: number;
  totalGeneral: number;
}

export interface ReporteInsumosRango {
  fecha_inicio: string;
  fecha_fin: string;
  insumos: InsumoReporte[];
  totalesPorTipo: {
    medicamento: number;
    material: number;
    mat_general: number;
    procedimiento: number;
  };
  totalInsumos: number;
  costoConsultas: number;
  costoExtras: number;
  totalGeneral: number;
}

export interface ResumenConsultas {
  fecha: string;
  total_consultas?: number;
  completadas?: number;
  canceladas?: number;
  total_ingresos?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private baseUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene el reporte de insumos utilizados en un día específico
   * @param fecha Fecha en formato YYYY-MM-DD (opcional, por defecto fecha actual)
   */
  obtenerReporteInsumosDiarios(fecha?: string): Observable<ReporteInsumosDiarios> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<ReporteInsumosDiarios>(`${this.baseUrl}/insumos-diarios`, { params });
  }

  /**
   * Obtiene el reporte de insumos utilizados en un rango de fechas
   * @param fecha_inicio Fecha de inicio en formato YYYY-MM-DD
   * @param fecha_fin Fecha de fin en formato YYYY-MM-DD
   */
  obtenerReporteInsumosRango(fecha_inicio: string, fecha_fin: string): Observable<ReporteInsumosRango> {
    const params = new HttpParams()
      .set('fecha_inicio', fecha_inicio)
      .set('fecha_fin', fecha_fin);
    return this.http.get<ReporteInsumosRango>(`${this.baseUrl}/insumos-rango`, { params });
  }

  /**
   * Obtiene el resumen de consultas del día
   * @param fecha Fecha en formato YYYY-MM-DD (opcional, por defecto fecha actual)
   */
  obtenerResumenConsultasDia(fecha?: string): Observable<ResumenConsultas> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<ResumenConsultas>(`${this.baseUrl}/resumen-consultas`, { params });
  }
}
