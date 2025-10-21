import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Doctores } from './doctores';

describe('Doctores', () => {
  let component: Doctores;
  let fixture: ComponentFixture<Doctores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Doctores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Doctores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
