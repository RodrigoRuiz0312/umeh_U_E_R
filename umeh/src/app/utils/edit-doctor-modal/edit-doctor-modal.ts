import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
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
    private messageService: MessageService
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
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Por favor, completa los campos requeridos.' });
      return;
    }

    if (!this.doctor) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No hay un doctor seleccionado.' });
      return;
    }

    const updatedData = {
      ...this.doctor,
      ...this.editForm.value
    };

    this.api.actualizarDoctor(this.doctor.id_medico, updatedData).subscribe({
      next: (response) => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: '¡Médico actualizado con éxito!' });
        this.doctorActualizado.emit();
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar el médico.' });
        console.error(error);
      }
    });
  }
}
