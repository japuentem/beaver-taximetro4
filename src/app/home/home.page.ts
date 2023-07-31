import { Component } from '@angular/core';
import { DateTimeService } from '../services/date-time-service.service';
import { TarifaService } from '../services/tarifa-service.service';
import { TaximetroService } from '../services/taximetro-service.service';
import { GPSLocationService } from '../services/gps-location-service.service';
import { MiscellaneousService } from '../services/miscellaneous-service.service';

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

  // textoCoordenadas: string = '';
  //   intervaloSimularMovimiento: any;

  constructor(
    private dateTimeService: DateTimeService,
    private tarifaService: TarifaService,
    private taximetroService: TaximetroService,
    private gpsLocationService: GPSLocationService,
    private miscellaneousService: MiscellaneousService // private alertController: AlertController
  ) {
    this.currentDateTime = new Date();
    this.nuevaFecha = this.dateTimeService.convertirFecha(this.currentDateTime);
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
    this.distanciaRecorridaSegundo = 0;
    this.distanciaRecorridaTotal = 0;

    this.taximetroService.iniciarViaje();
    this.tarifaInicial();
    this.iniciarTimerCostoTiempo();
    this.iniciarTimerCostoDistancia();
  }

  terminarViaje() {
    this.calcularDetalleViaje();
    this.taximetroService.terminarViaje();
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    this.viajeIniciado = false;
    this.viajeTerminado = true;
    this.vecesTiempo = 0;
    this.vecesDistancia = 0;
    this.detenerCurrentPosition();
    // clearInterval(this.intervaloSimularMovimiento);
  }

  reiniciarTaximetro() {
    this.viajeIniciado = false;
    this.viajeTerminado = false;
    this.taxiSelected = null;
    this.costo_viaje = 0;
    this.lastLatitude = 0;
    this.lastLongitude = 0;
    this.currentLatitude = 0;
    this.currentLongitude = 0;
    // this.lastDistance = 0;
    this.cobroPorTiempo = false;
    this.cobroPorDistancia = false;
    this.distanciaRecorridaSegundo = 0;
    this.distanciaRecorridaTotal = 0;
    clearInterval(this.intervaloCostoTiempo);
    clearInterval(this.intervaloCostoDistancia);
    this.acumuladoTiempo = 0;
    this.acumuladoDistancia = 0;
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

        // Actualiza el valor de distanciaRecorridaTotal con el valor de distanceTraveled del objeto emitido
        // this.distanciaRecorridaTotal = positionData.distanceTraveled;
        // this.textoCoordenadas = positionData.distanceTraveled;
        this.distanceTraveled = positionData.distanceTraveled;
        this.distanciaRecorridaSegundo += positionData.distanceTraveled;
        this.distanciaRecorridaTotal += positionData.distanceTraveled;

        if (this.distanciaRecorridaSegundo >= 242) {
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
}
