import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Evita ver el login si ya hay sesión. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const c = auth.cuenta();
  if (c) {
    return router.createUrlTree([auth.rutaPorRol(c.rol)]);
  }
  return true;
};
