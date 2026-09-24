import { Component, inject, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';
import { FleetService } from '../../services/fleet';
import { DroneBaseDto } from '../../models/drone.model';
import { DronePosition } from '../../models/drone.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  imports: [FormsModule, CommonModule],
  selector: 'app-drone-map',
  styleUrl: './drone-map.css',
  templateUrl: './drone-map.html',
})
export class DroneMap implements AfterViewInit, OnDestroy {

  private readonly fleetService = inject(FleetService);
  private readonly cdr = inject(ChangeDetectorRef);
  // Riferimento all'istanza della mappa Leaflet
  private map?: L.Map;

  allDrones: DroneBaseDto[] = [];

  // Droni attualmente selezionati per il tracciamento (max 10)
  selectedDroneId: string = '';
  trackedDrones = new Map<string, L.Marker>();
  private telemetrySubscriptions = new Map<string, any>();

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    // Clean-up: previene memory leak distruggendo l'istanza della mappa
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Inizializza la mappa con coordinate centrali (Roma) e livello di zoom iniziale
    const defaultLat = 41.9028; // Latitudine di Roma
    const defaultLon = 12.4964; // Longitudine di Roma

    this.map = L.map('map').setView([defaultLat, defaultLon], 12);

    // Aggiunge il layer delle tessere OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    //proviamo a ottenere la posizione dell'utente e centrare la mappa su di essa
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          this.map?.setView([userLat, userLon], 12);

          //aggiungiamo un marker per la posizione dell'utente
          const userMarker = L.marker([userLat, userLon], {
            icon: L.divIcon({
              className: 'user-marker-container',
              html: `<div class="user-icon">📍</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          }).addTo(this.map!);
          userMarker.bindPopup('La tua posizione');
        },
        (error) => {
          console.error('Errore nel recupero della posizione dell\'utente:', error);
        }
      );
    }

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  lanciaFlotta() {
    this.fleetService.launchFleet().subscribe({
      next: (response: DroneBaseDto[]) => {
        this.allDrones = response;
        console.log('[DroneMap] Numero di droni caricati:', this.allDrones.length);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[DroneMap] Errore durante la chiamata al backend:', err);
      }
    });
  }

  arrestoEmergenza() {
  }

  /**
    * Aggiunge un drone alla mappa in base alla selezione dell'utente (Max 10)
    */
  onDroneSelected(droneId: string): void {
    if (!droneId || !this.map) return;

    // Controllo limite massimo 10 droni
    if (this.trackedDrones.size >= 10 && !this.trackedDrones.has(droneId)) {
      alert('Hai raggiunto il limite massimo di 10 droni tracciati contemporaneamente.');
      return;
    }

    // Se il drone è già tracciato, centra la mappa su di esso
    if (this.trackedDrones.has(droneId)) {
      const existingMarker = this.trackedDrones.get(droneId)!;
      this.map.setView(existingMarker.getLatLng(), 14);
      return;
    }

    // Trova i dati del drone nella lista generale
    const droneData = this.allDrones.find(d => d.id === droneId);
    if (!droneData) return;

    // Crea l'icona e posiziona il marker alle coordinate di base
    const icon = L.divIcon({
      className: 'drone-marker-container',
      html: `<div class="drone-icon">🛸</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([droneData.baseLat, droneData.baseLon], { icon })
      .addTo(this.map)
      .bindPopup(`<b>ID:</b> ${droneData.id}<br><b>Tipo:</b> ${droneData.type}<br><b>Stato:</b> IN ATTESA DI TELEMETRIA`);

    // Salva nel dizionario dei droni attivi
    this.trackedDrones.set(droneId, marker);

    // Centra la mappa sull'ultimo drone aggiunto
    this.map.setView([droneData.baseLat, droneData.baseLon], 10);

    this.startListeningToTelemetry(droneId);
  }

  /**
   * Rimuove un drone dal tracciamento attivo e dalla mappa
   */
  removeTrackedDrone(droneId: string): void {
    const marker = this.trackedDrones.get(droneId);
    if (marker && this.map) {
      marker.remove();
      this.trackedDrones.delete(droneId);
    }
    const sub = this.telemetrySubscriptions.get(droneId);
    if (sub) {
      sub.unsubscribe();
      this.telemetrySubscriptions.delete(droneId);
    }

    this.allDrones = this.allDrones.filter(drone => drone.id !== droneId);
    // Se il drone rimosso era quello attualmente selezionato nella select, puliamo la selezione
    if (this.selectedDroneId === droneId) {
      this.selectedDroneId = '';
    }
  }

  richiamaFlotta(): void {

    this.fleetService.recallFleet().subscribe({
      next: (response) => {
        console.log('[DroneMap] Flotta richiamata. Numero di droni rimanenti: ', this.allDrones.length);

        this.cdr.markForCheck()//Forza Angular a rinfrescare la vista  
      },
      error: (err) => {
        console.error('[DroneMap] Errore durante la chiamata al backend per richiamare la flotta:', err);
      }
    });
  }

  startListeningToTelemetry(droneId: string): void {
    const subscription = this.fleetService.subscribeToFleetControl(droneId).subscribe({
      next: (dronePosition: DronePosition) => {
        const marker = this.trackedDrones.get(droneId);
        console.log(`[Telemetry] Ricevuta nuova posizione per ${droneId}:`, dronePosition);

        // Controllo del valore sentinella (tutti zeri)
        if (dronePosition.latitude === 0 && dronePosition.longitude === 0 && dronePosition.altitudeMeters === 0) {
          console.log(`[SSE] Ricevuto segnale di atterraggio per il drone ${droneId}. Chiusura pulita.`);
          this.removeTrackedDrone(droneId); // Rimuove il marker dalla mappa Leaflet
          return;
        }

        if (marker) {
          marker.setLatLng([dronePosition.latitude, dronePosition.longitude]);

          marker.setPopupContent(`
            <b>ID:</b> ${droneId}<br>
            <b>Lat:</b> ${dronePosition.latitude.toFixed(4)}<br>
            <b>Lon:</b> ${dronePosition.longitude.toFixed(4)}<br>
            <b>Altitudine:</b> ${dronePosition.altitudeMeters.toFixed(1)}m
          `);
        }
      },
      error: (err) => {
        console.error(`[DroneMap] Errore nella ricezione dei dati di telemetria per il drone ${droneId}:`, err);

        this.removeTrackedDrone(droneId);
      }
    });

    // Salva la sottoscrizione per poterla annullare in seguito
    this.telemetrySubscriptions.set(droneId, subscription);
  }
}