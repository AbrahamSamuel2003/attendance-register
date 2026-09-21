# Geofence Validation & DB Verification Invariants

## 1. Single Source of Truth
- The master geofence coordinates (`latitude`, `longitude`, `radius_meters`) must always be read directly from the database (`office_settings` table in Supabase).
- No hardcoded or mock fallback coordinates may override the stored database configuration.

## 2. Strict Mathematical Geofence Validation
- Geofence status must strictly be calculated using the standard Haversine distance formula:
  - If `distance <= radius_meters` -> Status is `isInside: true` (Inside Office).
  - If `distance > radius_meters` -> Status is `isInside: false` (Outside Office Boundary).
- Never use artificial client-side simulation overrides or mock location flips.

## 3. Sensor Settings for Accuracy
- All mobile location requests in attendance check-ins must enforce `maximumAge: 0` and `enableHighAccuracy: true` with a minimum `timeout: 10000ms` to ensure fresh satellite GNSS triangulation rather than stale cellular tower approximations.
