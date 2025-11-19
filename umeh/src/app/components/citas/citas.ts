import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendarCitaModal } from '../../utils//agendar-cita-modal/agendar-cita-modal';
import { ApiService } from '../../services/api';
import { DetallesCitaModal } from '../../utils/detalles-cita-modal/detalles-cita-modal';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendarCitaModal, DetallesCitaModal, ToastModule],
  providers: [MessageService],
  templateUrl: './citas.html',
  styleUrl: './citas.css'
})
export class Citas implements OnInit {
  agendaSeleccionada: string | null = null;
  agenda: any[] = [];
  terminoBusquedaCita: string = '';
  resultadoBusqueda: any[] = [];
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];

  horariosManana: string[] = [
    '07:00:00', '07:30:00',
    '08:00:00', '08:30:00',
    '09:00:00', '09:30:00',
    '10:00:00', '10:30:00',
    '11:00:00', '11:30:00',
    '12:00:00', '12:30:00',
    '13:00:00', '13:30:00'
  ];

  horariosTarde: string[] = [
    '14:00:00', '14:30:00',
    '15:00:00', '15:30:00',
    '16:00:00', '16:30:00',
    '17:00:00', '17:30:00',
    '18:00:00', '18:30:00',
    '19:00:00', '19:30:00',
    '20:00:00', '20:30:00',
    '21:00:00'
  ];

  isAgendarModalVisible = false;
  datosParaNuevaCita: any = {};

  isDetailsModalVisible = false;
  citaSeleccionada: any;
  haRealizadoBusqueda: boolean = false;
  doctorSeleccionado: any | null = null;

  constructor(private api: ApiService, private router: Router, private messageService: MessageService) { }

  ngOnInit() { }

  seleccionarAgenda(nombreAgenda: string) {
    this.agendaSeleccionada = nombreAgenda;
    this.doctorSeleccionado = null;
    this.cargarAgenda();

    this.resultadoBusqueda = [];
    this.terminoBusquedaCita = '';
  }

  elegirDoctorDeLista(doctor: any) {
    this.doctorSeleccionado = doctor;
  }

  volverAListaDoctores() {
    this.doctorSeleccionado = null;
  }

  cargarAgenda() {
    if (!this.agendaSeleccionada) return;
    this.api.getAgenda(this.fechaSeleccionada, this.agendaSeleccionada).subscribe((data) => {
      this.agenda = data;
      console.log('Agenda recibida para la fecha', this.fechaSeleccionada, ':', this.agenda);
    });
  }

  buscarCitas() {
    if (this.terminoBusquedaCita.length < 3) {
      this.resultadoBusqueda = [];
      this.haRealizadoBusqueda = false;
      return;
    }

    this.api.buscarCitasPorPacientes(this.terminoBusquedaCita).subscribe(data => {
      this.resultadoBusqueda = data;
      this.haRealizadoBusqueda = true;
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
    this.doctorSeleccionado = null;
    this.agenda = [];
    this.resultadoBusqueda = [];
    this.terminoBusquedaCita = '';
    this.haRealizadoBusqueda = false;
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
