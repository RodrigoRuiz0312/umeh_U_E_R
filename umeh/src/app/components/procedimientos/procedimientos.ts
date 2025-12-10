import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsumoService } from '../../services/insumos.service';
import { Procedimiento } from '../../modelos/procedimiento';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { TablaConfig, DEFAULT_TABLA_CONFIG } from '../../modelos/tabla-config';

@Component({
  selector: 'app-procedimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastModule, SkeletonModule, SelectModule],
  templateUrl: './procedimientos.html',
  styleUrls: ['./procedimientos.css'],
  providers: [MessageService]
})
export class Procedimientos implements OnInit, OnDestroy {
  procedimientos: Procedimiento[] = [];
  loading = true;
  error: string | null = null;

  // Usar modelo TablaConfig
  config: TablaConfig = { ...DEFAULT_TABLA_CONFIG, sortColumn: 'id_procedimiento' };
  
  // Debounce para búsqueda
  private searchTimeout: any = null;

  // Skeletons
  loadingRows = Array.from({ length: 8 });

  // Formulario de edición
  editForm: FormGroup;
  modalEditOpen = false;
  selectedProcedimiento: Procedimiento | null = null;

  // Catálogos para insumos
  medicamentos: Array<{ id: number; nombre: string; cantidad: number }> = [];
  materiales: Array<{ id: number; nombre: string; cantidad: number }> = [];
  matGenerales: Array<{ id: number; nombre: string; cantidad: number }> = [];

  constructor(
    private insumoService: InsumoService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      descripcion: ['', Validators.required],
      observaciones: [''],
      responsables: this.fb.array([]),
      insumos: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarProcedimientos();
  }

  private cargarCatalogos() {
    // Cargar todos los medicamentos (límite alto para obtener todos)
    this.insumoService.getInsumos(1, 1000).subscribe({
      next: (response) => this.medicamentos = response.data || [],
      error: (err) => console.error('Error cargando medicamentos:', err)
    });
    // Cargar material de triage (límite alto para obtener todos)
    this.insumoService.getMaterial_Triage(1, 1000).subscribe({
      next: (response) => this.materiales = response.data || [],
      error: (err) => console.error('Error cargando material triage:', err)
    });
    // Cargar material general (límite alto para obtener todos)
    this.insumoService.getMatGeneral(1, 1000).subscribe({
      next: (response) => this.matGenerales = response.data || [],
      error: (err) => console.error('Error cargando material general:', err)
    });
  }

