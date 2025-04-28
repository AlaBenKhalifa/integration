import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private parameterSubject = new BehaviorSubject<any>(null);

  isOpen$ = this.isOpenSubject.asObservable();
  parameter$ = this.parameterSubject.asObservable();

  open(parameter: any) {
    console.log('PopupService open called with:', parameter); // Debug log
    this.parameterSubject.next(parameter);
    this.isOpenSubject.next(true);
  }

  close() {
    console.log('PopupService close called'); // Debug log
    this.isOpenSubject.next(false);
    this.parameterSubject.next(null);
  }
}