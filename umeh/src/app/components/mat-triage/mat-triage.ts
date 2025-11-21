import { Component, OnInit } from '@angular/core';
import { Triage } from '../../modelos/triage';
import { InsumoService } from '../../services/insumos.service';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mat-triage',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, FormsModule],
  templateUrl: './mat-triage.html',
  styleUrl: './mat-triage.css',
  providers: [MessageService]
})
export class MatTriage implements OnInit {
  triage: Triage[] = [];
  triageView: Triage[] = [];
  error: string | null = null;
  loading = true;
  // búsqueda y ordenamiento
  searchTerm = '';
  sortColumn: 'nombre' | 'cantidad' | 'unidad' | 'costo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';
  // estado del modal de edición
  modalOpen = false;
  selectedTriage: Triage | null = null;
  editedCantidad: number | null = null;
  nombreNuevo: string = '';
  unidadNueva: string = '';
  costoNuevo: number | null = null;
  loadingRows = Array.from({ length: 14 });

  constructor(private insumosService: InsumoService,
    private messageService: MessageService) { }

  ngOnInit(): void {
    console.log("🚀 Cargando insumos desde la base de datos...");
    this.insumosService.getMaterial_Triage().subscribe({
      next: (data) => {
        console.log("✅ Datos recibidos:", data);
        // Asegurar que costo sea numérico y por defecto 0
        this.triage = (data || []).map(d => ({
          ...d,
          costo: Number(d?.costo ?? 0)
        }));
        this.applyFilters();
        this.loading = false;
        if (!data || data.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: 'No hay material de triage para mostrar.',
            sticky: false,
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Carga completa',
            detail: 'El material de triage se cargó correctamente.',
            sticky: false,
            life: 5000
          });
        }

      },
      error: (err) => {
        console.error("❌ Error al cargar insumos:", err.message);
        this.error = "No se cargo el material.";
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

  toggleSort(column: 'nombre' | 'cantidad' | 'unidad' | 'costo') {
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
    const validCols = ['nombre', 'cantidad', 'unidad', 'costo'] as const;
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
    let data = [...this.triage];
    if (term) {
      data = data.filter(t =>
        t.nombre.toLowerCase().includes(term) ||
        String(t.cantidad).includes(term) ||
        t.unidad.toLowerCase().includes(term) ||
        String(t.costo ?? 0).includes(term)
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
        // costo
        comp = (a.costo ?? 0) - (b.costo ?? 0);
      }
      return this.sortDirection === 'asc' ? comp : -comp;
    });

    this.triageView = data;
  }

  openEdit(item: Triage) {
    this.selectedTriage = item;
    this.nombreNuevo = item.nombre;
    this.editedCantidad = item.cantidad;
    this.unidadNueva = item.unidad;
    this.costoNuevo = item.costo || 0;
    this.modalOpen = true;
  }

  closeEdit() {
    this.modalOpen = false;
    this.selectedTriage = null;
    this.nombreNuevo = '';
    this.editedCantidad = null;
    this.unidadNueva = '';
    this.costoNuevo = null;
  }

  saveEdit() {
    if (!this.selectedTriage) return;

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
      nombre === this.selectedTriage.nombre &&
      cantidad === this.selectedTriage.cantidad &&
      unidad === this.selectedTriage.unidad &&
      costo_unitario === (this.selectedTriage.costo || 0)
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

    this.insumosService.updateTriage(this.selectedTriage.id, datosActualizados).subscribe({
      next: (actualizado: any) => {
        // Mapear respuesta del backend (costo_unitario -> costo)
        const triageActualizado = {
          ...actualizado,
          costo: actualizado.costo_unitario !== undefined ? Number(actualizado.costo_unitario) : Number(actualizado.costo || 0)
        };

        const idx = this.triage.findIndex(t => t.id === actualizado.id);
        if (idx !== -1) this.triage[idx] = { ...this.triage[idx], ...triageActualizado };

        this.applyFilters();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `Material actualizado correctamente.` });
        this.closeEdit();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error al actualizar', detail: err.message || 'Ocurrió un error.' });
      }
    });
  }

  // Lógica para el modal de eliminación
  modalEliminarVisible: boolean = false;
  triageAEliminar: Triage | null = null;

  confirmarEliminacion(triage: Triage) {
    this.triageAEliminar = triage;
    this.modalEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.triageAEliminar = null;
  }

  ejecutarEliminacion() {
    if (!this.triageAEliminar) return;

    this.insumosService.deleteTriage(this.triageAEliminar.id).subscribe({
      next: () => {
        this.triage = this.triage.filter(t => t.id !== this.triageAEliminar!.id);
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Material "${this.triageAEliminar!.nombre}" eliminado.`
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