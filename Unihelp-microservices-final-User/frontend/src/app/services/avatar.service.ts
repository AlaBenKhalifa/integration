import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private avatarStyles = [
    'avataaars', 'bottts', 'adventurer', 'micah', 'personas', 'pixel-art', 'open-peeps'
  ];
  private currentStyleIndex = 0;

  constructor(private http: HttpClient) { }

  /**
   * Generate a random avatar using DiceBear API
   * @returns Observable with the Blob data of the generated avatar
   */
  generateAvatar(seed?: string): Observable<Blob> {
    // Use random seed if not provided
    const avatarSeed = seed || Math.random().toString(36).substring(2, 8);
    const style = this.avatarStyles[this.currentStyleIndex];
    
    // DiceBear API URL
    const apiUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${avatarSeed}`;

    return this.http.get(apiUrl, { responseType: 'blob' }).pipe(
      catchError(error => {
        console.error('Error generating avatar:', error);
        return of(new Blob()); // Return empty blob on error
      })
    );
  }

  /**
   * Cycle to the next avatar style
   */
  nextStyle(): void {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % this.avatarStyles.length;
  }

  /**
   * Convert a Blob to a File object for form upload
   * @param blob The avatar blob
   * @param fileName The file name to use
   * @returns File object
   */
  blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: 'image/svg+xml' });
  }
  
  /**
   * Convert SVG to PNG for better compatibility with the backend
   * @param svgBlob The SVG blob to convert
   * @returns Promise with a PNG File
   */
  convertSvgToPng(svgBlob: Blob): Promise<File> {
    return new Promise((resolve, reject) => {
      // Create a URL for the SVG
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        try {
          // Create a canvas with the same dimensions as the SVG
          const canvas = document.createElement('canvas');
          canvas.width = 150; // Fixed width for consistent quality
          canvas.height = 150; // Fixed height for consistent quality
          
          // Draw the image on the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to PNG blob
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              reject(new Error('Could not convert SVG to PNG'));
              return;
            }
            
            // Clean up the object URL
            URL.revokeObjectURL(url);
            
            // Create a File from the PNG blob
            const pngFile = new File([pngBlob], `avatar-${Date.now()}.png`, { type: 'image/png' });
            resolve(pngFile);
          }, 'image/png', 0.9);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      
      img.src = url;
    });
  }
}
