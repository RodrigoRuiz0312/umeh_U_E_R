export interface Triage {
    id: number;
    nombre: string;
    cantidad: number;
    unidad: string;
    costo: number;
    costo_unitario?: number; // Campo del backend
}
