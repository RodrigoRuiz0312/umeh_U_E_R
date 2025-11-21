import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditDoctorModal } from '../../utils/edit-doctor-modal/edit-doctor-modal';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-lista-doctores',
  standalone: true,
  imports: [CommonModule, FormsModule, EditDoctorModal],
  templateUrl: './lista-doctores.html',
  styleUrl: './lista-doctores.css'
})
export class ListaDoctores implements OnInit {
  searchTerm = '';
  sortColumn: 'nombre' | 'apellidos' | 'cedula_prof' | 'telefono' | 'especialidad' | 'correo' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';

  medicos: any[] = [];
  medicosView: any[] = [];

  isModalVisible = false;
  medicoSeleccionado: any;

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.cargarMedicos();
  }

  cargarMedicos() {
    this.api.getDoctores().subscribe({
      next: (data) => {
        this.medicos = data || [];
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error al cargar los médicos:', error);
      }
    });
  }

  onSearchTermChange() {
    this.applyFilters();
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
    this.applyFilters();
  }

  private applyFilters() {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let data = [...this.medicos];
    if (term) {
      data = data.filter(d => {
        const nombreCompleto = `${d.nombre || ''} ${d.apellidos || ''}`.toLowerCase();
        return (
          nombreCompleto.includes(term) ||
          String(d?.nombre || '').toLowerCase().includes(term) ||
          String(d?.apellidos || '').toLowerCase().includes(term) ||
          String(d?.cedula_prof || '').toLowerCase().includes(term) ||
          String(d?.telefono || '').toLowerCase().includes(term) ||
          String(d?.especialidad || '').toLowerCase().includes(term) ||
          String(d?.correo || '').toLowerCase().includes(term)
        );
      });
    }
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    data.sort((a, b) => {
      const av = String(a?.[this.sortColumn] ?? '').toLowerCase();
      const bv = String(b?.[this.sortColumn] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    this.medicosView = data;
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

  borrarMedico(id: number) {
    if (!confirm('¿Estás seguro de que quieres eliminar a este médico?')) return;
    this.api.deleteDoctor(id).subscribe({
      next: () => {
        this.medicos = this.medicos.filter(m => m.id_medico !== id);
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error al eliminar el médico', error);
      }
    });
  }
}
