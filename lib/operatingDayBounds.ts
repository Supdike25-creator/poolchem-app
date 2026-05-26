export const DEFAULT_OPERATING_TIME_ZONE = 'America/Los_Angeles';

const formatZonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
};

export const toOperatingDateInputValue = (date = new Date(), timeZone = DEFAULT_OPERATING_TIME_ZONE) => {
  const parts = formatZonedParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getOperatingDayBounds = (dateStr: string, timeZone = DEFAULT_OPERATING_TIME_ZONE) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const searchStart = Date.UTC(year, month - 1, day, 0, 0, 0) - 16 * 60 * 60 * 1000;
  const searchEnd = Date.UTC(year, month - 1, day, 23, 59, 59) + 16 * 60 * 60 * 1000;

  let start: Date | null = null;
  let end: Date | null = null;

  for (let timestamp = searchStart; timestamp <= searchEnd; timestamp += 60_000) {
    const current = new Date(timestamp);
    const parts = formatZonedParts(current, timeZone);
    const currentDate = `${parts.year}-${parts.month}-${parts.day}`;

    if (currentDate === dateStr && parts.hour === '00' && parts.minute === '00' && !start) {
      start = current;
    }

    if (start && currentDate !== dateStr) {
      end = current;
      break;
    }
  }

  if (!start) {
    throw new Error(`Unable to resolve day bounds for ${dateStr} in ${timeZone}`);
  }

  if (!end) {
    end = new Date(searchEnd);
  }

  return { start, end };
};

export const getOperatingHour = (value: string | Date, timeZone = DEFAULT_OPERATING_TIME_ZONE) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number(formatZonedParts(date, timeZone).hour);
};

export const formatOperatingTime = (value: string | Date, timeZone = DEFAULT_OPERATING_TIME_ZONE) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const getOperatingHourLabel = (hour: number) => {
  const date = new Date(Date.UTC(2026, 0, 1, hour, 0, 0));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
};

export const getOperatingHourSlots = () => Array.from({ length: 12 }, (_, index) => 9 + index);
