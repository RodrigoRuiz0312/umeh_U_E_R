import { Component, OnInit } from '@angular/core';
import { EditPacienteModal } from '../../utils/edit-paciente-modal/edit-paciente-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [CommonModule, EditPacienteModal, FormsModule, ToastModule, ConfirmDialogModule],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
  providers: [MessageService]
})
export class ListaPacientes implements OnInit {
  isModalVisible = false;
  pacienteSeleccionado: any;
  pacientes: any[] = [];
  pacientesView: any[] = [];
  searchTerm: string = '';
  sortColumn: 'nombre' | 'apellidos' | 'telefonos' | 'correos' | 'sexo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';
  modalEliminarVisible: boolean = false;
  pacienteAEliminar: { id: number, nombre: string } | null = null;

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  constructor(private api: ApiService, private messageService: MessageService) { }

  ngOnInit() {
    this.cargarPacientes();
  }


  cargarPacientes() {
    this.api.getPacientes(this.currentPage, this.itemsPerPage, this.sortColumn, this.sortDirection, this.searchTerm).subscribe((resp: any) => {
      this.pacientes = resp.pacientes;
      this.totalItems = resp.total;
      this.pacientesView = [...this.pacientes];
    });
  }

  goToPage(page: number) {
    const pageCount = Math.ceil(this.totalItems / this.itemsPerPage)
    if (page < 1 || page > pageCount) return;
    this.currentPage = page;
    this.cargarPacientes();
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


  openEditModal(paciente: any) {
    this.pacienteSeleccionado = { ...paciente };
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }


  recargarPacientes() {
    this.closeModal();
    this.cargarPacientes();
  }

 
  confirmarEliminacion(id: number, nombre: string) {
   
    this.pacienteAEliminar = { id, nombre };
    this.modalEliminarVisible = true;
  }

  // Función para cerrar el modal sin hacer nada
  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.pacienteAEliminar = null;
  }

  // Función que REALMENTE elimina (se llama al dar clic en "Sí, eliminar")
  ejecutarEliminacion() {
    if (!this.pacienteAEliminar) return;

    this.api.deletePaciente(this.pacienteAEliminar.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Paciente eliminado correctamente'
        });

        // Recargar la tabla
        this.cargarPacientes();

        // Cerrar modal
        this.cancelarEliminacion();
      },
      error: (e) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el paciente'
        });
        console.error(e);
        this.cancelarEliminacion();
      }
    });
  }

  onSearchTermChange() {
    this.currentPage = 1;
    this.cargarPacientes();
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');

    if (col && (['nombre', 'apellidos', 'telefonos', 'correos', 'sexo'] as const).includes(col as any)) {
      this.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.sortDirection = dir;
    }
    this.cargarPacientes();
  }
}
