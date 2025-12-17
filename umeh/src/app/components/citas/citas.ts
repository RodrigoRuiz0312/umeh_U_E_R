import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendarCitaModal } from '../../utils//agendar-cita-modal/agendar-cita-modal';
import { ApiService } from '../../services/api.service';
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
  
  consultorios: string[] = ['Consultorio 1', 'Consultorio 2', 'Consultorio 3', 'Consultorio 4'];
  citasDelDia: any[] = [];

  horariosManana: string[] = [
    '07:00:00', '07:30:00',
    '08:00:00', '08:30:00',
    '09:00:00', '09:30:00',
    '10:00:00', '10:30:00',
    '11:00:00', '11:30:00',
    '12:00:00', '12:30:00',
    '13:00:00', '13:30:00'
  ];

  horariosMananaConsultorio2: string[] = [
    '07:00:00', '07:15:00', '07:30:00', '07:45:00',
    '08:00:00', '08:15:00', '08:30:00', '08:45:00',
    '09:00:00', '09:15:00', '09:30:00', '09:45:00',
    '10:00:00', '10:15:00', '10:30:00', '10:45:00',
    '11:00:00', '11:15:00', '11:30:00', '11:45:00',
    '12:00:00', '12:15:00', '12:30:00', '12:45:00',
    '13:00:00', '13:15:00', '13:30:00', '13:45:00'
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
 // Comentario para forzar actualizacion
  horariosTardeConsultorio2: string[] = [
    '14:00:00', '14:15:00', '14:30:00', '14:45:00',
    '15:00:00', '15:15:00', '15:30:00', '15:45:00',
    '16:00:00', '16:15:00', '16:30:00', '16:45:00',
    '17:00:00', '17:15:00', '17:30:00', '17:45:00',
    '18:00:00', '18:15:00', '18:30:00', '18:45:00',
    '19:00:00', '19:15:00', '19:30:00', '19:45:00',
    '20:00:00', '20:15:00', '20:30:00', '20:45:00',
    '21:00:00'
  ];

  getHorariosManana(consultorio: string): string[] {
    return consultorio === 'Consultorio 2' ? this.horariosMananaConsultorio2 : this.horariosManana;
  }

  getHorariosTarde(consultorio: string): string[] {
    return consultorio === 'Consultorio 2' ? this.horariosTardeConsultorio2 : this.horariosTarde;
  }

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
    
    // 1. Obtener lista de doctores (para el modal de agendar)
    this.api.getAgenda(this.fechaSeleccionada, this.agendaSeleccionada).subscribe((data) => {
      this.agenda = [...data];
      console.log('Agenda recibida para la fecha', this.fechaSeleccionada, ':', this.agenda);
      if (this.doctorSeleccionado) {
        const actualizado = this.agenda.find(
          d => d.id_medico === this.doctorSeleccionado.id_medico
        );
        this.doctorSeleccionado = actualizado ?? null;
      }
    });

    // 2. Obtener TODAS las citas del día para llenar la grilla de consultorios
    this.api.getAgendaCompletaDelDia(this.fechaSeleccionada).subscribe(data => {
      this.citasDelDia = data;
      console.log('Citas del día (Global):', this.citasDelDia);
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

  // --- Nueva Lógica para la Vista por Consultorios ---

  getCitaCelda(consultorio: string, horario: string): any {
    // Buscar en la lista global de citas del día
    // Asumimos que horario viene en formato 'HH:MM:SS' matches
    return this.citasDelDia.find(c => c.consultorio === consultorio && c.hora === horario);
  }

  abrirModalAgendarCelda(consultorio: string, horario: string) {
    const citaExistente = this.getCitaCelda(consultorio, horario);
    
    // Si ya hay cita, ver detalles
    if (citaExistente) {
      this.verDetallesCita(citaExistente);
      return;
    }

    // Si está libre, agendar nueva. Filtrar doctores disponibles.
    const doctoresDisponibles = this.agenda.filter(doc => {
       // Un doctor está disponible si NO tiene cita a esa hora
       return !doc.citas.some((c: any) => c.hora === horario);
    });

    this.datosParaNuevaCita = {
      consultorio: consultorio,
      fecha: this.fechaSeleccionada,
      hora: horario,
      doctoresDisponibles: doctoresDisponibles
    };
    this.isAgendarModalVisible = true;
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
