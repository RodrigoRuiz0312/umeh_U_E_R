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

  buscarPacientes(nombre: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/pacientes/buscar`, { params: { nombre } });
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

  actualizarEstadoCita(id: number, estado:string): Observable<any>{
    return this.http.patch(`${this.base}/citas/${id}/estado`, { estado });
  }
}
