// services/consulta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsultaService {
  
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // Búsqueda de pacientes
  buscarPaciente(nombre: string, apellidos?: string): Observable<any[]> {
    let params = new HttpParams().set('nombre', nombre);
    if (apellidos) {
      params = params.set('apellidos', apellidos);
    }
    return this.http.get<any[]>(`${this.apiUrl}/consultas/pacientes/buscar`, { params });
  }

  // Obtener médicos
  obtenerMedicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/consultas/medicos`);
  }

  // Crear consulta
  crearConsulta(id_paciente: number, id_medico: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultas/crearConsulta`, {
      id_paciente,
      id_medico,
      motivo
    });
  }

  // Obtener datos para hoja de consulta
  obtenerHojaConsulta(id_consulta: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consultas/${id_consulta}/hoja`);
  }

  // Actualizar estatus de consulta
  actualizarEstatus(id_consulta: number, estatus: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/consultas/actConsulta/${id_consulta}/estatus`, {
      estatus
    });
  }

  // Obtener insumos de una consulta
  obtenerInsumosConsulta(id_consulta: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/consultas/consultas/${id_consulta}/insumos`);
  }

  // Agregar insumo a consulta
  agregarInsumo(
    id_consulta: number,
    id_insumo: number,
    tipo: string,
    cantidad: number,
    descripcion?: string
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultas/consultas/${id_consulta}/insumos`, {
      id_insumo,
      tipo,
      cantidad,
      descripcion
    });
  }

  // Eliminar insumo
  eliminarInsumo(id_insumo_consulta: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/consultas/consulta-insumos/${id_insumo_consulta}`);
  }

  // Finalizar consulta
  finalizarConsulta(id_consulta: number, observaciones: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultas/finalizarConsulta/${id_consulta}/finalizar`, {
      observaciones
    });
  }

  // Buscar medicamentos
  buscarMedicamentos(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/consultas/medicamentos/buscar`, { params });
  }

  // Buscar materiales
  buscarMateriales(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/materiales/buscar`, { params });
  }

  // Buscar procedimientos
  buscarProcedimientos(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/procedimientos/buscar`, { params });
  }
}