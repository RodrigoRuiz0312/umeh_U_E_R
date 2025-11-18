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
  matGenerales: Array<{ id: number; nombre: string; cantidad: number }> = [];
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

    // Limpiar selección de métodos si el tipo cambia a 'material', 'mat_general' o 'procedimiento'
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
    this.insumoService.getMatGeneral().subscribe({
      next: (mg: any[]) => this.matGenerales = mg || []
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
    let tipo: string | null = null;
    
    if (tipoPrefix === 'med') tipo = 'medicamento';
    else if (tipoPrefix === 'mat') tipo = 'material';
    else if (tipoPrefix === 'mg') tipo = 'mat_general';

    if (!tipo || !Number.isFinite(idNum)) {
      ctrl.patchValue({ id: null, tipo: null, nombre: '' });
      return;
    }

    if (tipo === 'medicamento') {
      const med = this.medicamentos.find(m => m.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: med?.nombre || '' });
    } else if (tipo === 'material') {
      const mat = this.materiales.find(t => t.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: mat?.nombre || '' });
    } else if (tipo === 'mat_general') {
      const mg = this.matGenerales.find(t => t.id === idNum);
      ctrl.patchValue({ id: idNum, tipo, nombre: mg?.nombre || '' });
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
    const mg = this.matGenerales.find(g => g.nombre.toLowerCase() === query);

    const coincidencias = [med, mat, mg].filter(Boolean).length;
    
    if (coincidencias > 1) {
      // Ambiguo: no decidir automáticamente
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

    ctrl.patchValue({ id: null, encoded: '', tipo: null, nombre: '' });
  }

  // NUEVO MÉTODO: Solo muestra información del insumo seleccionado, no valida inventario
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

  capitalize(text: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

      // Formatear descripción con capitalize
      const procFormateado = {
        ...proc,
        descripcion: this.capitalize(proc.descripcion)
      };

      try {
        // Registrar el procedimiento (sin descontar inventario)
        await firstValueFrom(this.insumoService.crearProcedimiento(procFormateado));

        // Limpiar formulario
        this.procGroup.reset({ descripcion: '', observaciones: '' });
        while (this.responsablesFA.length) this.responsablesFA.removeAt(0);
        while (this.insumosFA.length) this.insumosFA.removeAt(0);

        this.messageService.add({
          severity: 'success',
          summary: 'Procedimiento registrado',
          detail: 'El procedimiento fue guardado. El inventario se descontará al agregarlo a una consulta.'
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

    // Construir payload para insumo simple (medicamento/material/mat_general)
    const payload: any = {
      nombre: this.capitalize(this.nombre!.value),
      cantidad: Number(this.cantidad!.value),
      unidad: this.unidad!.value || null,
      costo_unitario: this.costo_unitario!.value != null && this.costo_unitario!.value !== ''
        ? Number(this.costo_unitario!.value)
        : null
    };

    if (tipo === 'medicamento') {
      payload.metodo_aplicacion = metodoIds;
      payload.tipo = 'medicamento';
    } else if (tipo === 'mat_general') {
      payload.tipo = 'mat_general';
    } else {
      payload.tipo = 'material';
    }

    this.insumoService.addInsumo(payload).subscribe({
      next: (nuevo) => {
        this.loading = false;
        this.form.reset({ tipo: 'medicamento' });
        this.selectedMetodos.clear();
        this.selectAllMetodos = false;
        this.metodosTouched = false;
        
        let tipoNombre = 'Insumo';
        if (tipo === 'medicamento') tipoNombre = 'Medicamento';
        else if (tipo === 'material') tipoNombre = 'Material de Triage';
        else if (tipo === 'mat_general') tipoNombre = 'Material General';
        
        this.messageService.add({
          severity: 'success',
          summary: 'Registro exitoso',
          detail: `${tipoNombre} "${nuevo.nombre}" agregado.`,
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
}