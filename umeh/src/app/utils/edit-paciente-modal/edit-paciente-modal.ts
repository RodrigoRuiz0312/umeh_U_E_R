import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-edit-paciente-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-paciente-modal.html',
  styleUrl: './edit-paciente-modal.css'
})
export class EditPacienteModal implements OnInit {

  @Input() paciente: any;
  @Output() close = new EventEmitter<void>();
  @Output() pacienteActualizado = new EventEmitter<void>();

  editForm: FormGroup;

  constructor(
    private api: ApiService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) { 
    this.editForm = this.fb.group({});
  }

  ngOnInit() {
    if (!this.paciente) {
      this.onClose();
      return;
    }

    this.editForm = this.fb.group({
      nombre: [this.paciente.nombre || ''],
      apellidos: [this.paciente.apellidos || ''],
      sexo: [this.paciente.sexo || ''],
      fecha_nacimiento: [this.formatDateForInput(this.paciente.fecha_nacimiento)],
      codigo_postal: [this.paciente.codigo_postal || ''],
      calle: [this.paciente.calle || ''],
      num: [this.paciente.num || ''],
      colonia: [this.paciente.colonia || ''],
      municipio: [this.paciente.municipio || ''],
      estado: [this.paciente.estado || ''],
      telefonos: this.fb.array(
        this.paciente.telefonos ?
          this.paciente.telefonos.map((tel: string) => this.fb.control(tel)) : []
      ),
      correos: this.fb.array(
        this.paciente.correos ?
          this.paciente.correos.map((correo: string) => this.fb.control(correo)) : []
      )
    });
  }

  // --- Helpers para Teléfonos ---
  get telefonos() { return this.editForm.get('telefonos') as FormArray; }
  addTelefono() { this.telefonos.push(this.fb.control('')); }
  removeTelefono(index: number) { this.telefonos.removeAt(index); }

  // --- Helpers para Correos ---
  get correos() { return this.editForm.get('correos') as FormArray; }
  addCorreo() { this.correos.push(this.fb.control('')); }
  removeCorreo(index: number) { this.correos.removeAt(index); }

  // --- Otros helpers ---
  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  }

  onClose() {
    this.close.emit();
  }


  // --- ACTUALIZAR guardarCambios() para usar p-toast ---
  guardarCambios() {
    if (this.editForm.invalid) {
      // REEMPLAZAR toastr.warning
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Por favor, revise los campos del formulario.'
      });
      this.editForm.markAllAsTouched();
      return;
    }

    const updatedData = this.editForm.value;

    this.api.actualizarPaciente(this.paciente.id_paciente, updatedData).subscribe({
      next: (response) => {
        // REEMPLAZAR toastr.success
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Paciente actualizado con éxito'
        });
        this.pacienteActualizado.emit();
        this.onClose();
      },
      error: (error) => {
        // REEMPLAZAR toastr.error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al actualizar el paciente.'
        });
        console.error(error);
      }
    });
  }
}