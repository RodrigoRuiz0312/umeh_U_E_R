import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendarCitaModal } from '../../utils//agendar-cita-modal/agendar-cita-modal';
import { ApiService } from '../../services/api';
import { DetallesCitaModal } from '../../utils/detalles-cita-modal/detalles-cita-modal';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendarCitaModal, DetallesCitaModal],
  templateUrl: './citas.html',
  styleUrl: './citas.css'
})
export class Citas implements OnInit {

  agendaSeleccionada: string | null = null;
  agenda: any[] = [];


  terminoBusquedaCita: string ='';
  resultadoBusqueda: any[] = [];

  fechaSeleccionada: string = new Date().toISOString().split('T')[0];

  horariosDelDia: string[] = [
    '07:00:00',
    '08:00:00',
    '09:00:00',
    '10:00:00',
    '11:00:00',
    '12:00:00',
    '13:00:00',
    '14:00:00',
    '15:00:00',
    '16:00:00',
    '17:00:00',
    '18:00:00',
    '19:00:00',
    '20:00:00',
    '21:00:00',
  ];
  isAgendarModalVisible = false;
  datosParaNuevaCita: any = {};

  isDetailsModalVisible = false;
  citaSeleccionada: any;

  constructor(private api: ApiService) { }

  ngOnInit() { }

  seleccionarAgenda(nombreAgenda: string) {
    this.agendaSeleccionada = nombreAgenda;
    this.cargarAgenda();

    this.resultadoBusqueda = [];
    this.terminoBusquedaCita = '';
  }

  cargarAgenda() {
    if (!this.agendaSeleccionada) return;
    this.api.getAgenda(this.fechaSeleccionada, this.agendaSeleccionada).subscribe((data) => {
      this.agenda = data;
      console.log('Agenda recibida para la fecha', this.fechaSeleccionada, ':', this.agenda);
    });
  }

  buscarCitas(){
    if(this.terminoBusquedaCita.length < 3) {
      this.resultadoBusqueda = [];
      return;
    }
    this.api.buscarCitasPorPacientes(this.terminoBusquedaCita).subscribe(data => {
      this.resultadoBusqueda = data;
    });
  }

  abrirModalAgendar(doctor: any, horario: string) {

    this.datosParaNuevaCita = {
      doctor: doctor,
      fecha: this.fechaSeleccionada,
      hora: horario,
    };
    this.isAgendarModalVisible = true;
  }


  cerrarModalAgendar() {
    this.isAgendarModalVisible = false;
  }


  citaAgendadaConExito() {
    this.cerrarModalAgendar();
    this.cargarAgenda();
  }

  volverASeleccion() {
    this.agendaSeleccionada = null;
    this.agenda = [];

    this.resultadoBusqueda = [];
    this.terminoBusquedaCita = '';
  }

  isHourBooked(doctor: any, horario: string): boolean {
    return doctor.citas.some((cita: any) => cita.hora === horario);
  }


  getAppointmentForHour(doctor: any, horario: string): any {
    return doctor.citas.find((cita: any) => cita.hora === horario);
  }

  verDetallesCita(cita: any) {
    this.citaSeleccionada = cita;
    this.isDetailsModalVisible = true;
  }
 

  closeDetailsModal() {
    this.isDetailsModalVisible = false;
  }

  
  citaActualizadaConExito() {
    this.closeDetailsModal();
    this.cargarAgenda();
  }
}
