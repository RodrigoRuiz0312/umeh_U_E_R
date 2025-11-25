import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Medicamento } from '../modelos/medicamento';
import { Triage } from '../modelos/triage';
import { MatGeneral } from '../modelos/mat-general';
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

export interface NuevoMatGeneral {
  tipo: 'mat_general';
  nombre: string;
  cantidad: number;
  unidad?: string | null;
  costo_unitario?: number | null;
}

export type NuevoInsumo = NuevoMedicamento | NuevoMaterial | NuevoMatGeneral;

@Injectable({
  providedIn: 'root'
})
export class InsumoService {
  private baseUrl = environment.apiUrl;
  private medicamentosURL = `${this.baseUrl}/medicamentos`;
  private triageURL = `${this.baseUrl}/triage`;
  private matGeneralURL = `${this.baseUrl}/mat_general`;
  private procedimientoURL = `${this.baseUrl}/procedimientos`;
  private resumenURL = `${this.baseUrl}/dashboard/resumen`;

  private medicamentosCache: Medicamento[] | null = null;
  private triageCache: Triage[] | null = null;
  private matGeneralCache: MatGeneral[] | null = null;
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

  // Obtener el material general
  getMatGeneral(): Observable<MatGeneral[]> {
    if (this.matGeneralCache) {
      return of(this.matGeneralCache);
    }

    return this.http.get<MatGeneral[]>(this.matGeneralURL).pipe(
      tap(data => this.matGeneralCache = data),
      catchError((error) => {
        console.error("❌ Error en la llamada HTTP:", error.message || error);
        return throwError(() => new Error('No se pudo obtener la lista de material general'));
      })
    );
  }

