import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import * as L from 'leaflet';
import { etiquetaRol } from '../../models/cuenta.model';
import { LugarEstacionamiento } from '../../models/estacionamiento.model';
import { AuthService } from '../../services/auth.service';
import { ParkingService } from '../../services/parking.service';

@Component({
  selector: 'app-estacionamiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estacionamiento.component.html',
  styleUrl: './estacionamiento.component.css'
})
export class EstacionamientoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') mapHost?: ElementRef<HTMLDivElement>;

  readonly auth = inject(AuthService);
  readonly parking = inject(ParkingService);

  readonly etiquetaRol = etiquetaRol;
  readonly tieneMapaKey = false; // Desactivamos Google Maps

  mapaListo = false;
  avisoMapa = '';

  private map: L.Map | null = null;
  private marcadores: L.CircleMarker[] = [];
  private readonly refEfecto: EffectRef;

  constructor() {
    this.refEfecto = effect(() => {
      this.parking.lugares();
      // MODIFICADO: Activamos el redibujado dinámico para los círculos de OpenStreetMap
      if (this.mapaListo) {
        this.redibujarMarcadores();
      }
    });
  }

  ngAfterViewInit(): void {
    void this.inicializarMapa();
  }

  ngOnDestroy(): void {
    this.refEfecto.destroy();
    this.limpiarMarcadores();
    if (this.map) {
      this.map.remove();
    }
  }

  miLugar(): LugarEstacionamiento | undefined {
    const id = this.auth.cuenta()?.id;
    if (id === undefined) {
      return undefined;
    }
    return this.parking.lugares().find((l) => l.ocupadoPorId === id);
  }

  async seleccionar(lugar: LugarEstacionamiento): Promise<void> {
    const c = this.auth.cuenta();
    if (!c) {
      return;
    }
    if (lugar.ocupadoPorId !== null && lugar.ocupadoPorId !== c.id) {
      window.alert('Este cajón ya está ocupado por otra persona.');
      return;
    }
    const res = await this.parking.asignarLugar(lugar.id, c);
    if (!res.ok) {
      window.alert(res.error ?? 'No se pudo asignar el lugar.');
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

  private inicializarMapa(): void {
    // Coordenadas del ITSJR
    const latItsjr = 20.374782;
    const lngItsjr = -99.982421;

    try {
      this.map = L.map('mapaID', {
        center: [latItsjr, lngItsjr],
        zoom: 21, // Aumentamos el zoom para ver de cerca el estacionamiento
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.mapaListo = true;

      // TRUCO CLAVE: Fuerza a Leaflet a calcular el tamaño real de la caja 
      // para que deje de salir en blanco.
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.redibujarMarcadores();
        }
      }, 200);

    } catch (error) {
      console.error(error);
      this.avisoMapa = 'No se pudo cargar el mapa didáctico.';
      this.mapaListo = true;
    }
  }

  private limpiarMarcadores(): void {
    if (this.map) {
      for (const m of this.marcadores) {
        this.map.removeLayer(m);
      }
    }
    this.marcadores = [];
  }

  private redibujarMarcadores(): void {
    if (!this.map) return;
    this.limpiarMarcadores();

    const cuenta = this.auth.cuenta();
    if (!cuenta) return;

    // Recorremos tus 12 cajones de SQL Server y los dibujamos como círculos reales
    for (const lugar of this.parking.lugares()) {
      const ocupado = lugar.ocupadoPorId !== null;
      const esMio = lugar.ocupadoPorId === cuenta.id;
      const colorCajon = !ocupado ? '#16a34a' : esMio ? '#ca8a04' : '#dc2626';

      // Creamos un marcador circular nativo de Leaflet en sus coordenadas lat/lng
      const marker = L.circleMarker([lugar.lat, lugar.lng], {
        radius: 10,
        fillColor: colorCajon,
        fillOpacity: 0.9,
        color: '#111827',
        weight: 1.5
      });

      // Le pegamos un globito de texto (Popup) al hacerle clic o pasar el mouse
      marker.bindPopup(`<b>Cajón ${lugar.id}</b><br>${ocupado ? 'Ocupado' : 'Disponible'}`);
      
      // Al hacerle clic al círculo, ejecuta tu función para apartar lugar
      marker.on('click', () => {
        this.seleccionar(lugar);
      });

      marker.addTo(this.map);
      this.marcadores.push(marker);
    }
  }
}