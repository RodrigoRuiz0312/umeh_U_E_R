import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { Router, RouterModule } from '@angular/router';



@Component({
  selector: 'app-detalles-cita-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalles-cita-modal.html',
  styleUrl: './detalles-cita-modal.css'
})
export class DetallesCitaModal {
  @Input() cita: any;

  @Output() close = new EventEmitter<void>();

   @Output() citaActualizada = new EventEmitter<void>();

  ngOnInit(){
    console.log("Datos recibidos por el modal", this.cita);
  }
  constructor(private api:ApiService, private router:Router){}


  irAconsulta(){
    this.router.navigate(['/consulta-recepcion'], {
    queryParams: {
      id_cita: this.cita.id_cita 
    }
  });
  }

  cancelarCita(){
    this.api.actualizarEstadoCita(this.cita.id_cita, 'Cancelada')
    .subscribe({
      next: () => {
        this.citaActualizada.emit(); 
        this.close.emit();           
      },
      error: (err) => console.error("Error cancelando cita:", err)
    });
  }

  onClose() {
    this.close.emit();
  }
}
