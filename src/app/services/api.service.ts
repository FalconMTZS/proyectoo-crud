import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cuenta, CuentaFormulario } from '../models/cuenta.model';
import { LugarEstacionamiento, UltimoIngreso } from '../models/estacionamiento.model';

export interface AsignarLugarResponse {
  lugares: LugarEstacionamiento[];
  ultimoIngreso: UltimoIngreso | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  health(): Observable<{ ok: boolean }> {
    return this.http.get<{ ok: boolean }>(`${this.base}/health`);
  }

  login(usuario: string, password: string): Observable<Cuenta> {
    return this.http.post<Cuenta>(`${this.base}/auth/login`, { usuario, password });
  }

  listarCuentas(): Observable<Cuenta[]> {
    return this.http.get<Cuenta[]>(`${this.base}/cuentas`);
  }

  crearCuenta(form: CuentaFormulario): Observable<Cuenta> {
    return this.http.post<Cuenta>(`${this.base}/cuentas`, form);
  }

  actualizarCuenta(id: number, form: CuentaFormulario): Observable<Cuenta> {
    return this.http.put<Cuenta>(`${this.base}/cuentas/${id}`, form);
  }

  eliminarCuenta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cuentas/${id}`);
  }

  listarLugares(): Observable<LugarEstacionamiento[]> {
    return this.http.get<LugarEstacionamiento[]>(`${this.base}/lugares`);
  }

  ultimoIngreso(): Observable<UltimoIngreso | null> {
    return this.http.get<UltimoIngreso | null>(`${this.base}/lugares/ingresos/ultimo`);
  }

  asignarLugar(lugarId: string, usuarioId: number): Observable<AsignarLugarResponse> {
    return this.http.post<AsignarLugarResponse>(`${this.base}/lugares/${lugarId}/asignar`, {
      usuarioId
    });
  }
}
