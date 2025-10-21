import { Component, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Tema } from '../../services/tema';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  isCollapsed = true;
  insumosOpen = false;
  pacientesOpen = false;
  doctoresOpen = false;

  constructor(public temaServicio: Tema, private el: ElementRef) { }

  get isDark() {
    return this.temaServicio.theme() === 'dark';
  }

  toggleTheme() {
    this.temaServicio.toggleTheme();
  }

  onMouseEnter() {
    this.isCollapsed = false;
  }
  
  onMouseLeave() {
    this.isCollapsed = true;
    this.insumosOpen = false;
    this.pacientesOpen = false;
    this.doctoresOpen = false;
  }

  toggleInsumos() {
    if (this.isCollapsed) this.isCollapsed = false;
    const next = !this.insumosOpen;
    this.insumosOpen = next;
    if (next) {
      this.pacientesOpen = false;
      this.doctoresOpen = false;
    }
  }

  togglePacientes() {
    if (this.isCollapsed) this.isCollapsed = false;
    const next = !this.pacientesOpen;
    this.pacientesOpen = next;
    if (next) {
      this.insumosOpen = false;
      this.doctoresOpen = false;
    }
  }

  toggleDoctores() {
    if (this.isCollapsed) this.isCollapsed = false;
    const next = !this.doctoresOpen;
    this.doctoresOpen = next;
    if (next) {
      this.insumosOpen = false;
      this.pacientesOpen = false;
    }
  }
}