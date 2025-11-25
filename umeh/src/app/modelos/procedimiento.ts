export interface Procedimiento {
    id_procedimiento: number;
    procedimiento: string;
    observaciones: string;
    costos_detalle: { responsable: string; costo: number }[];
    costo_total: number;
    insumos_detalle: { id_insumo: number; insumo: string; tipo: string; cantidad: number }[];
}
