import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaRecepcion } from './consulta-recepcion';

describe('ConsultaRecepcion', () => {
  let component: ConsultaRecepcion;
  let fixture: ComponentFixture<ConsultaRecepcion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaRecepcion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultaRecepcion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
