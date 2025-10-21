import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaPacientes } from './lista-pacientes';

describe('ListaPacientes', () => {
  let component: ListaPacientes;
  let fixture: ComponentFixture<ListaPacientes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPacientes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaPacientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
