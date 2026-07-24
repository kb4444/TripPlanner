import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CachedTripState } from "./types";

const CACHE_KEY = "burns-travel:trip-cache:v1";

export async function readCachedTripState() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as CachedTripState;
}

export async function writeCachedTripState(state: CachedTripState) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(state));
}
