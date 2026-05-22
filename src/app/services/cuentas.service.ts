import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Cuenta, CuentaFormulario, RolCuenta } from '../models/cuenta.model';
import { ApiService } from './api.service';

function cuentaVaciaForm(): CuentaFormulario {
  return {
    usuario: '',
    password: '',
    rol: '',
    acceso: '',
    nombrePerfil: '',
    vehiculo: '',
    colorAuto: '',
    matricula: ''
  };
}

@Injectable({ providedIn: 'root' })
export class CuentasService {
  private readonly api = inject(ApiService);

  private readonly _cuentas = signal<Cuenta[]>([]);
  readonly cuentas = this._cuentas.asReadonly();
  readonly listaOrdenada = computed(() =>
    [...this._cuentas()].sort((a, b) => a.usuario.localeCompare(b.usuario, 'es'))
  );

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  private editandoId: number | null = null;
  formulario: CuentaFormulario = cuentaVaciaForm();

  constructor() {
    void this.recargar();
  }

  get editandoCuentaId(): number | null {
    return this.editandoId;
  }

  obtenerPorId(id: number): Cuenta | undefined {
    return this._cuentas().find((c) => c.id === id);
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const lista = await firstValueFrom(this.api.listarCuentas());
      this._cuentas.set(lista);
    } catch {
      this.error.set('No se pudo conectar con SQL Server. Verifica que la API y la base estén activas.');
      this._cuentas.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  iniciarEdicion(cuenta: Cuenta): void {
    this.editandoId = cuenta.id;
    this.formulario = {
      usuario: cuenta.usuario,
      password: '',
      rol: cuenta.rol,
      acceso: cuenta.acceso,
      nombrePerfil: cuenta.nombrePerfil,
      vehiculo: cuenta.vehiculo,
      colorAuto: cuenta.colorAuto,
      matricula: cuenta.matricula
    };
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.formulario = cuentaVaciaForm();
  }

  async guardarCuenta(): Promise<{ ok: boolean; mensaje?: string }> {
    const usuario = this.formulario.usuario.trim();
    const acceso = this.formulario.acceso.trim();
    const rol = this.formulario.rol as RolCuenta;

    if (!usuario || !rol || !acceso) {
      return { ok: false, mensaje: 'Completa usuario, rol y acceso.' };
    }

    if (this.editandoId === null) {
      const password = this.formulario.password.trim();
      if (!password) {
        return { ok: false, mensaje: 'En altas nuevas debes indicar contraseña.' };
      }
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      if (this.editandoId === null) {
        await firstValueFrom(this.api.crearCuenta(this.formulario));
      } else {
        await firstValueFrom(this.api.actualizarCuenta(this.editandoId, this.formulario));
        this.editandoId = null;
      }
      await this.recargar();
      this.formulario = cuentaVaciaForm();
      return { ok: true };
    } catch (err: unknown) {
      const msg = extraerMensajeApi(err);
      return { ok: false, mensaje: msg };
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarCuenta(id: number): Promise<boolean> {
    this.cargando.set(true);
    try {
      await firstValueFrom(this.api.eliminarCuenta(id));
      if (this.editandoId === id) {
        this.cancelarEdicion();
      }
      await this.recargar();
      return true;
    } catch {
      return false;
    } finally {
      this.cargando.set(false);
    }
  }
}

function extraerMensajeApi(err: unknown): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const e = (err as { error?: { error?: string } }).error;
    if (e?.error) {
      return e.error;
    }
  }
  return 'No se pudo guardar. Revisa que el usuario no esté duplicado.';
}
