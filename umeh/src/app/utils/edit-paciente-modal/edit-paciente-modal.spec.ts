import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPacienteModal } from './edit-paciente-modal';

describe('EditPacienteModal', () => {
  let component: EditPacienteModal;
  let fixture: ComponentFixture<EditPacienteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPacienteModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPacienteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
