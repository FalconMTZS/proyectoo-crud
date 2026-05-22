const ETIQUETAS_ROL = {
  admin: 'Administrador',
  docente: 'Docente',
  estudiante: 'Estudiante',
  guardia: 'Guardia'
};

export function mapUsuarioRow(row) {
  return {
    id: row.Id,
    usuario: row.Usuario,
    rol: row.Rol,
    acceso: row.Acceso,
    nombrePerfil: row.NombrePerfil,
    vehiculo: row.Vehiculo,
    colorAuto: row.ColorAuto,
    matricula: row.Matricula
  };
}

export function mapLugarRow(row) {
  return {
    id: row.Id,
    lat: row.Lat,
    lng: row.Lng,
    ocupadoPorId: row.OcupadoPorId ?? null,
    ocupadoPorNombre: row.OcupadoPorNombre ?? null
  };
}

export function etiquetaRol(rol) {
  return ETIQUETAS_ROL[rol] ?? rol;
}
