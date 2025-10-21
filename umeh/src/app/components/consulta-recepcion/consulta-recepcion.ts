// gestion-consulta.component.ts
import { Component, OnInit } from '@angular/core';
import { ConsultaService } from '../../services/consulta-service';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Paciente {
  id_paciente: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  correo: string;
  sexo: string;
  calle: string;
  num: string;
  colonia: string;
  ciudad: string;
  codigo_postal: string;
}

interface Medico {
  id_medico: number;
  nombre: string;
  apellidos: string;
  especialidad: string;
}

interface Consulta {
  id_consulta: number;
  fecha: string;
  estatus: string;
  motivo?: string;
  total: number;
}

interface Insumo {
  id?: number;
  id_insumo: number;
  nombre_insumo: string;
  tipo: 'medicamento' | 'material' | 'procedimiento';
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  subtotal: number;
  descripcion?: string;
}

interface InsumoDisponible {
  id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
}

@Component({
  selector: 'app-consulta-recepcion',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './consulta-recepcion.html',
  styleUrls: ['./consulta-recepcion.css']
})
export class ConsultaRecepcion implements OnInit {

  // Control de flujo
  paso: 'busqueda' | 'seleccion-medico' | 'hoja-impresion' | 'captura-insumos' | 'nota-remision' = 'busqueda';

  // Datos de búsqueda
  nombreBusqueda: string = '';
  apellidosBusqueda: string = '';
  pacientesEncontrados: Paciente[] = [];

  // Paciente seleccionado
  pacienteSeleccionado: Paciente | null = null;

  // Médicos
  medicos: Medico[] = [];
  medicoSeleccionado: number | null = null;

  // Consulta activa
  consultaActual: Consulta | null = null;
  motivoConsulta: string = '';

  // Insumos de la consulta
  insumosConsulta: Insumo[] = [];
  totalConsulta: number = 0;

  // Búsqueda de insumos
  busquedaInsumo: string = '';
  tipoInsumoBusqueda: 'medicamento' | 'material' | 'procedimiento' = 'medicamento';
  insumosDisponibles: InsumoDisponible[] = [];

  // Datos para agregar insumo
  insumoAgregar: {
    id_insumo: number | null;
    nombre: string;
    tipo: string;
    cantidad: number;
    unidad: string;
    costo_unitario: number;
    descripcion: string;
  } = {
      id_insumo: null,
      nombre: '',
      tipo: 'medicamento',
      cantidad: 1,
      unidad: '',
      costo_unitario: 0,
      descripcion: ''
    };

  // Estados de carga
  cargando: boolean = false;
  mensajeError: string = '';
  mensajeExito: string = '';

  constructor(private consultaService: ConsultaService) { }

  ngOnInit(): void {
    this.cargarMedicos();
  }

  // ============================================
  // PASO 1: BÚSQUEDA DE PACIENTE
  // ============================================

