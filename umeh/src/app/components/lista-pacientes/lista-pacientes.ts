import { Component, OnInit } from '@angular/core';
import { EditPacienteModal } from '../../utils/edit-paciente-modal/edit-paciente-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [CommonModule, EditPacienteModal, FormsModule],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css'
})
export class ListaPacientes implements OnInit {
  isModalVisible = false;
  pacienteSeleccionado: any;
  pacientes: any[] = [];
  pacientesView: any[] = [];
  searchTerm: string = '';
  sortColumn: 'nombre' | 'apellidos' | 'telefono' | 'correo' | 'sexo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private api: ApiService) { }

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

  borrarPaciente(id: number) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este paciente?')) {
      return;
    }
    this.api.deletePaciente(id).subscribe({
      next: (response) => {
        alert('Paciente eliminado con éxito');
        console.log(response);
        this.pacientes = this.pacientes.filter(p => p.id_paciente !== id);
        this.applyFilters();
      },
      error: (error) => {
        alert('Error al eliminar el paciente');
        console.error(error);
      }
    });
  }

  onSearchTermChange() {
    this.applyFilters();
  }

  private applyFilters() {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.pacientesView = [...this.pacientes];
    } else {
      this.pacientesView = this.pacientes.filter(p =>
        String(p?.nombre || '').toLowerCase().includes(term) ||
        String(p?.apellidos || '').toLowerCase().includes(term)
      );
    }

    // Ordenar según columna y dirección seleccionadas
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.pacientesView.sort((a, b) => {
      const col = this.sortColumn;
      const av = String(a?.[col] ?? '').toLowerCase();
      const bv = String(b?.[col] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  onSortOptionChange(value: string) {
    // value formato: "col:dir" e.g. "nombre:asc"
    const [col, dir] = (value || '').split(':');
    if (col && (['nombre','apellidos','telefono','correo','sexo'] as const).includes(col as any)) {
      this.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.sortDirection = dir;
    }
    this.applyFilters();
  }
}
