import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolCuenta } from '../models/cuenta.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permitidos = route.data['roles'] as RolCuenta[] | undefined;
  const rol = auth.rol();

  if (!rol || !permitidos || permitidos.length === 0) {
    return router.createUrlTree(['/login']);
  }

  if (permitidos.includes(rol)) {
    return true;
  }

  return router.createUrlTree([auth.rutaPorRol(rol)]);
};
