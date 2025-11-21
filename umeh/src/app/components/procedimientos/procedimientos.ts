import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsumoService } from '../../services/insumos.service';
import { Procedimiento } from '../../modelos/procedimiento';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-procedimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, SkeletonModule],
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

  constructor(
    private insumoService: InsumoService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.cargarProcedimientos();
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
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Carga completa',
            detail: `${this.procedimientos.length} procedimientos cargados.`,
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

  getResponsablesList(costosDetalle: any[]): string {
    return costosDetalle?.map(c => c.responsable).join(', ') || 'N/A';
  }

  getInsumosCount(insumosDetalle: any[]): number {
    return insumosDetalle?.length || 0;
  }
}