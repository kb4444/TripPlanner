import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL, fetchTrips, mapUrlFor, saveTripPatch } from "./src/api";
import { readCachedTripState, writeCachedTripState } from "./src/storage";
import type { AgendaItem, ChecklistItem, DayPlan, Place, TripRecord } from "./src/types";

type TabKey = "today" | "itinerary" | "packing" | "places" | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "itinerary", label: "Plan" },
  { key: "packing", label: "Pack" },
  { key: "places", label: "Places" },
  { key: "notes", label: "Notes" },
];

export default function App() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTripId, setActiveTripId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("Loading trip...");
  const [lastSync, setLastSync] = useState("");

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) ?? trips[0] ?? null,
    [activeTripId, trips],
  );
  const days = activeTrip?.data.days ?? [];
  const activeDay = days[Math.min(activeDayIndex, Math.max(days.length - 1, 0))] ?? null;
  const packedCount = activeTrip
    ? activeTrip.data.checklist.filter((item) => activeTrip.packed?.[item.id]).length
    : 0;
  const packingTotal = activeTrip?.data.checklist.length ?? 0;
  const packingProgress = packingTotal ? Math.round((packedCount / packingTotal) * 100) : 0;

  const replaceTrip = useCallback((updatedTrip: TripRecord) => {
    setTrips((currentTrips) =>
      currentTrips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)),
    );
  }, []);

  const cacheTrips = useCallback(async (nextTrips: TripRecord[], nextActiveTripId: string) => {
    await writeCachedTripState({
      activeTripId: nextActiveTripId,
      cachedAt: new Date().toISOString(),
      trips: nextTrips,
    });
  }, []);

  const refreshTrips = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchTrips();
      const selected =
        payload.trips.find((trip) => trip.id === activeTripId) ??
        payload.trips.find((trip) => trip.id === "michigan-2026") ??
        payload.trips[0];
      setTrips(payload.trips);
      setActiveTripId(selected?.id ?? "");
      setNotesDraft(selected?.notes ?? "");
      setStatus("Online and synced");
      setLastSync(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      await cacheTrips(payload.trips, selected?.id ?? "");
    } catch {
      setStatus("Offline cache active");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTripId, cacheTrips]);

  useEffect(() => {
    let isMounted = true;
    async function boot() {
      const cached = await readCachedTripState();
      if (cached && isMounted) {
        setTrips(cached.trips);
        setActiveTripId(cached.activeTripId);
        const cachedTrip =
          cached.trips.find((trip) => trip.id === cached.activeTripId) ?? cached.trips[0];
        setNotesDraft(cachedTrip?.notes ?? "");
        setStatus("Loaded cached trip");
        setLastSync(new Date(cached.cachedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
        setLoading(false);
      }
      await refreshTrips();
    }
    void boot();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTrip) setNotesDraft(activeTrip.notes ?? "");
  }, [activeTrip?.id]);

  async function togglePacked(item: ChecklistItem) {
    if (!activeTrip) return;
    const packed = {
      ...(activeTrip.packed ?? {}),
      [item.id]: !activeTrip.packed?.[item.id],
    };
    const updatedTrip = { ...activeTrip, packed };
    replaceTrip(updatedTrip);
    await cacheTrips(
      trips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)),
      updatedTrip.id,
    );
    try {
      await saveTripPatch(activeTrip.id, { packed });
      setStatus("Packing saved");
    } catch {
      setStatus("Packing saved on phone");
    }
  }

  async function saveNotes() {
    if (!activeTrip) return;
    const updatedTrip = { ...activeTrip, notes: notesDraft };
    replaceTrip(updatedTrip);
    await cacheTrips(
      trips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)),
      updatedTrip.id,
    );
    try {
      await saveTripPatch(activeTrip.id, { notes: notesDraft });
      setStatus("Notes saved");
    } catch {
      setStatus("Notes saved on phone");
    }
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => Alert.alert("Could not open link", url));
  }

  if (loading && !activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.loadingScreen}>
          <Text style={styles.brand}>Burns Travel</Text>
          <ActivityIndicator color="#ec7357" />
          <Text style={styles.loadingText}>Loading your trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Family trip mode</Text>
          <Text style={styles.title}>{activeTrip?.title ?? "Burns Travel"}</Text>
          <Text style={styles.subtitle}>
            {activeTrip?.destination ?? "Trip"} · {activeTrip?.dateRange ?? "Dates"}
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressNumber}>{packingProgress}%</Text>
          <Text style={styles.progressLabel}>packed</Text>
        </View>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{status}</Text>
        <Text style={styles.statusText}>{lastSync ? `Updated ${lastSync}` : API_BASE_URL.replace("https://", "")}</Text>
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTrips} tintColor="#ec7357" />}
      >
        {!activeTrip ? (
          <EmptyState title="No trip found" body="Pull to refresh once the hosted planner is available." />
        ) : activeTab === "today" ? (
          <TodayScreen
            activeDay={activeDay}
            days={days}
            onOpenMap={openUrl}
            onSelectDay={setActiveDayIndex}
            selectedIndex={activeDayIndex}
          />
        ) : activeTab === "itinerary" ? (
          <ItineraryScreen days={days} onOpenMap={openUrl} />
        ) : activeTab === "packing" ? (
          <PackingScreen
            checklist={activeTrip.data.checklist}
            packed={activeTrip.packed ?? {}}
            onToggle={togglePacked}
          />
        ) : activeTab === "places" ? (
          <PlacesScreen onOpenUrl={openUrl} places={activeTrip.data.places} />
        ) : (
          <NotesScreen notesDraft={notesDraft} onChange={setNotesDraft} onSave={saveNotes} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TodayScreen({
  activeDay,
  days,
  onOpenMap,
  onSelectDay,
  selectedIndex,
}: {
  activeDay: DayPlan | null;
  days: DayPlan[];
  onOpenMap: (url: string) => void;
  onSelectDay: (index: number) => void;
  selectedIndex: number;
}) {
  if (!activeDay) return <EmptyState title="No itinerary yet" body="Add trip dates and day plans in the planner." />;

  return (
    <View style={styles.stack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPills}>
        {days.map((day, index) => (
          <Pressable
            key={day.date + day.title}
            onPress={() => onSelectDay(index)}
            style={[styles.dayPill, selectedIndex === index && styles.dayPillActive]}
          >
            <Text style={[styles.dayPillLabel, selectedIndex === index && styles.dayPillLabelActive]}>
              {day.label}
            </Text>
            <Text style={[styles.dayPillDate, selectedIndex === index && styles.dayPillDateActive]}>
              {day.date.replace(/^[^,]+,\s*/, "")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.heroCard}>
        <Text style={styles.cardEyebrow}>{activeDay.date}</Text>
        <Text style={styles.cardTitle}>{activeDay.title}</Text>
        <Text style={styles.cardBody}>{activeDay.mood}</Text>
      </View>

      <InfoCard title="Weather + gear" body={activeDay.weatherNeed} />
      <InfoCard title="Drive notes" body={activeDay.drive} />
      <AgendaList agenda={activeDay.agenda} onOpenMap={onOpenMap} />
    </View>
  );
}

function ItineraryScreen({ days, onOpenMap }: { days: DayPlan[]; onOpenMap: (url: string) => void }) {
  return (
    <View style={styles.stack}>
      {days.map((day) => (
        <View key={day.date + day.title} style={styles.card}>
          <Text style={styles.cardEyebrow}>{day.label} · {day.date}</Text>
          <Text style={styles.cardTitle}>{day.title}</Text>
          <Text style={styles.cardBody}>{day.mood}</Text>
          <AgendaList agenda={day.agenda} compact onOpenMap={onOpenMap} />
        </View>
      ))}
    </View>
  );
}

function AgendaList({
  agenda,
  compact,
  onOpenMap,
}: {
  agenda: AgendaItem[];
  compact?: boolean;
  onOpenMap: (url: string) => void;
}) {
  return (
    <View style={styles.stackSmall}>
      {agenda.map((item, index) => {
        const mapTarget = item.lat && item.lng ? `${item.lat},${item.lng}` : item.location || item.title;
        return (
          <View key={item.time + item.title + index} style={styles.timelineRow}>
            <View style={styles.timeRail}>
              <Text style={styles.timeText}>{item.time}</Text>
              <View style={styles.dot} />
            </View>
            <View style={styles.timelineCard}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDetail}>{item.detail}</Text>
              {!compact && (
                <Pressable onPress={() => onOpenMap(mapUrlFor(mapTarget))} style={styles.linkButton}>
                  <Text style={styles.linkText}>Open map</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PackingScreen({
  checklist,
  packed,
  onToggle,
}: {
  checklist: ChecklistItem[];
  packed: Record<string, boolean>;
  onToggle: (item: ChecklistItem) => void;
}) {
  const groups = [...new Set(checklist.map((item) => item.group || "General"))];
  return (
    <View style={styles.stack}>
      {groups.map((group) => {
        const items = checklist.filter((item) => (item.group || "General") === group);
        return (
          <View key={group} style={styles.card}>
            <Text style={styles.cardEyebrow}>{items.filter((item) => packed[item.id]).length} of {items.length} ready</Text>
            <Text style={styles.cardTitle}>{group}</Text>
            {items.map((item) => (
              <Pressable key={item.id} onPress={() => onToggle(item)} style={styles.checkRow}>
                <View style={[styles.checkbox, packed[item.id] && styles.checkboxChecked]}>
                  <Text style={styles.checkboxText}>{packed[item.id] ? "✓" : ""}</Text>
                </View>
                <View style={styles.checkCopy}>
                  <Text style={[styles.itemTitle, packed[item.id] && styles.itemDone]}>{item.label}</Text>
                  {item.note ? <Text style={styles.itemDetail}>{item.note}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function PlacesScreen({ onOpenUrl, places }: { onOpenUrl: (url: string) => void; places: Place[] }) {
  return (
    <View style={styles.stack}>
      {places.map((place, index) => {
        const mapUrl =
          place.mapUrl ||
          mapUrlFor([place.name, place.address].filter(Boolean).join(" "));
        const websiteUrl = place.website ? normalizeUrl(place.website) : "";
        return (
          <View key={place.name + index} style={styles.card}>
            <Text style={styles.cardEyebrow}>{place.status} · {place.type}</Text>
            <Text style={styles.cardTitle}>{place.name || "Untitled place"}</Text>
            {place.address ? <Text style={styles.address}>{place.address}</Text> : null}
            <Text style={styles.cardBody}>{place.note}</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={() => onOpenUrl(mapUrl)} style={styles.linkButton}>
                <Text style={styles.linkText}>Map</Text>
              </Pressable>
              {websiteUrl ? (
                <Pressable onPress={() => onOpenUrl(websiteUrl)} style={styles.linkButton}>
                  <Text style={styles.linkText}>Website</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NotesScreen({
  notesDraft,
  onChange,
  onSave,
}: {
  notesDraft: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>Trip notes</Text>
        <Text style={styles.cardTitle}>Keep the useful stuff here.</Text>
        <TextInput
          multiline
          onChangeText={onChange}
          placeholder="House details, confirmations, reminders, lessons learned..."
          placeholderTextColor="#8a9994"
          style={styles.notesInput}
          textAlignVertical="top"
          value={notesDraft}
        />
        <Pressable onPress={onSave} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save notes</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoCard({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const colors = {
  bg: "#eef4f1",
  card: "#fffaf2",
  coral: "#ec7357",
  dark: "#112b28",
  ink: "#1e2b27",
  line: "#d8e2dc",
  mint: "#dceee8",
  muted: "#65736f",
  teal: "#2c8a80",
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  address: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 8,
  },
  brand: {
    color: "white",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: "#eadfd0",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  cardEyebrow: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 8,
  },
  checkCopy: {
    flex: 1,
  },
  checkRow: {
    alignItems: "flex-start",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 13,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    marginTop: 1,
    width: 28,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkboxText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 42,
  },
  dayPill: {
    backgroundColor: "white",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayPillActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  dayPillDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  dayPillDateActive: {
    color: "#bdd8d1",
  },
  dayPillLabel: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 2,
  },
  dayPillLabelActive: {
    color: "white",
  },
  dayPills: {
    gap: 10,
    paddingRight: 16,
  },
  dot: {
    backgroundColor: colors.coral,
    borderRadius: 7,
    height: 14,
    marginTop: 8,
    width: 14,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 28,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.dark,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: 22,
    padding: 20,
  },
  itemDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  itemDone: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    marginBottom: 3,
  },
  kicker: {
    color: "#88bbb1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  linkButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  linkText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "900",
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colors.dark,
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: "#d9ebe7",
    fontSize: 15,
    marginTop: 14,
  },
  notesInput: {
    backgroundColor: "white",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 12,
    minHeight: 220,
    padding: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  progressBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    minWidth: 72,
    padding: 10,
  },
  progressLabel: {
    color: "#bdd8d1",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  progressNumber: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
  },
  safeArea: {
    backgroundColor: colors.dark,
    flex: 1,
  },
  stack: {
    gap: 14,
  },
  stackSmall: {
    gap: 10,
    marginTop: 10,
  },
  statusBar: {
    alignItems: "center",
    backgroundColor: "#183b36",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  statusText: {
    color: "#cfe4df",
    fontSize: 11,
    fontWeight: "700",
  },
  subtitle: {
    color: "#cfe4df",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 240,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.coral,
  },
  tabText: {
    color: "#bdd8d1",
    fontSize: 12,
    fontWeight: "900",
  },
  tabTextActive: {
    color: "white",
  },
  tabs: {
    backgroundColor: colors.dark,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  timeRail: {
    alignItems: "center",
    width: 82,
  },
  timeText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  timelineCard: {
    backgroundColor: "white",
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    maxWidth: 250,
  },
});
