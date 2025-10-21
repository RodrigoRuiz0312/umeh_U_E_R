import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InsumoService } from '../../services/insumos';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SelectModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
  providers: [MessageService]
})
export class Registro implements OnInit {
  form: FormGroup;
  loading = false;
  metodosAplicacion: { id: number; nombre: string }[] = [];
  selectedMetodos = new Set<number>();
  metodosTouched = false;
  selectAllMetodos = false;
  medicamentos: Array<{ id: number; nombre: string; cantidad: number }> = [];
  materiales: Array<{ id: number; nombre: string; cantidad: number }> = [];
  mostrarModalCamposObligatorios = false;
  camposFaltantes: string[] = [];
  insumosOptions: any[] = [];

  // Cierra el modal de campos obligatorios
  cerrarModalCamposObligatorios() {
    this.mostrarModalCamposObligatorios = false;
  }

  // Recolecta los campos faltantes para mostrarlos en el modal
  private recolectarCamposFaltantes(): string[] {
    const faltantes: string[] = [];
    const tipo = this.form.get('tipo')?.value;

    if (tipo === 'procedimiento') {
      const desc = this.procGroup.get('descripcion');
      if (!desc || desc.invalid) {
        if (!desc?.value || desc.value.trim() === '') {
          faltantes.push('Descripción del procedimiento');
        }
      }
      if (this.responsablesFA.length === 0) {
        faltantes.push('Al menos un responsable');
      } else {
        this.responsablesFA.controls.forEach((ctrl, index) => {
          const costo = Number(ctrl.get('costo')?.value);
          if (isNaN(costo) || costo < 0) {
            faltantes.push(`Responsable #${index + 1}: el costo no puede ser negativo`);
          }
        });
      }
      if (this.insumosFA.length > 0) {
        this.insumosFA.controls.forEach((ctrl, index) => {
          const id = ctrl.get('id')?.value;
          const cantidad = Number(ctrl.get('cantidad')?.value);

          if (!id) {
            faltantes.push(`Insumo #${index + 1}: debe seleccionar un insumo`);
          }
          if (isNaN(cantidad) || cantidad <= 0) {
            faltantes.push(`Insumo #${index + 1}: la cantidad debe ser mayor a 0`);
          }
        });
      }
    } else {
      if (!this.nombre || this.nombre.invalid) {
        if (!this.nombre?.value || this.nombre.value.trim() === '') {
          faltantes.push('Nombre');
        }
      }

      if (!this.cantidad || this.cantidad.invalid) {
        const cantidadVal = Number(this.cantidad?.value);
        if (!this.cantidad?.value && this.cantidad?.value !== 0) {
          faltantes.push('Cantidad');
        } else if (cantidadVal <= 0) {
          faltantes.push('Cantidad: debe ser mayor a 0');
        } else if (cantidadVal < 0) {
          faltantes.push('Cantidad: no puede ser negativa');
        }
      }

      const costoVal = this.costo_unitario?.value;
      if (costoVal !== null && costoVal !== undefined && costoVal !== '') {
        const costo = Number(costoVal);
        if (costo < 0) {
          faltantes.push('Costo unitario: no puede ser negativo');
        }
      }

      if (tipo === 'medicamento' && this.selectedMetodos.size === 0) {
        faltantes.push('Seleccionar al menos un método de aplicación');
      }
    }

    return faltantes;
  }

