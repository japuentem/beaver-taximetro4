import { Injectable } from '@angular/core';
// import { initializeApp } from 'firebase/app';
// import { getFirestore, collection, doc, getDoc } from 'firebase/firestore';
// import { environment } from '../../environments/environment'; // Importar environment

@Injectable({
  providedIn: 'root',
})
export class TarifaService {
  lastUpdateTime: number = 0;
  taxiSelected: string | null = null;
  tarifa: number = 0;
  aumento: number = 0;
  firestore: any; // Declara una variable para Firestore

  constructor() {
    // const firebaseConfig = environment.firebaseConfig; // Obtener la configuración de Firebase desde environment
    // const app = initializeApp(firebaseConfig);
    // this.firestore = getFirestore(app); // Inicializar Firestore
  }

  /*   async validarTarifa(
    opcion: number,
    currentTime: Date,
    taxiSelected: string | null
  ): Promise<{ tarifa: number; aumento: number }> {
    const currentHour = currentTime.getHours();

    try {
      const docSnapshot = await getDoc(
        doc(this.firestore, 'tarifas', taxiSelected || 'default')
      );
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const tarifa = data?.['tarifa'] || 0;
        const aumento = data?.['aumento'] || 0;

        return {
          tarifa: tarifa * (currentHour >= 5 && currentHour < 22 ? 1 : 1.2),
          aumento: aumento * (currentHour >= 5 && currentHour < 22 ? 1 : 1.2),
        };
      } else {
        // El documento no existe, se pueden establecer tarifas por defecto aquí
        return {
          tarifa: 0,
          aumento: 0,
        };
      }
    } catch (error) {
      console.error('Error al obtener las tarifas desde Firebase:', error);
      // Manejo de errores aquí, se pueden establecer tarifas por defecto en caso de error
      return {
        tarifa: 0,
        aumento: 0,
      };
    }
  }
 */

  validarTarifa(
    opcion: number,
    currentTime: Date,
    taxiSelected: string | null
  ): { tarifa: number; aumento: number } {
    const currentHour = currentTime.getHours();

    let tarifas: { [key: string]: { tarifa: number; aumento: number } } = {
      libre: { tarifa: 0, aumento: 0 },
      sitio: { tarifa: 0, aumento: 0 },
      radio_taxi: { tarifa: 0, aumento: 0 },
    };

    if (opcion === 1) {
      const tiempo = this.obtenerTiempo();

      if (tiempo >= 44980) {
        tarifas = {
          libre: { tarifa: 8.74, aumento: 1.07 },
          sitio: { tarifa: 13.1, aumento: 1.3 },
          radio_taxi: { tarifa: 27.3, aumento: 1.84 },
        };
      }
    } else if (opcion === 2) {
      tarifas = {
        libre: { tarifa: 8.74, aumento: 1.07 },
        sitio: { tarifa: 13.1, aumento: 1.3 },
        radio_taxi: { tarifa: 27.3, aumento: 1.84 },
      };
    }

    let tarifa = 0;
    let aumento = 0;

    if (taxiSelected !== null && taxiSelected in tarifas) {
      tarifa =
        tarifas[taxiSelected].tarifa *
        (currentHour >= 5 && currentHour < 22 ? 1 : 1.2);
      aumento =
        tarifas[taxiSelected].aumento *
        (currentHour >= 5 && currentHour < 22 ? 1 : 1.2);
    }

    this.tarifa = tarifa;
    this.aumento = aumento;
    return { tarifa, aumento };
  }

  obtenerTiempo(): number {
    const currentTime = new Date().getTime();
    const elapsedTime = currentTime - this.lastUpdateTime;

    return elapsedTime;
  }

  obtenerNumeroTarifa(taxiSelected: string | null): number {
    switch (taxiSelected) {
      case 'libre':
        return 1;
      case 'sitio':
        return 3;
      case 'radio_taxi':
        return 5;
      default:
        return 0; // Otra opción por defecto
    }
  }

  obtenerTarifaInicial(): number {
    return this.tarifa; // Valor de la tarifa inicial
  }
}
