// Independent test fixture — deliberately not imported from the seed
// script, so these tests don't silently break if the dev seed changes
// later. Same 9 real Dhaka zone coordinates, defined locally.
import type { LatLng } from "../geo";

export const TEST_ZONES: Record<string, LatLng> = {
  Banani: { lat: 23.793993, lng: 90.404272 },
  "Gulshan 1": { lat: 23.797911, lng: 90.414391 },
  "Gulshan 2": { lat: 23.7925, lng: 90.4078 },
  Mohakhali: { lat: 23.777628, lng: 90.405449 },
  Dhanmondi: { lat: 23.746466, lng: 90.376015 },
  Mirpur: { lat: 23.82235, lng: 90.365417 },
  Uttara: { lat: 23.872839, lng: 90.396028 },
  Farmgate: { lat: 23.756107, lng: 90.387196 },
  Bashundhara: { lat: 23.814311, lng: 90.437596 },
};
