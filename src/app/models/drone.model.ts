export interface DroneBaseDto {
  id: string;
  type: string;
  baseLat: number;
  baseLon: number;
}

export interface DronePosition {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}