import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuentasService } from '../../services/cuentas.service';
import { AuthService } from '../../services/auth.service';
import { Cuenta, etiquetaRol } from '../../models/cuenta.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  readonly cuentas = inject(CuentasService);
  private readonly auth = inject(AuthService);

  mensaje = '';
  mensajeTipo: 'ok' | 'error' = 'ok';
  readonly etiquetaRol = etiquetaRol;

  async guardar(): Promise<void> {
    this.mensaje = '';
    const eraAlta = this.cuentas.editandoCuentaId === null;
    const res = await this.cuentas.guardarCuenta();
    if (!res.ok) {
      this.mensajeTipo = 'error';
      this.mensaje = res.mensaje ?? 'No se pudo guardar.';
      return;
    }
    this.auth.sincronizarCuentaActiva();
    this.mensajeTipo = 'ok';
    this.mensaje = eraAlta
      ? 'Usuario guardado en SQL Server. Ya puede iniciar sesión (cierra tu sesión de admin para probarlo).'
      : 'Cambios guardados en la base de datos.';
  }

  editar(cuenta: Cuenta): void {
    this.mensaje = '';
    this.cuentas.iniciarEdicion(cuenta);
  }

  async eliminar(cuenta: Cuenta): Promise<void> {
    const actual = this.auth.cuenta();
    if (actual && actual.id === cuenta.id) {
      this.mensajeTipo = 'error';
      this.mensaje = 'No puedes eliminar tu propia sesión activa.';
      return;
    }
    this.mensaje = '';
    const ok = await this.cuentas.eliminarCuenta(cuenta.id);
    if (!ok) {
      this.mensajeTipo = 'error';
      this.mensaje = 'No se pudo eliminar el usuario.';
      return;
    }
    this.mensajeTipo = 'ok';
    this.mensaje = 'Usuario eliminado de SQL Server.';
    this.auth.sincronizarCuentaActiva();
  }

  cancelar(): void {
    this.mensaje = '';
    this.cuentas.cancelarEdicion();
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
