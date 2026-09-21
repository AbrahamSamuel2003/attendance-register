/**
 * Calculates distance in meters between two lat/long points using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // returns distance in meters
}

/**
 * Validates if the given coordinates fall within the office boundary
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number
): { isInside: boolean; distanceMeters: number } {
  const distance = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: distance,
  };
}
