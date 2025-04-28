import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NlpService, NlpAnalysisResult } from '../../services/nlp.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bio-analysis',
  templateUrl: './bio-analysis.component.html',
  styleUrls: ['./bio-analysis.component.css']
})
export class BioAnalysisComponent implements OnInit {
  @Input() userId: number = 0;
  @Input() bio: string = '';
  @Output() analysisComplete = new EventEmitter<NlpAnalysisResult>();
  @Output() addSkill = new EventEmitter<string>();
  @Output() addInterest = new EventEmitter<string>();
  
  analysisForm: FormGroup;
  analysisResult: NlpAnalysisResult | null = null;
  isLoading = false;
  isRealtime = false;
  errorMessage: string | null = null;
  addedItemAnimation = false; // For animation when adding new skills/interests
  
  constructor(
    private nlpService: NlpService,
    private fb: FormBuilder
  ) {
    this.analysisForm = this.fb.group({
      bioText: ['', [Validators.required, Validators.minLength(10)]]
    });
  }
  
  ngOnInit(): void {
    if (this.bio) {
      this.analysisForm.patchValue({ bioText: this.bio });
    }
    
    // If we have a userId, try to fetch existing analysis
    if (this.userId) {
      this.fetchUserAnalysis();
    }
  }
  
  fetchUserAnalysis(): void {
    this.isLoading = true;
    this.nlpService.getUserAnalysis(this.userId).subscribe({
      next: (result) => {
        this.analysisResult = result;
        this.analysisComplete.emit(result);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching analysis:', err);
        this.errorMessage = err.message || 'Failed to fetch analysis';
        this.isLoading = false;
      }
    });
  }
  
  analyzeUserBio(): void {
    if (this.userId) {
      this.isLoading = true;
      this.nlpService.analyzeUserBio(this.userId).subscribe({
        next: (result) => {
          this.analysisResult = result;
          this.analysisComplete.emit(result);
          this.isLoading = false;
          
          Swal.fire({
            icon: 'success',
            title: 'Analysis Complete!',
            text: 'Your bio has been analyzed successfully.',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error('Error analyzing bio:', err);
          this.errorMessage = err.message || 'Failed to analyze bio';
          this.isLoading = false;
          
          Swal.fire({
            icon: 'error',
            title: 'Analysis Failed',
            text: this.errorMessage || 'An unknown error occurred'
          });
        }
      });
    }
  }
  
  analyzeText(): void {
    if (this.analysisForm.valid) {
      const bioText = this.analysisForm.get('bioText')?.value || '';
      
      this.isLoading = true;
      this.nlpService.analyzeText(bioText).subscribe({
        next: (result) => {
          this.analysisResult = result;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error analyzing text:', err);
          this.errorMessage = err.message || 'Failed to analyze text';
          this.isLoading = false;
        }
      });
    }
  }
  
  // Toggle realtime analysis (for demo purposes)
  toggleRealtime(): void {
    this.isRealtime = !this.isRealtime;
    
    if (this.isRealtime) {
      // Set up a subscription to value changes
      this.analysisForm.get('bioText')?.valueChanges.subscribe(value => {
        if (value && value.length > 30) {
          // Debounce this in a real implementation
          this.analyzeText();
        }
      });
    }
  }
  
  getPersonalityTraitScore(trait: string): number {
    if (!this.analysisResult || !this.analysisResult.personalityTraits) {
      return 0;
    }
    return this.analysisResult.personalityTraits[trait] || 0;
  }
  
  getTraitPercentage(trait: string): number {
    const score = this.getPersonalityTraitScore(trait);
    return Math.round(score * 100);
  }
  
  isDominantTrait(trait: string): boolean {
    return this.analysisResult?.dominantTrait === trait;
  }
  
  // Add a skill to the user's profile
  addSkillToProfile(skill: string): void {
    // Trigger animation
    this.addedItemAnimation = true;
    
    // Only emit the skill to parent component and let parent handle toast
    // after successful database update
    this.addSkill.emit(skill);
    
    // Reset animation after a delay
    setTimeout(() => {
      this.addedItemAnimation = false;
    }, 500);
  }
  
  // Add an interest to the user's profile
  addInterestToProfile(interest: string): void {
    // Trigger animation
    this.addedItemAnimation = true;
    
    // Only emit the interest to parent component and let parent handle toast
    // after successful database update
    this.addInterest.emit(interest);
    
    // Reset animation after a delay
    setTimeout(() => {
      this.addedItemAnimation = false;
    }, 500);
  }
  
  // Convert personality traits object to array for the template
  getPersonalityTraitsArray(): any[] {
    if (!this.analysisResult || !this.analysisResult.personalityTraits) {
      return [];
    }
    
    // Convert from object format to array format
    const traitsObj = this.analysisResult.personalityTraits;
    const dominantTrait = this.analysisResult.dominantTrait;
    
    return Object.keys(traitsObj).map(name => ({
      name,
      score: traitsObj[name],
      dominant: name === dominantTrait
    }));
  }
}
