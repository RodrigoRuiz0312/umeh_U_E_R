import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-edit-doctor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-doctor-modal.html',
  styleUrl: './edit-doctor-modal.css'
})
export class EditDoctorModal implements OnChanges {
  @Input() doctor: any;
  @Output() close = new EventEmitter<void>();
  @Output() doctorActualizado = new EventEmitter<void>();

  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService
  ) {
    this.editForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      cedula_prof: ['', Validators.required],
      especialidad: [''],
      telefono: [''],
      correo: ['', [Validators.email]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doctor'] && this.doctor) {
      this.editForm.patchValue({
        nombre: this.doctor.nombre,
        apellidos: this.doctor.apellidos,
        cedula_prof: this.doctor.cedula_prof,
        especialidad: this.doctor.especialidad,
        telefono: this.doctor.telefono,
        correo: this.doctor.correo
      });
    }
  }

  onClose() {
    this.close.emit();
  }

  guardarCambios() {
    if (this.editForm.invalid) {
      this.toastr.warning('Por favor, completa los campos requeridos.');
      return;
    }

    if (!this.doctor) {
      this.toastr.error('No hay un doctor seleccionado.');
      return;
    }

    const updatedData = {
      ...this.doctor,
      ...this.editForm.value
    };

    this.api.actualizarDoctor(this.doctor.id_medico, updatedData).subscribe({
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
