import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDoctorModal } from './edit-doctor-modal';

describe('EditDoctorModal', () => {
  let component: EditDoctorModal;
  let fixture: ComponentFixture<EditDoctorModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDoctorModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditDoctorModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
