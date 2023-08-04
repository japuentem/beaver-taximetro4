import { Component } from '@angular/core';
import { DateTimeService } from '../services/date-time-service.service';
import { TarifaService } from '../services/tarifa-service.service';
import { TaximetroService } from '../services/taximetro-service.service';
import { GPSLocationService } from '../services/gps-location-service.service';
import { MiscellaneousService } from '../services/miscellaneous-service.service';
import { Platform } from '@ionic/angular';
import { StatusBar } from '@capacitor/status-bar';
import { DetalleViajeComponent } from '../components/detalle-viaje/detalle-viaje.component'; // Asegúrate de colocar la ruta correcta
import { AcercaDeComponent } from '../components/acerca-de/acerca-de.component'; // Asegúrate de colocar la ruta correcta
import { ModalController } from '@ionic/angular';
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
  nuevaFecha: string = '';
  viajeIniciado: boolean = false;
  viajeTerminado: boolean = false;
  taxiSelected: string | null = null;
  ubicacionActivada: boolean = false;
  watchId: any = null;
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
  lastLatitude: number = 0;
  lastLongitude: number = 0;
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  debugMode: boolean = false;
  distanceTraveled: number = 0;
  lastUpdateTime: number = 0;
  velocidadKmXHr: number = 0;
  ticket: boolean = false;

  tiempoViaje: number = 0;
  tiempoViajeFormatted: string = '00:00:00';
  intervaloTiempo: any;

  //   intervaloSimularMovimiento: any;

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
    this.checkUbicacionActivada();
    this.initializeApp();
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
    // clearInterval(this.intervaloSimularMovimiento);
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
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    this.acumuladoTiempo = 0;
    this.acumuladoDistancia = 0;
    this.actualizarTiempoViajeFormatted();
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

  /*
  async validarTarifa(opcion: number) {
    try {
      const { tarifa, aumento } = await this.tarifaService.validarTarifa(
        opcion,
        this.currentDateTime,
        this.taxiSelected
      );
      this.tarifa = tarifa;
      this.aumento = aumento;
    } catch (error) {
      console.error('Error al validar tarifa:', error);
      // Manejar el error si es necesario
    }
  }
 */
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
    this.watchId = this.gpsLocationService
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

        // Calcular velocidad en km/hr
        const tiempoTranscurridoSegundos =
          (new Date().getTime() - this.lastUpdateTime) / 1000; // Convertir a segundos
        const distanciaRecorridaKm = this.distanceTraveled / 1000; // Convertir a kilómetros
        const velocidadKmPorHora =
          distanciaRecorridaKm / (tiempoTranscurridoSegundos / 3600);

        this.velocidadKmXHr = velocidadKmPorHora;
        // Guardar el tiempo actual como referencia para el próximo cálculo de velocidad
        this.lastUpdateTime = new Date().getTime();
        /*
        this.intervaloSimularMovimiento = setInterval(() => {
          const simulatedPosition = this.miscellaneousService.simularMovimiento(
            this.currentLatitude,
            this.currentLongitude,
            this.lastLatitude,
            this.lastLongitude
          );

          this.lastLatitude = simulatedPosition.lastLatitude;
          this.lastLongitude = simulatedPosition.lastLongitude;
          this.currentLatitude = simulatedPosition.currentLatitude;
          this.currentLongitude = simulatedPosition.currentLongitude;
        }, 1000);
 */
        if (this.lastLatitude === 0 && this.lastLongitude === 0) {
          this.lastLatitude = this.currentLatitude;
          this.lastLongitude = this.currentLongitude;
        }

        this.distanciaRecorridaSegundo += positionData.distanceTraveled;
        this.distanciaRecorridaTotal += positionData.distanceTraveled;

        // if (this.distanciaRecorridaSegundo >= 242) {
        if (this.distanceTraveled >= 250) {
          this.validarTarifa(1);
          this.costo_viaje += this.aumento;
          this.vecesDistancia++;

          this.cobroPorTiempo = false;
          this.cobroPorDistancia = true;
          this.distanciaRecorridaSegundo = 0;
          this.reiniciarTimers();
        }
      });
  }

  /*
  actualizarCostoPorDistancia() {
    let distanciaEnMetros = this.gpsLocationService.calcularDistancia(
      this.lastLatitude,
      this.lastLongitude,
      this.currentLatitude,
      this.currentLongitude
    );
    console.log('distanciaEnMetros: ', distanciaEnMetros);
    this.textoCoordenadas = distanciaEnMetros.toString();

    this.distanciaRecorridaSegundo += distanciaEnMetros;
    this.distanciaRecorridaTotal += distanciaEnMetros;
    distanciaEnMetros = 0;

    if (this.distanciaRecorridaSegundo >= 242) {
      this.validarTarifa(1);
      this.costo_viaje += this.aumento;
      this.vecesDistancia++;

      this.cobroPorTiempo = false;
      this.cobroPorDistancia = true;
      this.distanciaRecorridaSegundo = 0;
      this.reiniciarTimers();
    }
  }

  calcularDistanciaRecorrida(): number {
    const distanciaEnMetros = this.gpsLocationService.calcularDistancia(
      this.lastLatitude,
      this.lastLongitude,
      this.currentLatitude,
      this.currentLongitude
    );

    if (distanciaEnMetros > 0) {
      this.lastDistance = distanciaEnMetros;
      this.distanciaRecorridaSegundo += distanciaEnMetros;
      this.distanciaRecorridaTotal += distanciaEnMetros;
    }

    return this.lastDistance;
  }
 */
  detenerCurrentPosition() {
    if (this.watchId) {
      this.watchId.unsubscribe(); // Detiene la actualización de la posición
      this.watchId = null; // Restablece el valor de la variable watchId a null
      // this.speed = 0; // Restablece el valor de la velocidad (si tienes una variable speed)
    }
  }

  async calcularDetalleViaje() {
    this.acumuladoTiempo = this.aumento * this.vecesTiempo;
    this.acumuladoDistancia = this.aumento * this.vecesDistancia;

    this.total = this.tarifa + this.acumuladoTiempo + this.acumuladoDistancia;
  }

  setDebug() {
    this.debugMode = this.miscellaneousService.setDebug(this.debugMode);
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
        distanceTraveled: this.distanceTraveled,
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
}
