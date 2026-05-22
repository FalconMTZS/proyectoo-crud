import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Cuenta, etiquetaRol } from '../models/cuenta.model';
import { LugarEstacionamiento, UltimoIngreso } from '../models/estacionamiento.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly api = inject(ApiService);

  private readonly _lugares = signal<LugarEstacionamiento[]>([]);
  readonly lugares = this._lugares.asReadonly();

  private readonly _ultimoIngreso = signal<UltimoIngreso | null>(null);
  readonly ultimoIngreso = this._ultimoIngreso.asReadonly();

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly ocupados = computed(() =>
    this._lugares().filter((l) => l.ocupadoPorId !== null)
  );

  readonly disponibles = computed(() =>
    this._lugares().filter((l) => l.ocupadoPorId === null)
  );

  constructor() {
    void this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [lugares, ultimo] = await Promise.all([
        firstValueFrom(this.api.listarLugares()),
        firstValueFrom(this.api.ultimoIngreso())
      ]);
      this._lugares.set(lugares);
      this._ultimoIngreso.set(ultimo);
    } catch {
      this.error.set('No se pudieron cargar los cajones desde la base de datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  lugarPorId(id: string): LugarEstacionamiento | undefined {
    return this._lugares().find((l) => l.id === id);
  }

  async asignarLugar(lugarId: string, cuenta: Cuenta): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await firstValueFrom(this.api.asignarLugar(lugarId, cuenta.id));
      this._lugares.set(res.lugares);
      this._ultimoIngreso.set(
        res.ultimoIngreso ?? {
          usuario: cuenta.nombrePerfil || cuenta.usuario,
          rolEtiqueta: etiquetaRol(cuenta.rol),
          lugarId,
          fechaHora: new Date().toISOString()
        }
      );
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? ((err as { error?: { error?: string } }).error?.error ?? 'No se pudo asignar el lugar.')
          : 'Error de conexión con el servidor.';
      return { ok: false, error: msg };
    }
  }
}
