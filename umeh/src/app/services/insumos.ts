import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Medicamento } from '../modelos/medicamento';
import { Triage } from '../modelos/triage';
import { Procedimiento } from '../modelos/procedimiento';
import { environment } from '../../environments/environment';

export interface NuevoMedicamento {
  tipo: 'medicamento';
  nombre: string;
  cantidad: number;
  unidad?: string | null;
  costo_unitario?: number | null;
  metodo_aplicacion: number[];
}

export interface NuevoMaterial {
  tipo: 'material';
  nombre: string;
  cantidad: number;
  unidad?: string | null;
  costo_unitario?: number | null;
}

export type NuevoInsumo = NuevoMedicamento | NuevoMaterial;

@Injectable({
  providedIn: 'root'
})
export class InsumoService {
  private baseUrl = environment.apiUrl;
  private medicamentosURL = `${this.baseUrl}/medicamentos`;
  private triageURL = `${this.baseUrl}/triage`;
  private procedimientoURL = `${this.baseUrl}/procedimientos`;
  private resumenURL = `${this.baseUrl}/dashboard/resumen`;

  private medicamentosCache: Medicamento[] | null = null;
  private triageCache: Triage[] | null = null;
  private procedimientoCache: Procedimiento[] | null = null;

  constructor(private http: HttpClient) { }

  // "********************************************************************************************************"
  // "* METODOS MEDICAMENTOS *
  // "********************************************************************************************************"
  getInsumos(): Observable<Medicamento[]> {
    if (this.medicamentosCache) {

      return of(this.medicamentosCache);
    }

    return this.http.get<Medicamento[]>(this.medicamentosURL).pipe(
      tap(data => this.medicamentosCache = data),
      catchError((error) => {
        console.error("❌ Error en la llamada HTTP:", error.message || error);
        return throwError(() => new Error('No se pudo obtener la lista de insumos'));
      })
    );
  }

  getResumen(): Observable<{ total_meds: number; stock_bajo: number; total_triage: number }> {
    const url = this.resumenURL;
    return this.http.get<{ total_meds: number; stock_bajo: number; total_triage: number }>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo resumen:', error.message || error);
        return throwError(() => new Error('Error obteniendo resumen: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Obtener el material de triage
  getMaterial_Triage(): Observable<Triage[]> {
    if (this.triageCache) {

      return of(this.triageCache);
    }

    return this.http.get<Triage[]>(this.triageURL).pipe(
      tap(data => this.triageCache = data),
      catchError((error) => {
        console.error("❌ Error en la llamada HTTP:", error.message || error);
        return throwError(() => new Error('No se pudo obtener la lista de insumos'));
      })
    );
  }

  // Actualizar cantidad de un material de triage por ID
  updateTriage(id: number, payload: Partial<Pick<Triage, 'cantidad'>>): Observable<Triage> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }
    if (payload.cantidad === undefined) {
      return throwError(() => new Error('Debe proporcionar cantidad a actualizar'));
    }

    return this.http.put<Triage>(`${this.triageURL}/${id}`, payload).pipe(
      tap((updated) => {
        if (this.triageCache) {
          const idx = this.triageCache.findIndex(t => t.id === updated.id);
          if (idx !== -1) {
            this.triageCache[idx] = { ...this.triageCache[idx], ...updated };
          }
        }
      }),
      catchError((error) => {
        return throwError(() => new Error('Error al actualizar triage: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Agregar un nuevo insumo con tipado estricto por discriminante
  addInsumo(insumo: NuevoMedicamento): Observable<Medicamento>;
  addInsumo(insumo: NuevoMaterial): Observable<Triage>;
  addInsumo(insumo: NuevoInsumo): Observable<Medicamento | Triage> {
    // Soporta payloads sin 'tipo' explícito (fallback por presencia de metodo_aplicacion)
    const isMedicamento = (insumo as any)?.tipo === 'medicamento' || Array.isArray((insumo as any)?.metodo_aplicacion);
    const url = isMedicamento ? this.medicamentosURL : this.triageURL;

    return this.http.post<Medicamento | Triage>(url, insumo).pipe(
      tap((nuevo) => {
        // Sólo actualizamos la cache de medicamentos cuando se agrega un medicamento
        if (isMedicamento && this.medicamentosCache) {
          this.medicamentosCache.push(nuevo as Medicamento);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(' Error al agregar insumo:', error);
        return throwError(() => new Error('No se pudo agregar el insumo: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Actualizar un medicamento parcialmente por ID (nombre y/o cantidad)
  updateInsumo(id: number, payload: Partial<Pick<Medicamento, 'nombre' | 'cantidad'>>): Observable<Medicamento> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }
    if (payload.nombre === undefined && payload.cantidad === undefined) {
      return throwError(() => new Error('Debe proporcionar al menos un campo a actualizar (nombre o cantidad)'));
    }

    return this.http.put<Medicamento>(`${this.medicamentosURL}/${id}`, payload).pipe(
      tap((updated) => {
        if (this.medicamentosCache) {
          const idx = this.medicamentosCache.findIndex(i => i.id === updated.id);
          if (idx !== -1) {
            this.medicamentosCache[idx] = { ...this.medicamentosCache[idx], ...updated };
          }
        }
      }),
      catchError((error) => {
        console.error(' Error al actualizar insumo:', error);
        return throwError(() => new Error('Error al actualizar insumo: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Eliminar un medicamento por ID
  deleteInsumo(id: number): Observable<{ message: string; medicamento: Medicamento } | Medicamento> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }

    return this.http.delete<{ message: string; medicamento: Medicamento } | Medicamento>(`${this.medicamentosURL}/${id}`).pipe(
      tap((res: any) => {
        const deleted: Medicamento | undefined = res?.insumo ?? res;
        if (this.medicamentosCache && deleted) {
          this.medicamentosCache = this.medicamentosCache.filter(i => i.id !== (deleted.id ?? id));
        } else if (this.medicamentosCache) {
          this.medicamentosCache = this.medicamentosCache.filter(i => i.id !== id);
        }
      }),
      catchError((error) => {
        console.error(' Error al eliminar medicamento:', error);
        return throwError(() => new Error('Error al eliminar medicamento: ' + (error.error?.message || error.message)));
      })
    );
  }

  crearProcedimiento(data: any): Observable<any> {
    return this.http.post(this.procedimientoURL, data);
  }

  getProcedimientos(): Observable<Procedimiento[]> {
    if (this.procedimientoCache) {
      return of(this.procedimientoCache);
    }

    return this.http.get<Procedimiento[]>(this.procedimientoURL).pipe(
      tap(data => this.procedimientoCache = data),
      catchError((error) => {
        console.error('❌ Error obteniendo procedimientos:', error.message || error);
        return throwError(() => new Error('No se pudo obtener la lista de procedimientos'));
      })
    );
  }

  // Método opcional para invalidar la cache
  clearCache() {
    this.medicamentosCache = null;
    this.triageCache = null; // 🔥 Agregar esta línea
  }
}