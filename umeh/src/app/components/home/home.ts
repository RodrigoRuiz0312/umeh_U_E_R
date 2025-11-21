import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InsumoService } from '../../services/insumos.service';
import { SkeletonModule } from 'primeng/skeleton';

interface InventoryOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  currentDate = new Date();
  showInventoryModal = false;
  totalMedicamentos: number | null = null;
  totalMaterial: number | null = null;
  stockBajo: number | null = null;

  inventoryOptions: InventoryOption[] = [
    {
      id: 'medicamentos',
      title: 'Medicamentos',
      description: 'Ver inventario completo de medicamentos',
      icon: 'fa-pills',
      route: '/insumos/medicamentos',
      color: 'primary'
    },
    {
      id: 'triage',
      title: 'Material de Triage',
      description: 'Ver material médico para clasificación',
      icon: 'fa-kit-medical',
      route: '/insumos/triage',
      color: 'success'
    },
    {
      id: 'general',
      title: 'Material General',
      description: 'Ver material general',
      icon: 'fa-kit-medical',
      route: '/insumos/mat-general',
      color: 'warning'
    }
  ];

  onClose(): void {
    this.showInventoryModal = false;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.showInventoryModal = false;
    }
  }

  constructor(private insumosService: InsumoService) { }

  ngOnInit(): void {
    this.insumosService.getResumen().subscribe({
      next: (data) => {
        console.log('Resumen recibido:', data);
        this.totalMedicamentos = data.total_meds || 0;
        this.stockBajo = data.stock_bajo || 0;
        this.totalMaterial = data.total_triage || 0;
      },
      error: (error) => {
        console.error('Error obteniendo resumen:', error);
        this.totalMedicamentos;
        this.stockBajo;
        this.totalMaterial;
      }
    });
  }

  openInventoryModal(): void {
    this.showInventoryModal = true;
  }

  closeInventoryModal(): void {
    this.showInventoryModal = false;
  }
}