/**
 * VIN and plate-number rules, mirrored from the backend serializer
 * (apps/listings/serializers.py — validate_vin / validate_plate_number).
 *
 * Keep the two in sync: the server is the source of truth and will reject
 * anything these helpers let through, but matching them client-side means the
 * owner gets the error inline instead of after a round trip.
 */

/** ISO 3779: 17 chars, and the letters I, O and Q are never valid. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
export const VIN_LENGTH = 17;
export const PLATE_MIN = 5;
export const PLATE_MAX = 12;

/** Uppercase and strip whitespace — VINs are stored normalized. */
export function normalizeVin(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

/** Uppercase and strip spaces/hyphens — plates are stored normalized. */
export function normalizePlate(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/** Returns an error message, or null when the VIN is valid. */
export function validateVin(raw: string): string | null {
  const vin = normalizeVin(raw);
  if (!vin) return "VIN is required";
  if (vin.length !== VIN_LENGTH) {
    return `VIN must be exactly ${VIN_LENGTH} characters (${vin.length}/${VIN_LENGTH})`;
  }
  if (/[IOQ]/.test(vin)) return "VIN cannot contain the letters I, O or Q";
  if (!VIN_PATTERN.test(vin)) return "VIN contains an invalid character";
  return null;
}

/** Returns an error message, or null when the plate is valid. */
export function validatePlate(raw: string): string | null {
  const plate = normalizePlate(raw);
  if (!plate) return "Plate number is required";
  if (plate.length < PLATE_MIN || plate.length > PLATE_MAX) {
    return `Plate must be ${PLATE_MIN}–${PLATE_MAX} characters (${plate.length})`;
  }
  if (!/^[A-Z0-9]+$/.test(plate)) {
    return "Plate can only contain letters and numbers";
  }
  return null;
}

/**
 * The server deliberately returns one generic message for a duplicate VIN or
 * plate so it never reveals which listing (or owner) already holds it.
 */
export const DUPLICATE_VEHICLE_MESSAGE =
  "This vehicle is already registered on the platform.";
