import { TestBed } from '@angular/core/testing';
import { Fleet } from './fleet';

describe('Fleet', () => {
  let service: Fleet;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fleet);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
