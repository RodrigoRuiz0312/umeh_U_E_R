import { Component, OnInit } from '@angular/core';
import { ConsultaService } from '../../services/consulta.service';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { Input } from '@angular/core';

interface Paciente {
  id_paciente: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefonos: string[];
  correos: string[];
  sexo: string;
  calle: string;
  num: string;
  colonia: string;
  municipio: string;
  estado: string;
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
  activo: boolean;
  paciente_nombre?: string;
  paciente_apellidos?: string;
  medico_nombre?: string;
  medico_apellidos?: string;
  id_cita?: number;
}

interface Insumo {
  id?: number;
  id_insumo: number;
  nombre_insumo: string;
  tipo: 'medicamento' | 'material' | 'mat_general' | 'procedimiento';
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

interface Extra {
  id_extra: number;
  concepto: string;
  costo: number;
  observaciones?: string;
}

@Component({
  selector: 'app-consulta-recepcion',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './consulta-recepcion.html',
  styleUrls: ['./consulta-recepcion.css']
})
export class ConsultaRecepcion implements OnInit {


  citasDelDia: any[] = [];
  idCita: number | null = null;
  @Input() cita: any;

  // Control de flujo
  paso: 'busqueda' | 'seleccion-medico' | 'captura-insumos' | 'nota-remision' = 'busqueda';

  // Datos de búsqueda
  nombreBusqueda: string = '';
  apellidosBusqueda: string = '';
  pacientesEncontrados: Paciente[] = [];

  // Paciente seleccionado
  pacienteSeleccionado: any;

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
  tipoInsumoBusqueda: 'medicamento' | 'material' | 'mat_general' | 'procedimiento' = 'medicamento';
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

  // Costos de consulta y extras
  costoConsulta: number = 0;
  extras: Extra[] = [];
  nuevoExtra: { concepto: string; costo: number; observaciones: string } = {
    concepto: '',
    costo: 0,
    observaciones: ''
  };

  // Estados de carga
  cargando: boolean = false;
  mensajeError: string = '';
  mensajeExito: string = '';

  consultasActivas: Consulta[] = [];

  // En consulta-recepcion.ts - agregar estas propiedades
  modoDetallado: boolean = false;
  editandoModoNota: boolean = false;

  mostrarModalNotas = false;
  resultados: any[] = [];
  intentado = false;

  filtro = {
    nombre: '',
    apellidos: '',
    fecha_inicio: '',
    fecha_fin: ''
  };

  get listaCostosCombinada() {
    const insumos = this.insumosConsulta.map(i => ({
      tipo: i.tipo,
      nombre: i.nombre_insumo,
      cantidad: i.cantidad,
      unidad: i.unidad,
      costo_unitario: i.costo_unitario,
      subtotal: i.subtotal,
      observaciones: i.descripcion || '',
      id: i.id,
      esExtra: false
    }));

    const extras = this.extras.map(e => ({
      tipo: 'extra',
      nombre: e.concepto,
      cantidad: '-',
      unidad: '-',
      costo_unitario: e.costo,
      subtotal: e.costo,
      observaciones: e.observaciones || '',
      id: e.id_extra,
      esExtra: true
    }));

    return [...insumos, ...extras];
  }


  constructor(private route: ActivatedRoute, private consultaService: ConsultaService, private api: ApiService, private router: Router) { }

  formConsulta = {
    id_medico: null as number | null,
    motivo: ''
  };

  ngOnInit(): void {
    this.cargarMedicos();
    this.cargarCitasDelDia();
    this.obtenerConsultasActivas();

    this.route.queryParams.subscribe(params => {
      this.idCita = params['id_cita'] ? Number(params['id_cita']) : null;
    })

    if (this.cita) {
      this.formConsulta.id_medico = this.cita.id_medico;
      this.medicoSeleccionado = this.cita.id_medico;
    }
  }


