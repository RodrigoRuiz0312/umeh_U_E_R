import { Component, EventEmitter, Output, Input} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-edit-paciente-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-paciente-modal.html',
  styleUrl: './edit-paciente-modal.css'
})
export class EditPacienteModal {

  
  @Input() paciente:any;

   @Output() close = new EventEmitter<void>();
   @Output() pacienteActualizado = new EventEmitter<void>();

  constructor (private api: ApiService, private toastr: ToastrService){}


  onClose(){
    this.close.emit();
  }

  guardarCambios(){
    this.api.actualizarPaciente(this.paciente.id_paciente, this.paciente).subscribe({
      next: (response) => {
        this.toastr.success('¡Paciente actualizado con éxito!');
        this.pacienteActualizado.emit(); 
      },
      error: (error) => {
        this.toastr.error('Error al actualizar el paciente.');
        console.error(error);
      }
    });
  }
}
