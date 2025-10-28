import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';



@Component({
  selector: 'app-detalles-cita-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalles-cita-modal.html',
  styleUrl: './detalles-cita-modal.css'
})
export class DetallesCitaModal {
  @Input() cita: any;

  @Output() close = new EventEmitter<void>();

  @Output() citaActualizada = new EventEmitter<void>();

  ngOnInit(){
    console.log("Datos recibiods por el modal", this.cita);
  }
  constructor(private api:ApiService){}

  /*actualizarEstado(nuevoEstado: string) {
    // Llama a la función correspondiente en tu ApiService
    this.api.actualizarEstadoCita(this.cita.id_cita, nuevoEstado).subscribe({
      next: () => {
        this.toastr.success(`Cita marcada como '${nuevoEstado}'`);
        this.citaActualizada.emit(); // ¡Avisa al padre!
      },
      error: () => this.toastr.error('No se pudo actualizar el estado.')
    });
  }*/

  onClose() {
    this.close.emit();
  }
}
