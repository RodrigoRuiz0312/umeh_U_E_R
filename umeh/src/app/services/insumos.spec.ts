import { TestBed } from '@angular/core/testing';

import { Insumos } from './insumos';

describe('Insumos', () => {
  let service: Insumos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Insumos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
