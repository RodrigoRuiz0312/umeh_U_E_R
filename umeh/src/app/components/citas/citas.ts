import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendarCitaModal } from '../../utils//agendar-cita-modal/agendar-cita-modal';
import { ApiService } from '../../services/api';
import { DetallesCitaModal } from '../../utils/detalles-cita-modal/detalles-cita-modal';
import { Router } from '@angular/router';

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

  horariosDelDia: any[] = [
    {h1:'07:00:00',h2:'07:30:00'},
    {h1:'08:00:00',h2:'08:30:00'},
    {h1:'09:00:00',h2:'09:30:00'},
    {h1:'10:00:00',h2:'10:30:00'},
    {h1:'11:00:00',h2:'11:30:00'},
    {h1:'12:00:00',h2:'12:30:00'},
    {h1:'13:00:00',h2:'13:30:00'},
    {h1:'14:00:00',h2:'14:30:00'},
    {h1:'15:00:00',h2:'15:30:00'},
    {h1:'16:00:00',h2:'16:30:00'},
    {h1:'17:00:00',h2:'17:30:00'},
    {h1:'18:00:00',h2:'18:30:00'},
    {h1:'19:00:00',h2:'19:30:00'},
    {h1:'20:00:00',h2:'20:30:00'},
    {h1:'21:00:00',h2:null}
  ];
  isAgendarModalVisible = false;
  datosParaNuevaCita: any = {};

  isDetailsModalVisible = false;
  citaSeleccionada: any;

  constructor(private api: ApiService, private router: Router) { }

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