  constructor(
    private fb: FormBuilder,
    private insumoService: InsumoService,
    private messageService: MessageService,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      tipo: ['medicamento', Validators.required],
      // Campos para registro de insumos (medicamento/material)
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      cantidad: [null, [Validators.required, Validators.min(0)]],
      unidad: [''],
      costo_unitario: [null, [Validators.min(0)]],
      metodo_aplicacion: [[]],
      // Grupo para registro de procedimiento
      procedimiento: this.fb.group({
        descripcion: ['', Validators.required],
        observaciones: [''],
        responsables: this.fb.array([], Validators.required),
        insumos: this.fb.array([])
      })
    });
  }

  ngOnInit() {
    this.http.get<{ id: number; nombre: string }[]>('http://localhost:4000/api/medicamentos/metodos-aplicacion')
      .subscribe({
        next: (data) => {
          this.metodosAplicacion = data;
          if (this.selectAllMetodos) {
            this.selectedMetodos = new Set(this.metodosAplicacion.map(m => m.id));
          }
        },
        error: (err) => console.error('Error cargando métodos:', err)
      });

    // Limpiar selección de métodos si el tipo cambia a 'material' o 'procedimiento'
    this.form.get('tipo')?.valueChanges.subscribe((tipo) => {
      if (tipo !== 'medicamento') {
        this.selectedMetodos.clear();
        this.metodosTouched = false;
        this.selectAllMetodos = false;
      }

      // Validaciones condicionales según tipo
      const nombreCtrl = this.form.get('nombre');
      const cantidadCtrl = this.form.get('cantidad');
      const costoCtrl = this.form.get('costo_unitario');
      const procGroup = this.form.get('procedimiento') as FormGroup;

      if (tipo === 'procedimiento') {
        nombreCtrl?.clearValidators();
        cantidadCtrl?.clearValidators();
        costoCtrl?.clearValidators();

        procGroup.get('descripcion')?.setValidators([Validators.required]);
        procGroup.get('responsables')?.setValidators([Validators.required]);
        // "insumos" opcional en procedimiento
        procGroup.get('insumos')?.clearValidators();
      } else {
        nombreCtrl?.setValidators([Validators.required, Validators.maxLength(100)]);
        cantidadCtrl?.setValidators([Validators.required, Validators.min(0)]);
        costoCtrl?.setValidators([Validators.min(0)]);

        procGroup.get('descripcion')?.clearValidators();
        procGroup.get('responsables')?.clearValidators();
        procGroup.get('insumos')?.clearValidators();
      }

      nombreCtrl?.updateValueAndValidity();
      cantidadCtrl?.updateValueAndValidity();
      costoCtrl?.updateValueAndValidity();
      procGroup.get('descripcion')?.updateValueAndValidity();
      procGroup.get('responsables')?.updateValueAndValidity();
      procGroup.get('insumos')?.updateValueAndValidity();
    });

    const tipoInicial = this.form.get('tipo')?.value;
    this.form.get('tipo')?.setValue(tipoInicial, { emitEvent: true });

    // Cargar catálogos de insumos existentes
    this.insumoService.getInsumos().subscribe({
      next: (meds: any[]) => this.medicamentos = meds || []
    });
    this.insumoService.getMaterial_Triage().subscribe({
      next: (tri: any[]) => this.materiales = tri || []
    });
  }

  get nombre() { return this.form.get('nombre'); }
  get cantidad() { return this.form.get('cantidad'); }
  get unidad() { return this.form.get('unidad'); }
  get costo_unitario() { return this.form.get('costo_unitario'); }
  get procGroup() { return this.form.get('procedimiento') as FormGroup; }
  get responsablesFA() { return this.procGroup.get('responsables') as FormArray; }
  get insumosFA() { return this.procGroup.get('insumos') as FormArray; }

  isFormValid(): boolean {
    const tipo = this.form.get('tipo')?.value;

    if (tipo === 'procedimiento') {
      const descripcionValida = this.procGroup.get('descripcion')?.valid;
      const tieneResponsables = this.responsablesFA.length > 0;
      const responsablesValidos = this.responsablesFA.controls.every(c => c.valid);
      const insumosValidos = this.insumosFA.length === 0 || this.insumosFA.controls.every(c => c.valid);

      return !!(descripcionValida && tieneResponsables &&
        responsablesValidos && insumosValidos);
    } else {
      const camposBasicosValidos = this.nombre?.valid &&
        this.cantidad?.valid &&
        (this.costo_unitario?.valid ?? true);

      if (tipo === 'medicamento') {
        return !!(camposBasicosValidos && this.selectedMetodos.size > 0);
      }

      return !!camposBasicosValidos;
    }
  }

  addResponsable() {
    this.responsablesFA.push(
      this.fb.group({
        nombre: ['UMEH', Validators.required],
        costo: [0, [Validators.required, Validators.min(0)]]
      })
    );
    this.responsablesFA.updateValueAndValidity();
  }

  removeResponsable(index: number) {
    this.responsablesFA.removeAt(index);
    this.responsablesFA.updateValueAndValidity();
  }

  addInsumo() {
    this.insumosFA.push(this.fb.group({
      id: [null, Validators.required],
      encoded: [''],
      tipo: [null],
      nombre: [''],
      busqueda: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]]
    }));
    this.insumosFA.updateValueAndValidity();
  }

  removeInsumo(index: number) {
    this.insumosFA.removeAt(index);
    this.insumosFA.updateValueAndValidity();
  }

  onSelectInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const encoded = String(ctrl.get('encoded')?.value || '');

    if (!encoded) {
      ctrl.patchValue({ id: null, tipo: null, nombre: '' });
      return;
    }

    const [tipoPrefix, idStr] = encoded.split('-');
    const idNum = Number(idStr);
    const tipo = tipoPrefix === 'med' ? 'medicamento' : tipoPrefix === 'mat' ? 'material' : null;

    if (!tipo || !Number.isFinite(idNum)) {
      ctrl.patchValue({ id: null, tipo: null, nombre: '' });
      return;
    }

    if (tipo === 'medicamento') {
      const med = this.medicamentos.find(m => m.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: med?.nombre || '' });
    } else {
      const mat = this.materiales.find(t => t.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: mat?.nombre || '' });
    }

    // Validar disponibilidad después de seleccionar
    this.validarDisponibilidadInsumo(index);
  }

  onCantidadChange(index: number) {
    // Solo validar disponibilidad cuando cambia la cantidad
    this.validarDisponibilidadInsumo(index);
  }

  onSearchInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const query = String(ctrl.get('busqueda')?.value || '').trim().toLowerCase();

    if (!query) return;

    const med = this.medicamentos.find(m => m.nombre.toLowerCase() === query);
    const mat = this.materiales.find(t => t.nombre.toLowerCase() === query);

    if (med && mat) {
      // Ambiguo: no decidir automáticamente
      this.messageService.add({
        severity: 'warn',
        summary: 'Nombre ambiguo',
        detail: 'Existe un medicamento y un material con el mismo nombre. Selecciona desde el listado.',
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

    ctrl.patchValue({ id: null, encoded: '', tipo: null, nombre: '' });
  }

  // NUEVO MÉTODO: Solo valida y muestra advertencia, NO actualiza inventario
  private validarDisponibilidadInsumo(index: number) {
    const ctrl = this.insumosFA.at(index) as FormGroup;
    const id = ctrl.get('id')?.value as number | null;
    const tipo = ctrl.get('tipo')?.value as 'medicamento' | 'material' | null;
    const cantidadSolicitada = Number(ctrl.get('cantidad')?.value || 0);

    if (!id || !tipo || cantidadSolicitada <= 0) return;

    // Inventario actual del insumo seleccionado
    const inventarioActual = tipo === 'medicamento'
      ? (this.medicamentos.find(m => m.id === id)?.cantidad ?? 0)
      : (this.materiales.find(m => m.id === id)?.cantidad ?? 0);

    // Sumar todo lo solicitado en el formulario para este insumo (incluye esta fila)
    let totalSolicitado = 0;
    for (let i = 0; i < this.insumosFA.length; i++) {
      const c = this.insumosFA.at(i) as FormGroup;
      if (c.get('id')?.value === id && c.get('tipo')?.value === tipo) {
        totalSolicitado += Number(c.get('cantidad')?.value || 0);
      }
    }

    // Disponibilidad restante considerando todas las líneas (incluyendo esta)
    const remaining = inventarioActual - totalSolicitado;
    // Disponible antes de aplicar la cantidad de ESTA línea (para mensaje de "Disponible")
    const disponibleAntes = inventarioActual - (totalSolicitado - cantidadSolicitada);
    const nombre = ctrl.get('nombre')?.value || 'Insumo';

    if (remaining < 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Inventario insuficiente',
        detail: `${nombre}: Solicitado ${cantidadSolicitada}, Disponible ${disponibleAntes}`,
        life: 3000
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Vista previa',
        detail: `${nombre}: Quedarían ${remaining} disponibles`,
        life: 2000
      });
    }
  }

  // MÉTODO AUXILIAR: Calcular el inventario disponible considerando todos los insumos agregados
  private calcularDisponibleReal(id: number, tipo: 'medicamento' | 'material'): number {
    // Obtener inventario actual desde los arrays cargados
    const inventarioActual = tipo === 'medicamento'
      ? (this.medicamentos.find(m => m.id === id)?.cantidad ?? 0)
      : (this.materiales.find(m => m.id === id)?.cantidad ?? 0);

    // Restar todas las cantidades ya agregadas en el formulario para este mismo insumo
    let totalSolicitado = 0;
    for (let i = 0; i < this.insumosFA.length; i++) {
      const ctrl = this.insumosFA.at(i) as FormGroup;
      const insumoId = ctrl.get('id')?.value;
      const insumoTipo = ctrl.get('tipo')?.value;

      if (insumoId === id && insumoTipo === tipo) {
        totalSolicitado += Number(ctrl.get('cantidad')?.value || 0);
      }
    }

    return inventarioActual - totalSolicitado;
  }

  toggleMetodo(id: number, checked: boolean) {
    this.metodosTouched = true;
    if (checked) {
      this.selectedMetodos.add(id);
    } else {
      this.selectedMetodos.delete(id);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(checked: boolean) {
    this.metodosTouched = true;
    this.selectAllMetodos = checked;
    if (checked) {
      this.selectedMetodos = new Set(this.metodosAplicacion.map(m => m.id));
    } else {
      this.selectedMetodos.clear();
    }
  }

  private updateSelectAllState() {
    if (!this.metodosAplicacion || this.metodosAplicacion.length === 0) {
      this.selectAllMetodos = false;
      return;
    }
    this.selectAllMetodos = this.selectedMetodos.size === this.metodosAplicacion.length;
  }

  get costoTotal(): number {
    return this.responsablesFA.controls
      .map(c => Number(c.get('costo')?.value) || 0)
      .reduce((a, b) => a + b, 0);
  }

  async onSubmit() {
    if (!this.isFormValid() || this.loading) {
      // Mostrar modal de campos faltantes cuando el formulario no es válido
      this.metodosTouched = true; // para mostrar validación visual de métodos
      this.camposFaltantes = this.recolectarCamposFaltantes();
      if (this.camposFaltantes.length > 0) {
        this.mostrarModalCamposObligatorios = true;
      }
      return;
    }

    this.loading = true;
    const tipo = this.form.value.tipo;
    let metodoIds: number[] = [];

    if (tipo === 'medicamento') {
      metodoIds = Array.from(this.selectedMetodos);
      if (metodoIds.length === 0) {
        this.loading = false;
        this.metodosTouched = true;
        this.messageService.add({
          severity: 'warn',
          summary: 'Falta método',
          detail: 'Selecciona al menos un método de aplicación.',
          life: 2500
        });
        return;
      }
    }

    if (tipo === 'procedimiento') {
      const proc = this.procGroup.value;

      // VALIDAR INVENTARIO antes de registrar
      const inventarioSuficiente = await this.validarInventarioProcedimiento();
      if (!inventarioSuficiente) {
        this.loading = false;
        return;
      }

      try {
        // Registrar el procedimiento
        await firstValueFrom(this.insumoService.crearProcedimiento(proc));

        // AHORA SÍ actualizar el inventario
        await this.actualizarInventarioProcedimiento();

        // Limpiar formulario
        this.procGroup.reset({ descripcion: '', observaciones: '' });
        while (this.responsablesFA.length) this.responsablesFA.removeAt(0);
        while (this.insumosFA.length) this.insumosFA.removeAt(0);

        this.messageService.add({
          severity: 'success',
          summary: 'Procedimiento registrado',
          detail: 'El procedimiento fue guardado exitosamente.'
        });
      } catch (err: any) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.message || 'No se pudo registrar el procedimiento'
        });
      } finally {
        this.loading = false;
      }
      return;
    }

    // Construir payload para insumo simple (medicamento/material)
    const payload: any = {
      nombre: this.nombre!.value.toUpperCase(),
      cantidad: Number(this.cantidad!.value),
      unidad: this.unidad!.value || null,
      costo_unitario: this.costo_unitario!.value != null && this.costo_unitario!.value !== ''
        ? Number(this.costo_unitario!.value)
        : null
    };

    if (tipo === 'medicamento') {
      payload.metodo_aplicacion = metodoIds;
    }

    this.insumoService.addInsumo(payload).subscribe({
      next: (nuevo) => {
        this.loading = false;
        this.form.reset({ tipo: 'medicamento' });
        this.selectedMetodos.clear();
        this.selectAllMetodos = false;
        this.metodosTouched = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Registro exitoso',
          detail: `${tipo === 'medicamento' ? 'Medicamento' : 'Material'} "${nuevo.nombre}" agregado.`,
          life: 3000
        });
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.message || 'No se pudo registrar el insumo',
          sticky: true
        });
      }
    });
  }

  // Validar que hay suficiente inventario para todos los insumos
  private async validarInventarioProcedimiento(): Promise<boolean> {
    const errores: string[] = [];

    for (let i = 0; i < this.insumosFA.length; i++) {
      const ctrl = this.insumosFA.at(i) as FormGroup;
      const id = ctrl.get('id')?.value as number | null;
      const tipo = ctrl.get('tipo')?.value as 'medicamento' | 'material' | null;
      const cantidad = Number(ctrl.get('cantidad')?.value || 0);

      if (!id || !tipo || cantidad <= 0) continue;

      // Usar el cálculo REAL que considera otros insumos del mismo formulario
      const disponible = this.calcularDisponibleReal(id, tipo);
      const nombre = ctrl.get('nombre')?.value || 'Insumo';

      if (cantidad > disponible) {
        errores.push(`${nombre}: solicitado ${cantidad}, disponible ${disponible}`);
      }
    }

    if (errores.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Inventario insuficiente',
        detail: errores.join(' | '),
        life: 5000
      });
      return false;
    }

    return true;
  }

  // Actualizar el inventario después de registrar el procedimiento
  private async actualizarInventarioProcedimiento(): Promise<void> {
    const updates: Promise<any>[] = [];

    for (let i = 0; i < this.insumosFA.length; i++) {
      const ctrl = this.insumosFA.at(i) as FormGroup;
      const id = ctrl.get('id')?.value as number | null;
      const tipo = ctrl.get('tipo')?.value as 'medicamento' | 'material' | null;
      const cantidad = Number(ctrl.get('cantidad')?.value || 0);

      if (!id || !tipo || cantidad <= 0) continue;

      // Obtener la cantidad actual REAL del servidor (no de cache)
      const disponible = tipo === 'medicamento'
        ? (this.medicamentos.find(m => m.id === id)?.cantidad ?? 0)
        : (this.materiales.find(m => m.id === id)?.cantidad ?? 0);

      const nuevaCantidad = disponible - cantidad;

      // Actualizar en el backend según el tipo
      if (tipo === 'medicamento') {
        updates.push(
          firstValueFrom(this.insumoService.updateInsumo(id, { cantidad: nuevaCantidad }))
        );
      } else {
        updates.push(
          firstValueFrom(this.insumoService.updateTriage(id, { cantidad: nuevaCantidad }))
        );
      }
    }

    // Esperar a que todas las actualizaciones terminen
    await Promise.all(updates);

    // Limpiar cache y recargar datos
    this.insumoService.clearCache();

    // Recargar medicamentos
    const medicamentosActualizados = await firstValueFrom(
      this.insumoService.getInsumos()
    );
    this.medicamentos = medicamentosActualizados || [];

    // Recargar materiales de triage
    const materialesActualizados = await firstValueFrom(
      this.insumoService.getMaterial_Triage()
    );
    this.materiales = materialesActualizados || [];
  }
}