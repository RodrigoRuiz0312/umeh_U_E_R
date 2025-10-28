import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallesCitaModal } from './detalles-cita-modal';

describe('DetallesCitaModal', () => {
  let component: DetallesCitaModal;
  let fixture: ComponentFixture<DetallesCitaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallesCitaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetallesCitaModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
