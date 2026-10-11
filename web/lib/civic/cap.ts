import { haversine } from './geo'

// Approximate centroids of Turin's postal codes: a report gets the CAP of the nearest centroid.
// Replace with the official polygons (cap_zones) when available.
export const CAP_CENTROIDS: Record<string, [number, number]> = {
  '10121': [7.684, 45.068],
  '10122': [7.68, 45.076],
  '10123': [7.679, 45.06],
  '10124': [7.701, 45.064],
  '10125': [7.68, 45.045],
  '10126': [7.662, 45.033],
  '10127': [7.64, 45.014],
  '10128': [7.662, 45.056],
  '10129': [7.654, 45.06],
  '10131': [7.7, 45.056],
  '10132': [7.735, 45.075],
  '10133': [7.69, 45.03],
  '10134': [7.658, 45.023],
  '10135': [7.67, 45.015],
  '10136': [7.645, 45.043],
  '10137': [7.67, 45.03],
  '10138': [7.645, 45.058],
  '10139': [7.633, 45.068],
  '10141': [7.645, 45.083],
  '10142': [7.625, 45.078],
  '10143': [7.655, 45.095],
  '10144': [7.666, 45.095],
  '10145': [7.62, 45.07],
  '10146': [7.66, 45.077],
  '10147': [7.69, 45.094],
  '10148': [7.71, 45.12],
  '10149': [7.635, 45.095],
  '10151': [7.645, 45.092],
  '10152': [7.695, 45.086],
  '10153': [7.705, 45.08],
  '10154': [7.7, 45.1],
  '10155': [7.72, 45.11],
  '10156': [7.705, 45.125],
}

export const CAPS = Object.keys(CAP_CENTROIDS)

export function capFor(lon: number, lat: number): string {
  let best = 'N/D'
  let bestDistance = Infinity
  for (const [cap, centroid] of Object.entries(CAP_CENTROIDS)) {
    const d = haversine([lon, lat], centroid)
    if (d < bestDistance) {
      bestDistance = d
      best = cap
    }
  }
  return best
}
