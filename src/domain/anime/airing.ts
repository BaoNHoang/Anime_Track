import type { Anime } from "./types";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return {
    weekday: value("weekday")?.toLowerCase(),
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second"))
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = getTimeZoneOffset(new Date(wallClockUtc), timeZone);
  const firstPass = new Date(wallClockUtc - firstOffset);
  const correctedOffset = getTimeZoneOffset(firstPass, timeZone);
  return new Date(wallClockUtc - correctedOffset);
}

export function getNextAiringAt(
  anime: Anime,
  now = new Date()
): Date | undefined {
  const { broadcast } = anime;
  if (
    anime.status !== "Currently Airing" ||
    !broadcast?.day ||
    !broadcast.time ||
    !broadcast.timezone
  ) {
    return undefined;
  }

  const targetDay =
    DAY_INDEX[broadcast.day.replace(/s$/i, "").toLowerCase()];
  const [hour, minute] = broadcast.time.split(":").map(Number);
  if (
    targetDay === undefined ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return undefined;
  }

  try {
    const current = getZonedParts(now, broadcast.timezone);
    const currentDay = current.weekday
      ? DAY_INDEX[current.weekday]
      : undefined;
    if (currentDay === undefined) return undefined;

    let dayOffset = (targetDay - currentDay + 7) % 7;
    const localDate = new Date(
      Date.UTC(current.year, current.month - 1, current.day + dayOffset)
    );
    let candidate = zonedDateTimeToUtc(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth() + 1,
      localDate.getUTCDate(),
      hour,
      minute,
      broadcast.timezone
    );

    if (candidate.getTime() <= now.getTime()) {
      dayOffset += 7;
      const nextWeek = new Date(
        Date.UTC(current.year, current.month - 1, current.day + dayOffset)
      );
      candidate = zonedDateTimeToUtc(
        nextWeek.getUTCFullYear(),
        nextWeek.getUTCMonth() + 1,
        nextWeek.getUTCDate(),
        hour,
        minute,
        broadcast.timezone
      );
    }

    return candidate;
  } catch {
    return undefined;
  }
}

export function formatNextAiring(
  anime: Anime,
  now = new Date()
): string | undefined {
  const next = getNextAiringAt(anime, now);
  if (!next) return undefined;

  const relative = formatAiringRelative(anime, now);
  const absolute = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(next);

  return `${absolute} - ${relative}`;
}

export function formatAiringRelative(
  anime: Anime,
  now = new Date()
): string | undefined {
  const next = getNextAiringAt(anime, now);
  if (!next) return undefined;

  const difference = next.getTime() - now.getTime();
  const hours = Math.max(1, Math.round(difference / (60 * 60 * 1000)));
  if (hours < 24) {
    return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
