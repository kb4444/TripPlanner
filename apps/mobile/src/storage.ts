import type { CachedTripState } from "./types";

let cachedTripState: CachedTripState | null = null;

export async function readCachedTripState() {
  return cachedTripState;
}

export async function writeCachedTripState(state: CachedTripState) {
  cachedTripState = state;
}