  buscarPaciente(): void {
    if (!this.nombreBusqueda.trim()) {
      this.mensajeError = 'Ingrese al menos el nombre del paciente';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.pacientesEncontrados = [];

    console.log('Buscando paciente:', this.nombreBusqueda, this.apellidosBusqueda);

    this.consultaService.buscarPaciente(this.nombreBusqueda, this.apellidosBusqueda)
      .subscribe({
        next: (pacientes) => {
          this.pacientesEncontrados = pacientes;
          this.cargando = false;

          console.log('Pacientes encontrados:', pacientes);

          if (pacientes.length === 0) {
            this.mensajeError = 'No se encontraron pacientes con ese nombre';
          }
        },
        error: (error) => {
          console.error('Error buscando paciente:', error);
          this.mensajeError = 'Error al buscar paciente. Verifique su conexión.';
          this.cargando = false;
        }
      });
  }

  seleccionarPaciente(paciente: Paciente): void {
    console.log('Paciente seleccionado:', paciente);

    // Verificar que el paciente tiene ID
    if (!paciente.id_paciente) {
      this.mensajeError = 'Error: El paciente no tiene un ID válido';
      console.error('Paciente sin ID:', paciente);
      return;
    }

    this.pacienteSeleccionado = paciente;
    this.paso = 'seleccion-medico';
    this.mensajeError = '';
  }

  irARegistroPaciente(): void {
    // Aquí rediriges a tu componente de registro de pacientes
    console.log('Redirigir a registro de pacientes');
    // Ejemplo: this.router.navigate(['/pacientes/registro']);
  }

  // ============================================
  // PASO 2: SELECCIÓN DE MÉDICO Y CREAR CONSULTA
  // ============================================

  cargarMedicos(): void {
    this.consultaService.obtenerMedicos().subscribe({
      next: (medicos) => {
        this.medicos = medicos;
      },
      error: (error) => {
        console.error('Error cargando médicos:', error);
      }
    });
  }

  crearConsulta(): void {
    if (!this.pacienteSeleccionado || !this.medicoSeleccionado) {
      this.mensajeError = 'Debe seleccionar un médico';
      return;
    }

    // Validar que el paciente tenga ID válido
    if (!this.pacienteSeleccionado.id_paciente) {
      this.mensajeError = 'Error: El paciente seleccionado no tiene un ID válido';
      console.error('Paciente sin ID:', this.pacienteSeleccionado);
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    console.log('Creando consulta con:', {
      id_paciente: this.pacienteSeleccionado.id_paciente,
      id_medico: this.medicoSeleccionado,
      motivo: this.motivoConsulta
    });

    this.consultaService.crearConsulta(
      this.pacienteSeleccionado.id_paciente,
      this.medicoSeleccionado,
      this.motivoConsulta
    ).subscribe({
      next: (consulta) => {
        this.consultaActual = consulta;
        this.cargando = false;
        this.paso = 'hoja-impresion';
        console.log('Consulta creada exitosamente:', consulta);
      },
      error: (error) => {
        console.error('Error creando consulta:', error);
        this.cargando = false;

        // Mostrar mensaje de error más específico
        if (error.status === 404) {
          this.mensajeError = error.error?.mensaje || 'Paciente o médico no encontrado';
        } else if (error.status === 400) {
          this.mensajeError = error.error?.mensaje || 'Datos inválidos para crear la consulta';
        } else {
          this.mensajeError = 'Error al crear la consulta. Por favor, verifique los datos.';
        }
      }
    });
  }

  // ============================================
  // PASO 3: HOJA DE IMPRESIÓN
  // ============================================

  imprimirHoja(): void {
    window.print();
  }

  confirmarImpresion(): void {
    // Cambiar estatus a "en_atencion"
    if (this.consultaActual) {
      this.consultaService.actualizarEstatus(this.consultaActual.id_consulta, 'en_atencion')
        .subscribe({
          next: () => {
            this.mensajeExito = 'Paciente en atención médica';
            // Aquí podrías cerrar este componente o esperar a que regrese
          },
          error: (error) => {
            console.error('Error actualizando estatus:', error);
          }
        });
    }
  }

  retomarConsulta(): void {
    // Cuando el paciente regresa de consulta con el doctor
    if (this.consultaActual) {
      this.consultaService.actualizarEstatus(this.consultaActual.id_consulta, 'por_facturar')
        .subscribe({
          next: () => {
            this.paso = 'captura-insumos';
            this.cargarInsumosConsulta();
          },
          error: (error) => {
            console.error('Error actualizando estatus:', error);
          }
        });
    }
  }

  calcularEdad(fechaNacimiento: string | Date | undefined): number {
    if (!fechaNacimiento) return 0;
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }


  // ============================================
  // PASO 4: CAPTURA DE INSUMOS
  // ============================================

  cargarInsumosConsulta(): void {
    if (!this.consultaActual) return;

    this.consultaService.obtenerInsumosConsulta(this.consultaActual.id_consulta)
      .subscribe({
        next: (insumos) => {
          this.insumosConsulta = insumos;
          this.calcularTotal();
        },
        error: (error) => {
          console.error('Error cargando insumos:', error);
        }
      });
  }

  buscarInsumos(): void {
    if (this.busquedaInsumo.trim().length < 2) {
      this.insumosDisponibles = [];
      return;
    }

    let observable;

    switch (this.tipoInsumoBusqueda) {
      case 'medicamento':
        observable = this.consultaService.buscarMedicamentos(this.busquedaInsumo);
        break;
      case 'material':
        observable = this.consultaService.buscarMateriales(this.busquedaInsumo);
        break;
      case 'procedimiento':
        observable = this.consultaService.buscarProcedimientos(this.busquedaInsumo);
        break;
    }

    observable.subscribe({
      next: (insumos) => {
        this.insumosDisponibles = insumos;
      },
      error: (error) => {
        console.error('Error buscando insumos:', error);
      }
    });
  }

  seleccionarInsumoDisponible(insumo: InsumoDisponible): void {
    this.insumoAgregar = {
      id_insumo: insumo.id,
      nombre: insumo.nombre,
      tipo: this.tipoInsumoBusqueda,
      cantidad: 1,
      unidad: insumo.unidad,
      costo_unitario: insumo.costo_unitario,
      descripcion: ''
    };
    this.insumosDisponibles = [];
    this.busquedaInsumo = '';
  }

  agregarInsumo(): void {
    if (!this.consultaActual || !this.insumoAgregar.id_insumo) {
      this.mensajeError = 'Debe seleccionar un insumo válido';
      return;
    }

    if (this.insumoAgregar.cantidad <= 0) {
      this.mensajeError = 'La cantidad debe ser mayor a 0';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    this.consultaService.agregarInsumo(
      this.consultaActual.id_consulta,
      this.insumoAgregar.id_insumo,
      this.insumoAgregar.tipo,
      this.insumoAgregar.cantidad,
      this.insumoAgregar.descripcion
    ).subscribe({
      next: (response) => {
        this.insumosConsulta.push(response.insumo);
        this.totalConsulta = response.totalConsulta;
        this.cargando = false;
        this.mensajeExito = 'Insumo agregado correctamente';

        // Limpiar formulario
        this.insumoAgregar = {
          id_insumo: null,
          nombre: '',
          tipo: 'medicamento',
          cantidad: 1,
          unidad: '',
          costo_unitario: 0,
          descripcion: ''
        };

        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: (error) => {
        console.error('Error agregando insumo:', error);
        this.mensajeError = error.error?.mensaje || 'Error al agregar insumo';
        this.cargando = false;
      }
    });
  }

  eliminarInsumo(insumoId: number): void {
    if (!confirm('¿Está seguro de eliminar este insumo?')) {
      return;
    }

    this.consultaService.eliminarInsumo(insumoId).subscribe({
      next: (response) => {
        this.insumosConsulta = this.insumosConsulta.filter(i => i.id !== insumoId);
        this.totalConsulta = response.totalConsulta;
        this.mensajeExito = 'Insumo eliminado correctamente';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: (error) => {
        console.error('Error eliminando insumo:', error);
        this.mensajeError = 'Error al eliminar insumo';
      }
    });
  }

  calcularTotal(): void {
    this.totalConsulta = this.insumosConsulta.reduce((sum, insumo) => sum + insumo.subtotal, 0);
  }

  // ============================================
  // PASO 5: FINALIZAR Y GENERAR NOTA DE REMISIÓN
  // ============================================

  finalizarConsulta(): void {
    if (!this.consultaActual) return;

    if (this.insumosConsulta.length === 0) {
      if (!confirm('No se han agregado insumos. ¿Desea continuar?')) {
        return;
      }
    }

    this.cargando = true;

    this.consultaService.finalizarConsulta(this.consultaActual.id_consulta, '')
      .subscribe({
        next: (response) => {
          this.cargando = false;
          this.paso = 'nota-remision';
          this.mensajeExito = 'Consulta finalizada correctamente';
        },
        error: (error) => {
          console.error('Error finalizando consulta:', error);
          this.mensajeError = 'Error al finalizar consulta';
          this.cargando = false;
        }
      });
  }

  imprimirNotaRemision(): void {
    window.print();
  }

  nuevaConsulta(): void {
    // Resetear todo
    this.paso = 'busqueda';
    this.nombreBusqueda = '';
    this.apellidosBusqueda = '';
    this.pacientesEncontrados = [];
    this.pacienteSeleccionado = null;
    this.medicoSeleccionado = null;
    this.consultaActual = null;
    this.motivoConsulta = '';
    this.insumosConsulta = [];
    this.totalConsulta = 0;
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  getMedicoNombre(id: number): string {
    const medico = this.medicos.find(m => m.id_medico === id);
    return medico ? `${medico.nombre} ${medico.apellidos}` : '';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearMoneda(cantidad: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad);
  }
}