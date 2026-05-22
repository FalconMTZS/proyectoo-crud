export interface LugarEstacionamiento {
  id: string;
  lat: number;
  lng: number;
  ocupadoPorId: number | null;
  ocupadoPorNombre: string | null;
}

export interface UltimoIngreso {
  usuario: string;
  rolEtiqueta: string;
  lugarId: string;
  fechaHora: string;
}
