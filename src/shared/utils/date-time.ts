/**
 * Central Date & Time Utilities for Clinical Cloud
 * Handles multi-branch timezone offsets (e.g. America/Mexico_City, America/Mazatlan, America/Cancun, America/Tijuana)
 * converting local branch times to true UTC for PostgreSQL storage and formatting UTC back to branch local times.
 */

export const DEFAULT_TIMEZONE = "America/Mazatlan";

export interface TimeParts {
  hours: number;
  minutes: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
}

/**
 * Returns today's date in YYYY-MM-DD format strictly in the specified timezone
 * (by default America/Mazatlan). Does not suffer from UTC midnight rollovers.
 */
export function getClinicTodayDateStr(timeZone: string = "America/Mazatlan"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Shifts a YYYY-MM-DD date string by a number of days (+1, -1) cleanly
 * without any UTC date shifting or timezone edge cases.
 */
export function shiftDateStr(dateStr: string, daysDelta: number): string {
  const parts = dateStr.trim().split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;

  const utcDate = new Date(Date.UTC(year, month - 1, day + daysDelta, 12, 0, 0));
  const newYear = utcDate.getUTCFullYear();
  const newMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const newDay = String(utcDate.getUTCDate()).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Converts a local date string (YYYY-MM-DD) and local time string (HH:mm or HH:mm:ss)
 * in an explicit IANA timezone into the exact UTC Date object.
 * Does not depend on the browser or server's host timezone.
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const [year = 2026, month = 1, day = 1] = dateStr.trim().split("-").map(Number);
  const timeParts = timeStr.trim().split(":").map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;

  // 1. Initial naive UTC instant
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0));

  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = dtf.formatToParts(naiveUtc);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
    const rawH = parseInt(get("hour"), 10);
    const tzYear = parseInt(get("year"), 10);
    const tzMonth = parseInt(get("month"), 10);
    const tzDay = parseInt(get("day"), 10);
    const tzHour = rawH === 24 ? 0 : rawH;
    const tzMinute = parseInt(get("minute"), 10);
    const tzSecond = parseInt(get("second"), 10);

    const localAsUtc = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond));
    const diffMs = naiveUtc.getTime() - localAsUtc.getTime();

    return new Date(naiveUtc.getTime() + diffMs);
  } catch (error) {
    console.warn(`[date-time] Error calculating UTC for timeZone "${timeZone}":`, error);
    return naiveUtc;
  }
}

/**
 * Parses a date/time string (e.g. "2026-09-22 11:00", "2026-09-22T11:00:00", "2026-09-22")
 * respecting the branch timezone if no timezone offset (Z or +/-HH:mm) is explicitly present.
 */
export function parseLocalDateTime(
  dateTimeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const clean = dateTimeStr.trim();
  if (!clean) return new Date();

  // If string already contains explicit timezone offset indicator ('Z', '+HH:mm', '-HH:mm')
  const hasTimezone = /([Zz]|[+-]\d{2}(?::?\d{2})?)$/.test(clean);
  if (hasTimezone) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }

  // Check if string matches "YYYY-MM-DD" or "YYYY-MM-DD[ T]HH:mm"
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if (isoMatch) {
    const datePart = isoMatch[1]!;
    const timePart = isoMatch[2] || "00:00";
    return localToUtc(datePart, timePart, timeZone);
  }

  // Fallback to standard Date parsing
  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * Backward compatibility alias for parseLocalDateTime
 */
export function parseClinicDateTime(
  dateTimeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  return parseLocalDateTime(dateTimeStr, timeZone);
}

/**
 * Extracts hours, minutes, and YYYY-MM-DD in the specified branch's timezone
 */
export function getAppointmentTimeParts(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): TimeParts {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;

  if (isNaN(date.getTime())) {
    return { hours: 0, minutes: 0, dateStr: "", timeStr: "00:00" };
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const getVal = (type: string) =>
      parts.find((p) => p.type === type)?.value || "0";

    const rawHour = parseInt(getVal("hour"), 10);
    const hours = rawHour === 24 ? 0 : rawHour;
    const minutes = parseInt(getVal("minute"), 10);
    const year = getVal("year");
    const month = getVal("month");
    const day = getVal("day");

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    return { hours, minutes, dateStr, timeStr };
  } catch {
    // Fallback to local getters
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    return { hours, minutes, dateStr, timeStr };
  }
}

/**
 * Formats time as "HH:mm" in the specified timezone
 */
export function formatAppointmentTime(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return getAppointmentTimeParts(isoOrDate, timeZone).timeStr;
}

/**
 * Formats date as long Spanish date string (e.g. "martes, 22 de septiembre de 2026")
 */
export function formatAppointmentDate(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(date.getTime())) return "";

  try {
    return date.toLocaleDateString("es-MX", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Calculates top (pixels) and height (pixels) of an appointment in the TimeGrid
 */
export function calculateAppointmentPosition(
  startAt: string | Date,
  durationMinutes: number,
  startHour: number,
  hourHeight: number,
  timeZone: string = DEFAULT_TIMEZONE
): { top: number; height: number } {
  const { hours, minutes } = getAppointmentTimeParts(startAt, timeZone);
  const startMins = hours * 60 + minutes;
  const top = ((startMins - startHour * 60) / 60) * hourHeight;
  const height = (durationMinutes / 60) * hourHeight;

  return { top, height };
}

/**
 * Calculates start and end Date objects in UTC corresponding to 00:00:00 and 23:59:59.999
 * of the specified local date (YYYY-MM-DD) for database querying in the branch timezone.
 */
export function getLocalDayBounds(
  dateStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): { startOfDay: Date; endOfDay: Date } {
  try {
    const startOfDay = localToUtc(dateStr, "00:00:00", timeZone);
    const endOfDay = new Date(localToUtc(dateStr, "23:59:59", timeZone).getTime() + 999);
    if (!isNaN(startOfDay.getTime()) && !isNaN(endOfDay.getTime())) {
      return { startOfDay, endOfDay };
    }
  } catch {
    // Fallback
  }

  return {
    startOfDay: new Date(`${dateStr}T00:00:00.000Z`),
    endOfDay: new Date(`${dateStr}T23:59:59.999Z`),
  };
}
