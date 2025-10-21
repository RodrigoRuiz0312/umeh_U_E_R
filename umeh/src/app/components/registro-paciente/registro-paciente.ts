import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-registro-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-paciente.html',
  styleUrl: './registro-paciente.css'
})
export class RegistroPaciente {
  

  pacienteData={
    nombre:'',
    apellidos:'',
    telefono:'',
    correo:'',
    sexo:'',
    fecha_nacimiento:'',
    codigo_postal:'',
    calle:'',
    colonia:'',
    num:'',
    ciudad:'',
    fecha_ingreso:'',
   };

    constructor(private router:Router, private api: ApiService, private toastr: ToastrService){}

  verRegistros(){
    console.log('Navegando a la lista de pacientes')
    this.router.navigate(['/pacientes/lista']);
  }


   onSubmit(){
    console.log('Enviado los siguientes datos:',this.pacienteData);
    this.api.crearPaciente(this.pacienteData)
    .subscribe({
      next:(Response) => {
          this.toastr.success('¡Paciente registrado con éxito!', 'Registro Completo');
          this.pacienteData = {nombre: '', apellidos: '', telefono: '', correo: '', sexo: '', fecha_nacimiento: '', codigo_postal: '', calle: '', colonia: '', num: '', ciudad: '',fecha_ingreso: '' };
      },
      error:(error) => {
        this.toastr.error('Hubo un error al registrar al paciente.', 'Error');
        console.error(error);
      }

    });
   }
}
