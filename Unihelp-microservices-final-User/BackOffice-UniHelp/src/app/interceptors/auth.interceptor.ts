import { HttpHandlerFn, HttpRequest } from '@angular/common/http';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  // Get the auth token from local storage
  const token = localStorage.getItem('token');

  // If token exists, clone the request and add the authorization header
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  // Otherwise, continue with the original request
  return next(req);
}
