import { Component, OnInit, OnDestroy } from '@angular/core';
import { Medicamento } from '../../modelos/medicamento';
import { InsumoService } from '../../services/insumos.service';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TablaConfig, DEFAULT_TABLA_CONFIG } from '../../modelos/tabla-config';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, FormsModule],
  templateUrl: './tabla.html',
  styleUrl: './tabla.css',
  providers: [MessageService]
})
export class Tabla implements OnInit, OnDestroy {
  medicamentos: Medicamento[] = [];
  error: string | null = null;
  loading = true;
  
  // Usar modelo TablaConfig
  config: TablaConfig = { ...DEFAULT_TABLA_CONFIG };
  
  // Debounce para búsqueda
  private searchTimeout: any = null;
  // estado del modal de edición
  modalOpen = false;
  selectedMedicamento: Medicamento | null = null;
  editedCantidad: number | null = null;
  nombreNuevo: string = '';
  unidadNueva: string = '';
  costoNuevo: number | null = null;
  metodosDisponibles: { id: number; nombre: string }[] = [];
  metodosSeleccionados = new Set<number>();
  loadingRows = Array.from({ length: 10 });

  constructor(private insumosService: InsumoService,
    private messageService: MessageService,
    private http: HttpClient) { }

  ngOnInit(): void {
    console.log(" Cargando insumos desde la base de datos...");

    // Cargar métodos de aplicación disponibles
    this.http.get<{ id: number; nombre: string }[]>('http://localhost:4000/api/medicamentos/metodos-aplicacion')
      .subscribe({
        next: (data) => {
          this.metodosDisponibles = data;
        },
        error: (err) => console.error('Error cargando métodos:', err)
      });

    // Cargar medicamentos con paginación
    this.cargarInsumos();
  }

