import { JobAppointment } from '../types';

export interface RouteStop {
  job: JobAppointment;
  stopNumber: number;
  areaName: string;
  estimatedDriveMinutesFromPrev: number;
}

export interface RouteOptimizationResult {
  date: string;
  originalJobs: JobAppointment[];
  optimizedStops: RouteStop[];
  totalEstimatedDriveMinutes: number;
  estimatedMinutesSaved: number;
  googleMapsUrl: string;
}

// Approximate coordinate centers for Yuma County neighborhoods
interface GeoPoint {
  lat: number;
  lng: number;
  zone: string;
}

function approximateAddressCoords(address: string, city?: string): GeoPoint {
  const lower = (address + ' ' + (city || '')).toLowerCase();

  if (lower.includes('foothills') || lower.includes('fortuna') || lower.includes('14e') || lower.includes('85367')) {
    return { lat: 32.658, lng: -114.415, zone: 'Yuma Foothills' };
  }
  if (lower.includes('somerton') || lower.includes('county 15') || lower.includes('85350')) {
    return { lat: 32.597, lng: -114.711, zone: 'Somerton' };
  }
  if (lower.includes('san luis') || lower.includes('85349')) {
    return { lat: 32.486, lng: -114.782, zone: 'San Luis' };
  }
  if (lower.includes('country club') || lower.includes('ave a') || lower.includes('32nd st')) {
    return { lat: 32.673, lng: -114.618, zone: 'South Yuma / Country Club' };
  }
  if (lower.includes('24th st') || lower.includes('pacific') || lower.includes('ave b')) {
    return { lat: 32.689, lng: -114.632, zone: 'Central Yuma' };
  }
  if (lower.includes('historic') || lower.includes('4th ave') || lower.includes('8th st') || lower.includes('1st st')) {
    return { lat: 32.721, lng: -114.623, zone: 'North / Historic Yuma' };
  }

  // Default Central Yuma
  return { lat: 32.692, lng: -114.627, zone: 'Yuma Metro' };
}

function calculateDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Optimizes the route for a given set of appointments on the same day.
 * Uses a nearest-neighbor TSP heuristic starting from North/Central Yuma.
 */
export function optimizeDailyRoute(jobs: JobAppointment[], date: string): RouteOptimizationResult {
  if (jobs.length === 0) {
    return {
      date,
      originalJobs: [],
      optimizedStops: [],
      totalEstimatedDriveMinutes: 0,
      estimatedMinutesSaved: 0,
      googleMapsUrl: '',
    };
  }

  if (jobs.length === 1) {
    const geo = approximateAddressCoords(jobs[0].address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobs[0].address)}`;
    return {
      date,
      originalJobs: jobs,
      optimizedStops: [
        {
          job: jobs[0],
          stopNumber: 1,
          areaName: geo.zone,
          estimatedDriveMinutesFromPrev: 0,
        },
      ],
      totalEstimatedDriveMinutes: 0,
      estimatedMinutesSaved: 0,
      googleMapsUrl: mapsUrl,
    };
  }

  // Base starting reference: Yuma Operations Base (e.g. Central Yuma)
  const basePoint: GeoPoint = { lat: 32.705, lng: -114.625, zone: 'Clean Convictions Base' };

  // Nearest-Neighbor sequencing
  const unvisited = [...jobs];
  const orderedJobs: JobAppointment[] = [];
  let currentPoint = basePoint;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const p = approximateAddressCoords(unvisited[i].address);
      const dist = calculateDistanceKm(currentPoint, p);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextJob = unvisited.splice(nearestIdx, 1)[0];
    orderedJobs.push(nextJob);
    currentPoint = approximateAddressCoords(nextJob.address);
  }

  // Calculate drive minutes between stops
  let totalOptimizedDriveMinutes = 0;
  const stops: RouteStop[] = [];

  for (let i = 0; i < orderedJobs.length; i++) {
    const prevPoint = i === 0 ? basePoint : approximateAddressCoords(orderedJobs[i - 1].address);
    const curPoint = approximateAddressCoords(orderedJobs[i].address);
    const distKm = calculateDistanceKm(prevPoint, curPoint);
    // Average urban/suburban speed ~40 km/h plus traffic & parking buffer
    const driveMinutes = Math.max(8, Math.round((distKm / 35) * 60));
    totalOptimizedDriveMinutes += driveMinutes;

    stops.push({
      job: orderedJobs[i],
      stopNumber: i + 1,
      areaName: curPoint.zone,
      estimatedDriveMinutesFromPrev: driveMinutes,
    });
  }

  // Estimate unoptimized time (often 30% more due to back-and-forth across town)
  const estimatedMinutesSaved = Math.max(12, Math.round(totalOptimizedDriveMinutes * 0.35));

  // Build multi-stop Google Maps URL
  // Format: https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=stop2|stop3...
  const origin = encodeURIComponent(orderedJobs[0].address);
  const destination = encodeURIComponent(orderedJobs[orderedJobs.length - 1].address);
  
  let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

  if (orderedJobs.length > 2) {
    const waypoints = orderedJobs
      .slice(1, -1)
      .map((j) => encodeURIComponent(j.address))
      .join('|');
    googleMapsUrl += `&waypoints=${waypoints}`;
  }

  return {
    date,
    originalJobs: jobs,
    optimizedStops: stops,
    totalEstimatedDriveMinutes: totalOptimizedDriveMinutes,
    estimatedMinutesSaved,
    googleMapsUrl,
  };
}
