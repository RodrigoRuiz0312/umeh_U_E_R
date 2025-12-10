import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesService, ReporteInsumosDiarios, ResumenConsultas, InsumoReporte } from '../../services/reportes.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
  // Variables para el reporte
  fechaSeleccionada: string = '';
  cargando: boolean = false;
  mensajeError: string = '';
  mensajeExito: string = '';

  // Datos del reporte
  reporte: ReporteInsumosDiarios | null = null;
  resumenConsultas: ResumenConsultas | null = null;

  // Filtros
  tipoFiltro: string = 'todos'; // todos, medicamento, material, mat_general, procedimiento
  busqueda: string = '';

  constructor(private reportesService: ReportesService) {
    // Establecer fecha actual por defecto
    const hoy = new Date();
    this.fechaSeleccionada = this.formatearFecha(hoy);
  }

  ngOnInit(): void {
    // Cargar reporte del día actual al iniciar
    this.generarReporte();
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  generarReporte(): void {
    if (!this.fechaSeleccionada) {
      this.mensajeError = 'Debe seleccionar una fecha';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    // Obtener reporte de insumos y resumen de consultas en paralelo
    Promise.all([
      this.reportesService.obtenerReporteInsumosDiarios(this.fechaSeleccionada).toPromise(),
      this.reportesService.obtenerResumenConsultasDia(this.fechaSeleccionada).toPromise()
    ]).then(([reporteInsumos, resumen]) => {
      this.reporte = reporteInsumos || null;
      this.resumenConsultas = resumen || null;
      this.cargando = false;

      if (this.reporte && this.reporte.insumos.length === 0) {
        this.mensajeError = 'No se encontraron insumos para la fecha seleccionada';
      } else {
        this.mensajeExito = 'Reporte generado exitosamente';
        setTimeout(() => this.mensajeExito = '', 3000);
      }
    }).catch(error => {
      console.error('Error generando reporte:', error);
      this.mensajeError = 'Error al generar el reporte';
      this.cargando = false;
    });
  }

  get insumosFiltrados(): InsumoReporte[] {
    if (!this.reporte) return [];

    let insumos = this.reporte.insumos;

    // Filtrar por tipo
    if (this.tipoFiltro !== 'todos') {
      insumos = insumos.filter(i => i.tipo === this.tipoFiltro);
    }

    // Filtrar por búsqueda
    if (this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase();
      insumos = insumos.filter(i =>
        i.nombre_insumo.toLowerCase().includes(busquedaLower)
      );
    }

    return insumos;
  }

  get totalFiltrado(): number {
    return this.insumosFiltrados.reduce((sum, i) => sum + i.subtotal_total, 0);
  }

  obtenerNombreTipo(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'medicamento': 'Medicamentos',
      'material': 'Material Triage',
      'mat_general': 'Material General',
      'procedimiento': 'Procedimientos'
    };
    return tipos[tipo] || tipo;
  }

  obtenerColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'medicamento': '#4CAF50',
      'material': '#2196F3',
      'mat_general': '#FF9800',
      'procedimiento': '#9C27B0'
    };
    return colores[tipo] || '#757575';
  }

  limpiarFiltros(): void {
    this.tipoFiltro = 'todos';
    this.busqueda = '';
  }

  imprimirReporte(): void {
    if (!this.fechaSeleccionada) return;

    this.cargando = true;
    this.reportesService.descargarReportePDF(this.fechaSeleccionada).subscribe(
      (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_diario_${this.fechaSeleccionada}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.cargando = false;
        this.mensajeExito = 'Reporte PDF descargado exitosamente';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      (error) => {
        console.error('Error descargando PDF:', error);
        this.mensajeError = 'Error al descargar el reporte PDF';
        this.cargando = false;
      }
    );
  }

  exportarCSV(): void {
    if (!this.reporte || this.insumosFiltrados.length === 0) return;

    const encabezados = ['Tipo', 'Nombre', 'Unidad', 'Cantidad Total', 'Costo Unitario', 'Subtotal'];
    const filas = this.insumosFiltrados.map(insumo => [
      this.obtenerNombreTipo(insumo.tipo),
      insumo.nombre_insumo || 'N/A',
      insumo.unidad || 'N/A',
      insumo.cantidad_total.toString(),
      `$${insumo.costo_unitario.toFixed(2)}`,
      `$${insumo.subtotal_total.toFixed(2)}`
    ]);

    // Agregar fila de totales
    filas.push(['', '', '', '', 'TOTAL', `$${this.totalFiltrado.toFixed(2)}`]);

    // Agregar línea en blanco
    filas.push(['', '', '', '', '', '']);

    // Agregar resumen de costos
    filas.push(['', '', '', '', 'Costos de Consultas', `$${this.reporte.costoConsultas.toFixed(2)}`]);
    if (this.reporte.costoExtras > 0) {
      filas.push(['', '', '', '', 'Procedimientos Extras', `$${this.reporte.costoExtras.toFixed(2)}`]);
    }
    filas.push(['', '', '', '', 'Costos de Insumos', `$${this.reporte.totalInsumos.toFixed(2)}`]);

    // Agregar línea en blanco
    filas.push(['', '', '', '', '', '']);

    // Agregar total general
    filas.push(['', '', '', '', 'TOTAL GENERAL', `$${this.reporte.totalGeneral.toFixed(2)}`]);

    const csvContent = [
      encabezados.join(','),
      ...filas.map(fila => fila.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_insumos_${this.fechaSeleccionada}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
