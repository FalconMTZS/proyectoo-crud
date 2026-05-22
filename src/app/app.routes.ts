import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';
import { AdminComponent } from './pages/admin/admin.component';
import { EstacionamientoComponent } from './pages/estacionamiento/estacionamiento.component';
import { GuardiaDashboardComponent } from './pages/guardia-dashboard/guardia-dashboard.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'estacionamiento',
    component: EstacionamientoComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['docente', 'estudiante'] }
  },
  {
    path: 'guardia',
    component: GuardiaDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['guardia'] }
  },
  { path: '**', redirectTo: 'login' }
];
