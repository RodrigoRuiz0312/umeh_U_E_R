export interface Medicamento {
    id: number;
    nombre: string;
    cantidad: number;
    costo: number;
    metodo_aplicacion: number[]; // IDs de métodos
}  