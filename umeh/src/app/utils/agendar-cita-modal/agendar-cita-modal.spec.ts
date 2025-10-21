import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendarCitaModal } from './agendar-cita-modal';

describe('AgendarCitaModal', () => {
  let component: AgendarCitaModal;
  let fixture: ComponentFixture<AgendarCitaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendarCitaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendarCitaModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
