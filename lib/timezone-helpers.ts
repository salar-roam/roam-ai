// lib/timezone-helpers.ts
// In a full application, this would query your 'towns' table or a timezone database
// to dynamically get the timezone for a given town.
// For now, we use a simple mapping.

// Map of towns to their timezones
const townTimezones: { [key: string]: string } = {
  'Cabarete': 'America/Santo_Domingo',
  'Las Terrenas': 'America/Santo_Domingo',
  'Santo Domingo': 'America/Santo_Domingo',
  // Add more towns as needed
};

export function getTownTimezone(town: string): string {
  return townTimezones[town] || 'America/Santo_Domingo'; // Default to Santo Domingo timezone
}