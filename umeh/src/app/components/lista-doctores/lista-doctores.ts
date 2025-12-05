import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditDoctorModal } from '../../utils/edit-doctor-modal/edit-doctor-modal';
import { ApiService } from '../../services/api.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-lista-doctores',
  standalone: true,
  imports: [CommonModule, FormsModule, EditDoctorModal, ToastModule],
  templateUrl: './lista-doctores.html',
  styleUrl: './lista-doctores.css',
  providers: [MessageService]
})
export class ListaDoctores implements OnInit {
  searchTerm = '';
  sortColumn: 'nombre' | 'apellidos' | 'cedula_prof' | 'telefono' | 'especialidad' | 'correo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';

  medicos: any[] = [];
  medicosView: any[] = []; // Kept for compatibility, but will mirror medicos

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  isModalVisible = false;
  medicoSeleccionado: any;

  modalEliminarVisible: boolean = false;
  medicoAEliminar: { id: number, nombre: string } | null = null;

  constructor(private api: ApiService, private messageService: MessageService) { }

  ngOnInit(): void {
    this.cargarMedicos();
  }

  cargarMedicos() {
    this.api.getDoctores(this.currentPage, this.itemsPerPage, this.sortColumn, this.sortDirection, this.searchTerm).subscribe({
      next: (data: any) => {
        this.medicos = data.doctores || [];
        this.totalItems = data.total || 0;
        this.medicosView = [...this.medicos];
      },
      error: (error) => {
        console.error('Error al cargar los médicos:', error);
      }
    });
  }

  onSearchTermChange() {
    this.currentPage = 1;
    this.cargarMedicos();
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');
    const valid = ['nombre', 'apellidos', 'cedula_prof', 'telefono', 'especialidad', 'correo'] as const;
    if (col && (valid as readonly string[]).includes(col)) {
      this.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.sortDirection = dir;
    }
    this.cargarMedicos();
  }

  goToPage(page: number) {
    const pageCount = Math.ceil(this.totalItems / this.itemsPerPage)
    if (page < 1 || page > pageCount) return;
    this.currentPage = page;
    this.cargarMedicos();
  }

  getPages(): number[] {
    const pageCount = Math.ceil(this.totalItems / this.itemsPerPage);
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(pageCount, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get pageCount(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  // acciones
  openEditModal(medico: any) {
    this.medicoSeleccionado = { ...medico };
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }

  recargarMedicos() {
    this.closeModal();
    this.cargarMedicos();
  }

  confirmarEliminacion(id: number, nombre: string) {
    this.medicoAEliminar = { id, nombre };
    this.modalEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.medicoAEliminar = null;
  }

  ejecutarEliminacion() {
    if (!this.medicoAEliminar) return;

    this.api.deleteDoctor(this.medicoAEliminar.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Médico eliminado correctamente'
        });
        
        this.medicos = this.medicos.filter(m => m.id_medico !== this.medicoAEliminar?.id);
        this.cargarMedicos();
        this.cancelarEliminacion();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el médico'
        });
        console.error('Error al eliminar el médico', error);
        this.cancelarEliminacion();
      }
    });
  }
}
