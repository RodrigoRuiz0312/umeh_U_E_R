import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualUsuario } from './manual-usuario';

describe('ManualUsuario', () => {
  let component: ManualUsuario;
  let fixture: ComponentFixture<ManualUsuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualUsuario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManualUsuario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
