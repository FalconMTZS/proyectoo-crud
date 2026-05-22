import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Cuenta, RolCuenta } from '../models/cuenta.model';
import { ApiService } from './api.service';
import { CuentasService } from './cuentas.service';

const SESION_KEY = 'estacionatec-sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly cuentas = inject(CuentasService);
  private readonly router = inject(Router);

  private readonly _cuenta = signal<Cuenta | null>(null);
  readonly cuenta = this._cuenta.asReadonly();
  readonly rol = computed(() => this._cuenta()?.rol ?? null);
  readonly iniciandoSesion = signal(false);

  constructor() {
    this.restaurarSesion();
  }

  private restaurarSesion(): void {
    const raw = sessionStorage.getItem(SESION_KEY);
    if (!raw) {
      return;
    }
    try {
      const guardada = JSON.parse(raw) as Cuenta;
      this._cuenta.set(guardada);
    } catch {
      sessionStorage.removeItem(SESION_KEY);
    }
  }

  async iniciarSesion(usuario: string, password: string): Promise<{ ok: boolean; error?: string }> {
    this.iniciandoSesion.set(true);
    try {
      const c = await firstValueFrom(this.api.login(usuario.trim(), password));
      this._cuenta.set(c);
      sessionStorage.setItem(SESION_KEY, JSON.stringify(c));
      await this.cuentas.recargar();
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? ((err as { error?: { error?: string } }).error?.error ??
            'Usuario o contraseña incorrectos.')
          : 'No se pudo conectar con el servidor. ¿Está la API en ejecución?';
      return { ok: false, error: msg };
    } finally {
      this.iniciandoSesion.set(false);
    }
  }

  cerrarSesion(): void {
    this._cuenta.set(null);
    sessionStorage.removeItem(SESION_KEY);
    void this.router.navigateByUrl('/login');
  }

  rutaPorRol(rol: RolCuenta): string {
    switch (rol) {
      case 'admin':
        return '/admin';
      case 'docente':
      case 'estudiante':
        return '/estacionamiento';
      case 'guardia':
        return '/guardia';
    }
  }

  sincronizarCuentaActiva(): void {
    const id = this._cuenta()?.id;
    if (id === undefined) {
      return;
    }
    const actualizada = this.cuentas.obtenerPorId(id);
    if (actualizada) {
      this._cuenta.set(actualizada);
      sessionStorage.setItem(SESION_KEY, JSON.stringify(actualizada));
    } else {
      this.cerrarSesion();
    }
  }
}
