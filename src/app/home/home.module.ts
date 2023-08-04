import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { DetalleViajeComponent } from '../components/detalle-viaje/detalle-viaje.component';
import { AcercaDeComponent } from '../components/acerca-de/acerca-de.component';
import { InfoTarifasComponent } from '../components/info-tarifas/info-tarifas.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule],
  declarations: [
    HomePage,
    DetalleViajeComponent,
    AcercaDeComponent,
    InfoTarifasComponent,
  ],
})
export class HomePageModule {}