  // Actualizar material de triage por ID (todos los campos)
  updateTriage(id: number, payload: Partial<Triage>): Observable<Triage> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }
    if (payload.nombre === undefined && payload.cantidad === undefined && payload.unidad === undefined && (payload as any).costo_unitario === undefined) {
      return throwError(() => new Error('Debe proporcionar al menos un campo a actualizar'));
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

  // Actualizar material general por ID (todos los campos)
  updateMatGeneral(id: number, payload: Partial<MatGeneral>): Observable<MatGeneral> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }
    if (payload.nombre === undefined && payload.cantidad === undefined && payload.unidad === undefined && (payload as any).costo_unitario === undefined) {
      return throwError(() => new Error('Debe proporcionar al menos un campo a actualizar'));
    }

    return this.http.put<MatGeneral>(`${this.matGeneralURL}/${id}`, payload).pipe(
      tap((updated) => {
        if (this.matGeneralCache) {
          const idx = this.matGeneralCache.findIndex(mg => mg.id === updated.id);
          if (idx !== -1) {
            this.matGeneralCache[idx] = { ...this.matGeneralCache[idx], ...updated };
          }
        }
      }),
      catchError((error) => {
        return throwError(() => new Error('Error al actualizar material general: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Agregar un nuevo insumo con tipado estricto por discriminante
  addInsumo(insumo: NuevoMedicamento): Observable<Medicamento>;
  addInsumo(insumo: NuevoMaterial): Observable<Triage>;
  addInsumo(insumo: NuevoMatGeneral): Observable<MatGeneral>;
  addInsumo(insumo: NuevoInsumo): Observable<Medicamento | Triage | MatGeneral> {
    const tipo = (insumo as any)?.tipo;
    let url: string;
    
    if (tipo === 'medicamento' || Array.isArray((insumo as any)?.metodo_aplicacion)) {
      url = this.medicamentosURL;
    } else if (tipo === 'mat_general') {
      url = this.matGeneralURL;
    } else {
      url = this.triageURL;
    }

    return this.http.post<Medicamento | Triage | MatGeneral>(url, insumo).pipe(
      tap((nuevo) => {
        if (tipo === 'medicamento' && this.medicamentosCache) {
          this.medicamentosCache.push(nuevo as Medicamento);
        } else if (tipo === 'material' && this.triageCache) {
          this.triageCache.push(nuevo as Triage);
        } else if (tipo === 'mat_general' && this.matGeneralCache) {
          this.matGeneralCache.push(nuevo as MatGeneral);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(' Error al agregar insumo:', error);
        return throwError(() => new Error('No se pudo agregar el insumo: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Actualizar un medicamento parcialmente por ID (nombre, cantidad, unidad, costo)
  updateInsumo(id: number, payload: Partial<Medicamento>): Observable<Medicamento> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }
    if (payload.nombre === undefined && payload.cantidad === undefined && payload.unidad === undefined && (payload as any).costo_unitario === undefined) {
      return throwError(() => new Error('Debe proporcionar al menos un campo a actualizar'));
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

  // Eliminar material de triage por ID
  deleteTriage(id: number): Observable<{ message: string; material: Triage } | Triage> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }

    return this.http.delete<{ message: string; material: Triage } | Triage>(`${this.triageURL}/${id}`).pipe(
      tap((res: any) => {
        const deleted: Triage | undefined = res?.material ?? res;
        if (this.triageCache && deleted) {
          this.triageCache = this.triageCache.filter(t => t.id !== (deleted.id ?? id));
        } else if (this.triageCache) {
          this.triageCache = this.triageCache.filter(t => t.id !== id);
        }
      }),
      catchError((error) => {
        console.error('❌ Error al eliminar material de triage:', error);
        return throwError(() => new Error('Error al eliminar material de triage: ' + (error.error?.message || error.message)));
      })
    );
  }

  // Eliminar material general por ID
  deleteMatGeneral(id: number): Observable<{ message: string; material: MatGeneral } | MatGeneral> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }

    return this.http.delete<{ message: string; material: MatGeneral } | MatGeneral>(`${this.matGeneralURL}/${id}`).pipe(
      tap((res: any) => {
        const deleted: MatGeneral | undefined = res?.material ?? res;
        if (this.matGeneralCache && deleted) {
          this.matGeneralCache = this.matGeneralCache.filter(mg => mg.id !== (deleted.id ?? id));
        } else if (this.matGeneralCache) {
          this.matGeneralCache = this.matGeneralCache.filter(mg => mg.id !== id);
        }
      }),
      catchError((error) => {
        console.error('❌ Error al eliminar material general:', error);
        return throwError(() => new Error('Error al eliminar material general: ' + (error.error?.message || error.message)));
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

  // Actualizar un procedimiento por ID
  updateProcedimiento(id: number, payload: any): Observable<any> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }

    return this.http.put<any>(`${this.procedimientoURL}/${id}`, payload).pipe(
      tap(() => {
        // Invalidar cache para refrescar datos
        this.procedimientoCache = null;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error al actualizar procedimiento:', error);
        return throwError(() => new Error('Error al actualizar procedimiento: ' + (error.error?.error || error.message)));
      })
    );
  }

  // Eliminar un procedimiento por ID
  deleteProcedimiento(id: number): Observable<{ message: string; procedimiento: any }> {
    if (!id) {
      return throwError(() => new Error('ID es requerido'));
    }

    return this.http.delete<{ message: string; procedimiento: any }>(`${this.procedimientoURL}/${id}`).pipe(
      tap((res: any) => {
        if (this.procedimientoCache) {
          this.procedimientoCache = this.procedimientoCache.filter(p => p.id_procedimiento !== id);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error al eliminar procedimiento:', error);
        return throwError(() => new Error('Error al eliminar procedimiento: ' + (error.error?.error || error.message)));
      })
    );
  }

  // ✅ Obtener configuración actual (limiteStock, etc.)
  obtenerConfiguracion(): Observable<any> {
    return this.http.get(`${this.baseUrl}/configuracion`);
  }

  // ✅ Actualizar configuración (nuevo límite de stock)
  actualizarConfiguracion(data: { limiteStock: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/configuracion`, data);
  }


  // Método opcional para invalidar la cache
  clearCache() {
    this.medicamentosCache = null;
    this.triageCache = null;
    this.matGeneralCache = null;
    this.procedimientoCache = null;
  }
}