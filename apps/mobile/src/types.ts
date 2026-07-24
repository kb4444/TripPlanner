export type AgendaItem = {
  time: string;
  title: string;
  detail: string;
  location?: string;
  lat?: string;
  lng?: string;
};

export type DayPlan = {
  date: string;
  label: string;
  title: string;
  mood: string;
  drive: string;
  weatherNeed: string;
  agenda: AgendaItem[];
  bring: string[];
  decisions: string[];
};

export type ChecklistItem = {
  id: string;
  label: string;
  group: string;
  note?: string;
};

export type Place = {
  name: string;
  type: string;
  note: string;
  status: string;
  address?: string;
  mapUrl?: string;
  website?: string;
  imageUrl?: string;
};

export type TripData = {
  days: DayPlan[];
  checklist: ChecklistItem[];
  packingGroups?: string[];
  places: Place[];
  tripTemplate: string[];
};

export type TripRecord = {
  id: string;
  title: string;
  destination: string;
  dateRange: string;
  status: string;
  summary: string;
  notes: string;
  packed: Record<string, boolean>;
  data: TripData;
  updatedAt: string;
};

export type CachedTripState = {
  activeTripId: string;
  cachedAt: string;
  trips: TripRecord[];
};
