import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = 'http://localhost:4000/api';

  constructor(private http: HttpClient) { }

  // Pacientes
  getPacientes(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/pacientes`).pipe(
      map((resp) => Array.isArray(resp) ? resp : (resp?.pacientes ?? []))
    );
  }

  buscarPacientes(nombre?: string, apellidos?: string): Observable<any[]> {
    let params: any = {};
    if (nombre) params.nombre = nombre;
    if (apellidos) params.apellidos = apellidos;
    return this.http.get<any[]>(`${this.base}/pacientes/buscar`, { params });
  }

  crearPaciente(data: any): Observable<any> {
    return this.http.post(`${this.base}/pacientes`, data);
  }

  actualizarPaciente(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/pacientes/${id}`, data);
  }

  deletePaciente(id: number): Observable<any> {
    return this.http.delete(`${this.base}/pacientes/${id}`);
  }

  crearConsulta(consulta: any) {
    return this.http.post('/api/consultas', consulta);
  }

  buscarCitasPorPacientes(nombre: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/citas/buscar-paciente`, { params: { nombre } });
  }


  // Doctores
  getDoctores(): Observable<any[]> {
    return this.http.get<any>(`${this.base}/doctores`).pipe(
      map((resp) => Array.isArray(resp) ? resp : (resp?.doctores ?? resp ?? []))
    );
  }

  crearDoctor(data: any): Observable<any> {
    return this.http.post(`${this.base}/doctores`, data);
  }

  actualizarDoctor(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/doctores/${id}`, data);
  }

  deleteDoctor(id: number): Observable<any> {
    return this.http.delete(`${this.base}/doctores/${id}`);
  }

  // Citas / Agenda
  getAgenda(fecha: string, especialidad: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/citas/agenda`, { params: { fecha, especialidad } });
  }

  getConsultoriosDisponibles(fecha: string, hora: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/citas/consultorios-disponibles`, { params: { fecha, hora } });
  }

  crearCita(data: any): Observable<any> {
    return this.http.post(`${this.base}/citas`, data);
  }

  getAgendaCompletaDelDia(fecha: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/citas/hoy`, { params: { fecha } });
  }

  actualizarEstadoCita(id: number, estado:string): Observable<any>{
    return this.http.patch(`${this.base}/citas/${id}/estado`, { estado });
  }

  // Medicamentos
  getMedicamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/medicamentos`);
  }

  crearMedicamento(data: any): Observable<any> {
    return this.http.post(`${this.base}/medicamentos`, data);
  }

  actualizarMedicamento(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/medicamentos/${id}`, data);
  }

  deleteMedicamento(id: number): Observable<any> {
    return this.http.delete(`${this.base}/medicamentos/${id}`);
  }

  getMetodosAplicacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/medicamentos/metodos-aplicacion`);
  }

  // Material de Triage
  getMaterialTriage(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/mat_triage`);
  }

  crearMaterialTriage(data: any): Observable<any> {
    return this.http.post(`${this.base}/mat_triage`, data);
  }

  actualizarMaterialTriage(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/mat_triage/${id}`, data);
  }

  deleteMaterialTriage(id: number): Observable<any> {
    return this.http.delete(`${this.base}/mat_triage/${id}`);
  }

  // Material General
  getMaterialGeneral(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/mat_general`);
  }

  crearMaterialGeneral(data: any): Observable<any> {
    return this.http.post(`${this.base}/mat_general`, data);
  }

  actualizarMaterialGeneral(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/mat_general/${id}`, data);
  }

  deleteMaterialGeneral(id: number): Observable<any> {
    return this.http.delete(`${this.base}/mat_general/${id}`);
  }

  // Procedimientos
  getProcedimientos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/procedimientos`);
  }

  crearProcedimiento(data: any): Observable<any> {
    return this.http.post(`${this.base}/procedimientos`, data);
  }

  actualizarProcedimiento(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/procedimientos/${id}`, data);
  }

  deleteProcedimiento(id: number): Observable<any> {
    return this.http.delete(`${this.base}/procedimientos/${id}`);
  }
}
