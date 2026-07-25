import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL, fetchTrips, mapUrlFor, mapUrlForCoordinate, saveTripPatch } from "./src/api";
import { readCachedTripState, writeCachedTripState } from "./src/storage";
import type { AgendaItem, ChecklistItem, DayPlan, Place, TripRecord } from "./src/types";

type TabKey = "today" | "itinerary" | "packing" | "places" | "menu";

const tabs: { key: TabKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "itinerary", label: "Plan" },
  { key: "packing", label: "Pack" },
  { key: "places", label: "Places" },
  { key: "menu", label: "Menu" },
];

const APP_VERSION = "0.1.7";

export default function App() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTripId, setActiveTripId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(true);
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

  async function saveUpdatedTrip(updatedTrip: TripRecord, onlineStatus: string, offlineStatus: string) {
    replaceTrip(updatedTrip);
    const nextTrips = trips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip));
    await cacheTrips(nextTrips, updatedTrip.id);
    try {
      await saveTripPatch(updatedTrip.id, {
        data: updatedTrip.data,
        packed: updatedTrip.packed,
      });
      setStatus(onlineStatus);
      setLastSync(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch {
      setStatus(offlineStatus);
    }
  }

  async function saveTripData(data: TripRecord["data"], onlineStatus: string, offlineStatus: string) {
    if (!activeTrip) return;
    await saveUpdatedTrip({ ...activeTrip, data }, onlineStatus, offlineStatus);
  }

  async function addPackingItem(item: Omit<ChecklistItem, "id">) {
    if (!activeTrip) return;
    const label = item.label.replace(/\s+/g, " ").trim();
    if (!label) return;
    const nextItem: ChecklistItem = {
      id: uniqueChecklistId(activeTrip.data.checklist, `${item.group}-${label}`),
      label,
      group: item.group.replace(/\s+/g, " ").trim() || "General",
      note: item.note?.replace(/\s+/g, " ").trim() || undefined,
    };
    await saveTripData(
      {
        ...activeTrip.data,
        checklist: [...activeTrip.data.checklist, nextItem],
        packingGroups: uniqueStrings([...(activeTrip.data.packingGroups ?? []), nextItem.group]),
      },
      "Packing item added",
      "Packing item saved on phone",
    );
  }

  async function updatePackingItem(itemId: string, patch: Partial<ChecklistItem>) {
    if (!activeTrip) return;
    const nextChecklist = activeTrip.data.checklist.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
            label: patch.label?.replace(/\s+/g, " ").trim() || item.label,
            group: patch.group?.replace(/\s+/g, " ").trim() || item.group || "General",
            note: patch.note?.replace(/\s+/g, " ").trim() || undefined,
          }
        : item,
    );
    await saveTripData(
      {
        ...activeTrip.data,
        checklist: nextChecklist,
        packingGroups: uniqueStrings(nextChecklist.map((item) => item.group || "General")),
      },
      "Packing item updated",
      "Packing item saved on phone",
    );
  }

  async function deletePackingItem(itemId: string) {
    if (!activeTrip) return;
    const nextChecklist = activeTrip.data.checklist.filter((item) => item.id !== itemId);
    const nextPacked = { ...(activeTrip.packed ?? {}) };
    delete nextPacked[itemId];
    await saveUpdatedTrip(
      {
        ...activeTrip,
        packed: nextPacked,
        data: {
          ...activeTrip.data,
          checklist: nextChecklist,
          packingGroups: uniqueStrings(nextChecklist.map((item) => item.group || "General")),
        },
      },
      "Packing item removed",
      "Packing change saved on phone",
    );
  }

  async function addPackingGroup(groupName: string) {
    if (!activeTrip) return;
    const group = groupName.replace(/\s+/g, " ").trim();
    if (!group) return;
    await saveTripData(
      {
        ...activeTrip.data,
        packingGroups: uniqueStrings([
          ...(activeTrip.data.packingGroups ?? []),
          ...activeTrip.data.checklist.map((item) => item.group || "General"),
          group,
        ]),
      },
      "Packing section added",
      "Packing section saved on phone",
    );
  }

  async function addItineraryStop(dayIndex: number, item: AgendaItem) {
    if (!activeTrip) return;
    const nextDays = activeTrip.data.days.map((day, index) =>
      index === dayIndex ? { ...day, agenda: [...day.agenda, cleanAgendaItem(item)] } : day,
    );
    await saveTripData({ ...activeTrip.data, days: nextDays }, "Stop added", "Stop saved on phone");
  }

  async function updateItineraryStop(dayIndex: number, itemIndex: number, item: AgendaItem) {
    if (!activeTrip) return;
    const nextDays = activeTrip.data.days.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            agenda: day.agenda.map((agendaItem, agendaIndex) =>
              agendaIndex === itemIndex ? cleanAgendaItem(item) : agendaItem,
            ),
          }
        : day,
    );
    await saveTripData({ ...activeTrip.data, days: nextDays }, "Stop updated", "Stop saved on phone");
  }

  async function deleteItineraryStop(dayIndex: number, itemIndex: number) {
    if (!activeTrip) return;
    const nextDays = activeTrip.data.days.map((day, index) =>
      index === dayIndex
        ? { ...day, agenda: day.agenda.filter((_item, agendaIndex) => agendaIndex !== itemIndex) }
        : day,
    );
    await saveTripData({ ...activeTrip.data, days: nextDays }, "Stop removed", "Stop change saved on phone");
  }

  async function addPlace(place: Place) {
    if (!activeTrip) return;
    const cleanPlace = cleanPlaceDraft(place);
    if (!cleanPlace.name) return;
    await saveTripData(
      { ...activeTrip.data, places: [...activeTrip.data.places, cleanPlace] },
      "Place added",
      "Place saved on phone",
    );
  }

  async function updatePlace(index: number, place: Place) {
    if (!activeTrip) return;
    const cleanPlace = cleanPlaceDraft(place);
    if (!cleanPlace.name) return;
    await saveTripData(
      {
        ...activeTrip.data,
        places: activeTrip.data.places.map((existingPlace, placeIndex) =>
          placeIndex === index ? cleanPlace : existingPlace,
        ),
      },
      "Place updated",
      "Place saved on phone",
    );
  }

  async function deletePlace(index: number) {
    if (!activeTrip) return;
    await saveTripData(
      {
        ...activeTrip.data,
        places: activeTrip.data.places.filter((_place, placeIndex) => placeIndex !== index),
      },
      "Place removed",
      "Place change saved on phone",
    );
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

  async function selectTrip(tripId: string) {
    const selectedTrip = trips.find((trip) => trip.id === tripId);
    setActiveTripId(tripId);
    setActiveDayIndex(0);
    setActiveTab("today");
    setNotesDraft(selectedTrip?.notes ?? "");
    await cacheTrips(trips, tripId);
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => Alert.alert("Could not open link", url));
  }

  if (loading && !activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
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

      <ScrollView
        contentContainerStyle={styles.content}
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
          <ItineraryScreen
            days={days}
            onAddStop={addItineraryStop}
            onDeleteStop={deleteItineraryStop}
            onOpenMap={openUrl}
            onUpdateStop={updateItineraryStop}
          />
        ) : activeTab === "packing" ? (
          <PackingScreen
            checklist={activeTrip.data.checklist}
            onAddItem={addPackingItem}
            onAddGroup={addPackingGroup}
            onDeleteItem={deletePackingItem}
            onUpdateItem={updatePackingItem}
            packingGroups={activeTrip.data.packingGroups ?? []}
            packed={activeTrip.packed ?? {}}
            onToggle={togglePacked}
          />
        ) : activeTab === "places" ? (
          <PlacesScreen
            onAddPlace={addPlace}
            onDeletePlace={deletePlace}
            onOpenUrl={openUrl}
            onUpdatePlace={updatePlace}
            places={activeTrip.data.places}
          />
        ) : (
          <MenuScreen
            activeTripId={activeTrip.id}
            appVersion={APP_VERSION}
            lastSync={lastSync}
            notesDraft={notesDraft}
            onChangeNotes={setNotesDraft}
            onOpenPlanner={() => openUrl(API_BASE_URL)}
            onRefresh={refreshTrips}
            onSaveNotes={saveNotes}
            onSelectTrip={selectTrip}
            packingProgress={packingProgress}
            status={status}
            trips={trips}
          />
        )}
      </ScrollView>

      <View style={styles.bottomTabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.bottomTabButton, activeTab === tab.key && styles.bottomTabButtonActive]}
          >
            <TabIcon active={activeTab === tab.key} name={tab.key} />
            <Text style={[styles.bottomTabText, activeTab === tab.key && styles.bottomTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function TabIcon({ active, name }: { active: boolean; name: TabKey }) {
  const tone = active ? colors.coral : "#a9ccc5";

  if (name === "today") {
    return (
      <View style={[styles.iconCalendar, { borderColor: tone }]}>
        <View style={[styles.iconCalendarTop, { backgroundColor: tone }]} />
        <View style={styles.iconCalendarDots}>
          <View style={[styles.iconDotTiny, { backgroundColor: tone }]} />
          <View style={[styles.iconDotTiny, { backgroundColor: tone }]} />
        </View>
      </View>
    );
  }

  if (name === "itinerary") {
    return (
      <View style={styles.iconRoute}>
        <View style={[styles.iconRouteDot, { borderColor: tone }]} />
        <View style={[styles.iconRouteLine, { backgroundColor: tone }]} />
        <View style={[styles.iconRouteLineShort, { backgroundColor: tone }]} />
        <View style={[styles.iconRouteDotEnd, { borderColor: tone }]} />
      </View>
    );
  }

  if (name === "packing") {
    return (
      <View style={[styles.iconBag, { borderColor: tone }]}>
        <View style={[styles.iconBagHandle, { borderColor: tone }]} />
      </View>
    );
  }

  if (name === "places") {
    return (
      <View style={styles.iconPin}>
        <View style={[styles.iconPinHead, { borderColor: tone }]} />
        <View style={[styles.iconPinStem, { backgroundColor: tone }]} />
      </View>
    );
  }

  return (
    <View style={styles.iconMenu}>
      <View style={[styles.iconMenuDot, { backgroundColor: tone }]} />
      <View style={[styles.iconMenuDot, { backgroundColor: tone }]} />
      <View style={[styles.iconMenuDot, { backgroundColor: tone }]} />
    </View>
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
        <Text style={styles.heroCardTitle}>{activeDay.title}</Text>
        <Text style={styles.heroCardBody}>{activeDay.mood}</Text>
      </View>

      <InfoCard title="Weather + gear" body={activeDay.weatherNeed} />
      <InfoCard title="Drive notes" body={activeDay.drive} />
      <AgendaList agenda={activeDay.agenda} onOpenMap={onOpenMap} />
    </View>
  );
}

function ItineraryScreen({
  days,
  onAddStop,
  onDeleteStop,
  onOpenMap,
  onUpdateStop,
}: {
  days: DayPlan[];
  onAddStop: (dayIndex: number, item: AgendaItem) => void;
  onDeleteStop: (dayIndex: number, itemIndex: number) => void;
  onOpenMap: (url: string) => void;
  onUpdateStop: (dayIndex: number, itemIndex: number, item: AgendaItem) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, AgendaItem>>({});
  const [editingKey, setEditingKey] = useState("");
  const [editingDraft, setEditingDraft] = useState<AgendaItem>(emptyAgendaItem());

  function draftFor(dayIndex: number) {
    return drafts[dayIndex] ?? emptyAgendaItem();
  }

  function updateDraft(dayIndex: number, patch: Partial<AgendaItem>) {
    setDrafts((current) => ({
      ...current,
      [dayIndex]: { ...draftFor(dayIndex), ...patch },
    }));
  }

  return (
    <View style={styles.stack}>
      {days.map((day, dayIndex) => (
        <View key={day.date + day.title} style={styles.card}>
          <Text style={styles.cardEyebrow}>{day.label} · {day.date}</Text>
          <Text style={styles.cardTitle}>{day.title}</Text>
          <Text style={styles.cardBody}>{day.mood}</Text>
          <View style={styles.stackSmall}>
            {day.agenda.map((item, itemIndex) => {
              const key = `${dayIndex}-${itemIndex}`;
              const isEditing = editingKey === key;
              return (
                <View key={key + item.title} style={styles.editableBlock}>
                  {isEditing ? (
                    <AgendaEditor
                      draft={editingDraft}
                      onCancel={() => setEditingKey("")}
                      onChange={(patch) => setEditingDraft((current) => ({ ...current, ...patch }))}
                      onSave={() => {
                        onUpdateStop(dayIndex, itemIndex, editingDraft);
                        setEditingKey("");
                      }}
                    />
                  ) : (
                    <View>
                      <View style={styles.itemHeaderRow}>
                        <View style={styles.checkCopy}>
                          <Text style={styles.itemTitle}>{item.time || "Time"}</Text>
                          <Text style={styles.cardBody}>{item.title}</Text>
                          {item.detail ? <Text style={styles.itemDetail}>{item.detail}</Text> : null}
                          {item.location ? <Text style={styles.address}>{item.location}</Text> : null}
                        </View>
                      </View>
                      <View style={styles.actionRow}>
                        {mapUrlForAgendaItem(item) ? (
                          <Pressable onPress={() => onOpenMap(mapUrlForAgendaItem(item))} style={styles.linkButton}>
                            <Text style={styles.linkText}>Map</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => {
                            setEditingKey(key);
                            setEditingDraft(item);
                          }}
                          style={styles.linkButton}
                        >
                          <Text style={styles.linkText}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => onDeleteStop(dayIndex, itemIndex)} style={styles.dangerButton}>
                          <Text style={styles.dangerText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.formBlock}>
            <Text style={styles.cardEyebrow}>Add stop</Text>
            <AgendaEditor
              draft={draftFor(dayIndex)}
              onChange={(patch) => updateDraft(dayIndex, patch)}
              onSave={() => {
                const nextDraft = draftFor(dayIndex);
                onAddStop(dayIndex, nextDraft);
                setDrafts((current) => ({ ...current, [dayIndex]: emptyAgendaItem() }));
              }}
              saveLabel="Add stop"
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function AgendaEditor({
  draft,
  onCancel,
  onChange,
  onSave,
  saveLabel = "Save stop",
}: {
  draft: AgendaItem;
  onCancel?: () => void;
  onChange: (patch: Partial<AgendaItem>) => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <View style={styles.stackTiny}>
      <TextInput
        onChangeText={(value) => onChange({ time: value })}
        placeholder="Time"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.time}
      />
      <TextInput
        onChangeText={(value) => onChange({ title: value })}
        placeholder="Stop name"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.title}
      />
      <TextInput
        multiline
        onChangeText={(value) => onChange({ detail: value })}
        placeholder="Notes"
        placeholderTextColor="#8a9994"
        style={[styles.input, styles.smallTextArea]}
        textAlignVertical="top"
        value={draft.detail}
      />
      <TextInput
        onChangeText={(value) => onChange({ location: value })}
        placeholder="Address, place name, or map location"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.location ?? ""}
      />
      <View style={styles.twoColumn}>
        <TextInput
          keyboardType="numbers-and-punctuation"
          onChangeText={(value) => onChange({ lat: value })}
          placeholder="Latitude"
          placeholderTextColor="#8a9994"
          style={[styles.input, styles.flexInput]}
          value={draft.lat ?? ""}
        />
        <TextInput
          keyboardType="numbers-and-punctuation"
          onChangeText={(value) => onChange({ lng: value })}
          placeholder="Longitude"
          placeholderTextColor="#8a9994"
          style={[styles.input, styles.flexInput]}
          value={draft.lng ?? ""}
        />
      </View>
      <View style={styles.actionRow}>
        <Pressable disabled={!draft.title.trim()} onPress={onSave} style={styles.primaryInlineButton}>
          <Text style={styles.primaryInlineButtonText}>{saveLabel}</Text>
        </Pressable>
        {onCancel ? (
          <Pressable onPress={onCancel} style={styles.linkButton}>
            <Text style={styles.linkText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
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
        const mapUrl = mapUrlForAgendaItem(item);
        return (
          <View key={item.time + item.title + index} style={styles.timelineRow}>
            <View style={styles.timeRail}>
              <Text style={styles.timeText}>{item.time}</Text>
              <View style={styles.dot} />
            </View>
            <View style={styles.timelineCard}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDetail}>{item.detail}</Text>
              {!compact && mapUrl ? (
                <Pressable onPress={() => onOpenMap(mapUrl)} style={styles.linkButton}>
                  <Text style={styles.linkText}>Open map</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PackingScreen({
  checklist,
  onAddGroup,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  packingGroups,
  packed,
  onToggle,
}: {
  checklist: ChecklistItem[];
  onAddGroup: (groupName: string) => void;
  onAddItem: (item: Omit<ChecklistItem, "id">) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<ChecklistItem>) => void;
  packingGroups: string[];
  packed: Record<string, boolean>;
  onToggle: (item: ChecklistItem) => void;
}) {
  const groups = uniqueStrings([...packingGroups, ...checklist.map((item) => item.group || "General")]);
  const [drafts, setDrafts] = useState<Record<string, { label: string; note: string }>>({});
  const [newGroupName, setNewGroupName] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [editingDraft, setEditingDraft] = useState({ label: "", group: "", note: "" });

  function draftFor(group: string) {
    return drafts[group] ?? { label: "", note: "" };
  }

  function updateDraft(group: string, patch: Partial<{ label: string; note: string }>) {
    setDrafts((current) => ({
      ...current,
      [group]: { ...draftFor(group), ...patch },
    }));
  }

  return (
    <View style={styles.stack}>
      {groups.map((group) => {
        const items = checklist.filter((item) => (item.group || "General") === group);
        const groupDraft = draftFor(group);
        return (
          <View key={group} style={styles.card}>
            <Text style={styles.cardEyebrow}>{items.filter((item) => packed[item.id]).length} of {items.length} ready</Text>
            <Text style={styles.cardTitle}>{group}</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.editableBlock}>
                {editingItemId === item.id ? (
                  <View style={styles.stackTiny}>
                    <TextInput
                      onChangeText={(value) => setEditingDraft((current) => ({ ...current, label: value }))}
                      placeholder="Item name"
                      placeholderTextColor="#8a9994"
                      style={styles.input}
                      value={editingDraft.label}
                    />
                    <TextInput
                      onChangeText={(value) => setEditingDraft((current) => ({ ...current, note: value }))}
                      placeholder="Note"
                      placeholderTextColor="#8a9994"
                      style={styles.input}
                      value={editingDraft.note}
                    />
                    <TextInput
                      onChangeText={(value) => setEditingDraft((current) => ({ ...current, group: value }))}
                      placeholder="Section"
                      placeholderTextColor="#8a9994"
                      style={styles.input}
                      value={editingDraft.group}
                    />
                    <View style={styles.actionRow}>
                      <Pressable
                        disabled={!editingDraft.label.trim()}
                        onPress={() => {
                          onUpdateItem(item.id, editingDraft);
                          setEditingItemId("");
                        }}
                        style={styles.primaryInlineButton}
                      >
                        <Text style={styles.primaryInlineButtonText}>Save item</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingItemId("")} style={styles.linkButton}>
                        <Text style={styles.linkText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.checkRow}>
                      <Pressable onPress={() => onToggle(item)} style={[styles.checkbox, packed[item.id] && styles.checkboxChecked]}>
                        <Text style={styles.checkboxText}>{packed[item.id] ? "✓" : ""}</Text>
                      </Pressable>
                      <View style={styles.checkCopy}>
                        <Text style={[styles.itemTitle, packed[item.id] && styles.itemDone]}>{item.label}</Text>
                        {item.note ? <Text style={styles.itemDetail}>{item.note}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => {
                          setEditingItemId(item.id);
                          setEditingDraft({
                            label: item.label,
                            group: item.group || "General",
                            note: item.note ?? "",
                          });
                        }}
                        style={styles.linkButton}
                      >
                        <Text style={styles.linkText}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => onDeleteItem(item.id)} style={styles.dangerButton}>
                        <Text style={styles.dangerText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
            <View style={styles.formBlock}>
              <Text style={styles.cardEyebrow}>Quick add</Text>
              <TextInput
                onChangeText={(value) => updateDraft(group, { label: value })}
                placeholder={`Add item to ${group}`}
                placeholderTextColor="#8a9994"
                style={styles.input}
                value={groupDraft.label}
              />
              <TextInput
                onChangeText={(value) => updateDraft(group, { note: value })}
                placeholder="Note"
                placeholderTextColor="#8a9994"
                style={styles.input}
                value={groupDraft.note}
              />
              <Pressable
                disabled={!groupDraft.label.trim()}
                onPress={() => {
                  onAddItem({ group, label: groupDraft.label, note: groupDraft.note });
                  setDrafts((current) => ({ ...current, [group]: { label: "", note: "" } }));
                }}
                style={styles.primaryInlineButton}
              >
                <Text style={styles.primaryInlineButtonText}>Add item</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>New section</Text>
        <Text style={styles.cardTitle}>Start another packing list.</Text>
        <TextInput
          onChangeText={setNewGroupName}
          placeholder="Section name"
          placeholderTextColor="#8a9994"
          style={styles.input}
          value={newGroupName}
        />
        <Pressable
          disabled={!newGroupName.trim()}
          onPress={() => {
            const group = newGroupName.replace(/\s+/g, " ").trim();
            onAddGroup(group);
            setEditingItemId("");
            setNewGroupName("");
          }}
          style={styles.primaryInlineButton}
        >
          <Text style={styles.primaryInlineButtonText}>Add section</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlacesScreen({
  onAddPlace,
  onDeletePlace,
  onOpenUrl,
  onUpdatePlace,
  places,
}: {
  onAddPlace: (place: Place) => void;
  onDeletePlace: (index: number) => void;
  onOpenUrl: (url: string) => void;
  onUpdatePlace: (index: number, place: Place) => void;
  places: Place[];
}) {
  const [newPlaceDraft, setNewPlaceDraft] = useState<Place>(emptyPlace());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Place>(emptyPlace());

  return (
    <View style={styles.stack}>
      {places.map((place, index) => {
        const mapUrl =
          place.mapUrl ||
          mapUrlFor([place.name, place.address].filter(Boolean).join(" "));
        const websiteUrl = place.website ? normalizeUrl(place.website) : "";
        return (
          <View key={place.name + index} style={styles.card}>
            {editingIndex === index ? (
              <PlaceEditor
                draft={editingDraft}
                onCancel={() => setEditingIndex(null)}
                onChange={(patch) => setEditingDraft((current) => ({ ...current, ...patch }))}
                onSave={() => {
                  onUpdatePlace(index, editingDraft);
                  setEditingIndex(null);
                }}
              />
            ) : (
              <View>
                <Text style={styles.cardEyebrow}>{place.status || "Saved"} · {place.type || "Place"}</Text>
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
                  <Pressable
                    onPress={() => {
                      setEditingIndex(index);
                      setEditingDraft(place);
                    }}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => onDeletePlace(index)} style={styles.dangerButton}>
                    <Text style={styles.dangerText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>New place</Text>
        <Text style={styles.cardTitle}>Add somewhere to remember.</Text>
        <PlaceEditor
          draft={newPlaceDraft}
          onChange={(patch) => setNewPlaceDraft((current) => ({ ...current, ...patch }))}
          onSave={() => {
            onAddPlace(newPlaceDraft);
            setNewPlaceDraft(emptyPlace());
          }}
          saveLabel="Add place"
        />
      </View>
    </View>
  );
}

function PlaceEditor({
  draft,
  onCancel,
  onChange,
  onSave,
  saveLabel = "Save place",
}: {
  draft: Place;
  onCancel?: () => void;
  onChange: (patch: Partial<Place>) => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <View style={styles.stackTiny}>
      <TextInput
        onChangeText={(value) => onChange({ name: value })}
        placeholder="Place name"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.name}
      />
      <View style={styles.twoColumn}>
        <TextInput
          onChangeText={(value) => onChange({ status: value })}
          placeholder="Status"
          placeholderTextColor="#8a9994"
          style={[styles.input, styles.flexInput]}
          value={draft.status}
        />
        <TextInput
          onChangeText={(value) => onChange({ type: value })}
          placeholder="Category"
          placeholderTextColor="#8a9994"
          style={[styles.input, styles.flexInput]}
          value={draft.type}
        />
      </View>
      <TextInput
        onChangeText={(value) => onChange({ address: value })}
        placeholder="Street address or searchable map location"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.address ?? ""}
      />
      <TextInput
        onChangeText={(value) => onChange({ mapUrl: value })}
        placeholder="Maps link"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.mapUrl ?? ""}
      />
      <TextInput
        onChangeText={(value) => onChange({ website: value })}
        placeholder="Website"
        placeholderTextColor="#8a9994"
        style={styles.input}
        value={draft.website ?? ""}
      />
      <TextInput
        multiline
        onChangeText={(value) => onChange({ note: value })}
        placeholder="Notes"
        placeholderTextColor="#8a9994"
        style={[styles.input, styles.smallTextArea]}
        textAlignVertical="top"
        value={draft.note}
      />
      <View style={styles.actionRow}>
        <Pressable disabled={!draft.name.trim()} onPress={onSave} style={styles.primaryInlineButton}>
          <Text style={styles.primaryInlineButtonText}>{saveLabel}</Text>
        </Pressable>
        {onCancel ? (
          <Pressable onPress={onCancel} style={styles.linkButton}>
            <Text style={styles.linkText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function MenuScreen({
  activeTripId,
  appVersion,
  lastSync,
  notesDraft,
  onChangeNotes,
  onOpenPlanner,
  onRefresh,
  onSaveNotes,
  onSelectTrip,
  packingProgress,
  status,
  trips,
}: {
  activeTripId: string;
  appVersion: string;
  lastSync: string;
  notesDraft: string;
  onChangeNotes: (value: string) => void;
  onOpenPlanner: () => void;
  onRefresh: () => Promise<void>;
  onSaveNotes: () => void;
  onSelectTrip: (tripId: string) => void;
  packingProgress: number;
  status: string;
  trips: TripRecord[];
}) {
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? trips[0] ?? null;

  return (
    <View style={styles.stack}>
      <View style={styles.menuHero}>
        <Text style={styles.cardEyebrow}>Current trip</Text>
        <Text style={styles.menuHeroTitle}>{activeTrip?.title ?? "No active trip"}</Text>
        <Text style={styles.menuHeroBody}>
          {activeTrip?.destination ?? "Open the web planner to create a trip."}
          {activeTrip?.dateRange ? ` · ${activeTrip.dateRange}` : ""}
        </Text>
        <View style={styles.menuStatsRow}>
          <View style={styles.menuStat}>
            <Text style={styles.menuStatValue}>{trips.length}</Text>
            <Text style={styles.menuStatLabel}>trips</Text>
          </View>
          <View style={styles.menuStat}>
            <Text style={styles.menuStatValue}>{packingProgress}%</Text>
            <Text style={styles.menuStatLabel}>packed</Text>
          </View>
          <View style={styles.menuStat}>
            <Text style={styles.menuStatValue}>{lastSync || "--"}</Text>
            <Text style={styles.menuStatLabel}>sync</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>Switch trips</Text>
        <Text style={styles.cardTitle}>Choose the trip you want on this phone.</Text>
        <View style={styles.stackSmall}>
          {trips.map((trip) => {
            const isActive = trip.id === activeTripId;
            return (
              <Pressable
                key={trip.id}
                onPress={() => onSelectTrip(trip.id)}
                style={[styles.tripRow, isActive && styles.tripRowActive]}
              >
                <View style={styles.tripRowCopy}>
                  <Text style={[styles.tripRowTitle, isActive && styles.tripRowTitleActive]}>
                    {trip.title}
                  </Text>
                  <Text style={[styles.tripRowMeta, isActive && styles.tripRowMetaActive]}>
                    {trip.destination} · {trip.dateRange}
                  </Text>
                </View>
                <Text style={[styles.tripRowAction, isActive && styles.tripRowActionActive]}>
                  {isActive ? "Active" : "Use"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>Sync + planner</Text>
        <Text style={styles.cardBody}>{status}</Text>
        <View style={styles.menuActionGrid}>
          <Pressable onPress={() => void onRefresh()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Refresh trips</Text>
          </Pressable>
          <Pressable onPress={onOpenPlanner} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open web planner</Text>
          </Pressable>
        </View>
        <Text style={styles.versionText}>Burns Travel iOS {appVersion}</Text>
      </View>

      <NotesScreen notesDraft={notesDraft} onChange={onChangeNotes} onSave={onSaveNotes} />
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

function emptyAgendaItem(): AgendaItem {
  return { detail: "", location: "", time: "", title: "" };
}

function emptyPlace(): Place {
  return { name: "", note: "", status: "Saved", type: "Place" };
}

function cleanAgendaItem(item: AgendaItem): AgendaItem {
  return {
    detail: item.detail.replace(/\s+/g, " ").trim(),
    location: item.location?.replace(/\s+/g, " ").trim() || undefined,
    time: item.time.replace(/\s+/g, " ").trim() || "Time",
    title: item.title.replace(/\s+/g, " ").trim() || "New stop",
    lat: item.lat?.replace(/\s+/g, " ").trim() || undefined,
    lng: item.lng?.replace(/\s+/g, " ").trim() || undefined,
  };
}

function cleanPlaceDraft(place: Place): Place {
  return {
    address: place.address?.replace(/\s+/g, " ").trim() || undefined,
    imageUrl: place.imageUrl?.trim() || undefined,
    mapUrl: place.mapUrl?.trim() || undefined,
    name: place.name.replace(/\s+/g, " ").trim(),
    note: place.note.replace(/\s+/g, " ").trim(),
    status: place.status.replace(/\s+/g, " ").trim() || "Saved",
    type: place.type.replace(/\s+/g, " ").trim() || "Place",
    website: place.website?.trim() || undefined,
  };
}

function uniqueChecklistId(items: ChecklistItem[], value: string) {
  const base =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "packing-item";
  const existingIds = new Set(items.map((item) => item.id));
  let id = base;
  let count = 2;
  while (existingIds.has(id)) {
    id = `${base}-${count}`;
    count += 1;
  }
  return id;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function mapUrlForAgendaItem(item: AgendaItem) {
  const coordinate = validCoordinate(item.lat, item.lng);
  if (coordinate) {
    return mapUrlForCoordinate(coordinate.lat, coordinate.lng, item.location || item.title);
  }

  const location = item.location?.replace(/\s+/g, " ").trim();
  if (location) {
    return mapUrlFor(location);
  }

  return "";
}

function validCoordinate(lat?: string, lng?: string) {
  const cleanLat = lat?.trim();
  const cleanLng = lng?.trim();
  if (!cleanLat || !cleanLng) return null;

  const latNumber = Number(cleanLat);
  const lngNumber = Number(cleanLng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return null;
  if (Math.abs(latNumber) > 90 || Math.abs(lngNumber) > 180) return null;

  return {
    lat: latNumber.toFixed(6),
    lng: lngNumber.toFixed(6),
  };
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
  bottomTabButton: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 54,
    paddingVertical: 7,
  },
  bottomTabButtonActive: {
    backgroundColor: "#1a443e",
  },
  bottomTabDot: {
    backgroundColor: "transparent",
    borderRadius: 3,
    height: 5,
    width: 18,
  },
  bottomTabDotActive: {
    backgroundColor: colors.coral,
  },
  bottomTabText: {
    color: "#a9ccc5",
    fontSize: 11,
    fontWeight: "900",
  },
  bottomTabTextActive: {
    color: "white",
  },
  bottomTabs: {
    backgroundColor: colors.dark,
    borderTopColor: "#1d4640",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
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
    paddingBottom: 28,
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
  dangerButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f9e5df",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  dangerText: {
    color: "#b9513b",
    fontSize: 13,
    fontWeight: "900",
  },
  editableBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 28,
  },
  flexInput: {
    flex: 1,
  },
  formBlock: {
    backgroundColor: "#f7fbf9",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 14,
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
  heroCardBody: {
    color: "#cfe4df",
    fontSize: 15,
    lineHeight: 22,
  },
  heroCardTitle: {
    color: "white",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 8,
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
  itemHeaderRow: {
    flexDirection: "row",
    gap: 12,
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
  input: {
    backgroundColor: "white",
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBag: {
    borderRadius: 5,
    borderWidth: 2,
    height: 16,
    marginTop: 4,
    width: 19,
  },
  iconBagHandle: {
    alignSelf: "center",
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 2,
    height: 8,
    marginTop: -7,
    width: 10,
  },
  iconCalendar: {
    borderRadius: 5,
    borderWidth: 2,
    height: 20,
    overflow: "hidden",
    width: 20,
  },
  iconCalendarDots: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: 5,
  },
  iconCalendarTop: {
    height: 5,
    width: "100%",
  },
  iconDotTiny: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  iconMenu: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 20,
    justifyContent: "center",
    width: 22,
  },
  iconMenuDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  iconPin: {
    alignItems: "center",
    height: 21,
    width: 20,
  },
  iconPinHead: {
    borderRadius: 8,
    borderWidth: 2,
    height: 15,
    width: 15,
  },
  iconPinStem: {
    borderRadius: 2,
    height: 8,
    marginTop: -2,
    transform: [{ rotate: "45deg" }],
    width: 3,
  },
  iconRoute: {
    height: 21,
    width: 23,
  },
  iconRouteDot: {
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    left: 0,
    position: "absolute",
    top: 0,
    width: 10,
  },
  iconRouteDotEnd: {
    borderRadius: 5,
    borderWidth: 2,
    bottom: 0,
    height: 10,
    position: "absolute",
    right: 0,
    width: 10,
  },
  iconRouteLine: {
    borderRadius: 2,
    height: 3,
    left: 8,
    position: "absolute",
    top: 8,
    transform: [{ rotate: "25deg" }],
    width: 12,
  },
  iconRouteLineShort: {
    borderRadius: 2,
    height: 3,
    left: 7,
    position: "absolute",
    top: 13,
    transform: [{ rotate: "-25deg" }],
    width: 12,
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
  menuActionGrid: {
    gap: 10,
    marginTop: 14,
  },
  menuHero: {
    backgroundColor: colors.dark,
    borderColor: "#24534c",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  menuHeroBody: {
    color: "#cfe4df",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  menuHeroTitle: {
    color: "white",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 32,
    marginBottom: 8,
  },
  menuStat: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  menuStatLabel: {
    color: "#9fc6bf",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  menuStatValue: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  menuStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
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
  primaryInlineButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.coral,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  primaryInlineButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.teal,
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
  stackTiny: {
    gap: 9,
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
  twoColumn: {
    flexDirection: "row",
    gap: 9,
  },
  smallTextArea: {
    minHeight: 82,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    maxWidth: 250,
  },
  tripRow: {
    alignItems: "center",
    backgroundColor: "white",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  tripRowAction: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "900",
  },
  tripRowActionActive: {
    color: "white",
  },
  tripRowActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  tripRowCopy: {
    flex: 1,
  },
  tripRowMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  tripRowMetaActive: {
    color: "#d6eee8",
  },
  tripRowTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginBottom: 3,
  },
  tripRowTitleActive: {
    color: "white",
  },
  versionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
});
