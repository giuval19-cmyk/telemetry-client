import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DroneMap } from './drone-map';

describe('DroneMap', () => {
  let component: DroneMap;
  let fixture: ComponentFixture<DroneMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DroneMap],
    }).compileComponents();

    fixture = TestBed.createComponent(DroneMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
