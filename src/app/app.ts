import { Component } from '@angular/core';
import { DroneMap } from './components/drone-map/drone-map'; 

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [DroneMap]
})
export class App {
  title = 'telemetry-client';
}