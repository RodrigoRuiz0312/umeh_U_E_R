import { Component, OnInit } from '@angular/core';
import { Medicamento } from '../../modelos/medicamento';
import { InsumoService } from '../../services/insumos';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';

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
  loadingRows = Array.from({ length: 14 });

  constructor(private insumosService: InsumoService,
    private messageService: MessageService) { }

  ngOnInit(): void {
    console.log(" Cargando insumos desde la base de datos...");
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
    const validCols = ['nombre','cantidad','costo'] as const;
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
    this.modalOpen = true;
  }

  closeEdit() {
    this.modalOpen = false;
    this.nombreNuevo = '';
    this.selectedMedicamento = null;
    this.editedCantidad = null;
  }

  saveEdit() {
    if (!this.selectedMedicamento) return;
    const cantidad = Number(this.editedCantidad);
    const nombre = String(this.nombreNuevo);
    if (!nombre) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'El nombre no puede estar vacío.' });
      return;
    }
    if (Number.isNaN(cantidad)) {
      this.messageService.add({ severity: 'warn', summary: 'Dato inválido', detail: 'La cantidad debe ser numérica.' });
      return;
    }
    if (cantidad === this.selectedMedicamento.cantidad) {
      this.messageService.add({ severity: 'info', summary: 'Sin cambios', detail: 'No se realizaron modificaciones.' });
      this.closeEdit();
      return;
    }

    this.insumosService.updateInsumo(this.selectedMedicamento.id, { cantidad, nombre }).subscribe({
      next: (actualizado) => {
        const idx = this.medicamentos.findIndex(i => i.id === actualizado.id);
        if (idx !== -1) this.medicamentos[idx] = { ...this.medicamentos[idx], ...actualizado };
        this.applyFilters();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `Stock actualizado.` });
        this.closeEdit();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error al actualizar', detail: err.message || 'Ocurrió un error.' });
      }
    });
  }

  eliminar(medicamento: Medicamento) {
    const ok = window.confirm(`¿Seguro que deseas eliminar el insumo ${medicamento.nombre} (ID ${medicamento.id})?`);
    if (!ok) return;

    this.insumosService.deleteInsumo(medicamento.id).subscribe({
      next: () => {
        this.medicamentos = this.medicamentos.filter(i => i.id !== medicamento.id);
        this.applyFilters();
        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: `Insumo ${medicamento.id} eliminado.` });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error al eliminar', detail: err.message || 'Ocurrió un error.' });
      }
    });
  }
}

