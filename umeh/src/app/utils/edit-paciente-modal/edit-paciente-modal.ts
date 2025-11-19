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
      sexo: [this.paciente.sexo || ''], // Campo controlado por los chips
      fecha_nacimiento: [this.formatDateForInput(this.paciente.fecha_nacimiento)],

      telefonos: this.fb.array([]),
      correos: this.fb.array([]),

      // Domicilio
      calle: [this.paciente.calle || ''],
      num: [this.paciente.num || ''],
      colonia: [this.paciente.colonia || ''],
      municipio: [this.paciente.municipio || ''],
      estado: [this.paciente.estado || ''],
      codigo_postal: [this.paciente.codigo_postal || '']
    });

    // Llenar FormArrays
    this.setTelefonos(this.paciente.telefonos);
    this.setCorreos(this.paciente.correos);
  }

  // --- GETTERS PARA EL HTML ---
  get telefonos() {
    return this.editForm.get('telefonos') as FormArray;
  }

  get correos() {
    return this.editForm.get('correos') as FormArray;
  }

  // --- LÓGICA PARA CHIPS (NUEVO) ---
  setSexo(valor: string) {
    this.editForm.get('sexo')?.setValue(valor);
    this.editForm.markAsDirty(); // Marcar como editado
  }

  // --- LÓGICA DE ARRAYS ---
  setTelefonos(telefonos: string[]) {
    const telArray = this.telefonos;
    telArray.clear();
    if (telefonos && telefonos.length > 0) {
      telefonos.forEach(tel => telArray.push(this.fb.control(tel)));
    }
  }

  addTelefono() {
    this.telefonos.push(this.fb.control(''));
  }

  removeTelefono(index: number) {
    this.telefonos.removeAt(index);
  }

  setCorreos(correos: string[]) {
    const correoArray = this.correos;
    correoArray.clear();
    if (correos && correos.length > 0) {
      correos.forEach(c => correoArray.push(this.fb.control(c)));
    }
  }

  addCorreo() {
    this.correos.push(this.fb.control(''));
  }

  removeCorreo(index: number) {
    this.correos.removeAt(index);
  }

  // --- Helpers ---
  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // Ajuste de zona horaria básico
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  }

  onClose() {
    this.close.emit();
  }

  guardarCambios() {
    if (this.editForm.invalid) {
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
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Paciente actualizado con éxito'
        });
        this.pacienteActualizado.emit();
        this.onClose();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el paciente'
        });
        console.error(err);
      }
    });
  }
}