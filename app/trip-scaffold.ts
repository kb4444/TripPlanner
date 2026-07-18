export const starterTripTemplate = [
  "Overview: destination, dates, travelers, home base, and trip mood",
  "Travel days: departure windows, must-stop towns, scenic vs. fastest route",
  "Daily plans: anchor activity, backup option, weather gear, food plan",
  "Packing: house, beach, park, health, food, car, kid-specific gear",
  "Places: confirmed, maybe, food, rain plans, quick-drive options",
  "Notes: loose ideas, questions, reminders, and post-trip lessons",
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthLookup = new Map(
  monthNames.flatMap((month, index) => [
    [month.toLowerCase(), index],
    [month.slice(0, 3).toLowerCase(), index],
  ]),
);

type ParsedTripDate = {
  month: number;
  day: number;
  year?: number;
};

function parseLooseTripDate(value: string, fallbackMonth?: number): ParsedTripDate | null {
  const clean = value.trim();
  const isoMatch = clean.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
    };
  }

  const namedMatch = clean.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
  );
  if (namedMatch) {
    const month = monthLookup.get(namedMatch[1].slice(0, 3).toLowerCase());
    if (month === undefined) return null;
    return {
      month,
      day: Number(namedMatch[2]),
      year: namedMatch[3] ? Number(namedMatch[3]) : undefined,
    };
  }

  const numericMatch = clean.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numericMatch) {
    const year = numericMatch[3]
      ? Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3])
      : undefined;
    return {
      month: Number(numericMatch[1]) - 1,
      day: Number(numericMatch[2]),
      year,
    };
  }

  const dayOnlyMatch = clean.match(/^\d{1,2}$/);
  if (dayOnlyMatch && fallbackMonth !== undefined) {
    return {
      month: fallbackMonth,
      day: Number(dayOnlyMatch[0]),
    };
  }

  return null;
}

function formatItineraryDate(date: Date, includeYear: boolean) {
  const month = monthNames[date.getMonth()].slice(0, 3);
  const day = date.getDate();
  return includeYear ? `${month} ${day}, ${date.getFullYear()}` : `${month} ${day}`;
}

export function createItineraryDaysFromDateRange(dateRange: string) {
  const clean = dateRange.replace(/\s+/g, " ").trim();
  if (!clean || /tbd/i.test(clean)) return [];

  const rangeParts = clean.includes(" - ")
    ? clean.split(/\s+-\s+/)
    : clean.split(/\s*(?:-|–|—|\bto\b)\s*/i);
  const start = parseLooseTripDate(rangeParts[0] ?? "");
  if (!start) return [];

  const end = parseLooseTripDate(rangeParts[1] ?? rangeParts[0] ?? "", start.month) ?? start;
  const startYear = start.year ?? end.year ?? new Date().getFullYear();
  const endYear = end.year ?? startYear;
  const startDate = new Date(startYear, start.month, start.day);
  const endDate = new Date(endYear, end.month, end.day);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
  if (endDate < startDate) {
    endDate.setFullYear(startDate.getFullYear() + 1);
  }

  const totalDays = Math.min(
    21,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
  );
  if (totalDays < 1) return [];

  const includeYear = Boolean(start.year || end.year);
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date: formatItineraryDate(date, includeYear),
      label: `Day ${index + 1}`,
      title:
        index === 0
          ? "Arrival / travel day"
          : index === totalDays - 1
            ? "Departure / travel day"
            : "Plan the day",
      mood: "Add the plan, timing, and notes for this day.",
      drive: "",
      showMap: false,
      weatherNeed: "Add weather and conditions notes.",
      agenda: [],
      bring: [],
      decisions: [],
    };
  });
}
