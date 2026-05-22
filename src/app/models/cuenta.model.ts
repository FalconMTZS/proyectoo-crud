export type RolCuenta = 'admin' | 'docente' | 'estudiante' | 'guardia';

export interface Cuenta {
  id: number;
  usuario: string;
  rol: RolCuenta;
  acceso: string;
  nombrePerfil: string;
  vehiculo: string;
  colorAuto: string;
  matricula: string;
}

export interface CuentaFormulario {
  usuario: string;
  password: string;
  rol: RolCuenta | '';
  acceso: string;
  nombrePerfil: string;
  vehiculo: string;
  colorAuto: string;
  matricula: string;
}

export function etiquetaRol(rol: RolCuenta): string {
  switch (rol) {
    case 'admin':
      return 'Administrador';
    case 'docente':
      return 'Docente';
    case 'estudiante':
      return 'Estudiante';
    case 'guardia':
      return 'Guardia';
  }
}

export function mapLegacyRolEtiqueta(etiqueta: string): RolCuenta {
  switch (etiqueta) {
    case 'Administrativo':
    case 'Administrador':
      return 'admin';
    case 'Docente':
      return 'docente';
    case 'Estudiante':
      return 'estudiante';
    case 'Guardia':
      return 'guardia';
    default:
      return 'estudiante';
  }
}
