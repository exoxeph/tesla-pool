// Mirrors the backend's phone normalization/validation (apps/api's
// auth.schema.ts) so client-side checks never reject something the
// server would accept, or vice versa. Server stays the source of truth.
const PHONE_REGEX = /^01[3-9]\d{8}$/;

export function normalizePhone(raw: string): string {
  return raw
    .trim()
    .replace(/[\s-]/g, "")
    .replace(/^\+?880/, "0");
}

export function isValidPhone(raw: string): boolean {
  return PHONE_REGEX.test(normalizePhone(raw));
}
