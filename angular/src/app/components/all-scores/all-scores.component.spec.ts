import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllScoresComponent } from './all-scores.component';

describe('AllScoresComponent', () => {
  let component: AllScoresComponent;
  let fixture: ComponentFixture<AllScoresComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllScoresComponent]
    });
    fixture = TestBed.createComponent(AllScoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
