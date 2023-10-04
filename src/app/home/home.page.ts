import { Component } from '@angular/core';
import { DateTimeService } from '../services/date-time-service.service';
import { Platform } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { ModalController } from '@ionic/angular';

import { TarifaService } from '../services/tarifa-service.service';
import { TaximetroService } from '../services/taximetro-service.service';
import { GPSLocationService } from '../services/gps-location-service.service';
import { MiscellaneousService } from '../services/miscellaneous-service.service';
import { DetalleViajeComponent } from '../components/detalle-viaje/detalle-viaje.component'; // Asegúrate de colocar la ruta correcta
import { AcercaDeComponent } from '../components/acerca-de/acerca-de.component'; // Asegúrate de colocar la ruta correcta
import { InfoTarifasComponent } from '../components/info-tarifas/info-tarifas.component';

declare global {
  interface Navigator {
    app: {
      exitApp: () => void;
    };
  }
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  currentDateTime: Date;
  nuevaFecha: string = ''; // Fecha del encabezado
  viajeIniciado: boolean = false;
  viajeTerminado: boolean = false;
  taxiSelected: string | null = null;
  ubicacionActivada: boolean = false;
  watchIdLocation: any = null;
  isDay: boolean = false;
  costo_viaje: number = 0;
  radioButtonsDisabled: boolean = true;
  tarifa: number = 0;
  acumuladoTiempo = 0;
  acumuladoDistancia = 0;
  total = 0;
  cobroPorDistancia: boolean = false;
  cobroPorTiempo: boolean = false;
  aumento: number = 0;
  intervaloCostoTiempo: any;
  intervaloCostoDistancia: any;
  vecesTiempo: number = 0;
  vecesDistancia: number = 0;
  distanciaRecorridaSegundo: number = 0;
  distanciaRecorridaTotal: number = 0;
  distanceTraveled: number = 0;
  velocidadKmXHr: number = 0;
  lastLatitude: number = 0;
  lastLongitude: number = 0;
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  lastUpdateTime: number = 0;
  ticket: boolean = false;
  tiempoViaje: number = 0;
  tiempoViajeFormatted: string = '00:00:00';
  intervaloTiempo: any;

  debugOn: boolean = true;
  debugButton: boolean = true;
  simularMov: boolean = false;

  constructor(
    private dateTimeService: DateTimeService,
    private tarifaService: TarifaService,
    private taximetroService: TaximetroService,
    private gpsLocationService: GPSLocationService,
    private miscellaneousService: MiscellaneousService, // private alertController: AlertController
    private platform: Platform,
    private modalController: ModalController
  ) {
    this.currentDateTime = new Date();
    this.nuevaFecha = this.dateTimeService.convertirFecha(this.currentDateTime);

    this.initializeApp();
    this.checkUbicacionActivada();
  }

  async ngOnInit() {
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  checkUbicacionActivada() {
    this.gpsLocationService.checkUbicacionActivada().then(
      (ubicacionActivada: boolean) => {
        this.ubicacionActivada = ubicacionActivada;
      },
      (error) => {
        console.log('No se pudo obtener la ubicación');
      }
    );
  }

  iniciarViaje() {
    this.viajeIniciado = true;
    this.viajeTerminado = false;
    this.ticket = false;
    this.distanciaRecorridaSegundo = 0;
    this.distanciaRecorridaTotal = 0;

    this.taximetroService.iniciarViaje();
    this.tarifaInicial();
    this.iniciarTimerCostoTiempo();
    this.iniciarTimerCostoDistancia();

    this.tiempoViaje = 0;
    this.actualizarTiempoViajeFormatted();
    this.intervaloTiempo = setInterval(() => {
      this.tiempoViaje++;
      this.actualizarTiempoViajeFormatted();
    }, 1000);

    const trip = {
      time: new Date(),
      distance: 0,
      type: this.distanciaRecorridaTotal ? 'distance' : 'time',
    };

    // Store the trip in localStorage
    const trips = JSON.parse(localStorage.getItem('trips') || '[]');
    trips.push(trip);
    localStorage.setItem('trips', JSON.stringify(trips));
  }

  terminarViaje() {
    this.calcularDetalleViaje();
    this.taximetroService.terminarViaje();
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    clearInterval(this.intervaloTiempo);
    this.viajeIniciado = false;
    this.viajeTerminado = true;
    this.vecesTiempo = 0;
    this.vecesDistancia = 0;
    this.detenerCurrentPosition();
    this.ticket = true;
  }

  reiniciarTaximetro() {
    this.viajeIniciado = false;
    this.viajeTerminado = false;
    this.ticket = false;
    this.taxiSelected = null;
    this.costo_viaje = 0;
    this.lastLatitude = 0;
    this.lastLongitude = 0;
    this.currentLatitude = 0;
    this.currentLongitude = 0;
    this.tiempoViaje = 0;
    this.cobroPorTiempo = false;
    this.cobroPorDistancia = false;
    this.distanciaRecorridaSegundo = 0;
    this.distanciaRecorridaTotal = 0;
    this.distanceTraveled = 0;
    this.velocidadKmXHr = 0;
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    clearInterval(this.intervaloTiempo);
    this.acumuladoTiempo = 0;
    this.acumuladoDistancia = 0;
    this.actualizarTiempoViajeFormatted();

    this.lastUpdateTime = 0;
  }

  tipoTarifa(): boolean {
    const currentHour = this.currentDateTime.getHours();
    return currentHour >= 5 && currentHour < 22 ? (this.isDay = true) : false;
  }

  obtenerNumeroTarifa(): number {
    return this.tarifaService.obtenerNumeroTarifa(this.taxiSelected);
  }

  onRadioSelect() {
    if (this.taxiSelected && this.viajeIniciado) {
      this.radioButtonsDisabled = true;
    }
  }

  tarifaInicial() {
    this.validarTarifa(2);
    this.costo_viaje = this.tarifa;
  }

  validarTarifa(opcion: number) {
    const { tarifa, aumento } = this.tarifaService.validarTarifa(
      opcion,
      this.currentDateTime,
      this.taxiSelected
    );
    this.tarifa = tarifa;
    this.aumento = aumento;
  }

  iniciarTimerCostoTiempo() {
    this.intervaloCostoTiempo = setInterval(() => {
      this.actualizarCostoPorTiempo();
    }, 45000);
  }

  iniciarTimerCostoDistancia() {
    this.obtenerCurrentPosition();
    this.intervaloCostoDistancia = setInterval(() => {
      // this.actualizarCostoPorDistancia();
      if (this.simularMov) {
        this.simularMovimiento();
      }
    }, 1000);
  }

  actualizarCostoPorTiempo() {
    this.validarTarifa(1);
    this.costo_viaje += this.aumento;
    this.vecesTiempo++;
    this.cobroPorTiempo = true;
    this.cobroPorDistancia = false;
    this.distanciaRecorridaSegundo = 0;
    this.reiniciarTimers();
  }

  reiniciarTimers() {
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    this.iniciarTimerCostoTiempo();
    this.iniciarTimerCostoDistancia();
  }

  obtenerCurrentPosition() {
    this.watchIdLocation = this.gpsLocationService
      .startPositionUpdates()
      .subscribe((positionData: any) => {
        const options: PositionOptions = {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 5000,
        };

        this.lastLatitude = positionData.lastLatitude;
        this.lastLongitude = positionData.lastLongitude;
        this.currentLatitude = positionData.currentLatitude;
        this.currentLongitude = positionData.currentLongitude;
        this.distanceTraveled = positionData.distanceTraveled;

        if (this.lastLatitude === 0 && this.lastLongitude === 0) {
          this.lastLatitude = this.currentLatitude;
          this.lastLongitude = this.currentLongitude;
        }

        console.log(
          'positionData.distanceTraveled: ',
          positionData.distanceTraveled
        );

        if (
          this.lastLatitude !== this.currentLatitude &&
          this.lastLongitude !== this.currentLongitude
        ) {
          this.distanciaRecorridaSegundo += positionData.distanceTraveled;
          this.distanciaRecorridaTotal += positionData.distanceTraveled;

          if (this.distanciaRecorridaSegundo >= 250) {
            // if (this.distanceTraveled >= 250) {
            this.validarTarifa(1);
            this.costo_viaje += this.aumento;
            this.vecesDistancia++;

            this.cobroPorTiempo = false;
            this.cobroPorDistancia = true;
            this.distanciaRecorridaSegundo = 0;
            this.reiniciarTimers();
          }

          // Llamar a la función para actualizar los datos reales de posición y cálculos
          this.actualizarDatosPosition(positionData.distanceTraveled);
        }
      });
  }

  detenerCurrentPosition() {
    if (this.watchIdLocation) {
      this.watchIdLocation.unsubscribe();
      this.watchIdLocation = null;
    }
  }

  async calcularDetalleViaje() {
    this.acumuladoTiempo = this.aumento * this.vecesTiempo;
    this.acumuladoDistancia = this.aumento * this.vecesDistancia;

    this.total = this.tarifa + this.acumuladoTiempo + this.acumuladoDistancia;
  }

  setDebug() {
    if (this.debugOn) {
      this.debugOn = false;
    } else {
      this.debugOn = true;
    }
  }

  setSimulador() {
    if (this.simularMov) {
      this.simularMov = false;
    } else {
      this.simularMov = true;
    }
  }

  initializeApp() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      navigator['app'].exitApp();
    });

    this.platform.ready().then(() => {
      if (this.platform.is('android') && this.platform.is('capacitor')) {
        // Change the status bar color
        StatusBar.setBackgroundColor({ color: '#d9176e' }); // Replace with your desired color
      }
    });
  }

  async mostrarTicket() {
    const modal = await this.modalController.create({
      component: DetalleViajeComponent,
      componentProps: {
        tarifa: this.tarifa.toFixed(2),
        acumuladoTiempo: this.acumuladoTiempo.toFixed(2),
        acumuladoDistancia: this.acumuladoDistancia.toFixed(2),
        total: this.total.toFixed(2),
        distanceTraveled: this.distanciaRecorridaTotal.toFixed(2),
        tiempoViajeFormatted: this.tiempoViajeFormatted,
      },
    });

    await modal.present();
  }

  async acercaDe() {
    const modal = await this.modalController.create({
      component: AcercaDeComponent,
    });

    await modal.present();
  }

  async mostrarOpcionesApp() {
    const modal = await this.modalController.create({
      component: InfoTarifasComponent,
    });

    await modal.present();
  }

  private actualizarTiempoViajeFormatted() {
    const hours = Math.floor(this.tiempoViaje / 3600);
    const minutes = Math.floor((this.tiempoViaje % 3600) / 60);
    const seconds = this.tiempoViaje % 60;

    this.tiempoViajeFormatted = `${this.padZero(hours)}:${this.padZero(
      minutes
    )}:${this.padZero(seconds)}`;
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  simularMovimiento() {
    const minSpeed = 1; // Mínima velocidad en metros por segundo
    const maxSpeed = 15; // Máxima velocidad en metros por segundo

    const distanciaRecorrida = Math.random() * (maxSpeed - minSpeed) + minSpeed;

    const bearing = Math.random() * 360; // Dirección aleatoria en grados
    const earthRadius = 6371000; // Radio de la Tierra en metros
    const lat1 = this.currentLatitude;
    const lon1 = this.currentLongitude;

    const lat2 = lat1 + (distanciaRecorrida / earthRadius) * (180 / Math.PI);
    const lon2 =
      lon1 +
      ((distanciaRecorrida / earthRadius) * (180 / Math.PI)) /
        Math.cos((lat1 * Math.PI) / 180);

    // Actualizar las coordenadas actuales simuladas
    this.currentLatitude = lat2;
    this.currentLongitude = lon2;

    // Actualizar la distancia recorrida simulada
    this.distanciaRecorridaSegundo += distanciaRecorrida;
    this.distanciaRecorridaTotal += distanciaRecorrida;
    this.distanceTraveled += distanciaRecorrida;

    if (this.distanciaRecorridaSegundo >= 242) {
      // if (this.distanceTraveled >= 250) {
      this.validarTarifa(1);
      this.costo_viaje += this.aumento;
      this.vecesDistancia++;

      this.cobroPorTiempo = false;
      this.cobroPorDistancia = true;
      this.distanciaRecorridaSegundo = 0;
      this.reiniciarTimers();
    }

    // Llamar a la función para actualizar los datos reales de posición y cálculos
    this.actualizarDatosPosition(distanciaRecorrida);
  }

  actualizarDatosPosition(distanciaRecorrida: number) {
    const timeElapsedSeconds = (Date.now() - this.lastUpdateTime) / 1000;

    // Actualizar valores
    this.distanceTraveled = distanciaRecorrida;
    this.lastLatitude = this.currentLatitude;
    this.lastLongitude = this.currentLongitude;

    // Actualizar la velocidad en km/hr
    if (timeElapsedSeconds > 0) {
      this.velocidadKmXHr = (this.distanceTraveled / timeElapsedSeconds) * 3.6; // Convertir a km/hr
    }

    this.lastUpdateTime = Date.now();
  }

  generateMonthlyReport() {
    const trips = JSON.parse(localStorage.getItem('trips') || '[]');

    // Filter trips for the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const filteredTrips = trips.filter((trip) => {
      const tripDate = new Date(trip.time);
      return (
        tripDate.getMonth() === currentMonth &&
        tripDate.getFullYear() === currentYear
      );
    });

    // Calculate total distance and time for the month
    let totalDistance = 0;
    let totalTime = 0;

    filteredTrips.forEach((trip: { type: string; distance: number }) => {
      if (trip.type === 'distance') {
        totalDistance += trip.distance;
      } else {
        // Assuming you have a way to calculate time for each trip
        totalTime += calculateTimeForTrip(trip);
      }
    });

    // Display or return the totalDistance and totalTime as needed
    console.log('Total Distance for the Month:', totalDistance);
    console.log('Total Time for the Month:', totalTime);
  }
}
