import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

/**
 * Pure, offline phone-number analysis powered by Google's libphonenumber
 * (via libphonenumber-js/max for accurate line-type detection). No network.
 */
export interface PhoneResult {
  input: string;
  valid: boolean;
  possible: boolean;
  e164: string | null;
  national: string | null;
  international: string | null;
  rfc3966: string | null;
  country: string | null;
  country_calling_code: string | null;
  type: string | null;
  is_mobile: boolean;
}

const MOBILE_TYPES = new Set(["MOBILE", "FIXED_LINE_OR_MOBILE"]);

export function analyzePhone(input: string, defaultCountry?: string): PhoneResult {
  const trimmed = input.trim();
  const pn = parsePhoneNumberFromString(
    trimmed,
    defaultCountry ? (defaultCountry.toUpperCase() as CountryCode) : undefined,
  );

  if (!pn) {
    return {
      input: trimmed,
      valid: false,
      possible: false,
      e164: null,
      national: null,
      international: null,
      rfc3966: null,
      country: null,
      country_calling_code: null,
      type: null,
      is_mobile: false,
    };
  }

  const type = pn.getType() ?? null;
  return {
    input: trimmed,
    valid: pn.isValid(),
    possible: pn.isPossible(),
    e164: pn.number,
    national: pn.formatNational(),
    international: pn.formatInternational(),
    rfc3966: pn.getURI(),
    country: pn.country ?? null,
    country_calling_code: pn.countryCallingCode ? `+${pn.countryCallingCode}` : null,
    type,
    is_mobile: type ? MOBILE_TYPES.has(type) : false,
  };
}
