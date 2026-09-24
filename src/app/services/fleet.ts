import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DroneBaseDto } from '../models/drone.model';
import { env } from '../../env/environment';
import { DronePosition } from '../models/drone.model';

@Injectable({
  providedIn: 'root'
})
export class FleetService {

  private readonly commandBaseUrl = `${env.api.command}`;
  private readonly controlBaseUrl = `${env.api.control}`;

  constructor(private http: HttpClient) { }
  /**
   * Invia il comando di lancio flotta al microservizio di Fleet Management.
   */
  launchFleet(): Observable<DroneBaseDto[]> {
    return this.http.post<DroneBaseDto[]>(`${this.commandBaseUrl}/launch`, {});
  }

  recallFleet(): Observable<any> {
    return this.http.post(`${this.commandBaseUrl}/recall-all`, {}, { responseType: 'text' as 'json' });
  }

  emergencyStop(): Observable<any> {
    return this.http.post<any>(`${this.commandBaseUrl}/emergency-stop`, {});
  }

  subscribeToFleetControl(droneId: string): Observable<DronePosition> {
    return new Observable<DronePosition>(observer => {

      const eventSource = new EventSource(`${this.controlBaseUrl}/telemetry/${droneId}`);

      eventSource.onmessage = (event) => {
        const telemetryData: DronePosition = JSON.parse(event.data);
        observer.next(telemetryData);
      };

      eventSource.onerror = (error) => {
        observer.error(error);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
