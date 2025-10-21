import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-agendar-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agendar-cita-modal.html',
  styleUrl: './agendar-cita-modal.css'
})
export class AgendarCitaModal implements OnInit {

  //Comunicacion con la clase padre
  @Input() datosCita: any;
  @Output() close = new EventEmitter<void>();
  @Output() citaCreada = new EventEmitter<void>();

  //variables internas
  pacientes: any[] = [];
  terminoBusqueda: string = '';
  pacienteSeleccionado: any = null;

  consultoriosDisponibles: string[] = [];
  consultorioSeleccionado: string = '';

  constructor(private api: ApiService, private toastr: ToastrService) { }

  //inicializacion logica
  ngOnInit() {
    this.buscarConsultoriosDisponibles();
  }

  buscarConsultoriosDisponibles() {
    const { fecha, hora } = this.datosCita;
    this.api.getConsultoriosDisponibles(fecha, hora).subscribe(data => {
      this.consultoriosDisponibles = data;
    });
  }

  //logica de busqueda y seleccion
  buscarPaciente() {
    if (this.terminoBusqueda.length < 3) {
      this.pacientes = [];
      return;
    }
    this.api.buscarPacientes(this.terminoBusqueda).subscribe(data => {
      this.pacientes = data;
    });
  }

  seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
    this.terminoBusqueda = `${paciente.nombre} ${paciente.apellidos}`;
    this.pacientes = [];
  }

  //acciones finales
  confirmarCita() {
    if (!this.pacienteSeleccionado || !this.consultorioSeleccionado) {
      this.toastr.warning('Por favor, seleccione un paciente y un consultorio');
      return;
    }

    const nuevaCita = {
      id_paciente: this.pacienteSeleccionado.id_paciente,
      id_medico: this.datosCita.doctor.id_medico,
      fecha: this.datosCita.fecha,
      hora: this.datosCita.hora,
      consultorio: this.consultorioSeleccionado
    };

    this.api.crearCita(nuevaCita).subscribe({
      next: () => {
        this.toastr.success('Cita agendada con exito');
        this.citaCreada.emit();
      },
      error: (err) => {
        this.toastr.error('Error al agendar la cita');
        console.log(err);
      }
    });
  }

  onClose() {
    this.close.emit();
  }
}