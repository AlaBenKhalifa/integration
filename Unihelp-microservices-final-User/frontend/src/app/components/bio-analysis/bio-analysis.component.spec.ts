import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BioAnalysisComponent } from './bio-analysis.component';

describe('BioAnalysisComponent', () => {
  let component: BioAnalysisComponent;
  let fixture: ComponentFixture<BioAnalysisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BioAnalysisComponent]
    });
    fixture = TestBed.createComponent(BioAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
