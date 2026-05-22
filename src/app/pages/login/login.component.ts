import { CommonModule } from '@angular/common';

import { Component, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';

import { ApiService } from '../../services/api.service';



@Component({

  selector: 'app-login',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './login.component.html',

  styleUrl: './login.component.css'

})

export class LoginComponent implements OnInit {

  usuario = '';

  password = '';

  error = '';



  readonly auth = inject(AuthService);

  readonly servidorOk = signal<boolean | null>(null);



  private readonly router = inject(Router);

  private readonly api = inject(ApiService);



  ngOnInit(): void {

    void this.verificarServidor();

  }



  private async verificarServidor(): Promise<void> {

    try {

      const h = await firstValueFrom(this.api.health());

      this.servidorOk.set(h.ok);

    } catch {

      this.servidorOk.set(false);

    }

  }



  async enviar(): Promise<void> {

    this.error = '';

    const res = await this.auth.iniciarSesion(this.usuario, this.password);

    if (!res.ok) {

      this.error = res.error ?? 'No se pudo iniciar sesión.';

      return;

    }

    const c = this.auth.cuenta();

    if (c) {

      void this.router.navigateByUrl(this.auth.rutaPorRol(c.rol));

    }

  }

}

