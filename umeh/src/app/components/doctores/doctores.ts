import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api.service';
import { Toast } from "primeng/toast";
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-doctores',
  standalone: true,
  imports: [CommonModule, FormsModule, Toast],
  templateUrl: './doctores.html',
  styleUrl: './doctores.css',
  providers: [MessageService]
})
export class Doctores implements OnInit {
  loading = false;
  mostrarModalCamposObligatorios = false;
  camposFaltantes: string[] = [];

  doctorData = {
    nombre: '',
    apellidos: '',
    cedula_prof: '',
    telefono: '',
    correo: '',
    especialidad: '',
    nombre_agenda: '',
  };

  constructor(private api: ApiService, private toastr: ToastrService, private messageService: MessageService) { }

  ngOnInit() { }

  // 🔹 Cierra el modal de campos obligatorios
  cerrarModalCamposObligatorios() {
    this.mostrarModalCamposObligatorios = false;
  }

  // 🔹 Recolecta los campos faltantes del formulario de doctores
  private recolectarCamposFaltantes(): string[] {
    const faltantes: string[] = [];

    if (!this.doctorData.nombre || this.doctorData.nombre.trim() === '') {
      faltantes.push('Nombre');
    }

    if (!this.doctorData.apellidos || this.doctorData.apellidos.trim() === '') {
      faltantes.push('Apellidos');
    }

    if (!this.doctorData.cedula_prof || this.doctorData.cedula_prof.trim() === '') {
      faltantes.push('Cédula profesional');
    }

    if (!this.doctorData.nombre_agenda) {
      faltantes.push('Agenda');
    }

    // Los siguientes son opcionales, pero puedes validar formato si quieres:
    if (this.doctorData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.doctorData.correo)) {
      faltantes.push('Correo electrónico inválido');
    }

    if (this.doctorData.telefono && !/^[0-9]{10}$/.test(this.doctorData.telefono)) {
      faltantes.push('Teléfono inválido (debe contener 10 dígitos)');
    }

    return faltantes;
  }

  capitalize(text: string) {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // 🔹 Enviar formulario
  onSubmit() {
    const faltantes = this.recolectarCamposFaltantes();

    if (faltantes.length > 0) {
      this.camposFaltantes = faltantes;
      this.mostrarModalCamposObligatorios = true;
      return;
    }

    // Preparar datos con capitalización
    const datosAEnviar = {
      ...this.doctorData,
      nombre: this.capitalize(this.doctorData.nombre),
      apellidos: this.capitalize(this.doctorData.apellidos),
      especialidad: this.doctorData.especialidad ? this.capitalize(this.doctorData.especialidad) : ''
    };

    // Si no hay faltantes, procede con el registro
    this.api.crearDoctor(datosAEnviar).subscribe({
      next: () => {
        this.toastr.success('¡Médico registrado con éxito!');
        this.doctorData = {
          nombre: '',
          apellidos: '',
          cedula_prof: '',
          telefono: '',
          correo: '',
          especialidad: '',
          nombre_agenda: '',
        };
      },
      error: (error) => {
        console.error(error);
        this.toastr.error('Hubo un error al registrar el médico.', 'Error');
      }
    });
  }
}