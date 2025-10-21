import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Procedimientos } from './procedimientos';

describe('Procedimientos', () => {
  let component: Procedimientos;
  let fixture: ComponentFixture<Procedimientos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Procedimientos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Procedimientos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