  private getTodayLocalYYYYMMDD(): string {
    const today = new Date();
    const year = today.getFullYear();

    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


  //Añadi esta nueva funcion
  cargarCitasDelDia(): void {
    const hoy = this.getTodayLocalYYYYMMDD();
    console.log(`Cargando citas para la fecha local: ${hoy}`);

    this.api.getAgendaCompletaDelDia(hoy).subscribe({
      next: (data) => {
        console.log(' Citas recibidas:', data);
        if (data.length > 0) {
          console.log('Ejemplo de cita recibida:', data[0]);
        }
        this.citasDelDia = Array.isArray(data)
          ? data.filter(
            (cita) =>
              cita.estado === 'Agendada' ||
              cita.estado === 'En espera' ||
              cita.estado === 'Pendiente'
          )
          : [];
      },
      error: (err) => {
        console.error('Error cargando la agenda del día:', err);
        this.mensajeError = 'No se pudo cargar la agenda del día.';
        this.citasDelDia = [];
      },
    });
  }


  seleccionarCitaParaConsulta(cita: any): void {

    const yaActiva = this.consultasActivas?.some(
      (c) => c.id_cita === cita.id_cita
    );

    if (yaActiva) {
      this.mensajeError = 'Esta cita ya tiene una consulta activa.';
      return;
    }


    this.cargando = true;


    this.idCita = cita.id_cita;


    this.formConsulta.id_medico = Number(cita.id_medico);
    this.formConsulta.motivo = cita.motivo || '';

    this.medicoSeleccionado = Number(cita.id_medico);

    this.consultaService.buscarPaciente(cita.nombre_paciente, cita.apellidos_paciente).subscribe({
      next: (pacientes) => {
        if (pacientes.length > 0) {
          this.seleccionarPaciente(pacientes[0]);
        } else {
          this.mensajeError = 'No se encontró el paciente en la base de datos';
        }
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al seleccionar paciente de la cita:', err);
        this.mensajeError = 'Error al seleccionar el paciente de la cita.';
        this.cargando = false;
      }
    });
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

    // Verificar que el paciente tenga ID
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
    this.router.navigate(['/pacientes/registro']);
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
    const idMedico = Number(this.formConsulta.id_medico);

    if (!this.pacienteSeleccionado || !idMedico) {
      this.mensajeError = 'Debe seleccionar un médico';
      return;
    }


    if (!this.pacienteSeleccionado.id_paciente) {
      this.mensajeError = 'Error: El paciente seleccionado no tiene un ID válido';
      console.error('Paciente sin ID:', this.pacienteSeleccionado);
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    const motivo = this.formConsulta.motivo || '';

    console.log('Creando consulta con:', {
      id_paciente: this.pacienteSeleccionado.id_paciente,
      id_medico: idMedico,
      motivo
    });

    this.consultaService.crearConsulta(
      this.pacienteSeleccionado.id_paciente,
      idMedico,
      motivo,
    ).subscribe({
      next: (consulta: any) => {
        this.consultaActual = consulta;
        this.cargando = false;

        // Cambiar estatus a 'en_atencion' automáticamente
        this.consultaService.actualizarEstatus(consulta.id_consulta, 'en_atencion').subscribe({
          next: () => {
            console.log('Consulta creada y en atencion', consulta);

            if (this.idCita) {
              this.consultaService.actualizarEstadoCita(this.idCita, "En Consulta")
                .subscribe({
                  next: () => {
                    console.log("Estado actualizado");
                    this.cargarCitasDelDia();
                    this.obtenerConsultasActivas();
                  },
                  error: (err) => {
                    console.error("Error actualizando la cita:", err);
                  }
                });
            } else {
              this.obtenerConsultasActivas();
            }

            this.paso = 'captura-insumos';
            this.cargarExtras();
            this.cargarInsumosConsulta();

            // Actualizar lista de consultas activas
            this.obtenerConsultasActivas();

            console.log('Consulta creada y en atención:', consulta);

            // ✅ Abrir automáticamente la hoja PDF generada en el backend
            const pdfUrl = `${this.consultaService.apiUrl}/consultas/${consulta.id_consulta}/hoja-pdf`;
            window.open(pdfUrl, '_blank');
          },
          error: (err) => console.error('Error actualizando estatus inicial:', err)
        });
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

  isCitaDeshabilitada(cita: any): boolean {
    if (!cita) return false;
    if (cita.estado && cita.estado !== 'Agendada') return true;
    if (!this.consultasActivas || !Array.isArray(this.consultasActivas)) return false;

    return this.consultasActivas.some((c: any) => {
      return (
        (c.id_cita && cita.id_cita && c.id_cita === cita.id_cita) ||
        (c.id_consulta && cita.id_cita && c.id_consulta === cita.id_cita) ||
        (c.paciente?.id_paciente && cita.id_paciente && c.paciente.id_paciente === cita.id_paciente) ||
        (c.paciente_nombre && cita.nombre_paciente && c.paciente_nombre === cita.nombre_paciente)
      );
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
            this.cargarExtras();
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
      case 'mat_general':
        observable = this.consultaService.buscarMatGeneral(this.busquedaInsumo);
        break;
      case 'procedimiento':
        observable = this.consultaService.buscarProcedimientos(this.busquedaInsumo);
        break;
      default:
        observable = this.consultaService.buscarMedicamentos(this.busquedaInsumo);
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
        this.calcularTotal();
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

  eliminarInsumo(insumoId: number | string): void {
    console.log('Tipo de insumoId:', typeof insumoId, 'Valor:', insumoId);

    if (!confirm('¿Está seguro de eliminar este insumo?')) return;

    // Asegurar que sea un entero válido
    const idLimpio = parseInt(String(insumoId), 10);

    if (isNaN(idLimpio)) {
      this.mensajeError = 'ID de insumo inválido';
      return;
    }

    this.consultaService.eliminarInsumo(idLimpio).subscribe({
      next: (response) => {
        // Usar idLimpio para la comparación
        this.insumosConsulta = this.insumosConsulta.filter(i => parseInt(String(i.id), 10) !== idLimpio);
        this.calcularTotal();
        this.mensajeExito = 'Insumo eliminado correctamente';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: (error) => {
        console.error('Error eliminando insumo:', error);
        this.mensajeError = 'Error al eliminar insumo';
      }
    });
  }

  // ============================================
  // COSTO DE CONSULTA Y COSTOS EXTRA
  // ============================================

  cargarExtras(): void {
    if (!this.consultaActual) return;
    this.consultaService.obtenerExtras(this.consultaActual.id_consulta).subscribe({
      next: (data: any) => {
        this.extras = data.extras || [];
        this.costoConsulta = data.costo_consulta || 0;
        this.calcularTotal();
      },
      error: (err) => console.error('Error cargando extras:', err)
    });
  }

  guardarCostoConsulta(): void {
    if (!this.consultaActual) return;
    const body = { costo_consulta: this.costoConsulta };

    this.consultaService.actualizarCostoConsulta(this.consultaActual.id_consulta, body).subscribe({
      next: () => {
        console.log('Costo de consulta actualizado');
        this.calcularTotal();
      },
      error: (err) => console.error('Error actualizando costo base:', err)
    });
  }

  agregarExtra(): void {
    if (!this.consultaActual) return;
    const { concepto, costo, observaciones } = this.nuevoExtra;

    if (!concepto || costo <= 0) {
      alert('Ingrese un concepto y un costo válido.');
      return;
    }

    // Formatear concepto con capitalize
    const conceptoFormateado = this.capitalize(concepto);

    this.consultaService.agregarExtra(this.consultaActual.id_consulta, conceptoFormateado, costo, observaciones)
      .subscribe({
        next: (res: any) => {
          this.extras.push(res.extra);
          this.nuevoExtra = { concepto: '', costo: 0, observaciones: '' };
          this.calcularTotal();
        },
        error: (err) => console.error('Error agregando costo extra:', err)
      });
  }

  eliminarExtra(id_extra: number): void {
    if (!confirm('¿Eliminar este costo adicional?')) return;

    this.consultaService.eliminarExtra(id_extra).subscribe({
      next: () => {
        this.extras = this.extras.filter(e => e.id_extra !== id_extra);
        this.calcularTotal();
      },
      error: (err) => console.error('Error eliminando extra:', err)
    });
  }

  // 🔢 Recalcular el total incluyendo costo base, insumos y extras
  calcularTotal(): void {
    const subtotalInsumos = this.insumosConsulta.reduce((sum, i) => sum + i.subtotal, 0);
    const subtotalExtras = this.extras.reduce((sum, e) => sum + Number(e.costo || 0), 0);
    this.totalConsulta = this.costoConsulta + subtotalInsumos + subtotalExtras;
  }

  generarNotaRemision(): void {
    if (!this.consultaActual) return;

    this.cargando = true;

    this.consultaService.generarNotaRemision(this.consultaActual.id_consulta, this.modoDetallado)
      .subscribe({
        next: (pdfBlob: Blob) => {
          this.cargando = false;

          // Abrir el PDF en una nueva ventana del navegador
          const url = window.URL.createObjectURL(pdfBlob);
          window.open(url, '_blank');

          this.mensajeExito = 'Nota de remisión generada correctamente';
        },
        error: (error) => {
          console.error('Error generando nota de remisión:', error);
          this.mensajeError = 'Error al generar la nota de remisión';
          this.cargando = false;
        }
      });
  }

  // Método para agrupar insumos por categoría (para la vista previa)
  getInsumosAgrupados(): any[] {
    const agrupados: any = {};

    this.listaCostosCombinada.forEach(item => {
      let categoria = '';

      if (item.esExtra) {
        categoria = 'Extras';
      } else {
        switch (item.tipo) {
          case 'medicamento': categoria = 'Medicamentos'; break;
          case 'material': categoria = 'Material'; break;
          case 'mat_general': categoria = 'Material General'; break;
          case 'procedimiento': categoria = 'Procedimientos'; break;
          default: categoria = 'Otros';
        }
      }

      if (!agrupados[categoria]) {
        agrupados[categoria] = { categoria, total: 0 };
      }
      agrupados[categoria].total += item.subtotal;
    });

    return Object.values(agrupados);
  }

  // Método para cambiar el modo de la nota
  cambiarModoNota(): void {
    if (!this.consultaActual) return;

    this.consultaService.actualizarModoNotaRemision(this.consultaActual.id_consulta, this.modoDetallado)
      .subscribe({
        next: () => {
          this.mensajeExito = `Modo ${this.modoDetallado ? 'detallado' : 'resumido'} guardado`;
          this.editandoModoNota = false;
          setTimeout(() => this.mensajeExito = '', 3000);
        },
        error: (error) => {
          console.error('Error actualizando modo de nota:', error);
          this.mensajeError = 'Error al actualizar el modo de la nota';
        }
      });
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
        next: () => {
          if (this.idCita) {
            this.api.actualizarEstadoCita(this.idCita, 'Finalizada')
              .subscribe(() => this.cargarCitasDelDia());
          }

          this.cargando = false;
          this.paso = 'nota-remision';
          this.mensajeExito = 'Consulta finalizada correctamente';

          // Actualizar lista de consultas activas (esta consulta ya no aparecerá)
          this.obtenerConsultasActivas();
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
    this.costoConsulta = 0;
    this.extras = [];
    this.nuevoExtra = { concepto: '', costo: 0, observaciones: '' };
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  getMedicoNombre(id_medico: number | null): string {
    if (!id_medico || !this.medicos) return 'No asignado';

    const medico = this.medicos.find(m =>
      m.id_medico === id_medico
    );
    return medico ? `${medico.nombre} ${medico.apellidos} - ${medico.especialidad}` : 'No encontrado';
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

  capitalize(text: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatearTelefonosOCorreos(data: string | string[]): string {
    if (!data) return '';
    if (Array.isArray(data)) {
      return data.join(', ');
    }
    return data;
  }

  obtenerConsultasActivas() {
    this.consultaService.obtenerConsultasActivas().subscribe({
      next: (data) => this.consultasActivas = data,
      error: (err) => console.error(err)
    });
  }


  isPacienteEnConsultaActiva(paciente: any): boolean {
    if (!paciente) return false;
    const idPaciente = paciente.id_paciente ?? (paciente.paciente?.id_paciente);
    if (!idPaciente) return false;
    if (!this.consultasActivas || !Array.isArray(this.consultasActivas)) return false;

    return this.consultasActivas.some((c: any) => {
      if (c.paciente && c.paciente.id_paciente && c.paciente.id_paciente === idPaciente) return true;
      if (c.id_paciente && c.id_paciente === idPaciente) return true;
      if (c.paciente_nombre && paciente.nombre && c.paciente_nombre === `${paciente.nombre}`) return true;
      return false;
  });
}

  // Retomar una consulta en espera para continuar con la captura de insumos
  retomarConsultaActiva(consulta: Consulta): void {
    // Buscar el paciente y médico de la consulta
    this.consultaService.obtenerHojaConsulta(consulta.id_consulta).subscribe({
      next: (datos: any) => {
        // Cargar datos del paciente
        this.pacienteSeleccionado = {
          id_paciente: datos.id_paciente || 0,
          nombre: datos.paciente_nombre,
          apellidos: datos.paciente_apellidos,
          fecha_nacimiento: datos.fecha_nacimiento,
          telefonos: datos.paciente_telefono,
          correos: datos.paciente_correo,
          sexo: datos.sexo,
          calle: datos.calle,
          num: datos.num,
          colonia: datos.colonia,
          municipio: datos.ciudad,
          estado: datos.estado,
          codigo_postal: datos.codigo_postal
        };

        // Cargar datos de la consulta
        this.consultaActual = consulta;
        this.idCita = datos.id_cita || null;
        this.motivoConsulta = consulta.motivo || '';

        // Buscar el médico en la lista
        const medico = this.medicos.find(m =>
          m.nombre === datos.medico_nombre && m.apellidos === datos.medico_apellidos
        );
        this.medicoSeleccionado = medico ? medico.id_medico : null;
        this.formConsulta.id_medico = this.medicoSeleccionado;

        // Cambiar a paso de captura de insumos
        this.paso = 'captura-insumos';
        this.cargarExtras();
        this.cargarInsumosConsulta();

        // Actualizar estatus a 'en_atencion'
        this.consultaService.actualizarEstatus(consulta.id_consulta, 'en_atencion').subscribe({
          next: () => {
            this.obtenerConsultasActivas();
            this.mensajeExito = 'Consulta retomada';
            setTimeout(() => this.mensajeExito = '', 3000);
          },
          error: (err) => console.error('Error actualizando estatus:', err)
        });
      },
      error: (err) => {
        console.error('Error obteniendo datos de consulta:', err);
        this.mensajeError = 'Error al cargar los datos de la consulta';
      }
    });
  }

  abrirModalNotas() {
    this.mostrarModalNotas = true;
    this.resultados = [];
    this.intentado = false;
  }

  cerrarModal() {
    this.mostrarModalNotas = false;
  }

  buscarNotas() {
    if (!this.filtro.nombre.trim()) {
      alert("El nombre del paciente es obligatorio");
      return;
    }

    this.consultaService.getHistorialConsultas(this.filtro).subscribe({
      next: (data) => {
        this.resultados = data;
        this.intentado = true;
      },
      error: () => {
        alert("Error buscando notas.");
      }
    });
  }

  imprimirNotaHistorica(id_consulta: number, modoDetallado: boolean) {
    const url = `http://localhost:4000/api/notas/${id_consulta}/nota-remision?modo_detallado=${modoDetallado}`;
    window.open(url, '_blank');
  }

  // ✅ NUEVO: Cancelar consulta y restaurar inventario
  cancelarConsulta(): void {
    if (!this.consultaActual) return;

    if (!confirm('¿Está seguro de cancelar esta consulta? Se restaurará todo el inventario de insumos utilizados.')) {
      return;
    }

    this.cargando = true;
    this.consultaService.cancelarConsulta(this.consultaActual.id_consulta).subscribe({
      next: (response) => {
        this.mensajeExito = `Consulta cancelada. ${response.insumosRestaurados} insumo(s) restaurado(s).`;

        // Actualizar cita si existe
        if (this.idCita) {
          this.api.actualizarEstadoCita(this.idCita, 'Cancelada')
            .subscribe(() => this.cargarCitasDelDia());
        }

        // Actualizar lista de consultas activas
        this.obtenerConsultasActivas();

        // Resetear formulario después de 2 segundos
        setTimeout(() => {
          this.nuevaConsulta();
        }, 2000);

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cancelando consulta:', error);
        this.mensajeError = error.error?.mensaje || 'Error al cancelar la consulta';
        this.cargando = false;
      }
    });
  }
}