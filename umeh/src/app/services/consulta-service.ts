// services/consulta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface Consulta {
  id_consulta: number;
  fecha: string;
  estatus: string;
  motivo?: string;
  total: number;
  activo: boolean;
  paciente_nombre?: string;
  paciente_apellidos?: string;
  medico_nombre?: string;
  medico_apellidos?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultaService {

  public apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

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

  // Obtener datos para hoja de consulta
  obtenerHojaConsulta(id_consulta: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consultas/${id_consulta}/hoja`);
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

  // Buscar medicamentos
  buscarMedicamentos(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/consultas/medicamentos/buscar`, { params });
  }

  // Buscar materiales
  buscarMateriales(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/consultas/materiales/buscar`, { params });
  }

  // Buscar materiales generales
  buscarMatGeneral(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/consultas/mat-general/buscar`, { params });
  }

  // Buscar procedimientos
  buscarProcedimientos(busqueda: string): Observable<any[]> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<any[]>(`${this.apiUrl}/consultas/procedimientos/buscar`, { params });
  }

  // Costos adicionales
  obtenerExtras(id_consulta: number) {
    return this.http.get(`${this.apiUrl}/consultas/extras/${id_consulta}/extras`);
  }

  agregarExtra(id_consulta: number, concepto: string, costo: number, observaciones?: string) {
    return this.http.post(`${this.apiUrl}/consultas/extras/${id_consulta}/extras`, {
      concepto, costo, observaciones
    });
  }

  eliminarExtra(id_extra: number) {
    return this.http.delete(`${this.apiUrl}/consultas/extras/extras/${id_extra}`);
  }

  // Costo de consulta
  actualizarCostoConsulta(id_consulta: number, data: any) {
    return this.http.patch(`${this.apiUrl}/consultas/actCosto/${id_consulta}`, data);
  }

  obtenerConsultasActivas() {
    return this.http.get<Consulta[]>(`${this.apiUrl}/consultas/activas`);
  }

  crearConsulta(id_paciente: number, id_medico: number, motivo: string) {
    return this.http.post(`${this.apiUrl}/consultas/crearConsulta`, {
      id_paciente, id_medico, motivo
    });
  }

  actualizarEstatus(id_consulta: number, nuevoEstatus: string) {
    return this.http.patch(`${this.apiUrl}/consultas/actConsulta/${id_consulta}/estatus`, { nuevoEstatus });
  }


  actualizarEstadoCita(id_cita: number, estado: string) {
    return this.http.patch(`${this.apiUrl}/citas/${id_cita}/estado`, {
      estado
    });
  }

  finalizarConsulta(id_consulta: number, observaciones?: string) {
    return this.http.put(`${this.apiUrl}/consultas/${id_consulta}/finalizar`, { observaciones });
  }

  // En tu consulta-service.ts - agregar estos métodos

  generarNotaRemision(idConsulta: number, modoDetallado: boolean = false): Observable<any> {
    return this.http.get(`${this.apiUrl}/notas/${idConsulta}/nota-remision`, {
      params: { modo_detallado: modoDetallado.toString() },
      responseType: 'blob'
    });
  }

  actualizarModoNotaRemision(idConsulta: number, modoDetallado: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notas/${idConsulta}/modo-nota`, {
      modo_detallado: modoDetallado
    });
  }

  getHistorialConsultas(filtro: any) {
    return this.http.get<any[]>(
      `${this.apiUrl}/notas/historial`, {
      params: {
        nombre: filtro.nombre,
        apellidos: filtro.apellidos,
        fecha: filtro.fecha
      }
    }
    );
  }

  // ✅ NUEVO: Cancelar consulta y restaurar inventario
  cancelarConsulta(id_consulta: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/consultas/${id_consulta}/cancelar`, {});
  }
}