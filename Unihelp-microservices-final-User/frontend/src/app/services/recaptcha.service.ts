import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

// Define the global grecaptcha object for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  // Your actual reCAPTCHA site key from Google
  private siteKey = '6LeudCgrAAAAAIJnmxR4y-TuZxLFSzqteHCScLYW';
  
  constructor() {
    this.loadRecaptchaScript();
  }
  
  /**
   * Load the reCAPTCHA script dynamically
   */
  private loadRecaptchaScript(): void {
    // Check if the script is already loaded
    if (document.querySelector(`script[src*="recaptcha"]`)) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    console.log('reCAPTCHA script added to DOM');
  }
  
  /**
   * Execute reCAPTCHA validation for a specific action
   * @param action The action name for analytics
   * @returns Promise with the reCAPTCHA token
   */
  executeRecaptcha(action: string): Observable<string> {
    return from(new Promise<string>((resolve, reject) => {
      // Wait for grecaptcha to be ready
      const waitForRecaptcha = () => {
        if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(this.siteKey, { action })
              .then((token: string) => {
                console.log(`reCAPTCHA executed for action: ${action}`);
                resolve(token);
              })
              .catch((error: any) => {
                console.error('reCAPTCHA execution failed:', error);
                reject(error);
              });
          });
        } else {
          // If not ready yet, wait a bit and try again
          setTimeout(waitForRecaptcha, 100);
        }
      };
      
      waitForRecaptcha();
    }));
  }
  
  /**
   * Updates the site key - useful for environment-specific configurations
   * @param newSiteKey The new reCAPTCHA site key
   */
  updateSiteKey(newSiteKey: string): void {
    this.siteKey = newSiteKey;
    // Reload the script with the new site key
    document.querySelector(`script[src*="recaptcha"]`)?.remove();
    this.loadRecaptchaScript();
  }
}
