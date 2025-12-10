import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatGeneral } from '../../modelos/mat-general';
import { InsumoService } from '../../services/insumos.service';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { TablaConfig, DEFAULT_TABLA_CONFIG } from '../../modelos/tabla-config';

@Component({
  selector: 'app-mat-general',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, FormsModule],
  templateUrl: './mat-general.html',
  styleUrl: './mat-general.css',
  providers: [MessageService]
})
export class MatGeneralComponent implements OnInit, OnDestroy {
  matGeneral: MatGeneral[] = [];
  error: string | null = null;
  loading = true;
  
  // Usar modelo TablaConfig
  config: TablaConfig = { ...DEFAULT_TABLA_CONFIG };
  
  // Debounce para búsqueda
  private searchTimeout: any = null;
  
  // estado del modal de edición
  modalOpen = false;
  selectedMatGeneral: MatGeneral | null = null;
  editedCantidad: number | null = null;
  nombreNuevo: string = '';
  unidadNueva: string = '';
  costoNuevo: number | null = null;
  loadingRows = Array.from({ length: 10 });

  constructor(
    private insumosService: InsumoService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    console.log("🚀 Cargando material general desde la base de datos...");
    this.cargarMatGeneral();
  }

  cargarMatGeneral() {
    this.loading = true;
    this.insumosService.getMatGeneral(
      this.config.paginaActual,
      this.config.limite,
      this.config.searchTerm,
      this.config.sortColumn,
      this.config.sortDirection
    ).subscribe({
      next: (response) => {
        console.log("✅ Datos recibidos:", response);
        // Los datos ya vienen filtrados y ordenados del servidor
        this.matGeneral = (response.data || []).map(d => ({
          ...d,
          costo_unitario: Number(d.costo_unitario ?? 0)
        }));
        
        // Metadatos de paginación
        this.config.totalItems = response.meta.totalItems;
        this.config.totalPages = response.meta.totalPages;
        
        this.loading = false;
        
        if (!response.data || response.data.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: this.config.searchTerm ? 'No se encontraron resultados.' : 'No hay material general para mostrar.',
            sticky: false,
            life: 3000
          });
        }
      },
      error: (err) => {
        console.error("❌ Error al cargar material general:", err);
        this.error = "No se cargó el material general.";
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.error,
          sticky: true
        });
      }
    });
  }

  onSearchTermChange() {
    // Cancelar búsqueda anterior si existe
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Esperar 500ms después de que el usuario deje de escribir
    this.searchTimeout = setTimeout(() => {
      this.config.paginaActual = 1; // Resetear a página 1 al buscar
      this.cargarMatGeneral();
    }, 500);
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');
    const validCols = ['nombre', 'cantidad', 'costo_unitario'] as const;
    if (col && (validCols as readonly string[]).includes(col)) {
      this.config.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.config.sortDirection = dir;
    }
    this.config.paginaActual = 1; // Resetear a página 1 al ordenar
    this.cargarMatGeneral();
  }

  openEdit(item: MatGeneral) {
    this.selectedMatGeneral = item;
    this.nombreNuevo = item.nombre;
    this.editedCantidad = item.cantidad;
    this.unidadNueva = item.unidad;
    this.costoNuevo = item.costo_unitario || 0;
    this.modalOpen = true;
  }

  closeEdit() {
    this.modalOpen = false;
    this.selectedMatGeneral = null;
    this.nombreNuevo = '';
    this.editedCantidad = null;
    this.unidadNueva = '';
    this.costoNuevo = null;
  }

  saveEdit() {
    if (!this.selectedMatGeneral) return;

    const nombre = this.nombreNuevo.trim();
    const cantidad = Number(this.editedCantidad);
    const unidad = this.unidadNueva.trim();
    const costo_unitario = Number(this.costoNuevo);

    if (!nombre) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'El nombre no puede estar vacío.' });
      return;
    }
    if (Number.isNaN(cantidad) || cantidad < 0) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'La cantidad debe ser numérica y positiva.' });
      return;
    }
    if (!unidad) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'La unidad no puede estar vacía.' });
      return;
    }
    if (Number.isNaN(costo_unitario) || costo_unitario < 0) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'El costo debe ser numérico y positivo.' });
      return;
    }

    const sinCambios = (
      nombre === this.selectedMatGeneral.nombre &&
      cantidad === this.selectedMatGeneral.cantidad &&
      unidad === this.selectedMatGeneral.unidad &&
      costo_unitario === (this.selectedMatGeneral.costo_unitario || 0)
    );

    if (sinCambios) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No se realizaron modificaciones.' });
      this.closeEdit();
      return;
    }

    const datosActualizados = {
      nombre,
      cantidad,
      unidad,
      costo_unitario
    };

    this.insumosService.updateMatGeneral(this.selectedMatGeneral.id, datosActualizados).subscribe({
      next: (actualizado: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Material general actualizado correctamente.'
        });
        this.closeEdit();
        // Recargar la página actual
        this.cargarMatGeneral();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al actualizar',
          detail: err.message || 'Ocurrió un error.'
        });
      }
    });
  }

  // Lógica para el modal de eliminación
  modalEliminarVisible: boolean = false;
  materialAEliminar: MatGeneral | null = null;

  confirmarEliminacion(material: MatGeneral) {
    this.materialAEliminar = material;
    this.modalEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.materialAEliminar = null;
  }

  ejecutarEliminacion() {
    if (!this.materialAEliminar) return;

    this.insumosService.deleteMatGeneral(this.materialAEliminar.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Material "${this.materialAEliminar!.nombre}" eliminado.`
        });
        this.cancelarEliminacion();
        // Recargar la página actual
        this.cargarMatGeneral();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail: err.message || 'Ocurrió un error.'
        });
        this.cancelarEliminacion();
      }
    });
  }

  // Métodos de paginación
  irAPaginaAnterior() {
    if (this.config.paginaActual > 1) {
      this.config.paginaActual--;
      this.cargarMatGeneral();
    }
  }

  irAPaginaSiguiente() {
    if (this.config.paginaActual < this.config.totalPages) {
      this.config.paginaActual++;
      this.cargarMatGeneral();
    }
  }

  irAPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.config.totalPages) {
      this.config.paginaActual = pagina;
      this.cargarMatGeneral();
    }
  }

  get paginasArray(): number[] {
    return Array.from({ length: this.config.totalPages }, (_, i) => i + 1);
  }

  ngOnDestroy() {
    // Limpiar timeout al destruir el componente
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}
