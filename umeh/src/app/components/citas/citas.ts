import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendarCitaModal } from '../../utils//agendar-cita-modal/agendar-cita-modal';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, AgendarCitaModal],
  templateUrl: './citas.html',
  styleUrl: './citas.css'
})
export class Citas implements OnInit {

  agendaSeleccionada: string | null = null;
  agenda: any[] = [];

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

  constructor(private api: ApiService) { }

  ngOnInit() { }

  seleccionarAgenda(nombreAgenda: string) {
    this.agendaSeleccionada = nombreAgenda;
    this.cargarAgenda();
  }

  cargarAgenda() {
    if (!this.agendaSeleccionada) return;
    this.api.getAgenda(this.fechaSeleccionada, this.agendaSeleccionada).subscribe((data) => {
      this.agenda = data;
      console.log('Agenda recibida para la fecha', this.fechaSeleccionada, ':', this.agenda);
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

  verDetallesCita(cita: any) {
    console.log('Mostrando detalles de la cita (función pendiente):', cita);

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
  }

  isHourBooked(doctor: any, horario: string): boolean {
    return doctor.citas.some((cita: any) => cita.hora === horario);
  }


  getAppointmentForHour(doctor: any, horario: string): any {
    return doctor.citas.find((cita: any) => cita.hora === horario);
  }

}
