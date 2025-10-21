import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-edit-doctor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-doctor-modal.html',
  styleUrl: './edit-doctor-modal.css'
})
export class EditDoctorModal {
  @Input() doctor: any;

  @Output() close = new EventEmitter<void>();

  @Output() doctorActualizado = new EventEmitter<void>();

  constructor(private api: ApiService, private toastr: ToastrService){}
  onClose(){  
    this.close.emit();
  }

  guardarCambios() {
    console.log('¡Botón Guardar Cambios presionado!');
    if (!this.doctor) {
      this.toastr.error('No hay un doctor seleccionado.');
      return;
    }

    this.api.actualizarDoctor(this.doctor.id_medico, this.doctor).subscribe({
      next: (response) => {
        this.toastr.success('¡Médico actualizado con éxito!');
        this.doctorActualizado.emit();
      },
      error: (error) => {
        this.toastr.error('Error al actualizar el médico.');
        console.error(error);
      }
    });
  }
}
