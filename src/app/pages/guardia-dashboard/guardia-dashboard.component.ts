import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ParkingService } from '../../services/parking.service';

@Component({
  selector: 'app-guardia-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './guardia-dashboard.component.html',
  styleUrl: './guardia-dashboard.component.css'
})
export class GuardiaDashboardComponent {
  readonly auth = inject(AuthService);
  readonly parking = inject(ParkingService);

  cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
