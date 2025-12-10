export interface TablaConfig {
  paginaActual: number;
  limite: number;
  totalItems: number;
  totalPages: number;
  searchTerm: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

// Configuración inicial por defecto
export const DEFAULT_TABLA_CONFIG: TablaConfig = {
  paginaActual: 1,
  limite: 10,
  totalItems: 0,
  totalPages: 0,
  searchTerm: '',
  sortColumn: 'nombre',
  sortDirection: 'asc'
};