  cargarInsumos() {
    this.loading = true;
    this.insumosService.getInsumos(
      this.config.paginaActual, 
      this.config.limite,
      this.config.searchTerm,
      this.config.sortColumn,
      this.config.sortDirection
    ).subscribe({
      next: (response) => {
        // Los datos ya vienen filtrados y ordenados del servidor
        this.medicamentos = (response.data || []).map(d => ({
          ...d,
          costo: Number(d.costo ?? 0), // Asegurar que sea numérico
          metodo_aplicacion: d.metodo_aplicacion || [] // Asegurar que sea array
        }));
        // Metadatos de paginación
        this.config.totalItems = response.meta.totalItems;
        this.config.totalPages = response.meta.totalPages;
        
        this.loading = false;
        
        if (!response.data || response.data.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: this.config.searchTerm ? 'No se encontraron resultados.' : 'No hay insumos para mostrar.',
            sticky: false,
            life: 3000
          });
        }
      },
      error: (err) => {
        console.error("❌ Error al cargar insumos:", err);
        this.error = "No se cargaron los medicamentos.";
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
      this.cargarInsumos();
    }, 500);
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');
    const validCols = ['nombre', 'cantidad', 'costo_unitario'] as const;
    if (col) {
      // Mapear 'costo' a 'costo_unitario' para el backend
      if (col === 'costo') {
        this.config.sortColumn = 'costo_unitario';
      } else if ((validCols as readonly string[]).includes(col as any)) {
        this.config.sortColumn = col as any;
      }
    }
    if (dir === 'asc' || dir === 'desc') {
      this.config.sortDirection = dir;
    }
    this.config.paginaActual = 1; // Resetear a página 1 al ordenar
    this.cargarInsumos();
  }

  openEdit(medicamento: Medicamento) {
    this.selectedMedicamento = medicamento;
    this.nombreNuevo = medicamento.nombre;
    this.editedCantidad = medicamento.cantidad;
    this.unidadNueva = medicamento.unidad || '';
    this.costoNuevo = medicamento.costo || 0;

    // Cargar métodos seleccionados (convertir nombres a IDs)
    this.metodosSeleccionados.clear();
    if (Array.isArray(medicamento.metodo_aplicacion)) {
      medicamento.metodo_aplicacion.forEach((nombreMetodo: any) => {
        const metodo = this.metodosDisponibles.find(m => m.nombre === nombreMetodo);
        if (metodo) {
          this.metodosSeleccionados.add(metodo.id);
        }
      });
    }

    this.modalOpen = true;
  }

  closeEdit() {
    this.modalOpen = false;
    this.nombreNuevo = '';
    this.selectedMedicamento = null;
    this.editedCantidad = null;
    this.unidadNueva = '';
    this.costoNuevo = null;
    this.metodosSeleccionados.clear();
  }

  saveEdit() {
    if (!this.selectedMedicamento) return;

    const cantidad = Number(this.editedCantidad);
    const nombre = String(this.nombreNuevo).trim();
    const unidad = String(this.unidadNueva).trim();
    const costo_unitario = Number(this.costoNuevo);

    // Validaciones
    if (!nombre) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'El nombre no puede estar vacío.' });
      return;
    }
    if (Number.isNaN(cantidad) || cantidad < 0) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'La cantidad debe ser un número válido.' });
      return;
    }
    if (Number.isNaN(costo_unitario) || costo_unitario < 0) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'El costo debe ser un número válido.' });
      return;
    }

    // Verificar si hubo cambios (incluyendo métodos de aplicación)
    const metodosActualesIds = new Set<number>();
    if (Array.isArray(this.selectedMedicamento.metodo_aplicacion)) {
      this.selectedMedicamento.metodo_aplicacion.forEach((nombreMetodo: any) => {
        const metodo = this.metodosDisponibles.find(m => m.nombre === nombreMetodo);
        if (metodo) {
          metodosActualesIds.add(metodo.id);
        }
      });
    }

    const metodosIguales =
      metodosActualesIds.size === this.metodosSeleccionados.size &&
      Array.from(metodosActualesIds).every(id => this.metodosSeleccionados.has(id));

    const sinCambios = (
      nombre === this.selectedMedicamento.nombre &&
      cantidad === this.selectedMedicamento.cantidad &&
      unidad === (this.selectedMedicamento.unidad || '') &&
      costo_unitario === (this.selectedMedicamento.costo || 0) &&
      metodosIguales
    );

    if (sinCambios) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No se realizaron modificaciones.' });
      this.closeEdit();
      return;
    }

    // Preparar datos para actualizar
    const datosActualizados: any = {
      nombre,
      cantidad,
      costo_unitario,
      metodo_aplicacion: Array.from(this.metodosSeleccionados)
    };

    // Solo incluir unidad si no está vacía
    if (unidad) {
      datosActualizados.unidad = unidad;
    }

    this.insumosService.updateInsumo(this.selectedMedicamento.id, datosActualizados).subscribe({
      next: (actualizado: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Medicamento actualizado correctamente.'
        });
        this.closeEdit();
        // Recargar la página actual
        this.cargarInsumos();
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

  toggleMetodo(metodoId: number) {
    if (this.metodosSeleccionados.has(metodoId)) {
      this.metodosSeleccionados.delete(metodoId);
    } else {
      this.metodosSeleccionados.add(metodoId);
    }
  }

  isMetodoSelected(metodoId: number): boolean {
    return this.metodosSeleccionados.has(metodoId);
  }

  // Lógica para el modal de eliminación
  modalEliminarVisible: boolean = false;
  medicamentoAEliminar: Medicamento | null = null;

  confirmarEliminacion(medicamento: Medicamento) {
    this.medicamentoAEliminar = medicamento;
    this.modalEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.medicamentoAEliminar = null;
  }

  ejecutarEliminacion() {
    if (!this.medicamentoAEliminar) return;

    this.insumosService.deleteInsumo(this.medicamentoAEliminar.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Insumo "${this.medicamentoAEliminar!.nombre}" eliminado.`
        });
        this.cancelarEliminacion();
        // Recargar la página actual
        this.cargarInsumos();
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
      this.cargarInsumos();
    }
  }

  irAPaginaSiguiente() {
    if (this.config.paginaActual < this.config.totalPages) {
      this.config.paginaActual++;
      this.cargarInsumos();
    }
  }

  irAPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.config.totalPages) {
      this.config.paginaActual = pagina;
      this.cargarInsumos();
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

