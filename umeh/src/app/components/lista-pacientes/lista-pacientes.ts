import { Component, OnInit } from '@angular/core';
import { EditPacienteModal } from '../../utils/edit-paciente-modal/edit-paciente-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
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

  constructor(private api: ApiService, private messageService: MessageService) { }

  ngOnInit() {
    this.cargarPacientes();
  }


  cargarPacientes() {
    this.api.getPacientes().subscribe(items => {
      this.pacientes = items;
      this.applyFilters();
    });
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

  // REEMPLAZA TU FUNCIÓN 'confirmarEliminacion' POR ESTA:
  confirmarEliminacion(id: number, nombre: string) {
    // En lugar de llamar al servicio de PrimeNG, guardamos datos y mostramos NUESTRO modal
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
    this.applyFilters();
  }

  // EN: lista-pacientes.ts

  private applyFilters() {
    // --- El filtrado por término de búsqueda (search) no necesita cambios ---
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.pacientesView = [...this.pacientes];
    } else {
      this.pacientesView = this.pacientes.filter(p =>
        String(p?.nombre || '').toLowerCase().includes(term) ||
        String(p?.apellidos || '').toLowerCase().includes(term)
        // Nota: El filtro de búsqueda no buscará en teléfonos o correos,
        // ¡pero eso es un tema para otra mejora!
      );
    }

    // --- El Ordenamiento (sort) SÍ necesita cambios ---
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.pacientesView.sort((a, b) => {
      const col = this.sortColumn;

      let av: string, bv: string;

      // --- ¡NUEVA LÓGICA DE ORDENAMIENTO! ---
      if (col === 'telefonos') {
        // Ordenar por el *primer* teléfono del array
        av = String(a?.telefonos?.[0] ?? '').toLowerCase();
        bv = String(b?.telefonos?.[0] ?? '').toLowerCase();
      } else if (col === 'correos') {
        // Ordenar por el *primer* correo del array
        av = String(a?.correos?.[0] ?? '').toLowerCase();
        bv = String(b?.correos?.[0] ?? '').toLowerCase();
      } else {
        // Lógica original para nombre, apellidos, sexo
        av = String(a?.[col] ?? '').toLowerCase();
        bv = String(b?.[col] ?? '').toLowerCase();
      }
      // --- FIN DE LA NUEVA LÓGICA ---

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  onSortOptionChange(value: string) {
    // value formato: "col:dir" e.g. "nombre:asc"
    const [col, dir] = (value || '').split(':');

    // ANTES
    // if (col && (['nombre','apellidos','telefono','correo','sexo'] as const).includes(col as any)) {

    // DESPUÉS
    if (col && (['nombre', 'apellidos', 'telefonos', 'correos', 'sexo'] as const).includes(col as any)) {
      this.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.sortDirection = dir;
    }
    this.applyFilters();
  }
}
