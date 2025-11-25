import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsumoService } from '../../services/insumos.service';
import { Procedimiento } from '../../modelos/procedimiento';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-procedimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastModule, SkeletonModule, SelectModule],
  templateUrl: './procedimientos.html',
  styleUrls: ['./procedimientos.css'],
  providers: [MessageService]
})
export class Procedimientos implements OnInit {
  procedimientos: Procedimiento[] = [];
  procedimientosView: Procedimiento[] = [];
  loading = true;
  error: string | null = null;

  // Búsqueda y ordenamiento
  searchTerm = '';
  sortColumn: 'id_procedimiento' | 'procedimiento' | 'costo_total' = 'id_procedimiento';
  sortDirection: 'asc' | 'desc' = 'asc';

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
    this.cargarProcedimientos();
    this.cargarCatalogos();
  }

  private cargarCatalogos() {
    this.insumoService.getInsumos().subscribe({
      next: (meds: any[]) => this.medicamentos = meds || [],
      error: (err) => console.error('Error cargando medicamentos:', err)
    });
    this.insumoService.getMaterial_Triage().subscribe({
      next: (tri: any[]) => this.materiales = tri || [],
      error: (err) => console.error('Error cargando material triage:', err)
    });
    this.insumoService.getMatGeneral().subscribe({
      next: (mg: any[]) => this.matGenerales = mg || [],
      error: (err) => console.error('Error cargando material general:', err)
    });
  }

  private cargarProcedimientos() {
    this.loading = true;
    this.error = null;

    this.insumoService.getProcedimientos().subscribe({
      next: (data) => {
        this.procedimientos = data || [];
        this.applyFilters();
        this.loading = false;

        if (this.procedimientos.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin registros',
            detail: 'No hay procedimientos para mostrar.',
            sticky: false,
            life: 3000
          });
        }
      },
      error: (err) => {
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
    this.applyFilters();
  }

  toggleSort(column: 'id_procedimiento' | 'procedimiento' | 'costo_total') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  private applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    let data = [...this.procedimientos];

    if (term) {
      data = data.filter(p =>
        p.procedimiento.toLowerCase().includes(term) ||
        String(p.id_procedimiento).includes(term) ||
        String(p.costo_total ?? 0).includes(term) ||
        (p.observaciones || '').toLowerCase().includes(term) ||
        (p.costos_detalle || []).some(c => c.responsable.toLowerCase().includes(term)) ||
        (p.insumos_detalle || []).some(i => i.insumo.toLowerCase().includes(term))
      );
    }

    data.sort((a, b) => {
      let comp = 0;
      if (this.sortColumn === 'id_procedimiento') {
        comp = (a.id_procedimiento ?? 0) - (b.id_procedimiento ?? 0);
      } else if (this.sortColumn === 'procedimiento') {
        comp = (a.procedimiento || '').localeCompare(b.procedimiento || '');
      } else if (this.sortColumn === 'costo_total') {
        comp = (a.costo_total ?? 0) - (b.costo_total ?? 0);
      }
      return this.sortDirection === 'asc' ? comp : -comp;
    });

    this.procedimientosView = data;
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
        this.procedimientos = this.procedimientos.filter(p => p.id_procedimiento !== this.procedimientoAEliminar!.id_procedimiento);
        this.applyFilters();
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Procedimiento "${this.procedimientoAEliminar!.procedimiento}" eliminado correctamente.`
        });
        this.cancelarEliminacion();
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
}