import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const APP_TIME_ZONE = "Europe/Bucharest";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeForCompare(value: string) {
  return normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeForCompactCompare(value: string) {
  return normalizeForCompare(value).replace(/\s+/g, "");
}

export function normalizeEmail(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function slugify(value: string) {
  return normalizeWhitespace(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

const zonedDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getZonedParts(date: Date) {
  const parts = zonedDateTimeFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second"))
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getZonedParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function parseNaiveDateTimeInAppTimeZone(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  let offsetMs = getTimeZoneOffsetMs(new Date(utcGuess));
  let timestamp = utcGuess - offsetMs;
  const adjustedOffsetMs = getTimeZoneOffsetMs(new Date(timestamp));
  if (adjustedOffsetMs !== offsetMs) {
    timestamp = utcGuess - adjustedOffsetMs;
  }

  return new Date(timestamp);
}

export function parseAppDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const hasExplicitTimeZone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value);
  if (hasExplicitTimeZone) {
    const explicit = new Date(value);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }

  return parseNaiveDateTimeInAppTimeZone(value);
}

export function toStoredDateTime(value: string | null | undefined) {
  const parsed = parseAppDateTime(value);
  return parsed ? parsed.toISOString() : null;
}

export function formatDateTimeInputValue(value: string | null | undefined) {
  const parsed = parseAppDateTime(value);
  if (!parsed) {
    return "";
  }

  const parts = getZonedParts(parsed);
  const pad = (number: number) => String(number).padStart(2, "0");

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatDateTime(value: string | null | undefined) {
  const parsed = parseAppDateTime(value);
  if (!parsed) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE
  }).format(parsed);
}

export function hashIpForDisplay(value: string | null) {
  if (!value) {
    return "unknown";
  }

  return `${value.slice(0, 6)}...`;
}
