import type { TripRecord } from "./types";

export const API_BASE_URL = "https://burns-travel-planner.kyleburns626647.chatgpt.site";

export async function fetchTrips() {
  const response = await fetch(`${API_BASE_URL}/api/trips`);
  if (!response.ok) {
    throw new Error(`Trip fetch failed: ${response.status}`);
  }
  return (await response.json()) as { trips: TripRecord[] };
}

export async function saveTripPatch(
  tripId: string,
  patch: Partial<Pick<TripRecord, "notes" | "packed">>,
) {
  const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}`, {
    body: JSON.stringify(patch),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(`Trip save failed: ${response.status}`);
  }
}

export function mapUrlFor(target: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}
