import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Interface for NLP analysis results
 */
export interface NlpAnalysisResult {
  userId?: number;
  extractedSkills: string[];
  extractedInterests: string[];
  personalityTraits: { [key: string]: number };
  dominantTrait?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NlpService {
  private apiUrl = 'http://localhost:8888/USER/api/nlp';

  constructor(private http: HttpClient) {}

  /**
   * Analyze a user's bio by their user ID
   * @param userId ID of the user to analyze
   */
  analyzeUserBio(userId: number): Observable<NlpAnalysisResult> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<NlpAnalysisResult>(`${this.apiUrl}/analyze/${userId}`, {}, { 
      headers,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error analyzing user bio:', error);
        throw error;
      })
    );
  }

  /**
   * Analyze arbitrary text without saving
   * @param text Text to analyze
   */
  analyzeText(text: string): Observable<NlpAnalysisResult> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Set Content-Type header for text data
    headers = headers.set('Content-Type', 'text/plain');
    
    return this.http.post<NlpAnalysisResult>(`${this.apiUrl}/analyze-text`, text, { 
      headers,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error analyzing text:', error);
        throw error;
      })
    );
  }

  /**
   * Get the stored NLP analysis for a user
   * @param userId ID of the user
   */
  getUserAnalysis(userId: number): Observable<NlpAnalysisResult> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<NlpAnalysisResult>(`${this.apiUrl}/${userId}`, { 
      headers,
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error getting user analysis:', error);
        throw error;
      })
    );
  }
}
