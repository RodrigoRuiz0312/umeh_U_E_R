import { Component, OnInit } from '@angular/core';
import { Medicamento } from '../../modelos/medicamento';
import { InsumoService } from '../../services/insumos.service';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, FormsModule],
  templateUrl: './tabla.html',
  styleUrl: './tabla.css',
  providers: [MessageService]
})
export class Tabla implements OnInit {
  medicamentos: Medicamento[] = [];
  medicamentosView: Medicamento[] = [];
  error: string | null = null;
  loading = true;
  // búsqueda y ordenamiento
  searchTerm = '';
  sortColumn: 'nombre' | 'cantidad' | 'costo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';
  // estado del modal de edición
  modalOpen = false;
  selectedMedicamento: Medicamento | null = null;
  editedCantidad: number | null = null;
  nombreNuevo: string = '';
  unidadNueva: string = '';
  costoNuevo: number | null = null;
  metodosDisponibles: { id: number; nombre: string }[] = [];
  metodosSeleccionados = new Set<number>();
  loadingRows = Array.from({ length: 14 });

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

    this.insumosService.getInsumos().subscribe({
      next: (data) => {
        console.log("✅ Datos recibidos:", data);
        this.medicamentos = (data || []).map(d => ({
          ...d,
          costo: Number(d.costo ?? 0),
          metodo_aplicacion: d.metodo_aplicacion || []
        }));
        this.applyFilters();
        this.loading = false;
        if (!data || data.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: 'No hay insumos para mostrar.',
            sticky: false,
            life: 3000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Carga completa',
            detail: 'Los insumos se cargaron correctamente.',
            sticky: false,
            life: 3000
          });
        }

      },
      error: (err) => {
        console.error("❌ Error al cargar insumos:", err.message);
        this.error = "No se cargaron los medicamentos.";
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
    this.applyFilters();
  }

  toggleSort(column: 'nombre' | 'cantidad' | 'costo') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');
    const validCols = ['nombre', 'cantidad', 'costo'] as const;
    if (col && (validCols as readonly string[]).includes(col)) {
      this.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.sortDirection = dir;
    }
    this.applyFilters();
  }

  private applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    let data = [...this.medicamentos];
    if (term) {
      data = data.filter(i =>
        i.nombre.toLowerCase().includes(term) ||
        String(i.cantidad).includes(term) ||
        String(i.costo ?? 0).includes(term) ||
        (i.metodo_aplicacion || []).join(', ').toLowerCase().includes(term)
      );
    }

    data.sort((a, b) => {
      let comp = 0;
      if (this.sortColumn === 'nombre') {
        comp = a.nombre.localeCompare(b.nombre);
      } else if (this.sortColumn === 'cantidad') {
        comp = (a.cantidad ?? 0) - (b.cantidad ?? 0);
      } else if (this.sortColumn === 'costo') {
        comp = (a.costo ?? 0) - (b.costo ?? 0);
      }
      return this.sortDirection === 'asc' ? comp : -comp;
    });

    this.medicamentosView = data;
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
        // Mapear costo_unitario del backend a costo del frontend si existe
        const medicamentoActualizado = {
          ...actualizado,
          costo: actualizado.costo_unitario !== undefined ? actualizado.costo_unitario : actualizado.costo
        };

        const idx = this.medicamentos.findIndex(i => i.id === actualizado.id);
        if (idx !== -1) {
          this.medicamentos[idx] = { ...this.medicamentos[idx], ...medicamentoActualizado };
        }
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Medicamento actualizado correctamente.'
        });
        this.closeEdit();
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
        this.medicamentos = this.medicamentos.filter(i => i.id !== this.medicamentoAEliminar!.id);
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Insumo "${this.medicamentoAEliminar!.nombre}" eliminado.`
        });
        this.cancelarEliminacion();
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
}

