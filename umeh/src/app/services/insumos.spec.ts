import { TestBed } from '@angular/core/testing';

import { InsumoService } from './insumos.service';

describe('Insumos', () => {
  let service: InsumoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InsumoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
