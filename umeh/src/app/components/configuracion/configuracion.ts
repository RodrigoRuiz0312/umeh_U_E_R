import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tema } from '../../services/tema.service';
import { InsumoService } from '../../services/insumos.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit {
  limiteStock: number = 0; // valor por defecto
  isDark: boolean = false;

  constructor(private temaServicio: Tema, private insumosService: InsumoService, private router: Router) { }

  navegarAManual() {
    this.router.navigate(['/manual-usuario']);
  }

  ngOnInit() {
    this.isDark = this.temaServicio.theme() === 'dark';
    this.cargarConfiguracion();
  }

  toggleTheme() {
    this.temaServicio.toggleTheme();
    this.isDark = !this.isDark;
  }

  guardarConfiguracion() {
    this.insumosService.actualizarConfiguracion({ limiteStock: this.limiteStock }).subscribe({
      next: () => alert('Configuración guardada correctamente'),
      error: err => console.error(err)
    });
  }

  cargarConfiguracion() {
    this.insumosService.obtenerConfiguracion().subscribe({
      next: (data: any) => {
        if (data?.limiteStock) this.limiteStock = data.limiteStock;
      },
      error: err => console.error(err)
    });
  }
}