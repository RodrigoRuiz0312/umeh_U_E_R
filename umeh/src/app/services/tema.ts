import { Injectable, signal, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import Aura from '@primeuix/themes/aura';

@Injectable({
  providedIn: 'root'
})
export class Tema {
  theme = signal<'light' | 'dark'>('light');

  constructor(@Inject(DOCUMENT) private document: Document) {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('light');
    }
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
    
    if (theme === 'dark') {
      this.document.documentElement.classList.add('p-dark');
      this.document.body.classList.add('dark');
    } else {
      this.document.documentElement.classList.remove('p-dark');
      this.document.body.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }

  toggleTheme() {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  } 
}