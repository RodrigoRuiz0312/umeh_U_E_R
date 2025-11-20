import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api';
import { SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-agendar-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agendar-cita-modal.html',
  styleUrl: './agendar-cita-modal.css'
})
export class AgendarCitaModal implements OnInit, OnChanges {

  //Comunicacion con la clase padre
  @Input() datosCita: any;
  @Output() close = new EventEmitter<void>();
  @Output() citaCreada = new EventEmitter<void>();

  //variables internas
  pacientes: any[] = [];

  terminoNombre: string = '';
  terminoApellido: string = '';
  pacienteSeleccionado: any = null;

  consultoriosDisponibles: string[] = [];
  consultorioSeleccionado: string = '';

  constructor(private api: ApiService, private messageService: MessageService) { }

  //inicializacion logica
  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['datosCita'] && this.datosCita) {
      this.buscarConsultoriosDisponibles(); // 🔥 Se actualiza cada vez
    }
  }

  buscarConsultoriosDisponibles() {
    const { fecha, hora } = this.datosCita;
    this.api.getConsultoriosDisponibles(fecha, hora).subscribe(data => {
      this.consultoriosDisponibles = data;
    });
  }

  //logica de busqueda y seleccion
  buscarPaciente() {
    // Validamos que al menos uno de los dos tenga 3 letras para no saturar
    if (this.terminoNombre.length < 3 && this.terminoApellido.length < 3) {
      this.pacientes = [];
      return;
    }

    // Enviamos nombre y apellidos como parámetros separados
    const nombre = this.terminoNombre.trim() || undefined;
    const apellidos = this.terminoApellido.trim() || undefined;

    this.api.buscarPacientes(nombre, apellidos).subscribe(data => {
      this.pacientes = data;
    });
  }

  seleccionarPaciente(paciente: any) {
    this.pacienteSeleccionado = paciente;
    
    // Llenamos los inputs con la selección para que se vea bonito
    this.terminoNombre = paciente.nombre;
    this.terminoApellido = paciente.apellidos;
    
    // Limpiamos la lista
    this.pacientes = [];
  }

  //acciones finales
  confirmarCita() {
    if (!this.pacienteSeleccionado || !this.consultorioSeleccionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione un paciente y un consultorio'
      });
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
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cita agendada con éxito'
        });

        this.citaCreada.emit();
        this.close.emit();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al agendar la cita'
        });
        console.log(err);
      }
    });
  }

  onClose() {
    this.close.emit();
  }
}