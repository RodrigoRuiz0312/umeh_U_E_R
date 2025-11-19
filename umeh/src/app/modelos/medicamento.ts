export interface Medicamento {
    id: number;
    nombre: string;
    cantidad: number;
    unidad?: string; // Opcional: piezas, ml, mg, etc.
    costo: number;
    metodo_aplicacion: number[]; // IDs de métodos
}  