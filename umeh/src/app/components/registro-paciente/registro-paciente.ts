// EN: registro-paciente.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
// ¡Importar FormArray!
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-registro-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ReactiveFormsModule],
  templateUrl: './registro-paciente.html',
  styleUrl: './registro-paciente.css',
  providers: [MessageService]
})
export class RegistroPaciente {

  pacienteForm: FormGroup;
  colonias: string[] = [];
  cargando = false;
  errorMsg = '';
  mostrarModalCamposObligatorios = false;
  camposFaltantes: string[] = [];

  // Cierra el modal de campos obligatorios
  cerrarModalCamposObligatorios() {
    this.mostrarModalCamposObligatorios = false;
  }

  // Recolecta los campos faltantes para mostrarlos en el modal
  private recolectarCamposFaltantes(): string[] {
    const faltantes: string[] = [];
    const controls = this.pacienteForm.controls;

    // Validar campos de datos personales
    if (controls['nombre'].invalid) {
      faltantes.push('Nombre');
    }
    if (controls['apellidos'].invalid) {
      faltantes.push('Apellidos');
    }
    if (controls['sexo'].invalid) {
      faltantes.push('Sexo');
    }
    if (controls['fecha_nacimiento'].invalid) {
      faltantes.push('Fecha de nacimiento');
    }

    // Validar FormArrays
    if (this.telefonos.invalid) {
       faltantes.push('Teléfono (Se requiere al menos uno, formato 10-15 dígitos)');
    }
    if (this.correos.invalid) {
       faltantes.push('Correo (Uno o más correos tienen formato inválido)');
    }
    
    // Validar campos de domicilio
    if (controls['codigo_postal'].invalid) {
      faltantes.push('Código postal');
    }
    if (controls['calle'].invalid) {
      faltantes.push('Calle');
    }
    if (controls['colonia'].invalid) {
      faltantes.push('Colonia');
    }
    if (controls['municipio'].invalid) {
      faltantes.push('Municipio');
    }
    if (controls['estado'].invalid) {
      faltantes.push('Estado');
    }

    return faltantes;
  }

  constructor(private router: Router, private api: ApiService, private messageService: MessageService, private fb: FormBuilder, private http: HttpClient) {
    this.pacienteForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      sexo: ['', Validators.required],
      fecha_nacimiento: ['', Validators.required],
      
      // --- CAMBIO AQUÍ ---
      // Convertidos a FormArray
      telefonos: this.fb.array([
        // Iniciar con un campo de teléfono requerido
        this.fb.control('', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)])
      ]),
      correos: this.fb.array([
        // Iniciar con un campo de correo opcional, pero con validación de email
        this.fb.control('', [Validators.email])
      ]),
      // --- FIN DEL CAMBIO ---

      codigo_postal: ['', Validators.required],
      calle: ['', Validators.required],
      colonia: ['', Validators.required],
      num: ['', Validators.required], // 'num' es requerido en tu HTML, lo añado aquí
      municipio: ['', Validators.required],
      estado: ['', Validators.required],
    })
  }

  // --- MÉTODOS NUEVOS ---
  // Getters para acceder fácilmente a los FormArrays desde el HTML
  get telefonos(): FormArray {
    return this.pacienteForm.get('telefonos') as FormArray;
  }

  get correos(): FormArray {
    return this.pacienteForm.get('correos') as FormArray;
  }

  // Añadir un nuevo control de teléfono al FormArray
  addTelefono(): void {
    this.telefonos.push(this.fb.control('', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]));
  }

  // Remover un teléfono (no permitir remover el último)
  removeTelefono(index: number): void {
    if (this.telefonos.length > 1) {
      this.telefonos.removeAt(index);
    }
  }

  // Añadir un nuevo control de correo al FormArray
  addCorreo(): void {
    this.correos.push(this.fb.control('', [Validators.email]));
  }

  // Remover un correo (permitir remover todos si se desea)
  removeCorreo(index: number): void {
    this.correos.removeAt(index);
  }
  // --- FIN MÉTODOS NUEVOS ---

  buscarCP(): void {
    // ... (Tu función buscarCP no necesita cambios) ...
    const cp = this.pacienteForm.get('codigo_postal')?.value;
    if (!cp || cp.length !== 5) {
      this.errorMsg = 'El código postal debe tener 5 dígitos.';
      return;
    }

    this.errorMsg = '';
    this.cargando = true;

    this.http.get<any>(`https://sepomex.icalialabs.com/api/v1/zip_codes?zip_code=${cp}`).subscribe({
      next: (res) => {
        this.cargando = false;

        const zipData = res.zip_codes?.[0];
        if (!zipData) {
          this.errorMsg = 'No se encontraron resultados para este código postal.';
          this.pacienteForm.patchValue({ estado: '', municipio: '', colonia: '' });
          this.colonias = [];
          return;
        }

        // Llenar formulario
        this.pacienteForm.patchValue({
          estado: zipData.d_estado,
          municipio: zipData.d_mnpio,
          colonia: ''
        });

        // Colonias
        this.colonias = res.zip_codes.map((z: any) => z.d_asenta);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = 'Error al consultar el código postal.';
        console.error(err);
      }
    });
  }

  capitalize(text: string) {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onSubmit() {
    // Marcar todo como "tocado" para mostrar errores de validación
    this.pacienteForm.markAllAsTouched(); 
    
    this.camposFaltantes = this.recolectarCamposFaltantes();

    if (this.camposFaltantes.length > 0 || this.pacienteForm.invalid) {
      this.mostrarModalCamposObligatorios = true;
      return;
    }

    // Preparamos los datos del formulario
    const datosAEnviar = {
      ...this.pacienteForm.value,
      nombre: this.capitalize(this.pacienteForm.value.nombre),
      apellidos: this.capitalize(this.pacienteForm.value.apellidos),
      calle: this.capitalize(this.pacienteForm.value.calle),
      fecha_ingreso: new Date().toISOString().split('T')[0]
    };

    // Usar el método crearPaciente
    this.api.crearPaciente(datosAEnviar).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Registro exitoso',
          detail: '¡Paciente registrado con éxito! Registro Completo',
          life: 3000
        });

        this.pacienteForm.reset();
        this.colonias = [];
        this.telefonos.clear();
        this.correos.clear();
        this.addTelefono();
        this.addCorreo();
      },
      error: (error: any) => {
        console.error('Error al registrar paciente:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al registrar el paciente',
          life: 3000
        });
      }
    });
  }

  verRegistros() {
    console.log('Navegando a la lista de pacientes')
    this.router.navigate(['/pacientes/lista']);
  }

  irAConsultaRecepcion() {
    console.log('Navegando a la recepcion de la consulta')
    this.router.navigate(['/pacientes/recepcion']);
  }
}