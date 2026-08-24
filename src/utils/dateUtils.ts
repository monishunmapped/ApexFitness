/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for date parsing, formatting, and calculations across the app.
 * - DOB is recorded in DDMMYY (6 digits).
 * - Join date, Expiry date, and all other dates are DDMMYYYY / DD-MM-YYYY / YYYY-MM-DD.
 */

/**
 * Parse any date string or Date object safely without throwing errors or producing invalid dates.
 */
export function parseDate(input: string | Date | number | null | undefined): Date {
  if (!input) return new Date('2026-06-20');
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date('2026-06-20') : input;
  }

  const str = String(input).trim();
  if (!str) return new Date('2026-06-20');

  // Handle timestamp in milliseconds as string if purely numeric > 10 digits
  if (/^\d{10,13}$/.test(str)) {
    const num = parseInt(str, 10);
    const d = new Date(num);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2100) {
      return d;
    }
  }

  // Handle 8-digit DDMMYYYY (e.g., 20062026 or 15012027)
  if (/^\d{8}$/.test(str)) {
    const day = parseInt(str.slice(0, 2), 10);
    const month = parseInt(str.slice(2, 4), 10);
    const year = parseInt(str.slice(4, 8), 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return new Date(year, month - 1, day);
    }
  }

  // Handle 6-digit DDMMYY (e.g., 200688 or 200626)
  if (/^\d{6}$/.test(str)) {
    const day = parseInt(str.slice(0, 2), 10);
    const month = parseInt(str.slice(2, 4), 10);
    const yy = parseInt(str.slice(4, 6), 10);
    const year = yy > 30 ? 1900 + yy : 2000 + yy;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, day);
    }
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10);
    const year = parseInt(ddmmyyyyMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, day);
    }
  }

  // Handle DD-MM-YY or DD/MM/YY
  const ddmmyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (ddmmyyMatch) {
    const day = parseInt(ddmmyyMatch[1], 10);
    const month = parseInt(ddmmyyMatch[2], 10);
    const yy = parseInt(ddmmyyMatch[3], 10);
    const year = yy > 30 ? 1900 + yy : 2000 + yy;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, day);
    }
  }

  // Handle YYYY-MM-DD
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10);
    const day = parseInt(yyyymmddMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return new Date(year, month - 1, day);
    }
  }

  // Standard fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
    return parsed;
  }

  return new Date('2026-06-20');
}

/**
 * Calculate expiry date from join date and duration in days.
 */
export function calculateExpiryDate(joinDateInput: string | Date, durationDays: number) {
  const start = parseDate(joinDateInput);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  return {
    expiryObj: end,
    expiryDateIso: formatDateISO(end), // "YYYY-MM-DD"
    expiryDateFormatted: formatDateDDMMYYYY(end, '-'), // "DD-MM-YYYY"
  };
}

/**
 * Format date as ISO "YYYY-MM-DD"
 */
export function formatDateISO(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date as "DD-MM-YYYY", "DD/MM/YYYY", or "DDMMYYYY"
 */
export function formatDateDDMMYYYY(dateInput: string | Date | null | undefined, separator = '-'): string {
  const d = parseDate(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  if (!separator) {
    return `${day}${month}${year}`;
  }
  return `${day}${separator}${month}${separator}${year}`;
}

/**
 * Format date as 6-digit "DDMMYY" (for DOB)
 */
export function formatDateDDMMYY(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}${month}${yy}`;
}

/**
 * Calculate remaining check-in days until expiry relative to a reference date.
 */
export function calculateDaysRemaining(
  expiryDateInput: string | Date, 
  referenceDateInput: string | Date = '2026-06-20'
): number {
  const expiry = parseDate(expiryDateInput);
  const ref = parseDate(referenceDateInput);

  const d1 = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const d2 = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

  return Math.max(0, diffDays);
}
