import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatTriage } from './mat-triage';

describe('MatTriage', () => {
  let component: MatTriage;
  let fixture: ComponentFixture<MatTriage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatTriage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatTriage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
