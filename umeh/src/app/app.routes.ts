import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { Tabla } from './components/tabla/tabla';
import { Registro } from './components/registro/registro';
import { MatTriage } from './components/mat-triage/mat-triage';
import { Procedimientos } from './components/procedimientos/procedimientos';
import { RegistroPaciente } from './components/registro-paciente/registro-paciente';
import { ListaPacientes } from './components/lista-pacientes/lista-pacientes';
import { Doctores } from './components/doctores/doctores';
import { Citas } from './components/citas/citas';
import { ListaDoctores } from './components/lista-doctores/lista-doctores';
import { Reportes } from './components/reportes/reportes';
import { ConsultaRecepcion } from './components/consulta-recepcion/consulta-recepcion';
import { Configuracion } from './components/configuracion/configuracion';
import { Estadisticas } from './components/estadisticas/estadisticas';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: HomeComponent },
  // Alias top-level
  { path: 'agenda', component: Citas },
  { path: 'reportes', component: Reportes },
  { path: 'configuracion', component: Configuracion },

  // Rutas agrupadas para Insumos
  {
    path: 'insumos',
    children: [
      { path: '', redirectTo: 'registro', pathMatch: 'full' },
      { path: 'registro', component: Registro },
      { path: 'medicamentos', component: Tabla },
      { path: 'triage', component: MatTriage },
      { path: 'procedimientos', component: Procedimientos },
    ]
  },

  // Rutas agrupadas para Pacientes
  {
    path: 'pacientes',
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      { path: 'registro', component: RegistroPaciente },
      { path: 'lista', component: ListaPacientes },
      { path: 'citas', component: Citas },
      { path: 'doctores', component: Doctores },
      { path: 'lista-doctores', component: ListaDoctores },
      { path: 'recepcion', component: ConsultaRecepcion },
      { path: 'estadisticas', component: Estadisticas },
    ]
  },

  { path: '**', redirectTo: '' }
];