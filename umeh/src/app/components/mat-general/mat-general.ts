import { Component, OnInit } from '@angular/core';
import { MatGeneral } from '../../modelos/mat-general';
import { InsumoService } from '../../services/insumos.service';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mat-general',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, FormsModule],
  templateUrl: './mat-general.html',
  styleUrl: './mat-general.css',
  providers: [MessageService]
})
export class MatGeneralComponent implements OnInit {
  matGeneral: MatGeneral[] = [];
  matGeneralView: MatGeneral[] = [];
  error: string | null = null;
  loading = true;
  // búsqueda y ordenamiento
  searchTerm = '';
  sortColumn: 'nombre' | 'cantidad' | 'unidad' | 'costo_unitario' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';
  // estado del modal de edición
  modalOpen = false;
  selectedMatGeneral: MatGeneral | null = null;
  editedCantidad: number | null = null;
  nombreNuevo: string = '';
  unidadNueva: string = '';
  costoNuevo: number | null = null;
  loadingRows = Array.from({ length: 14 });

  constructor(
    private insumosService: InsumoService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    console.log("🚀 Cargando material general desde la base de datos...");
    this.insumosService.getMatGeneral().subscribe({
      next: (data) => {
        console.log("✅ Datos recibidos:", data);
        // Asegurar que costo_unitario sea numérico y por defecto 0
        this.matGeneral = (data || []).map(d => ({
          ...d,
          costo_unitario: Number(d?.costo_unitario ?? 0)
        }));
        this.applyFilters();
        this.loading = false;
        if (!data || data.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: 'No hay material general para mostrar.',
            sticky: false,
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Carga completa',
            detail: 'El material general se cargó correctamente.',
            sticky: false,
            life: 5000
          });
        }
      },
      error: (err) => {
        console.error("❌ Error al cargar material general:", err.message);
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
    this.applyFilters();
  }

  toggleSort(column: 'nombre' | 'cantidad' | 'unidad' | 'costo_unitario') {
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
    const validCols = ['nombre', 'cantidad', 'unidad', 'costo_unitario'] as const;
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
    let data = [...this.matGeneral];
    if (term) {
      data = data.filter(mg =>
        mg.nombre.toLowerCase().includes(term) ||
        String(mg.cantidad).includes(term) ||
        mg.unidad.toLowerCase().includes(term) ||
        String(mg.costo_unitario ?? 0).includes(term)
      );
    }

    data.sort((a, b) => {
      let comp = 0;
      if (this.sortColumn === 'cantidad') {
        comp = (a.cantidad ?? 0) - (b.cantidad ?? 0);
      } else if (this.sortColumn === 'nombre') {
        comp = a.nombre.localeCompare(b.nombre);
      } else if (this.sortColumn === 'unidad') {
        comp = a.unidad.localeCompare(b.unidad);
      } else {
        // costo_unitario
        comp = (a.costo_unitario ?? 0) - (b.costo_unitario ?? 0);
      }
      return this.sortDirection === 'asc' ? comp : -comp;
    });

    this.matGeneralView = data;
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
        const idx = this.matGeneral.findIndex(mg => mg.id === actualizado.id);
        if (idx !== -1) {
          this.matGeneral[idx] = { ...this.matGeneral[idx], ...actualizado };
        }
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: `Material general actualizado.`
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
        this.matGeneral = this.matGeneral.filter(mg => mg.id !== this.materialAEliminar!.id);
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Material "${this.materialAEliminar!.nombre}" eliminado.`
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