  private cargarProcedimientos() {
    this.loading = true;
    this.error = null;

    this.insumoService.getProcedimientos(
      this.config.paginaActual,
      this.config.limite,
      this.config.searchTerm,
      this.config.sortColumn,
      this.config.sortDirection
    ).subscribe({
      next: (response) => {
        console.log('✅ Procedimientos recibidos:', response);
        this.procedimientos = response.data || [];
        
        // Metadatos de paginación
        this.config.totalItems = response.meta.totalItems;
        this.config.totalPages = response.meta.totalPages;
        
        this.loading = false;

        if (this.procedimientos.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: this.config.searchTerm ? 'No se encontraron resultados.' : 'No hay procedimientos para mostrar.',
            sticky: false,
            life: 3000
          });
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar procedimientos:', err);
        this.error = err?.message || 'Error cargando procedimientos';
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error cargando procedimientos',
          sticky: true
        });
      }
    });
  }

  onSearchTermChange() {
    // Cancelar búsqueda anterior si existe
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Esperar 500ms después de que el usuario deje de escribir
    this.searchTimeout = setTimeout(() => {
      this.config.paginaActual = 1; // Resetear a página 1 al buscar
      this.cargarProcedimientos();
    }, 500);
  }

  onSortOptionChange(value: string) {
    const [col, dir] = (value || '').split(':');
    const validCols = ['id_procedimiento', 'procedimiento', 'costo_total'] as const;
    if (col && (validCols as readonly string[]).includes(col as any)) {
      this.config.sortColumn = col as any;
    }
    if (dir === 'asc' || dir === 'desc') {
      this.config.sortDirection = dir;
    }
    this.config.paginaActual = 1; // Resetear a página 1 al ordenar
    this.cargarProcedimientos();
  }

  // Métodos de paginación
  irAPaginaAnterior() {
    if (this.config.paginaActual > 1) {
      this.config.paginaActual--;
      this.cargarProcedimientos();
    }
  }

  irAPaginaSiguiente() {
    if (this.config.paginaActual < this.config.totalPages) {
      this.config.paginaActual++;
      this.cargarProcedimientos();
    }
  }

  // Getters para el formulario
  get responsablesFA() { return this.editForm.get('responsables') as FormArray; }
  get insumosFA() { return this.editForm.get('insumos') as FormArray; }
  get costoTotal(): number {
    return this.responsablesFA.controls
      .map(c => Number(c.get('costo')?.value) || 0)
      .reduce((a, b) => a + b, 0);
  }

  // Métodos para Responsables
  addResponsable() {
    this.responsablesFA.push(
      this.fb.group({
        nombre: ['UMEH', Validators.required],
        costo: [0, [Validators.required, Validators.min(0)]]
      })
    );
  }

  removeResponsable(index: number) {
    this.responsablesFA.removeAt(index);
  }

  // Métodos para Insumos
  addInsumo() {
    this.insumosFA.push(this.fb.group({
      id: [null, Validators.required],
      encoded: [''],
      tipo: [null],
      nombre: [''],
      busqueda: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeInsumo(index: number) {
    this.insumosFA.removeAt(index);
  }

  onSelectInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const encoded = String(ctrl.get('encoded')?.value || '');

    if (!encoded) {
      ctrl.patchValue({ id: null, tipo: null, nombre: '', busqueda: '' });
      return;
    }

    const [tipoPrefix, idStr] = encoded.split('-');
    const idNum = Number(idStr);
    let tipo: string | null = null;

    if (tipoPrefix === 'med') tipo = 'medicamento';
    else if (tipoPrefix === 'mat') tipo = 'material';
    else if (tipoPrefix === 'mg') tipo = 'mat_general';

    if (!tipo || !Number.isFinite(idNum)) {
      ctrl.patchValue({ id: null, tipo: null, nombre: '', busqueda: '' });
      return;
    }

    if (tipo === 'medicamento') {
      const med = this.medicamentos.find(m => m.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: med?.nombre || '', busqueda: med?.nombre || '' });
    } else if (tipo === 'material') {
      const mat = this.materiales.find(t => t.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: mat?.nombre || '', busqueda: mat?.nombre || '' });
    } else if (tipo === 'mat_general') {
      const mg = this.matGenerales.find(t => t.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: mg?.nombre || '', busqueda: mg?.nombre || '' });
    }

    this.validarDisponibilidadInsumo(index);
  }

  onSearchInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const query = String(ctrl.get('busqueda')?.value || '').trim().toLowerCase();

    if (!query) return;

    const med = this.medicamentos.find(m => m.nombre.toLowerCase() === query);
    const mat = this.materiales.find(t => t.nombre.toLowerCase() === query);
    const mg = this.matGenerales.find(g => g.nombre.toLowerCase() === query);

    const coincidencias = [med, mat, mg].filter(Boolean).length;

    if (coincidencias > 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nombre ambiguo',
        detail: 'Existe más de un insumo con el mismo nombre. Selecciona desde el listado.',
        life: 3000
      });
      return;
    }

    if (med) {
      ctrl.patchValue({ id: med.id, encoded: `med-${med.id}`, tipo: 'medicamento', nombre: med.nombre });
      this.validarDisponibilidadInsumo(index);
      return;
    }

    if (mat) {
      ctrl.patchValue({ id: mat.id, encoded: `mat-${mat.id}`, tipo: 'material', nombre: mat.nombre });
      this.validarDisponibilidadInsumo(index);
      return;
    }

    if (mg) {
      ctrl.patchValue({ id: mg.id, encoded: `mg-${mg.id}`, tipo: 'mat_general', nombre: mg.nombre });
      this.validarDisponibilidadInsumo(index);
      return;
    }

    // No se encontró ningún insumo con ese nombre exacto
    ctrl.patchValue({ id: null, encoded: '', tipo: null, nombre: '' });
    this.messageService.add({
      severity: 'warn',
      summary: 'Insumo no encontrado',
      detail: 'No se encontró un insumo con ese nombre. Intenta con el selector.',
      life: 3000
    });
  }

  onCantidadChange(index: number) {
    this.validarDisponibilidadInsumo(index);
  }

  private validarDisponibilidadInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const nombre = ctrl.get('nombre')?.value || 'Insumo';
    const cantidadSolicitada = Number(ctrl.get('cantidad')?.value || 0);

    if (nombre && cantidadSolicitada > 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Insumo agregado',
        detail: `${nombre}: ${cantidadSolicitada} unidad(es)`,
        life: 2000
      });
    }
  }

  openEdit(procedimiento: Procedimiento) {
    this.selectedProcedimiento = procedimiento;
    this.modalEditOpen = true;

    // Resetear form
    this.editForm.reset();
    this.responsablesFA.clear();
    this.insumosFA.clear();

    // Cargar datos básicos
    this.editForm.patchValue({
      descripcion: procedimiento.procedimiento,
      observaciones: procedimiento.observaciones || ''
    });

    // Cargar responsables
    if (procedimiento.costos_detalle) {
      procedimiento.costos_detalle.forEach(c => {
        this.responsablesFA.push(this.fb.group({
          nombre: [c.responsable, Validators.required],
          costo: [c.costo, [Validators.required, Validators.min(0)]]
        }));
      });
    }

    // Cargar insumos
    if (procedimiento.insumos_detalle) {
      procedimiento.insumos_detalle.forEach(i => {
        let encoded = '';
        if (i.tipo === 'medicamento') encoded = `med-${i.id_insumo}`;
        else if (i.tipo === 'material') encoded = `mat-${i.id_insumo}`;
        else if (i.tipo === 'mat_general') encoded = `mg-${i.id_insumo}`;

        this.insumosFA.push(this.fb.group({
          id: [i.id_insumo, Validators.required],
          encoded: [encoded],
          tipo: [i.tipo],
          nombre: [i.insumo],
          busqueda: [i.insumo],
          cantidad: [i.cantidad, [Validators.required, Validators.min(1)]]
        }));
      });
    }
  }

  closeEdit() {
    this.modalEditOpen = false;
    this.selectedProcedimiento = null;
    this.editForm.reset();
  }

  saveEdit() {
    if (!this.selectedProcedimiento) {
      return;
    }

    // Validar que todos los insumos tengan un ID válido
    const insumosInvalidos = this.insumosFA.controls.some(c => !c.get('id')?.value);
    if (insumosInvalidos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Insumos incompletos',
        detail: 'Por favor selecciona un insumo válido para todos los campos de insumos.'
      });
      return;
    }

    if (this.editForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos requeridos.'
      });
      return;
    }

    const formValue = this.editForm.value;

    // Preparar objeto para enviar
    const datosActualizados = {
      descripcion: formValue.descripcion,
      observaciones: formValue.observaciones,
      responsables: formValue.responsables,
      insumos: formValue.insumos.map((i: any) => ({
        id: i.id,
        tipo: i.tipo,
        cantidad: i.cantidad
      }))
    };

    this.insumoService.updateProcedimiento(this.selectedProcedimiento.id_procedimiento, datosActualizados).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Procedimiento actualizado correctamente.'
        });
        this.closeEdit();
        this.cargarProcedimientos();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al actualizar',
          detail: err.message || 'Ocurrió un error al actualizar el procedimiento.'
        });
      }
    });
  }

  // Modal de eliminación
  modalEliminarVisible: boolean = false;
  procedimientoAEliminar: Procedimiento | null = null;

  confirmarEliminacion(procedimiento: Procedimiento) {
    this.procedimientoAEliminar = procedimiento;
    this.modalEliminarVisible = true;
  }

  cancelarEliminacion() {
    this.modalEliminarVisible = false;
    this.procedimientoAEliminar = null;
  }

  ejecutarEliminacion() {
    if (!this.procedimientoAEliminar) return;

    this.insumoService.deleteProcedimiento(this.procedimientoAEliminar.id_procedimiento).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Procedimiento "${this.procedimientoAEliminar!.procedimiento}" eliminado correctamente.`
        });
        this.cancelarEliminacion();
        this.cargarProcedimientos(); // Recargar lista completa desde el servidor
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail: err.message || 'Ocurrió un error al eliminar el procedimiento.'
        });
        this.cancelarEliminacion();
      }
    });
  }

  ngOnDestroy() {
    // Limpiar timeout al destruir el componente
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}