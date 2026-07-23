"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CloudSun,
  ClipboardCheck,
  Copy,
  Clock3,
  FileText,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  Home as HomeIcon,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Luggage,
  MapPin,
  Menu,
  Navigation,
  NotebookPen,
  Plus,
  Printer,
  Route,
  Search,
  Sparkles,
  Settings,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { APP_VERSION } from "./app-version";

type DayPlan = {
  date: string;
  label: string;
  title: string;
  mood: string;
  drive: string;
  showMap?: boolean;
  weatherNeed: string;
  agenda: { time: string; title: string; detail: string; location?: string; lat?: string; lng?: string }[];
  bring: string[];
  decisions: string[];
};

type ChecklistItem = {
  id: string;
  label: string;
  group: string;
  note?: string;
};

type PackingTemplate = {
  id: string;
  name: string;
  description: string;
  items: ChecklistItem[];
};

type Place = {
  name: string;
  type: string;
  note: string;
  status: string;
  address?: string;
  mapUrl?: string;
  website?: string;
  imageUrl?: string;
  imageAlt?: string;
};

type RouteSummary = {
  distanceMiles: number;
  durationMinutes: number;
  pointCount: number;
  status: "ready" | "partial" | "loading" | "error";
};

type TripBookRoute = RouteSummary & {
  coordinates: [number, number][];
};

type PlaceSuggestion = {
  id: string;
  name: string;
  detail: string;
  lat: string;
  lng: string;
};

type TripData = {
  days: DayPlan[];
  checklist: ChecklistItem[];
  packingGroups?: string[];
  places: Place[];
  tripTemplate: string[];
  settings?: {
    heroImage?: string;
    shareNotes?: string;
  };
};

type TripRecord = {
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

const days: DayPlan[] = [
  {
    date: "Sunday, July 26",
    label: "Day 1",
    title: "Drive North + Holland Stop",
    mood: "Get moving, keep the drive humane, and arrive with some Lake Michigan sand already in the day.",
    drive: "Drop off Wiz at 9:00 AM, then head north. After Holland, take Lakeshore Drive north through Ottawa Beach, Port Sheldon, and Grand Haven before US-31 toward Muskegon.",
    showMap: true,
    weatherNeed: "Travel clothes, beach-access shoes, quick towels, sunscreen within reach.",
    agenda: [
      {
        time: "9:00 AM",
        title: "Drop off Wiz and head north",
        detail: "Load road snacks, beach bag, and the first-day tote where they can be reached without unpacking the car.",
      },
      {
        time: "11:00 AM-ish",
        title: "Rest stop 1",
        detail: "Quick bathroom break, stretch, refill waters, verify lunch timing.",
      },
      {
        time: "12:30-1:00 PM",
        title: "Lunch in Dundee, MI",
        detail: "Taco Bell / McDonald's to the right, Culver's to the left. Pick based on speed and morale.",
      },
      {
        time: "4:00 PM",
        title: "Holland State Park",
        detail: "See the beach, walk the pier, maybe play a bit, and consider Captain Sundae before heading north.",
      },
      {
        time: "Evening",
        title: "Rental arrival",
        detail: "About one hour from Holland. Unload essentials first: beds, swim bag, food, toiletries.",
      },
    ],
    bring: ["First-day beach bag", "Quick towels", "Cooler", "Road snacks", "Water shoes"],
    decisions: ["How long to stay in Holland", "Captain Sundae stop", "Dinner after arrival"],
  },
  {
    date: "Monday, July 27",
    label: "Day 2",
    title: "Duck Lake Beach Day",
    mood: "Make this the easy full beach day with room to settle in.",
    drive: "Short local drive from the house. Keep the car packed for a long beach stretch.",
    weatherNeed: "Full sun kit: shade, sunscreen, cooler, towels, water shoes, toys.",
    agenda: [
      {
        time: "Morning",
        title: "Pack for Duck Lake",
        detail: "Chairs, towels, sunscreen, cooler, food and drinks, toys, tubes, frisbees, kites, umbrellas, beach wagon.",
      },
      {
        time: "Midday",
        title: "Beach block",
        detail: "Swim, walk, eat from the cooler, and keep sunscreen on a timer.",
      },
      {
        time: "Late afternoon",
        title: "Easy reset",
        detail: "Rinse, dry towels, check what needs replenished before Michigan's Adventure.",
      },
    ],
    bring: ["Beach wagon", "Chairs", "Umbrellas", "Cooler", "Tubes", "Kites", "Frisbees"],
    decisions: ["Cooler lunch vs. buying food", "How much shade to carry", "Dinner plan"],
  },
  {
    date: "Tuesday, July 28",
    label: "Day 3",
    title: "Michigan's Adventure",
    mood: "Theme park day: organized, light, and ready for water rides.",
    drive: "Local park day. Start early enough to make the most of the day without turning it into a forced march.",
    weatherNeed: "Normal Cedar Point gear: dry bag, sunscreen, hats, sandals or secure shoes, water plan.",
    agenda: [
      {
        time: "Morning",
        title: "Park launch",
        detail: "Use the Cedar Point routine: tickets, sunscreen, phone battery, water ride gear, backup clothes.",
      },
      {
        time: "Midday",
        title: "Rides + water break",
        detail: "Alternate high-energy rides with shade, snacks, and water.",
      },
      {
        time: "Evening",
        title: "Recovery dinner",
        detail: "Keep dinner close and easy. This is a good night for Hobos Tavern if everyone has energy.",
      },
    ],
    bring: ["Dry bag", "Park shoes", "Sunscreen", "Hats", "Portable charger", "Backup clothes"],
    decisions: ["Arrival time", "Water park timing", "Dinner reservation or casual"],
  },
  {
    date: "Wednesday, July 29",
    label: "Day 4",
    title: "Beach Day #2",
    mood: "A second Lake Michigan day, with Pere Marquette Beach as the leading option.",
    drive: "Keep it flexible: Pere Marquette Beach, another favorite, or a Muskegon State Park explore if weather shifts.",
    weatherNeed: "Beach kit plus light explore shoes if you want to add a short hike.",
    agenda: [
      {
        time: "Morning",
        title: "Pick the beach",
        detail: "Pere Marquette Beach is the maybe. Decide based on wind, swim conditions, parking, and energy.",
      },
      {
        time: "Afternoon",
        title: "Long beach block",
        detail: "Repeat the best parts of Duck Lake, but pack a lighter version if Monday taught you anything.",
      },
      {
        time: "Optional",
        title: "Muskegon State Park",
        detail: "Short hike or drive-explore close to the house.",
      },
    ],
    bring: ["Towels", "Umbrella", "Water shoes", "Cooler", "Beach toys", "Light shoes"],
    decisions: ["Pere Marquette vs. another beach", "Muskegon State Park add-on", "Laundry and towel reset"],
  },
  {
    date: "Thursday, July 30",
    label: "Day 5",
    title: "Beach Morning + Head Home",
    mood: "Squeeze in one gentle morning if it helps, then take the shortest drive home.",
    drive: "Shortest route possible. Load the car for fast departure and keep one go-home tote accessible.",
    showMap: true,
    weatherNeed: "Either travel clothes only or a stripped-down beach morning bag.",
    agenda: [
      {
        time: "Morning",
        title: "Final call",
        detail: "Decide whether a beach morning is worth the sand and towel logistics.",
      },
      {
        time: "Late morning",
        title: "Load and sweep",
        detail: "Trash, fridge, chargers, swim gear, towels, bathroom items, and one last look under beds.",
      },
      {
        time: "Depart",
        title: "Head home",
        detail: "Use the shortest drive possible. Save scenic detours for another trip.",
      },
    ],
    bring: ["Go-home tote", "Trash bags", "Laundry bag", "Chargers", "Road snacks"],
    decisions: ["Beach morning or clean exit", "Departure time", "Lunch stop"],
  },
];

const checklist: ChecklistItem[] = [
  { id: "water-shoes", label: "Water shoes", group: "Beach Gear" },
  { id: "swim-stuff", label: "Swim stuff", group: "Beach Gear" },
  { id: "kites", label: "Kites", group: "Beach Gear" },
  { id: "tubes", label: "Tubes", group: "Beach Gear" },
  { id: "frisbees", label: "Frisbees", group: "Beach Gear" },
  { id: "umbrellas", label: "Beach umbrellas", group: "Beach Gear" },
  { id: "wagon", label: "Beach wagon", group: "Beach Gear" },
  { id: "chairs", label: "Chairs", group: "Beach Gear" },
  { id: "towels", label: "Lots of towels", group: "Beach Gear", note: "Plan a mid-trip drying or laundry reset." },
  { id: "baby-powder", label: "Baby powder", group: "Beach Gear", note: "Your note said paper powder; assuming beach sand baby powder." },
  { id: "sunscreen", label: "Sunscreen", group: "Health" },
  { id: "cooler", label: "Cooler", group: "Food" },
  { id: "popcorn", label: "Popcorn", group: "Food" },
  { id: "coffee", label: "Coffee", group: "Food" },
  { id: "chips", label: "Chips", group: "Food" },
  { id: "drinks", label: "Drinks", group: "Food" },
  { id: "park-gear", label: "Normal Cedar Point gear", group: "Park Day", note: "Dry bag, phone power, water shoes, backup clothes." },
  { id: "chargers", label: "Chargers", group: "House" },
  { id: "laundry", label: "Laundry bag", group: "House" },
  { id: "trash-bags", label: "Trash bags", group: "House" },
];

const places = [
  {
    name: "Holland State Park",
    type: "Beach stop",
    note: "First Lake Michigan stop on the drive north. Walk the pier, stretch, and let the trip feel like vacation.",
    status: "Planned",
    address: "2215 Ottawa Beach Rd, Holland, MI 49424",
    website: "https://www.miottawa.org/Parks/holland.htm",
  },
  {
    name: "Captain Sundae",
    type: "Treat",
    note: "Maybe stop after Holland State Park if timing and energy are good.",
    status: "Maybe",
    address: "365 Douglas Ave, Holland, MI 49424",
    website: "https://captainsundae.com/",
  },
  {
    name: "Duck Lake",
    type: "Beach day",
    note: "Primary Monday beach day. Pack the full beach setup.",
    status: "Planned",
    address: "3560 Memorial Dr, North Muskegon, MI 49445",
  },
  {
    name: "Michigan's Adventure",
    type: "Theme park",
    note: "Tuesday park day. Use the Cedar Point packing pattern.",
    status: "Planned",
    address: "4750 Whitehall Rd, Muskegon, MI 49445",
    website: "https://www.miadventure.com/",
  },
  {
    name: "Pere Marquette Beach",
    type: "Beach option",
    note: "Maybe for Wednesday Beach Day #2.",
    status: "Maybe",
    address: "3510 Channel Dr, Muskegon, MI 49441",
  },
  {
    name: "Hobos Tavern",
    type: "Food close to house",
    note: "Purveyors of Food, Drink, and Song. Good easy dinner candidate.",
    status: "Option",
    address: "1411 Whitehall Rd, Muskegon, MI 49445",
    website: "https://hobostavern.com/",
  },
  {
    name: "Muskegon State Park",
    type: "Explore",
    note: "Short hike or just drive-explore close to the rental.",
    status: "Option",
    address: "3560 Memorial Dr, North Muskegon, MI 49445",
    website: "https://www2.dnr.state.mi.us/parksandtrails/details.aspx?id=475&type=SPRK",
  },
];

const tripTemplate = [
  "Overview: destination, dates, travelers, home base, and trip mood",
  "Travel days: departure windows, must-stop towns, scenic vs. fastest route",
  "Daily plans: anchor activity, backup option, weather gear, food plan",
  "Packing: house, beach, park, health, food, car, kid-specific gear",
  "Places: confirmed, maybe, food, rain plans, quick-drive options",
  "Notes: loose ideas, questions, reminders, and post-trip lessons",
];

const defaultTripData: TripData = {
  days,
  checklist,
  packingGroups: ["Beach Gear", "Health", "Food", "Park Day", "House"],
  places,
  tripTemplate,
};

const areaImages = [
  {
    label: "Holland State Park",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Holland_Harbor_Light_-_Holland%2C_Michigan.jpg",
  },
  {
    label: "Pere Marquette Beach",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Saturday_Evening%2C_Muskegon%2C_MI_at_Pere_Marquette_Beach.jpg",
  },
  {
    label: "Duck Lake State Park",
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Scenic_drive_at_Duck_Lake%2C_Muskegon%2C_Michigan_%2864134%29.jpg",
  },
];


const navItems = [
  { id: "home", label: "Trips", icon: HomeIcon },
  { id: "itinerary", label: "Itinerary", icon: Route },
  { id: "packing", label: "Packing", icon: Luggage },
  { id: "places", label: "Places", icon: MapPin },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "admin", label: "Admin", icon: Settings },
];

const defaultPackingTemplates: PackingTemplate[] = [
  {
    id: "beach",
    name: "Beach",
    description: "Lake, pool, and beach-day basics.",
    items: [
      { id: "beach-water-shoes", label: "Water shoes", group: "Beach Gear" },
      { id: "beach-swimsuits", label: "Bathing suits", group: "Beach Gear" },
      { id: "beach-towels", label: "Beach towels", group: "Beach Gear", note: "Bring extras for car seats and post-beach showers." },
      { id: "beach-sunscreen", label: "Sunscreen", group: "Health" },
      { id: "beach-cooler", label: "Cooler", group: "Food" },
      { id: "beach-wagon", label: "Beach wagon", group: "Beach Gear" },
    ],
  },
  {
    id: "camping",
    name: "Camping",
    description: "Cabin, tent, and state-park overnight gear.",
    items: [
      { id: "camping-lanterns", label: "Lanterns or flashlights", group: "Camp Gear" },
      { id: "camping-bug-spray", label: "Bug spray", group: "Health" },
      { id: "camping-rain-jackets", label: "Rain jackets", group: "Clothes" },
      { id: "camping-camp-chairs", label: "Camp chairs", group: "Camp Gear" },
      { id: "camping-fire-starters", label: "Fire starters", group: "Camp Kitchen" },
      { id: "camping-first-aid", label: "First aid kit", group: "Health" },
    ],
  },
  {
    id: "amusement-park",
    name: "Amusement Park",
    description: "Theme park and water-ride day pack.",
    items: [
      { id: "park-dry-bag", label: "Dry bag", group: "Park Day" },
      { id: "park-portable-charger", label: "Portable charger", group: "Tech" },
      { id: "park-sunscreen", label: "Sunscreen", group: "Health" },
      { id: "park-hats", label: "Hats", group: "Clothes" },
      { id: "park-backup-clothes", label: "Backup clothes", group: "Park Day" },
      { id: "park-water-bottles", label: "Water bottles", group: "Food" },
    ],
  },
];

const placeSearchEndpoint = "https://photon.komoot.io/api/";

function formatPhotonSuggestion(feature: {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}): PlaceSuggestion | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates) return null;
  const properties = feature.properties ?? {};
  const name = String(properties.name ?? properties.street ?? properties.city ?? "Map result");
  const locality = [
    properties.housenumber,
    properties.street,
    properties.city,
    properties.county,
    properties.state,
    properties.country,
  ]
    .filter(Boolean)
    .map(String);
  const detail = [...new Set(locality.filter((item) => item !== name))].join(", ");

  return {
    id: String(properties.osm_id ?? properties.osm_key ?? name + coordinates.join(",")),
    name,
    detail,
    lat: coordinates[1].toFixed(6),
    lng: coordinates[0].toFixed(6),
  };
}

function agendaLocation(item: DayPlan["agenda"][number]) {
  if (item.location?.trim()) return item.location;
  if (item.lat?.trim() && item.lng?.trim()) return item.lat + ", " + item.lng;
  const textValue = (item.title + " " + item.detail).toLowerCase();
  if (textValue.includes("dundee")) return "Dundee, Michigan";
  if (textValue.includes("holland")) return "Holland State Park, Michigan";
  if (textValue.includes("rental") || textValue.includes("muskegon")) return "Muskegon, Michigan";
  if (textValue.includes("duck lake")) return "Duck Lake State Park, Michigan";
  if (textValue.includes("pere marquette")) return "Pere Marquette Park, Muskegon, Michigan";
  if (textValue.includes("adventure")) return "Michigan's Adventure, Michigan";
  if (textValue.includes("home")) return "Home";
  return item.title;
}

function mapTarget(item: DayPlan["agenda"][number]) {
  const coordinate = validCoordinate(item.lat, item.lng);
  if (coordinate) return coordinate.join(", ");
  return agendaLocation(item);
}

function parseCoordinates(value: string) {
  const decoded = decodeURIComponent(value);
  const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const queryMatch = decoded.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const plainMatch = decoded.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const match = atMatch ?? queryMatch ?? plainMatch;
  if (!match) return null;
  return { lat: match[1], lng: match[2] };
}

const defaultMapCenter: [number, number] = [43.2342, -86.2484];

function validCoordinate(lat?: string, lng?: string): [number, number] | null {
  const cleanLat = lat?.trim();
  const cleanLng = lng?.trim();
  if (!cleanLat || !cleanLng) return null;
  const latNumber = Number(cleanLat);
  const lngNumber = Number(cleanLng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return null;
  if (Math.abs(latNumber) > 90 || Math.abs(lngNumber) > 180) return null;
  return [latNumber, lngNumber];
}

function knownCoordinateForLocation(value: string): [number, number] | null {
  const text = value.toLowerCase();
  if (text.includes("hounds town") || text.includes("huber village") || text.includes("westerville")) return [40.104855, -82.922664];
  if (text.includes("head home") || text.includes(" home")) return [40.104855, -82.922664];
  if (text.includes("findlay")) return [41.0442, -83.6499];
  if (text.includes("dundee")) return [41.9573, -83.6597];
  if (text.includes("holland state park") || text.includes("holland harbor") || text.includes("captain sundae")) return [42.7786, -86.2064];
  if (text.includes("duck lake")) return [43.3277, -86.3388];
  if (text.includes("pere marquette")) return [43.2144, -86.3354];
  if (text.includes("michigan's adventure") || text.includes("michigans adventure")) return [43.3475, -86.2792];
  if (text.includes("final call") || text.includes("load and sweep")) return [43.2342, -86.2484];
  if (text.includes("muskegon") || text.includes("green creek")) return [43.2342, -86.2484];
  return null;
}

function stopCoordinate(item?: DayPlan["agenda"][number]): [number, number] | null {
  if (!item) return null;
  return (
    validCoordinate(item.lat, item.lng) ??
    knownCoordinateForLocation([agendaLocation(item), item.title, item.detail].join(" "))
  );
}

function routeCoordinates(stops: DayPlan["agenda"]) {
  return stops
    .map((stop, index) => ({ coordinate: stopCoordinate(stop), index, stop }))
    .filter((item): item is { coordinate: [number, number]; index: number; stop: DayPlan["agenda"][number] } =>
      Boolean(item.coordinate),
    );
}

const PRINT_MAP_WIDTH = 640;
const PRINT_MAP_HEIGHT = 360;
const PRINT_MAP_TILE_SIZE = 256;

function mercatorPoint([lat, lng]: [number, number], zoom: number) {
  const sinLat = Math.sin((Math.max(Math.min(lat, 85.05112878), -85.05112878) * Math.PI) / 180);
  const scale = PRINT_MAP_TILE_SIZE * 2 ** zoom;

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function mapTileUrl(zoom: number, x: number, y: number) {
  const tileCount = 2 ** zoom;
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;
  const clampedY = Math.max(0, Math.min(tileCount - 1, y));

  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

function osrmRouteUrl(points: { coordinate: [number, number] }[]) {
  const routePath = points.map(({ coordinate }) => coordinate[1] + "," + coordinate[0]).join(";");

  return (
    "https://router.project-osrm.org/route/v1/driving/" +
    routePath +
    "?overview=full&geometries=geojson&steps=false"
  );
}

function printableRouteMap(stops: DayPlan["agenda"], roadRoute?: [number, number][]) {
  const points = routeCoordinates(stops);
  if (!points.length) return null;
  const roadPoints = roadRoute?.length ? roadRoute : [];
  const allCoordinates = [...points.map((point) => point.coordinate), ...roadPoints];

  const projectedByZoom = Array.from({ length: 13 }, (_, index) => 14 - index).map((zoom) => {
    const projected = points.map((point) => ({ ...point, projected: mercatorPoint(point.coordinate, zoom) }));
    const projectedRoad = roadPoints.map((coordinate) => mercatorPoint(coordinate, zoom));
    const boundsPoints = allCoordinates.map((coordinate) => mercatorPoint(coordinate, zoom));
    const xs = boundsPoints.map((point) => point.x);
    const ys = boundsPoints.map((point) => point.y);

    return {
      zoom,
      projected,
      projectedRoad,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });

  const mapFrame =
    projectedByZoom.find(
      (frame) =>
        frame.maxX - frame.minX <= PRINT_MAP_WIDTH - 130 &&
        frame.maxY - frame.minY <= PRINT_MAP_HEIGHT - 120,
    ) ?? projectedByZoom[projectedByZoom.length - 1];

  const routeWidth = Math.max(mapFrame.maxX - mapFrame.minX, 1);
  const routeHeight = Math.max(mapFrame.maxY - mapFrame.minY, 1);
  const topLeftX = mapFrame.minX + routeWidth / 2 - PRINT_MAP_WIDTH / 2;
  const topLeftY = mapFrame.minY + routeHeight / 2 - PRINT_MAP_HEIGHT / 2;
  const minTileX = Math.floor(topLeftX / PRINT_MAP_TILE_SIZE);
  const maxTileX = Math.floor((topLeftX + PRINT_MAP_WIDTH) / PRINT_MAP_TILE_SIZE);
  const minTileY = Math.floor(topLeftY / PRINT_MAP_TILE_SIZE);
  const maxTileY = Math.floor((topLeftY + PRINT_MAP_HEIGHT) / PRINT_MAP_TILE_SIZE);
  const tiles = [];

  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      tiles.push({
        key: `${mapFrame.zoom}-${tileX}-${tileY}`,
        left: tileX * PRINT_MAP_TILE_SIZE - topLeftX,
        top: tileY * PRINT_MAP_TILE_SIZE - topLeftY,
        url: mapTileUrl(mapFrame.zoom, tileX, tileY),
      });
    }
  }

  const markers = mapFrame.projected.map((point) => ({
    ...point,
    x: point.projected.x - topLeftX,
    y: point.projected.y - topLeftY,
  }));
  const roadLine = mapFrame.projectedRoad.map((point) => `${point.x - topLeftX},${point.y - topLeftY}`).join(" ");

  return {
    height: PRINT_MAP_HEIGHT,
    markers,
    roadLine,
    routeLine: markers.map((point) => `${point.x},${point.y}`).join(" "),
    tiles,
    width: PRINT_MAP_WIDTH,
    zoom: mapFrame.zoom,
  };
}

function directionsUrlForStops(stops: DayPlan["agenda"], fallback = "Trip route") {
  const targets = stops.map(mapTarget).filter(Boolean);
  if (targets.length > 1) {
    return (
      "https://www.google.com/maps/dir/?api=1&origin=" +
      encodeURIComponent(targets[0]) +
      "&destination=" +
      encodeURIComponent(targets[targets.length - 1]) +
      "&waypoints=" +
      encodeURIComponent(targets.slice(1, -1).join("|")) +
      "&travelmode=driving"
    );
  }
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(targets[0] ?? fallback);
}

function formatRouteDistance(miles?: number) {
  if (!Number.isFinite(miles)) return "Distance pending";
  if ((miles ?? 0) < 10) return (miles ?? 0).toFixed(1) + " mi";
  return Math.round(miles ?? 0).toLocaleString() + " mi";
}

function formatRouteDuration(minutes?: number) {
  if (!Number.isFinite(minutes)) return "Drive time pending";
  const rounded = Math.max(1, Math.round(minutes ?? 0));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (!hours) return mins + " min";
  if (!mins) return hours + " hr";
  return hours + " hr " + mins + " min";
}

function blankRouteSummary(): RouteSummary {
  return {
    distanceMiles: 0,
    durationMinutes: 0,
    pointCount: 0,
    status: "partial",
  };
}

function tripBookRouteKey(day: DayPlan, index: number) {
  const coordinates = routeCoordinates(day.agenda)
    .map((point) => point.coordinate.join(","))
    .join("|");

  return [index, day.label, day.date, day.title, coordinates].join("::");
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  if (fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function packingSignals(data: TripData, trip?: TripRecord) {
  return [
    trip?.title,
    trip?.destination,
    trip?.summary,
    ...((data.days ?? []).flatMap((day) => [
      day.title,
      day.mood,
      day.drive,
      day.weatherNeed,
      ...day.bring,
      ...day.decisions,
      ...day.agenda.flatMap((item) => [item.title, item.detail, item.location]),
    ])),
    ...((data.places ?? []).flatMap((place) => [
      place.name,
      place.type,
      place.note,
      place.status,
      place.address,
      place.website,
    ])),
  ].join(" ").toLowerCase();
}

function normalizeExternalUrl(value?: string) {
  const clean = (value ?? "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  return "https://" + clean;
}

function placeMapUrl(place: Place) {
  const directMapUrl = normalizeExternalUrl(place.mapUrl);
  if (directMapUrl) return directMapUrl;
  const query = [place.name, place.address].filter(Boolean).join(" ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query || place.name);
}

function placeImageFor(place: Place, index: number) {
  return place.imageUrl?.trim() || areaImages[index % areaImages.length].url;
}

function createPackingSuggestions(data: TripData, trip?: TripRecord) {
  const text = packingSignals(data, trip);
  const existing = new Set((data.checklist ?? []).map((item) => item.label.toLowerCase()));
  const candidates = [
    {
      id: "suggest-swimsuits",
      label: "Bathing suits",
      group: "Beach Gear",
      note: "Suggested because this trip mentions beaches, lakes, pools, swimming, or water days.",
      triggers: ["beach", "lake", "pool", "swim", "water park", "water rides"],
    },
    {
      id: "suggest-goggles",
      label: "Goggles",
      group: "Beach Gear",
      note: "Helpful for lake, pool, or water-park time.",
      triggers: ["pool", "swim", "water park", "water rides", "lake"],
    },
    {
      id: "suggest-rashguards",
      label: "Rash guards or swim shirts",
      group: "Beach Gear",
      note: "Useful when several days include sun and water.",
      triggers: ["beach", "lake", "sun", "swim", "water park"],
    },
    {
      id: "suggest-rain-jackets",
      label: "Light rain jackets",
      group: "Weather",
      note: "Suggested because the plan mentions weather, backups, or flexible outdoor days.",
      triggers: ["weather", "rain", "backup", "flexible", "storm"],
    },
    {
      id: "suggest-hiking-shoes",
      label: "Hiking or trail shoes",
      group: "Explore",
      note: "Suggested because the trip includes parks, hikes, or exploring.",
      triggers: ["hike", "trail", "state park", "explore", "walk"],
    },
    {
      id: "suggest-dry-bag",
      label: "Dry bag",
      group: "Park Day",
      note: "Useful for water rides, beach days, and wet towels.",
      triggers: ["water rides", "water park", "beach", "swim", "lake"],
    },
  ];

  return candidates.filter(
    (candidate) =>
      !existing.has(candidate.label.toLowerCase()) &&
      candidate.triggers.some((trigger) => text.includes(trigger)),
  );
}

type ItineraryMapProps = {
  focusRouteRequest: number;
  previewLabel: string;
  selectedIndex: number;
  selectedStopTitle: string;
  stops: DayPlan["agenda"];
  onPick: (coordinates: { lat: string; lng: string }) => void;
  onRouteSummary: (summary: RouteSummary) => void;
  onSelectStop: (index: number) => void;
};

function ItineraryClickMap({
  focusRouteRequest,
  previewLabel,
  selectedIndex,
  selectedStopTitle,
  stops,
  onPick,
  onRouteSummary,
  onSelectStop,
}: ItineraryMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeHaloLayerRef = useRef<Leaflet.Polyline | null>(null);
  const routeLayerRef = useRef<Leaflet.Polyline | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onPickRef = useRef(onPick);
  const onRouteSummaryRef = useRef(onRouteSummary);
  const onSelectStopRef = useRef(onSelectStop);
  const [mapReady, setMapReady] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary>({
    distanceMiles: 0,
    durationMinutes: 0,
    pointCount: 0,
    status: "partial",
  });
  const selectedCoordinate = stopCoordinate(stops[selectedIndex]);
  const selectedCoordinateRef = useRef(selectedCoordinate);

  useEffect(() => {
    onPickRef.current = onPick;
    onRouteSummaryRef.current = onRouteSummary;
    onSelectStopRef.current = onSelectStop;
  }, [onPick, onRouteSummary, onSelectStop]);

  useEffect(() => {
    selectedCoordinateRef.current = selectedCoordinate;
  }, [selectedCoordinate]);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leaflet) => {
      if (cancelled || !mapElementRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const initialCoordinate = selectedCoordinateRef.current;
      const map = leaflet
        .map(mapElementRef.current, { attributionControl: true, zoomControl: true })
        .setView(initialCoordinate ?? defaultMapCenter, initialCoordinate ? 13 : 9);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(map);

      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        onPickRef.current({
          lat: event.latlng.lat.toFixed(6),
          lng: event.latlng.lng.toFixed(6),
        });
      });
      mapRef.current = map;
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 80);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeHaloLayerRef.current = null;
      routeLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(selectedCoordinate ?? defaultMapCenter, selectedCoordinate ? 13 : 9, {
      animate: true,
    });
  }, [selectedCoordinate]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const markerLayer = markerLayerRef.current;
    if (!mapReady || !leaflet || !markerLayer) return;

    markerLayer.clearLayers();
    routeCoordinates(stops).forEach(({ coordinate, index, stop }) => {
      if (!coordinate) return;
      const marker = leaflet.marker(coordinate, {
        icon: leaflet.divIcon({
          className: "map-stop-marker",
          html: `<span>${index + 1}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        title: stop.title,
      });
      marker.on("click", () => onSelectStopRef.current(index));
      marker.addTo(markerLayer);
    });
  }, [mapReady, selectedIndex, stops]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !leaflet || !map) return;

    const routableStops = routeCoordinates(stops);
    if (routeHaloLayerRef.current) {
      routeHaloLayerRef.current.removeFrom(map);
      routeHaloLayerRef.current = null;
    }
    if (routeLayerRef.current) {
      routeLayerRef.current.removeFrom(map);
      routeLayerRef.current = null;
    }

    if (routableStops.length < 2) {
      const summary: RouteSummary = {
        distanceMiles: 0,
        durationMinutes: 0,
        pointCount: routableStops.length,
        status: "partial",
      };
      window.setTimeout(() => {
        setRouteSummary(summary);
        onRouteSummaryRef.current(summary);
      }, 0);
      return;
    }

    const controller = new AbortController();
    const loadingSummary: RouteSummary = {
      distanceMiles: 0,
      durationMinutes: 0,
      pointCount: routableStops.length,
      status: "loading",
    };
    window.setTimeout(() => {
      setRouteSummary(loadingSummary);
      onRouteSummaryRef.current(loadingSummary);
    }, 0);

    const routePath = routableStops
      .map(({ coordinate }) => coordinate[1] + "," + coordinate[0])
      .join(";");
    fetch(
      "https://router.project-osrm.org/route/v1/driving/" +
        routePath +
        "?overview=full&geometries=geojson&steps=false",
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error("Route request failed");
        return response.json() as Promise<{
          routes?: {
            distance?: number;
            duration?: number;
            geometry?: { coordinates?: [number, number][] };
          }[];
        }>;
      })
      .then((payload) => {
        const route = payload.routes?.[0];
        const geometry = route?.geometry?.coordinates;
        if (!route || !geometry?.length) throw new Error("Route unavailable");

        const routeLine = geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
        routeHaloLayerRef.current = leaflet
          .polyline(routeLine, {
            color: "#ffffff",
            opacity: 0.94,
            weight: 9,
          })
          .addTo(map);
        routeLayerRef.current = leaflet
          .polyline(routeLine, {
            color: "#d94f37",
            opacity: 0.96,
            weight: 6,
          })
          .addTo(map);
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [34, 34] });

        const summary: RouteSummary = {
          distanceMiles: (route.distance ?? 0) / 1609.344,
          durationMinutes: (route.duration ?? 0) / 60,
          pointCount: routableStops.length,
          status: "ready",
        };
        setRouteSummary(summary);
        onRouteSummaryRef.current(summary);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const summary: RouteSummary = {
          distanceMiles: 0,
          durationMinutes: 0,
          pointCount: routableStops.length,
          status: "error",
        };
        setRouteSummary(summary);
        onRouteSummaryRef.current(summary);
      });

    return () => controller.abort();
  }, [mapReady, stops]);

  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!mapReady || !map || !routeLayer || !focusRouteRequest) return;
    map.fitBounds(routeLayer.getBounds(), { animate: true, padding: [42, 42] });
  }, [focusRouteRequest, mapReady]);

  return (
    <div className="click-map-shell">
      <div aria-label="Click map to set selected stop coordinates" className="click-map" ref={mapElementRef} />
      <div className="map-overlay">
        <span><MapPin size={15} /> Click map to set</span>
        <strong>{selectedStopTitle}</strong>
        <small>{previewLabel}</small>
      </div>
      <div className="route-overlay">
        <span><Route size={15} /> Road route</span>
        {routeSummary.status === "ready" ? (
          <strong>{formatRouteDuration(routeSummary.durationMinutes)} · {formatRouteDistance(routeSummary.distanceMiles)}</strong>
        ) : routeSummary.status === "loading" ? (
          <strong>Calculating drive time</strong>
        ) : routeSummary.status === "error" ? (
          <strong>Route unavailable</strong>
        ) : (
          <strong>Add at least 2 mapped stops</strong>
        )}
        <small><i aria-hidden="true" /> {routeSummary.pointCount} mapped stops</small>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeDay, setActiveDay] = useState(0);
  const [activeView, setActiveView] = useState("home");
  const [packed, setPacked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [packingQuery, setPackingQuery] = useState("");
  const [packingDrafts, setPackingDrafts] = useState<Record<string, { label: string; note: string }>>({});
  const [newPackingGroup, setNewPackingGroup] = useState("");
  const [showNewPackingGroup, setShowNewPackingGroup] = useState(false);
  const [packingTemplates, setPackingTemplates] = useState<PackingTemplate[]>(defaultPackingTemplates);
  const [selectedPackingTemplateId, setSelectedPackingTemplateId] = useState("beach");
  const [templateItemDrafts, setTemplateItemDrafts] = useState<Record<string, { label: string; group: string; note: string }>>({});
  const [newTemplateDraft, setNewTemplateDraft] = useState({ name: "", description: "" });
  const [showUnpackedOnly, setShowUnpackedOnly] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [previewLoadingPlace, setPreviewLoadingPlace] = useState<number | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [activeTripId, setActiveTripId] = useState("michigan-2026");
  const [saveState, setSaveState] = useState("Saved");
  const [editMode, setEditMode] = useState(false);
  const [mapStopIndex, setMapStopIndex] = useState(0);
  const [mapDraft, setMapDraft] = useState("");
  const [mapApplyNote, setMapApplyNote] = useState("");
  const [locationSearch, setLocationSearch] = useState<{
    index: number | null;
    query: string;
    results: PlaceSuggestion[];
    status: "idle" | "loading" | "ready" | "empty" | "error";
  }>({ index: null, query: "", results: [], status: "idle" });
  const [hiddenMapDays, setHiddenMapDays] = useState<Record<string, boolean>>({});
  const [focusRouteRequest, setFocusRouteRequest] = useState(0);
  const [routeSummary, setRouteSummary] = useState<RouteSummary>(blankRouteSummary);
  const [mobileNav, setMobileNav] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripBook, setShowTripBook] = useState(false);
  const [tripBookRoutes, setTripBookRoutes] = useState<Record<string, TripBookRoute>>({});
  const [adminTab, setAdminTab] = useState<"trips" | "templates">("trips");
  const [reseedTemplateId, setReseedTemplateId] = useState("");
  const [newTrip, setNewTrip] = useState({ title: "", destination: "", dateRange: "", packingTemplateId: "" });
  const [draggingAgendaIndex, setDraggingAgendaIndex] = useState<number | null>(null);
  const [draggingChecklistIndex, setDraggingChecklistIndex] = useState<number | null>(null);
  const autosaveReady = useRef(false);
  const packedDirty = useRef(false);
  const notesDirty = useRef(false);
  const locationSearchCache = useRef(new Map<string, PlaceSuggestion[]>());

  useEffect(() => {
    fetch("/api/trips")
      .then((response) => response.json())
      .then((payload: { trips: TripRecord[] }) => {
        setTrips(payload.trips);
        const selected =
          payload.trips.find((trip) => trip.id === "michigan-2026") ?? payload.trips[0];
        if (selected) {
          setActiveTripId(selected.id);
          setPacked(selected.packed ?? {});
          setNotes(selected.notes ?? "");
          window.setTimeout(() => {
            autosaveReady.current = true;
          }, 0);
        }
      })
      .catch(() => setSaveState("Offline"));

    fetch("/api/packing-templates")
      .then((response) => response.json())
      .then((payload: { templates?: PackingTemplate[] }) => {
        if (payload.templates?.length) {
          setPackingTemplates(payload.templates);
          setSelectedPackingTemplateId(payload.templates[0].id);
        }
      })
      .catch(() => setPackingTemplates(defaultPackingTemplates));
  }, []);

  useEffect(() => {
    if (!trips.some((trip) => trip.id === activeTripId)) return;
    if (!autosaveReady.current || (!packedDirty.current && !notesDirty.current)) return;
    const timeout = window.setTimeout(() => {
      setSaveState("Saving");
      fetch("/api/trips/" + activeTripId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packed, notes }),
      })
        .then(() => {
          packedDirty.current = false;
          notesDirty.current = false;
          setSaveState("Saved");
        })
        .catch(() => setSaveState("Could not save"));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [activeTripId, notes, packed, trips]);

  useEffect(() => {
    const query = locationSearch.query.replace(/\s+/g, " ").trim();
    if (locationSearch.index === null || query.length < 3) {
      return;
    }

    const cacheKey = query.toLowerCase();
    const cached = locationSearchCache.current.get(cacheKey);
    if (cached) {
      setLocationSearch((current) => ({
        ...current,
        results: cached,
        status: cached.length ? "ready" : "empty",
      }));
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLocationSearch((current) => ({ ...current, status: "loading" }));
      const params = new URLSearchParams({
        q: query,
        lang: "en",
        limit: "5",
      });

      fetch(placeSearchEndpoint + "?" + params.toString(), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Place search failed");
          return response.json() as Promise<{
            features?: {
              geometry?: { coordinates?: [number, number] };
              properties?: Record<string, unknown>;
            }[];
          }>;
        })
        .then((payload) => {
          const results = (payload.features ?? [])
            .map(formatPhotonSuggestion)
            .filter((result): result is PlaceSuggestion => Boolean(result));
          locationSearchCache.current.set(cacheKey, results);
          setLocationSearch((current) =>
            current.query.replace(/\s+/g, " ").trim().toLowerCase() === cacheKey
              ? {
                  ...current,
                  results,
                  status: results.length ? "ready" : "empty",
                }
              : current,
          );
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setLocationSearch((current) => ({ ...current, results: [], status: "error" }));
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [locationSearch.index, locationSearch.query]);

  const activeTrip = trips.find((trip) => trip.id === activeTripId);
  const tripData = activeTrip?.data ?? defaultTripData;
  const dataDays = tripData.days;
  const dataChecklist = tripData.checklist;
  const dataPlaces = tripData.places;
  const dataTemplate = tripData.tripTemplate?.length ? tripData.tripTemplate : tripTemplate;
  const tripSettings = tripData.settings ?? {};
  const activeHeroImage = tripSettings.heroImage?.trim() || areaImages[0].url;
  const currentDay = dataDays[Math.min(activeDay, Math.max(dataDays.length - 1, 0))];
  const packedCount = dataChecklist.filter((item) => packed[item.id]).length;
  const progress = dataChecklist.length ? Math.round((packedCount / dataChecklist.length) * 100) : 0;
  const groups = [
    ...new Set([
      ...(tripData.packingGroups ?? []),
      ...dataChecklist.map((item) => item.group),
    ].filter(Boolean)),
  ];
  const normalizedPackingQuery = packingQuery.trim().toLowerCase();
  const visibleChecklist = dataChecklist.filter((item) => {
    const groupMatches = !selectedGroups.length || selectedGroups.includes(item.group);
    const queryMatches =
      !normalizedPackingQuery ||
      (item.label + " " + item.group + " " + (item.note ?? ""))
        .toLowerCase()
        .includes(normalizedPackingQuery);
    const packingMatches = !showUnpackedOnly || !packed[item.id];
    return groupMatches && queryMatches && packingMatches;
  });
  const visibleGroups = groups.filter((group) => {
    const selectedMatches = !selectedGroups.length || selectedGroups.includes(group);
    const hasVisibleItems = visibleChecklist.some((item) => item.group === group);
    return selectedMatches && (hasVisibleItems || (!normalizedPackingQuery && !showUnpackedOnly));
  });
  const normalizedPlaceQuery = placeQuery.trim().toLowerCase();
  const visiblePlaces = dataPlaces.filter((place) =>
    !normalizedPlaceQuery ||
    (place.name + " " + place.type + " " + place.status + " " + place.note + " " + (place.address ?? "") + " " + (place.website ?? ""))
      .toLowerCase()
      .includes(normalizedPlaceQuery),
  );
  const packingSuggestions = createPackingSuggestions(tripData, activeTrip);
  const selectedPackingTemplate =
    packingTemplates.find((template) => template.id === selectedPackingTemplateId) ??
    packingTemplates[0];
  const selectedNewTripTemplate = packingTemplates.find((template) => template.id === newTrip.packingTemplateId);
  const selectedReseedTemplate = packingTemplates.find((template) => template.id === reseedTemplateId);
  const isDriveDay = Boolean(
    currentDay &&
      (currentDay.showMap ||
        currentDay.agenda.length >= 4 ||
        /drive|head home|travel/i.test(currentDay.title + " " + currentDay.drive)),
  );
  const selectedStopIndex = Math.min(mapStopIndex, Math.max((currentDay?.agenda.length ?? 1) - 1, 0));
  const selectedStop = currentDay?.agenda[selectedStopIndex];
  const stopLocations = currentDay?.agenda.map(mapTarget) ?? [];
  const selectedLocation =
    stopLocations[selectedStopIndex] ??
    activeTrip?.destination ??
    "Michigan";
  const mapVisibilityKey = activeTripId + ":" + activeDay;
  const mapHidden = Boolean(hiddenMapDays[mapVisibilityKey]);
  const previewLocation = mapDraft.trim() || selectedLocation;
  const parsedDraftCoordinates = parseCoordinates(mapDraft);
  const routeUrl =
    stopLocations.length > 1
      ? "https://www.google.com/maps/dir/?api=1&origin=" +
        encodeURIComponent(stopLocations[0]) +
        "&destination=" +
        encodeURIComponent(stopLocations[stopLocations.length - 1]) +
        "&waypoints=" +
        encodeURIComponent(stopLocations.slice(1, -1).join("|")) +
        "&travelmode=driving"
      : "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(selectedLocation);
  const checklistByGroup = groups.map((group) => ({
    group,
    items: dataChecklist.filter((item) => item.group === group),
  }));
  const mappedDayCount = dataDays.filter((day) => routeCoordinates(day.agenda).length > 0).length;

  useEffect(() => {
    if (!showTripBook) return;
    const candidates = dataDays
      .map((day, index) => ({
        day,
        index,
        key: tripBookRouteKey(day, index),
        points: routeCoordinates(day.agenda),
      }))
      .filter((item) => item.points.length > 1);

    if (!candidates.length) return;

    const controller = new AbortController();

    candidates.forEach((item) => {
      fetch(osrmRouteUrl(item.points), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Route request failed");
          return response.json() as Promise<{
            routes?: {
              distance?: number;
              duration?: number;
              geometry?: { coordinates?: [number, number][] };
            }[];
          }>;
        })
        .then((payload) => {
          const route = payload.routes?.[0];
          const geometry = route?.geometry?.coordinates;
          if (!route || !geometry?.length) throw new Error("Route unavailable");

          setTripBookRoutes((current) => ({
            ...current,
            [item.key]: {
              coordinates: geometry.map(([lng, lat]) => [lat, lng]),
              distanceMiles: (route.distance ?? 0) / 1609.344,
              durationMinutes: (route.duration ?? 0) / 60,
              pointCount: item.points.length,
              status: "ready",
            },
          }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setTripBookRoutes((current) => ({
            ...current,
            [item.key]: {
              ...blankRouteSummary(),
              coordinates: [],
              pointCount: item.points.length,
              status: "error",
            },
          }));
        });
    });

    return () => controller.abort();
  }, [activeTripId, dataDays, showTripBook]);

  function printTripBook() {
    setShowTripBook(true);
    window.setTimeout(() => window.print(), 900);
  }

  function navigate(view: string) {
    setActiveView(view);
    setMobileNav(false);
    setEditMode(false);
  }

  function selectTrip(trip: TripRecord, open = false) {
    setActiveTripId(trip.id);
    setActiveDay(0);
    setMapStopIndex(0);
    setRouteSummary(blankRouteSummary());
    setPacked(trip.packed ?? {});
    setNotes(trip.notes ?? "");
    setPackingQuery("");
    setShowUnpackedOnly(false);
    setPlaceQuery("");
    packedDirty.current = false;
    notesDirty.current = false;
    setMapDraft("");
    setMapApplyNote("");
    if (open) navigate("itinerary");
  }

  function saveTripPatch(patchData: Partial<TripRecord>) {
    if (!activeTrip) return;
    const updated = { ...activeTrip, ...patchData };
    setTrips((current) => current.map((trip) => (trip.id === updated.id ? updated : trip)));
    setSaveState("Saving");
    fetch("/api/trips/" + activeTrip.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patchData),
    })
      .then(() => setSaveState("Saved"))
      .catch(() => setSaveState("Could not save"));
  }

  function saveTripData(nextData: TripData) {
    saveTripPatch({ data: nextData });
  }

  function updateTripData(updater: (currentData: TripData) => TripData) {
    if (!activeTrip) return;
    const nextData = updater(activeTrip.data ?? defaultTripData);
    const tripId = activeTrip.id;

    setTrips((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, data: nextData } : trip)),
    );

    setSaveState("Saving");
    fetch("/api/trips/" + tripId, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: nextData }),
    })
      .then(() => setSaveState("Saved"))
      .catch(() => setSaveState("Could not save"));
  }

  function updateDay(index: number, patchData: Partial<DayPlan>) {
    updateTripData((currentData) => ({
      ...currentData,
      days: (currentData.days ?? []).map((day, dayIndex) =>
        dayIndex === index ? { ...day, ...patchData } : day,
      ),
    }));
  }

  function updateTripSettings(patchData: Partial<TripRecord>) {
    saveTripPatch(patchData);
  }

  function updateTripDataSettings(patchData: NonNullable<TripData["settings"]>) {
    updateTripData((currentData) => ({
      ...currentData,
      settings: {
        ...(currentData.settings ?? {}),
        ...patchData,
      },
    }));
  }

  function cloneTripAsTemplate() {
    if (!activeTrip) return;
    fetch("/api/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: activeTrip.title + " Template",
        destination: activeTrip.destination,
        dateRange: "Dates TBD",
        cloneFromId: activeTrip.id,
      }),
    })
      .then((response) => response.json())
      .then((payload: { trip: TripRecord }) => {
        setTrips((current) => [payload.trip, ...current]);
        selectTrip(payload.trip);
        setShowTripSettings(false);
        navigate("home");
      })
      .catch(() => setSaveState("Could not clone trip"));
  }

  function reloadTrips(selectedTripId = activeTripId) {
    return fetch("/api/trips")
      .then((response) => response.json())
      .then((payload: { trips: TripRecord[] }) => {
        setTrips(payload.trips);
        const selected =
          payload.trips.find((trip) => trip.id === selectedTripId) ?? payload.trips[0];
        if (selected) selectTrip(selected);
      });
  }

  function deleteTrip(trip: TripRecord) {
    if (trips.length <= 1) {
      setSaveState("Keep at least one trip");
      return;
    }
    const confirmed = window.confirm("Delete " + trip.title + "? This removes its itinerary, packing, places, and notes.");
    if (!confirmed) return;

    setSaveState("Deleting");
    fetch("/api/trips/" + trip.id, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not delete trip");
        const remaining = trips.filter((item) => item.id !== trip.id);
        setTrips(remaining);
        const nextTrip = remaining.find((item) => item.id === activeTripId) ?? remaining[0];
        if (nextTrip) selectTrip(nextTrip);
        setSaveState("Saved");
      })
      .catch(() => setSaveState("Could not delete trip"));
  }

  function reseedTrip(trip: TripRecord) {
    const confirmed = window.confirm(
      "Re-seed " + trip.title + "? This resets itinerary, packing, places, and notes using the trip dates.",
    );
    if (!confirmed) return;

    setSaveState("Re-seeding");
    fetch("/api/trips/" + trip.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reseed: true,
        title: trip.title,
        destination: trip.destination,
        dateRange: trip.dateRange,
        packingTemplate: selectedReseedTemplate,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not re-seed trip");
        return reloadTrips(trip.id);
      })
      .then(() => setSaveState("Saved"))
      .catch(() => setSaveState("Could not re-seed trip"));
  }

  function moveAgendaItem(fromIndex: number, toIndex: number) {
    if (!currentDay) return;
    updateDay(activeDay, {
      agenda: reorderList(currentDay.agenda, fromIndex, toIndex),
    });
    setMapStopIndex(toIndex);
  }

  function addDay() {
    const nextDay: DayPlan = {
      date: "New day",
      label: "Day " + (dataDays.length + 1),
      title: "Untitled plan",
      mood: "",
      drive: "",
      showMap: false,
      weatherNeed: "",
      agenda: [],
      bring: [],
      decisions: [],
    };
    saveTripData({ ...tripData, days: [...dataDays, nextDay] });
    setActiveDay(dataDays.length);
    setEditMode(true);
  }

  function addAgendaItem() {
    if (!currentDay) return;
    updateDay(activeDay, {
      agenda: [
        ...currentDay.agenda,
        { time: "Time", title: "New stop", detail: "", location: "" },
      ],
    });
    selectMapStop(currentDay.agenda.length);
  }

  function addRouteStopFromMap(
    patchData: Partial<DayPlan["agenda"][number]>,
    fallbackTitle = "Route stop",
  ) {
    if (!currentDay) return;
    const nextIndex = currentDay.agenda.length;
    const nextTitle = patchData.title?.trim() || fallbackTitle + " " + (nextIndex + 1);
    updateDay(activeDay, {
      agenda: [
        ...currentDay.agenda,
        {
          time: "Stop " + (nextIndex + 1),
          title: nextTitle,
          detail: "",
          location: patchData.location ?? nextTitle,
          lat: patchData.lat ?? "",
          lng: patchData.lng ?? "",
        },
      ],
    });
    setMapStopIndex(nextIndex);
    setMapDraft("");
    setMapApplyNote("Added " + nextTitle);
  }

  function updateAgendaItem(index: number, patchData: Partial<DayPlan["agenda"][number]>) {
    if (!currentDay) return;
    updateDay(activeDay, {
      agenda: currentDay.agenda.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patchData } : item,
      ),
    });
  }

  function updateAgendaLocationSearch(index: number, value: string) {
    updateAgendaItem(index, { location: value });
    setLocationSearch({
      index,
      query: value,
      results: [],
      status: value.trim().length >= 3 ? "loading" : "idle",
    });
  }

  function selectPlaceSuggestion(index: number, suggestion: PlaceSuggestion) {
    updateAgendaItem(index, {
      location: suggestion.detail ? suggestion.name + ", " + suggestion.detail : suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    selectMapStop(index);
    setLocationSearch({ index: null, query: "", results: [], status: "idle" });
    setMapApplyNote("Mapped " + suggestion.name);
  }

  function selectMapStop(index: number) {
    setMapStopIndex(index);
    setMapDraft("");
    setMapApplyNote("");
  }

  function showFullDayMap() {
    setHiddenMapDays((current) => ({ ...current, [mapVisibilityKey]: false }));
    setFocusRouteRequest((count) => count + 1);
  }

  function applyMapDraftToStop() {
    if (!mapDraft.trim()) return;
    const coordinates = parseCoordinates(mapDraft);
    const cleanDraft = mapDraft.replace(/\s+/g, " ").trim();
    const isUrl = /^https?:\/\//i.test(cleanDraft);
    if (!selectedStop) {
      addRouteStopFromMap(
        {
          title: coordinates ? "Route stop " + ((currentDay?.agenda.length ?? 0) + 1) : cleanDraft,
          location: coordinates && isUrl ? "Route stop " + ((currentDay?.agenda.length ?? 0) + 1) : cleanDraft,
          lat: coordinates?.lat ?? "",
          lng: coordinates?.lng ?? "",
        },
        "Route stop",
      );
      setMapApplyNote("Added first route stop");
      return;
    }
    updateAgendaItem(selectedStopIndex, {
      location: coordinates && isUrl ? selectedStop.location || selectedStop.title : cleanDraft,
      lat: coordinates?.lat ?? selectedStop.lat ?? "",
      lng: coordinates?.lng ?? selectedStop.lng ?? "",
    });
    setMapApplyNote("Saved to " + selectedStop.title);
  }

  function applyMapClickToStop(coordinates: { lat: string; lng: string }) {
    if (!selectedStop) {
      const nextTitle = "Route stop " + ((currentDay?.agenda.length ?? 0) + 1);
      addRouteStopFromMap({
        title: nextTitle,
        location: coordinates.lat + ", " + coordinates.lng,
        lat: coordinates.lat,
        lng: coordinates.lng,
      });
      setMapDraft(coordinates.lat + ", " + coordinates.lng);
      setMapApplyNote("Map click added " + nextTitle);
      return;
    }
    const selectedTitle = selectedStop.title;
    updateTripData((currentData) => ({
      ...currentData,
      days: (currentData.days ?? []).map((day, dayIndex) =>
        dayIndex === activeDay
          ? {
              ...day,
              agenda: day.agenda.map((item, itemIndex) =>
                itemIndex === selectedStopIndex
                  ? {
                      ...item,
                      lat: coordinates.lat,
                      lng: coordinates.lng,
                      location: item.location || item.title,
                    }
                  : item,
              ),
            }
          : day,
      ),
    }));
    setMapDraft(coordinates.lat + ", " + coordinates.lng);
    setMapApplyNote("Map click saved to " + selectedTitle);
  }

  function removeAgendaItem(index: number) {
    if (!currentDay) return;
    updateDay(activeDay, {
      agenda: currentDay.agenda.filter((_, itemIndex) => itemIndex !== index),
    });
    setMapStopIndex(0);
    setMapDraft("");
    setMapApplyNote("");
  }

  function uniqueChecklistId(label: string) {
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 36) || "item";
    let id = base;
    let counter = 1;
    while (dataChecklist.some((item) => item.id === id)) {
      counter += 1;
      id = base + "-" + counter;
    }
    return id;
  }

  function addChecklistItem(group = "General") {
    const draft = packingDrafts[group] ?? { label: "", note: "" };
    const label = draft.label.replace(/\s+/g, " ").trim();
    const note = draft.note.replace(/\s+/g, " ").trim();
    if (!label) return;
    const nextGroups = groups.includes(group) ? groups : [...groups, group];
    saveTripData({
      ...tripData,
      packingGroups: nextGroups,
      checklist: [
        ...dataChecklist,
        {
          id: uniqueChecklistId(label),
          label,
          group,
          note,
        },
      ],
    });
    setPackingDrafts((current) => ({
      ...current,
      [group]: { label: "", note: "" },
    }));
  }

  function addPackingGroup() {
    const group = newPackingGroup.replace(/\s+/g, " ").trim();
    if (!group) return;
    const nextGroups = groups.includes(group) ? groups : [...groups, group];
    saveTripData({
      ...tripData,
      packingGroups: nextGroups,
    });
    setSelectedGroups([]);
    setNewPackingGroup("");
    setShowNewPackingGroup(false);
  }

  function renamePackingGroup(oldGroup: string, nextGroupValue: string) {
    const nextGroup = nextGroupValue.replace(/\s+/g, " ").trim();
    if (!nextGroup || nextGroup === oldGroup) return;
    const nextGroups = groups.map((group) => (group === oldGroup ? nextGroup : group));
    saveTripData({
      ...tripData,
      packingGroups: [...new Set(nextGroups)],
      checklist: dataChecklist.map((item) =>
        item.group === oldGroup ? { ...item, group: nextGroup } : item,
      ),
    });
    setSelectedGroups((current) =>
      current.map((group) => (group === oldGroup ? nextGroup : group)),
    );
    setPackingDrafts((current) => {
      const next = { ...current };
      if (next[oldGroup] && !next[nextGroup]) next[nextGroup] = next[oldGroup];
      delete next[oldGroup];
      return next;
    });
  }

  function removePackingGroup(group: string) {
    saveTripData({
      ...tripData,
      packingGroups: groups.filter((item) => item !== group),
      checklist: dataChecklist.filter((item) => item.group !== group),
    });
    setSelectedGroups((current) => current.filter((item) => item !== group));
  }

  function updateChecklistItem(index: number, patchData: Partial<ChecklistItem>) {
    saveTripData({
      ...tripData,
      checklist: dataChecklist.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patchData } : item,
      ),
    });
  }

  function moveChecklistItem(fromIndex: number, toIndex: number) {
    saveTripData({
      ...tripData,
      checklist: reorderList(dataChecklist, fromIndex, toIndex),
    });
  }

  function addPackingSuggestion(suggestion: ChecklistItem) {
    let id = suggestion.id;
    let counter = 1;
    while (dataChecklist.some((item) => item.id === id)) {
      counter += 1;
      id = suggestion.id + "-" + counter;
    }
    saveTripData({
      ...tripData,
      checklist: [...dataChecklist, { ...suggestion, id }],
    });
  }

  function savePackingTemplates(nextTemplates: PackingTemplate[]) {
    setPackingTemplates(nextTemplates);
    setSaveState("Saving");
    fetch("/api/packing-templates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templates: nextTemplates }),
    })
      .then(() => setSaveState("Saved"))
      .catch(() => setSaveState("Could not save"));
  }

  function applyPackingTemplate(template: PackingTemplate) {
    const existingLabels = new Set(dataChecklist.map((item) => item.label.toLowerCase()));
    const additions = template.items
      .filter((item) => !existingLabels.has(item.label.toLowerCase()))
      .map((item) => ({
        ...item,
        id: uniqueChecklistId(template.id + "-" + item.label),
      }));
    const nextGroups = [
      ...new Set([
        ...groups,
        ...template.items.map((item) => item.group),
      ].filter(Boolean)),
    ];

    saveTripData({
      ...tripData,
      packingGroups: nextGroups,
      checklist: [...dataChecklist, ...additions],
    });
  }

  function createPackingTemplate() {
    const name = newTemplateDraft.name.replace(/\s+/g, " ").trim();
    if (!name) return;
    const idBase =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "template";
    let id = idBase;
    let counter = 1;
    while (packingTemplates.some((template) => template.id === id)) {
      counter += 1;
      id = idBase + "-" + counter;
    }
    const nextTemplate: PackingTemplate = {
      id,
      name,
      description: newTemplateDraft.description.replace(/\s+/g, " ").trim(),
      items: [],
    };
    savePackingTemplates([...packingTemplates, nextTemplate]);
    setSelectedPackingTemplateId(id);
    setNewTemplateDraft({ name: "", description: "" });
  }

  function updatePackingTemplate(templateId: string, patchData: Partial<PackingTemplate>) {
    savePackingTemplates(
      packingTemplates.map((template) =>
        template.id === templateId ? { ...template, ...patchData } : template,
      ),
    );
  }

  function removePackingTemplate(templateId: string) {
    const nextTemplates = packingTemplates.filter((template) => template.id !== templateId);
    savePackingTemplates(nextTemplates);
    setSelectedPackingTemplateId(nextTemplates[0]?.id ?? "");
  }

  function addTemplateItem(templateId: string) {
    const draft = templateItemDrafts[templateId] ?? { label: "", group: "", note: "" };
    const label = draft.label.replace(/\s+/g, " ").trim();
    if (!label) return;
    const group = draft.group.replace(/\s+/g, " ").trim() || "General";
    const note = draft.note.replace(/\s+/g, " ").trim();
    savePackingTemplates(
      packingTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              items: [
                ...template.items,
                {
                  id: template.id + "-" + uniqueChecklistId(label),
                  label,
                  group,
                  note,
                },
              ],
            }
          : template,
      ),
    );
    setTemplateItemDrafts((current) => ({
      ...current,
      [templateId]: { label: "", group: "", note: "" },
    }));
  }

  function updateTemplateItem(templateId: string, itemIndex: number, patchData: Partial<ChecklistItem>) {
    savePackingTemplates(
      packingTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              items: template.items.map((item, index) =>
                index === itemIndex ? { ...item, ...patchData } : item,
              ),
            }
          : template,
      ),
    );
  }

  function removeTemplateItem(templateId: string, itemIndex: number) {
    savePackingTemplates(
      packingTemplates.map((template) =>
        template.id === templateId
          ? {
              ...template,
              items: template.items.filter((_, index) => index !== itemIndex),
            }
          : template,
      ),
    );
  }

  function removeChecklistItem(index: number) {
    saveTripData({
      ...tripData,
      checklist: dataChecklist.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function addPlace() {
    saveTripData({
      ...tripData,
      places: [
        ...dataPlaces,
        { name: "", type: "Idea", status: "Maybe", note: "", address: "", mapUrl: "", website: "", imageUrl: "" },
      ],
    });
    setEditMode(true);
  }

  function updatePlace(index: number, patchData: Partial<Place>) {
    saveTripData({
      ...tripData,
      places: dataPlaces.map((place, placeIndex) =>
        placeIndex === index ? { ...place, ...patchData } : place,
      ),
    });
  }

  function handlePlaceImageUpload(index: number, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      updatePlace(index, {
        imageUrl: reader.result,
        imageAlt: dataPlaces[index]?.name ? dataPlaces[index].name + " photo" : "Uploaded place photo",
      });
    };
    reader.readAsDataURL(file);
  }

  function fetchPlaceWebsiteImage(index: number) {
    const website = normalizeExternalUrl(dataPlaces[index]?.website);
    if (!website) return;
    setPreviewLoadingPlace(index);
    fetch("/api/place-preview?url=" + encodeURIComponent(website))
      .then((response) => response.json())
      .then((payload: { imageUrl?: string; error?: string }) => {
        if (payload.imageUrl) {
          updatePlace(index, { website, imageUrl: payload.imageUrl });
        }
      })
      .finally(() => setPreviewLoadingPlace((current) => (current === index ? null : current)));
  }

  function removePlace(index: number) {
    saveTripData({
      ...tripData,
      places: dataPlaces.filter((_, placeIndex) => placeIndex !== index),
    });
  }

  function createTrip() {
    if (!newTrip.title.trim()) return;
    fetch("/api/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...newTrip,
        packingTemplate: selectedNewTripTemplate,
      }),
    })
      .then((response) => response.json())
      .then((payload: { trip: TripRecord }) => {
        setTrips((current) => [payload.trip, ...current]);
        selectTrip(payload.trip);
        setNewTrip({ title: "", destination: "", dateRange: "", packingTemplateId: "" });
        setShowNewTrip(false);
      })
      .catch(() => setSaveState("Could not create trip"));
  }

  const pageTitle =
    activeView === "home"
      ? "Your trips"
      : activeView === "itinerary"
        ? "Itinerary"
        : activeView === "packing"
          ? "Packing"
          : activeView === "places"
            ? "Saved places"
            : activeView === "admin"
              ? "Admin"
              : "Trip notes";

  return (
    <main className="app-shell">
      <aside className={mobileNav ? "sidebar is-open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/app-logo.png" />
          </div>
          <div>
            <strong>Burns Travel</strong>
            <small>Family trip planner</small>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? "nav-item is-active" : "nav-item"}
                key={item.id}
                onClick={() => navigate(item.id)}
                type="button"
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "packing" && <em>{progress}%</em>}
              </button>
            );
          })}
        </nav>

        {activeTrip && (
          <button className="sidebar-trip" onClick={() => navigate("home")} type="button">
            <span className="trip-thumb" />
            <span>
              <small>Active trip</small>
              <strong>{activeTrip.title}</strong>
              <em>{activeTrip.dateRange}</em>
            </span>
            <ChevronRight size={17} />
          </button>
        )}
        <div className="sidebar-footer">
          <span>
            <span className={saveState === "Saved" ? "save-dot" : "save-dot is-saving"} />
            {saveState}
          </span>
          <span className="app-version" title={"Burns Travel Planner " + APP_VERSION}>
            {APP_VERSION}
          </span>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
          type="button"
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
              type="button"
            >
              <Menu size={21} />
            </button>
            <div>
              {activeView !== "home" && (
                <span className="breadcrumb">
                  {activeTrip?.title ?? "Trip"} <ChevronRight size={13} /> {pageTitle}
                </span>
              )}
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            {activeView !== "home" && (
              <button
                className={editMode ? "button secondary is-active" : "button secondary"}
                onClick={() => setEditMode((value) => !value)}
                type="button"
              >
                {editMode ? <Check size={17} /> : <Edit3 size={17} />}
                {editMode ? "Done" : "Edit"}
              </button>
            )}
            <button
              className="avatar-button"
              aria-label="Account menu"
              title="Private family workspace"
              type="button"
            >
              KB
            </button>
          </div>
        </header>

        {activeView === "home" && (
          <div className="dashboard">
            <section className="welcome-row">
              <div>
                <span className="kicker">Family travel, organized</span>
                <h2>Everything for the next adventure, in one place.</h2>
                <p>
                  Build the plan, map the drive, remember the towels, and keep the good
                  ideas for next time.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => setShowNewTrip(true)}
                type="button"
              >
                <Plus size={18} /> New trip
              </button>
            </section>

            {activeTrip && (
              <section className="trip-feature">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={activeTrip.title + " hero image"} src={activeHeroImage} />
                <div className="feature-shade" />
                <div className="feature-content">
                  <span className="status-badge">
                    <span /> {activeTrip.status}
                  </span>
                  <div>
                    <span className="feature-date">
                      <CalendarDays size={16} /> {activeTrip.dateRange}
                    </span>
                    <h2>{activeTrip.title}</h2>
                    <p>{activeTrip.summary}</p>
                    <div className="feature-actions">
                      <button
                        className="button light"
                        onClick={() => navigate("itinerary")}
                        type="button"
                      >
                        Open trip <ArrowRight size={17} />
                      </button>
                      <button
                        className="button light"
                        onClick={() => setShowTripBook(true)}
                        type="button"
                      >
                        <FileText size={17} /> Trip book
                      </button>
                      <button
                        className="icon-button glass"
                        aria-label="More trip options"
                        title="More trip options"
                        onClick={() => setShowTripSettings(true)}
                        type="button"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="feature-stats">
                  <span><strong>{dataDays.length}</strong> days</span>
                  <span><strong>{dataPlaces.length}</strong> places</span>
                  <span><strong>{progress}%</strong> packed</span>
                </div>
              </section>
            )}

            {activeTrip && (
              <section className="settings-overview">
                <div>
                  <span className="kicker">Trip settings</span>
                  <h3>{activeTrip.destination}</h3>
                  <p>{activeTrip.dateRange} · {activeTrip.status}</p>
                </div>
                <div className="settings-overview-actions">
                  <button className="button secondary" onClick={() => setShowTripSettings(true)} type="button">
                    <Settings size={16} /> Edit trip
                  </button>
                  <button className="button quiet" onClick={cloneTripAsTemplate} type="button">
                    <Copy size={16} /> Clone template
                  </button>
                  <button className="button secondary" onClick={() => setShowTripBook(true)} type="button">
                    <FileText size={16} /> Export PDF
                  </button>
                </div>
              </section>
            )}

            <section className="dashboard-lower">
              <div className="saved-trips-section">
                <div className="section-title">
                  <div><span className="kicker">Trip library</span><h3>Saved trips</h3></div>
                  <span>{trips.length} total</span>
                </div>
                <div className="trip-card-grid">
                  {trips.map((trip, index) => (
                    <button
                      className={activeTripId === trip.id ? "trip-card is-active" : "trip-card"}
                      key={trip.id}
                      onClick={() => selectTrip(trip, true)}
                      type="button"
                    >
                      <div
                        className="trip-card-image"
                        style={{
                          backgroundImage:
                            'url("' + areaImages[index % areaImages.length].url + '")',
                        }}
                      >
                        <span>{trip.status}</span>
                      </div>
                      <div className="trip-card-copy">
                        <strong>{trip.title}</strong>
                        <small><MapPin size={14} /> {trip.destination || "Destination TBD"}</small>
                        <em>{trip.dateRange || "Dates TBD"}</em>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                  <button
                    className="trip-card add-trip-card"
                    onClick={() => setShowNewTrip(true)}
                    type="button"
                  >
                    <span><Plus size={22} /></span>
                    <strong>Plan another trip</strong>
                    <small>Start with a clean, reusable workspace</small>
                  </button>
                </div>
              </div>

              <aside className="readiness-panel">
                <div className="section-title">
                  <div><span className="kicker">At a glance</span><h3>Trip readiness</h3></div>
                </div>
                <div className="readiness-score">
                  <div
                    className="score-ring"
                    style={{ "--score": progress * 3.6 + "deg" } as React.CSSProperties}
                  >
                    <span>{progress}%</span>
                  </div>
                  <div>
                    <strong>Packing progress</strong>
                    <small>{packedCount} of {dataChecklist.length} items ready</small>
                  </div>
                </div>
                <button className="readiness-row" onClick={() => navigate("itinerary")} type="button">
                  <span className="row-icon coral"><CalendarDays size={18} /></span>
                  <span><strong>{dataDays.length} days planned</strong><small>Review the daily itinerary</small></span>
                  <ChevronRight size={17} />
                </button>
                <button className="readiness-row" onClick={() => navigate("packing")} type="button">
                  <span className="row-icon teal"><ClipboardCheck size={18} /></span>
                  <span><strong>{dataChecklist.length - packedCount} things left</strong><small>Continue packing</small></span>
                  <ChevronRight size={17} />
                </button>
                <button className="readiness-row" onClick={() => navigate("places")} type="button">
                  <span className="row-icon gold"><MapPin size={18} /></span>
                  <span><strong>{dataPlaces.length} places saved</strong><small>Food, beaches, and backups</small></span>
                  <ChevronRight size={17} />
                </button>
              </aside>
            </section>
          </div>
        )}

        {activeView === "itinerary" && (
          <div className="itinerary-layout">
            <div className="day-strip" aria-label="Trip days">
              {dataDays.map((day, index) => (
                <button
                  className={activeDay === index ? "day-tab is-active" : "day-tab"}
                  key={day.date + "-" + index}
                  onClick={() => {
                    setActiveDay(index);
                    setMapStopIndex(0);
                    setRouteSummary(blankRouteSummary());
                    setMapDraft("");
                    setMapApplyNote("");
                  }}
                  type="button"
                >
                  <span>{day.label}</span>
                  <strong>{day.date.replace(/^[^,]+,\s*/, "")}</strong>
                  <small>{day.title}</small>
                </button>
              ))}
              <button className="day-tab add-day" onClick={addDay} type="button">
                <Plus size={20} /><span>Add day</span>
              </button>
            </div>

            {currentDay ? (
              <>
                <section className="day-hero">
                  <div>
                    <span className="kicker">{currentDay.label} · {currentDay.date}</span>
                    {editMode ? (
                      <div className="day-edit-heading">
                        <input aria-label="Day label" value={currentDay.label} onChange={(event) => updateDay(activeDay, { label: event.target.value })} />
                        <input aria-label="Day date" value={currentDay.date} onChange={(event) => updateDay(activeDay, { date: event.target.value })} />
                        <input className="title-input" aria-label="Day title" value={currentDay.title} onChange={(event) => updateDay(activeDay, { title: event.target.value })} />
                      </div>
                    ) : (
                      <h2>{currentDay.title}</h2>
                    )}
                    {editMode ? (
                      <textarea aria-label="Day description" value={currentDay.mood} onChange={(event) => updateDay(activeDay, { mood: event.target.value })} />
                    ) : (
                      <p>{currentDay.mood}</p>
                    )}
                  </div>
                  <div className="day-meta">
                    <span><Clock3 size={16} /> {currentDay.agenda.length} planned moments</span>
                    <span><Luggage size={16} /> {currentDay.bring.length} day-pack items</span>
                    {editMode && (
                      <label className="toggle-control day-map-toggle">
                        <input
                          checked={Boolean(currentDay.showMap)}
                          onChange={(event) => updateDay(activeDay, { showMap: event.target.checked })}
                          type="checkbox"
                        />
                        <span />
                        Route map
                      </label>
                    )}
                  </div>
                </section>

                {isDriveDay && mapHidden && (
                  <section className="route-collapsed-panel">
                    <div>
                      <span className="kicker"><Navigation size={14} /> Route map hidden</span>
                      <h3>Map data is still saved</h3>
                      <p>
                        {routeSummary.status === "ready"
                          ? formatRouteDuration(routeSummary.durationMinutes) + " · " + formatRouteDistance(routeSummary.distanceMiles)
                          : currentDay.agenda.length + " stops ready when you show the map"}
                      </p>
                    </div>
                    <button
                      className="button route-visibility-button"
                      onClick={() =>
                        setHiddenMapDays((current) => ({ ...current, [mapVisibilityKey]: false }))
                      }
                      type="button"
                    >
                      <Eye size={16} /> Show map
                    </button>
                  </section>
                )}

                {isDriveDay && !mapHidden && (
                  <section className="route-workspace">
                    <div className="map-panel">
                      <ItineraryClickMap
                        focusRouteRequest={focusRouteRequest}
                        onPick={applyMapClickToStop}
                        onRouteSummary={setRouteSummary}
                        onSelectStop={selectMapStop}
                        previewLabel={previewLocation}
                        selectedIndex={selectedStopIndex}
                        selectedStopTitle={selectedStop?.title ?? "Click map to add stop"}
                        stops={currentDay.agenda}
                      />
                    </div>
                    <div className="route-summary">
                      <div className="route-summary-heading">
                        <div>
                          <span className="kicker"><Navigation size={14} /> Drive day route</span>
                          <h3>{selectedStop ? "Map " + selectedStop.title : "Add your first stop"}</h3>
                        </div>
                        <button
                          className="icon-button map-hide-button"
                          onClick={() =>
                            setHiddenMapDays((current) => ({ ...current, [mapVisibilityKey]: true }))
                          }
                          aria-label="Hide map"
                          title="Hide map"
                          type="button"
                        >
                          <EyeOff size={16} />
                        </button>
                      </div>
                      <div className="route-stats">
                        <span><Clock3 size={14} /> {formatRouteDuration(routeSummary.durationMinutes)}</span>
                        <span><Route size={14} /> {formatRouteDistance(routeSummary.distanceMiles)}</span>
                        <small>
                          {routeSummary.status === "ready"
                            ? routeSummary.pointCount + " mapped stops routed"
                            : routeSummary.status === "loading"
                              ? "Calculating from mapped stops"
                              : routeSummary.status === "error"
                                ? "Could not calculate the road route"
                                : "Add 2 mapped stops for drive time"}
                        </small>
                      </div>
                      <button
                        className="button route-focus-button"
                        disabled={routeSummary.status !== "ready"}
                        onClick={showFullDayMap}
                        type="button"
                      >
                        <Route size={16} />
                        {routeSummary.status === "ready"
                          ? "Show full map"
                          : routeSummary.status === "loading"
                            ? "Calculating route"
                            : "Map 2 stops first"}
                      </button>
                      <div className="map-editor">
                        <label htmlFor="map-search">
                          {selectedStop
                            ? "Click the map, or paste a map target"
                            : "Click the map to add a stop, or paste a place"}
                        </label>
                        <div className="map-search-row">
                          <Search size={15} />
                          <input
                            id="map-search"
                            aria-label="Search, address, Google Maps link, or coordinates"
                            placeholder="Place, address, Maps link, or 43.234, -86.335"
                            value={mapDraft}
                            onChange={(event) => {
                              setMapDraft(event.target.value);
                              setMapApplyNote("");
                            }}
                          />
                        </div>
                        {parsedDraftCoordinates && (
                          <div className="coordinate-preview">
                            <Target size={14} />
                            <span>{parsedDraftCoordinates.lat}, {parsedDraftCoordinates.lng}</span>
                          </div>
                        )}
                        <div className="map-editor-actions">
                          <button
                            className="button route-apply-button"
                            disabled={!mapDraft.trim()}
                            onClick={applyMapDraftToStop}
                            type="button"
                          >
                            <CheckCircle2 size={16} /> {selectedStop ? "Apply to selected stop" : "Add as stop"}
                          </button>
                          {!selectedStop && (
                            <button
                              className="button quiet"
                              onClick={() => addRouteStopFromMap({ title: "Route stop " + (currentDay.agenda.length + 1) })}
                              type="button"
                            >
                              <Plus size={16} /> Add blank stop
                            </button>
                          )}
                          <button
                            className="map-clear-button"
                            onClick={() => {
                              setMapDraft("");
                              setMapApplyNote("");
                            }}
                            type="button"
                          >
                            Use saved
                          </button>
                        </div>
                        {mapApplyNote && <span className="save-note">{mapApplyNote}</span>}
                      </div>
                      <div className="route-stop-list">
                        {currentDay.agenda.length ? (
                          currentDay.agenda.map((item, index) => (
                            <button
                              className={selectedStopIndex === index ? "route-stop is-active" : "route-stop"}
                              key={item.title + "-" + index}
                              onClick={() => selectMapStop(index)}
                              type="button"
                            >
                              <span className="stop-number">{index + 1}</span>
                              <span>
                                <strong>{item.title}</strong>
                                <small>{agendaLocation(item)}</small>
                                {item.lat?.trim() && item.lng?.trim() && (
                                  <small className="coordinate-line">{item.lat}, {item.lng}</small>
                                )}
                                {selectedStopIndex === index && <small className="selected-stop-label">Selected for map</small>}
                              </span>
                              <ChevronRight size={16} />
                            </button>
                          ))
                        ) : (
                          <div className="route-empty-state">
                            <MapPin size={18} />
                            <strong>No route stops yet</strong>
                            <span>Click the map to drop Stop 1, or paste a place above.</span>
                          </div>
                        )}
                      </div>
                      <a className="button route-button" href={routeUrl} target="_blank" rel="noreferrer">
                        <Route size={17} /> Open full route <ExternalLink size={15} />
                      </a>
                    </div>
                  </section>
                )}

                <section className="day-content-grid">
                  <div className="timeline-panel">
                    <div className="section-title">
                      <div><span className="kicker">Day plan</span><h3>Timeline</h3></div>
                      {isDriveDay && !editMode && (
                        <button
                          className="button quiet timeline-full-map-button"
                          disabled={routeSummary.status !== "ready"}
                          onClick={showFullDayMap}
                          type="button"
                        >
                          <Route size={16} />
                          {routeSummary.status === "ready"
                            ? "Show full map"
                            : routeSummary.status === "loading"
                              ? "Calculating route"
                              : "Map 2 stops first"}
                        </button>
                      )}
                      {editMode && (
                        <button className="button quiet" onClick={addAgendaItem} type="button">
                          <Plus size={16} /> Add stop
                        </button>
                      )}
                    </div>
                    <div className="timeline">
                      {currentDay.agenda.map((item, index) => (
                        <article
                          className={
                            [
                              "timeline-item",
                              isDriveDay && !editMode ? "is-map-clickable" : "",
                              isDriveDay && selectedStopIndex === index ? "is-map-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")
                          }
                          draggable={editMode}
                          onClick={() => {
                            if (isDriveDay && !editMode) selectMapStop(index);
                          }}
                          onDragStart={() => setDraggingAgendaIndex(index)}
                          onDragOver={(event) => {
                            if (editMode) event.preventDefault();
                          }}
                          onDrop={() => {
                            if (draggingAgendaIndex === null) return;
                            moveAgendaItem(draggingAgendaIndex, index);
                            setDraggingAgendaIndex(null);
                          }}
                          onKeyDown={(event) => {
                            if (!isDriveDay || editMode) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectMapStop(index);
                            }
                          }}
                          key={item.time + "-" + index}
                          role={isDriveDay && !editMode ? "button" : undefined}
                          tabIndex={isDriveDay && !editMode ? 0 : undefined}
                        >
                          <div className="timeline-time">
                            {editMode ? (
                              <input aria-label="Time" value={item.time} onChange={(event) => updateAgendaItem(index, { time: event.target.value })} />
                            ) : item.time}
                          </div>
                          <div className="timeline-marker"><span /></div>
                          <div className="timeline-copy">
                            {editMode ? (
                              <>
                                <div className="reorder-row">
                                  <span className="drag-handle" title="Drag to reorder"><GripVertical size={16} /></span>
                                  <button className="icon-button mini" disabled={index === 0} onClick={() => moveAgendaItem(index, index - 1)} aria-label={"Move " + item.title + " earlier"} type="button"><ArrowUp size={14} /></button>
                                  <button className="icon-button mini" disabled={index === currentDay.agenda.length - 1} onClick={() => moveAgendaItem(index, index + 1)} aria-label={"Move " + item.title + " later"} type="button"><ArrowDown size={14} /></button>
                                </div>
                                <input className="item-title-input" aria-label="Agenda title" value={item.title} onChange={(event) => updateAgendaItem(index, { title: event.target.value })} />
                                <div className="location-search-field">
                                  <input
                                    aria-label="Map location"
                                    autoComplete="off"
                                    placeholder="Map location or address"
                                    value={item.location ?? ""}
                                    onChange={(event) => updateAgendaLocationSearch(index, event.target.value)}
                                    onFocus={() =>
                                      setLocationSearch({
                                        index,
                                        query: item.location ?? "",
                                        results: [],
                                        status: (item.location ?? "").trim().length >= 3 ? "loading" : "idle",
                                      })
                                    }
                                  />
                                  {locationSearch.index === index && (
                                    <div className="location-suggestions" role="listbox" aria-label="Map location suggestions">
                                      {locationSearch.status === "idle" && (
                                        <span>Type 3+ characters to search places.</span>
                                      )}
                                      {locationSearch.status === "loading" && (
                                        <span>Searching map places...</span>
                                      )}
                                      {locationSearch.status === "empty" && (
                                        <span>No places found. Try city and state.</span>
                                      )}
                                      {locationSearch.status === "error" && (
                                        <span>Place search is unavailable right now.</span>
                                      )}
                                      {locationSearch.results.map((suggestion) => (
                                        <button
                                          key={suggestion.id}
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => selectPlaceSuggestion(index, suggestion)}
                                          aria-selected="false"
                                          role="option"
                                          type="button"
                                        >
                                          <MapPin size={15} />
                                          <span>
                                            <strong>{suggestion.name}</strong>
                                            <small>{suggestion.detail || suggestion.lat + ", " + suggestion.lng}</small>
                                          </span>
                                        </button>
                                      ))}
                                      <button
                                        className="location-suggestions-close"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setLocationSearch({ index: null, query: "", results: [], status: "idle" })}
                                        type="button"
                                      >
                                        Close suggestions
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="coordinate-fields">
                                  <input aria-label="Latitude" placeholder="Latitude" value={item.lat ?? ""} onChange={(event) => updateAgendaItem(index, { lat: event.target.value })} />
                                  <input aria-label="Longitude" placeholder="Longitude" value={item.lng ?? ""} onChange={(event) => updateAgendaItem(index, { lng: event.target.value })} />
                                </div>
                                <textarea aria-label="Agenda details" value={item.detail} onChange={(event) => updateAgendaItem(index, { detail: event.target.value })} />
                                <button className="delete-button" onClick={() => removeAgendaItem(index)} aria-label={"Remove " + item.title} type="button"><Trash2 size={15} /> Remove</button>
                              </>
                            ) : (
                              <>
                                <div className="timeline-title-row">
                                  <h4>{item.title}</h4>
                                  {isDriveDay && (
                                    <span className="map-link">
                                      <MapPin size={14} /> {selectedStopIndex === index ? "Selected for map" : "Show on map"}
                                    </span>
                                  )}
                                </div>
                                <p>{item.detail}</p>
                                {isDriveDay && (
                                  <span className="location-line">
                                    {agendaLocation(item)}
                                    {item.lat?.trim() && item.lng?.trim() ? " · " + item.lat + ", " + item.lng : ""}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <aside className="day-sidebar">
                    <section className="insight-card route-note">
                      <span className="card-icon"><Route size={19} /></span>
                      <span className="kicker">Route notes</span>
                      {editMode ? (
                        <textarea aria-label="Route notes" value={currentDay.drive} onChange={(event) => updateDay(activeDay, { drive: event.target.value })} />
                      ) : <p>{currentDay.drive}</p>}
                    </section>
                    <section className="insight-card weather-card">
                      <span className="card-icon"><CloudSun size={19} /></span>
                      <span className="kicker">Weather + conditions</span>
                      {editMode ? (
                        <textarea aria-label="Weather and conditions" value={currentDay.weatherNeed} onChange={(event) => updateDay(activeDay, { weatherNeed: event.target.value })} />
                      ) : <p>{currentDay.weatherNeed}</p>}
                    </section>
                    <section className="insight-card">
                      <span className="card-icon"><Luggage size={19} /></span>
                      <span className="kicker">Bring today</span>
                      {editMode ? (
                        <textarea aria-label="Bring items" value={currentDay.bring.join("\n")} onChange={(event) => updateDay(activeDay, { bring: event.target.value.split("\n").filter(Boolean) })} />
                      ) : (
                        <ul>{currentDay.bring.map((item) => <li key={item}><Check size={14} /> {item}</li>)}</ul>
                      )}
                    </section>
                    <section className="insight-card">
                      <span className="card-icon"><Sparkles size={19} /></span>
                      <span className="kicker">Decide later</span>
                      {editMode ? (
                        <textarea aria-label="Decisions" value={currentDay.decisions.join("\n")} onChange={(event) => updateDay(activeDay, { decisions: event.target.value.split("\n").filter(Boolean) })} />
                      ) : (
                        <ul className="decision-list">{currentDay.decisions.map((item) => <li key={item}><CircleDot size={13} /> {item}</li>)}</ul>
                      )}
                    </section>
                  </aside>
                </section>
              </>
            ) : (
              <section className="empty-state">
                <CalendarDays size={28} />
                <h2>No days planned yet</h2>
                <button className="button primary" onClick={addDay} type="button">
                  <Plus size={17} /> Add the first day
                </button>
              </section>
            )}
          </div>
        )}

        {activeView === "packing" && (
          <div className="content-page">
            <section className="packing-header">
              <div>
                <span className="kicker">Ready without the scramble</span>
                <h2>Pack once. Relax sooner.</h2>
                <p>Check things off as they reach the car. Filter by category when one person owns a section.</p>
              </div>
              <div className="packing-score">
                <div className="score-ring large" style={{ "--score": progress * 3.6 + "deg" } as React.CSSProperties}><span>{progress}%</span></div>
                <div><strong>{packedCount} packed</strong><small>{dataChecklist.length - packedCount} remaining</small></div>
              </div>
            </section>
            <div className="packing-toolbar">
              <div className="packing-tools">
                <div className="search-control">
                  <Search size={16} />
                  <input
                    aria-label="Search packing list"
                    placeholder="Search packing"
                    value={packingQuery}
                    onChange={(event) => setPackingQuery(event.target.value)}
                  />
                </div>
                <label className="toggle-control">
                  <input
                    checked={showUnpackedOnly}
                    onChange={() => setShowUnpackedOnly((current) => !current)}
                    type="checkbox"
                  />
                  <span />
                  Needs packing
                </label>
                <div className="filter-row">
                  <button className={!selectedGroups.length ? "is-active" : ""} onClick={() => setSelectedGroups([])} type="button">All</button>
                  {groups.map((group) => (
                    <button
                      className={selectedGroups.includes(group) ? "is-active" : ""}
                      key={group}
                      onClick={() =>
                        setSelectedGroups((current) =>
                          current.includes(group)
                            ? current.filter((value) => value !== group)
                            : [...current, group],
                        )
                      }
                      type="button"
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              <button className="button primary" onClick={() => setShowNewPackingGroup((current) => !current)} type="button">
                <Plus size={17} /> Add section
              </button>
            </div>
            {packingTemplates.length > 0 && (
              <section className="template-apply-panel">
                <div>
                  <span className="kicker">Packing templates</span>
                  <h3>Apply a reusable list to this trip</h3>
                  <p>Templates are managed centrally in Admin. Applying one copies missing items into this trip only.</p>
                </div>
                <select
                  aria-label="Packing template"
                  value={selectedPackingTemplate?.id ?? ""}
                  onChange={(event) => setSelectedPackingTemplateId(event.target.value)}
                >
                  {packingTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                <button
                  className="button route-apply-button"
                  disabled={!selectedPackingTemplate}
                  onClick={() => selectedPackingTemplate && applyPackingTemplate(selectedPackingTemplate)}
                  type="button"
                >
                  <Plus size={16} /> Apply template
                </button>
              </section>
            )}
            {showNewPackingGroup && (
              <section className="add-section-panel">
                <div>
                  <span className="kicker">New packing section</span>
                  <h3>Start another list group</h3>
                </div>
                <input
                  aria-label="New section name"
                  placeholder="Section name, like Car, Kids, Beach"
                  value={newPackingGroup}
                  onChange={(event) => setNewPackingGroup(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addPackingGroup();
                  }}
                />
                <button className="button route-apply-button" disabled={!newPackingGroup.trim()} onClick={addPackingGroup} type="button">
                  <Plus size={16} /> Add section
                </button>
              </section>
            )}
            <div className="packing-groups">
              {packingSuggestions.length > 0 && (
                <section className="suggestion-panel">
                  <div className="section-title">
                    <div><span className="kicker">Smart packing prompts</span><h3>Suggested for this trip</h3></div>
                  </div>
                  <div className="suggestion-list">
                    {packingSuggestions.map((suggestion) => (
                      <article className="suggestion-card" key={suggestion.id}>
                        <div>
                          <strong>{suggestion.label}</strong>
                          <small>{suggestion.note}</small>
                        </div>
                        <button className="button quiet" onClick={() => addPackingSuggestion(suggestion)} type="button">
                          <Plus size={15} /> Add
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {visibleGroups.map((group) => {
                const items = visibleChecklist.filter((item) => item.group === group);
                const complete = items.filter((item) => packed[item.id]).length;
                return (
                  <section className="packing-group" key={group}>
                    <div className="group-heading">
                      <span className="row-icon teal"><ListChecks size={18} /></span>
                      <div>
                        {editMode ? (
                          <input
                            aria-label={"Rename " + group + " section"}
                            className="group-name-input"
                            defaultValue={group}
                            onBlur={(event) => renamePackingGroup(group, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                        ) : (
                          <h3>{group}</h3>
                        )}
                        <small>{complete} of {items.length} packed</small>
                      </div>
                      {editMode && (
                        <button className="icon-button delete-icon" onClick={() => removePackingGroup(group)} aria-label={"Remove " + group + " section"} type="button">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <div className="packing-list">
                      {items.map((item) => {
                        const index = dataChecklist.findIndex((entry) => entry.id === item.id);
                        return (
                          <div
                            className={packed[item.id] ? "packing-item is-done" : "packing-item"}
                            draggable={editMode}
                            key={item.id}
                            onDragStart={() => setDraggingChecklistIndex(index)}
                            onDragOver={(event) => {
                              if (editMode) event.preventDefault();
                            }}
                            onDrop={() => {
                              if (draggingChecklistIndex === null) return;
                              moveChecklistItem(draggingChecklistIndex, index);
                              setDraggingChecklistIndex(null);
                            }}
                          >
                            <label>
                              <input checked={Boolean(packed[item.id])} onChange={() => {
                                packedDirty.current = true;
                                setPacked((current) => {
                                  const nextPacked = { ...current, [item.id]: !current[item.id] };
                                  setTrips((currentTrips) =>
                                    currentTrips.map((trip) =>
                                      trip.id === activeTripId ? { ...trip, packed: nextPacked } : trip,
                                    ),
                                  );
                                  return nextPacked;
                                });
                              }} type="checkbox" />
                              <span className="custom-check"><Check size={14} /></span>
                            </label>
                            {editMode ? (
                              <div className="packing-edit">
                                <div className="reorder-row">
                                  <span className="drag-handle" title="Drag to reorder"><GripVertical size={16} /></span>
                                  <button className="icon-button mini" disabled={index === 0} onClick={() => moveChecklistItem(index, index - 1)} aria-label={"Move " + item.label + " earlier"} type="button"><ArrowUp size={14} /></button>
                                  <button className="icon-button mini" disabled={index === dataChecklist.length - 1} onClick={() => moveChecklistItem(index, index + 1)} aria-label={"Move " + item.label + " later"} type="button"><ArrowDown size={14} /></button>
                                </div>
                                <input aria-label="Packing item name" value={item.label} onChange={(event) => updateChecklistItem(index, { label: event.target.value })} />
                                <input aria-label="Packing item note" placeholder="Optional note" value={item.note ?? ""} onChange={(event) => updateChecklistItem(index, { note: event.target.value })} />
                              </div>
                            ) : (
                              <div><strong>{item.label}</strong>{item.note && <small>{item.note}</small>}</div>
                            )}
                            {editMode && (
                              <button className="icon-button delete-icon" onClick={() => removeChecklistItem(index)} aria-label={"Remove " + item.label} type="button"><Trash2 size={16} /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <form
                      className="quick-add-item"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addChecklistItem(group);
                      }}
                    >
                      <input
                        aria-label={"Add item to " + group}
                        placeholder="Item name"
                        value={packingDrafts[group]?.label ?? ""}
                        onChange={(event) =>
                          setPackingDrafts((current) => ({
                            ...current,
                            [group]: { label: event.target.value, note: current[group]?.note ?? "" },
                          }))
                        }
                      />
                      <input
                        aria-label={"Add note to " + group + " item"}
                        placeholder="Desc / note"
                        value={packingDrafts[group]?.note ?? ""}
                        onChange={(event) =>
                          setPackingDrafts((current) => ({
                            ...current,
                            [group]: { label: current[group]?.label ?? "", note: event.target.value },
                          }))
                        }
                      />
                      <button className="icon-button quick-add-button" disabled={!packingDrafts[group]?.label?.trim()} aria-label={"Add item to " + group} type="submit">
                        <Plus size={17} />
                      </button>
                    </form>
                  </section>
                );
              })}
              {!visibleGroups.length && (
                <section className="empty-state inline-empty">
                  <ListChecks size={24} />
                  <h2>No packing items match</h2>
                  <button className="button quiet" onClick={() => {
                    setPackingQuery("");
                    setSelectedGroups([]);
                    setShowUnpackedOnly(false);
                  }} type="button">Clear filters</button>
                </section>
              )}
            </div>
          </div>
        )}

        {activeView === "places" && (
          <div className="content-page">
            <section className="places-header">
              <div>
                <span className="kicker">Your short list</span>
                <h2>Places worth remembering.</h2>
                <p>Keep confirmed plans, loose ideas, meals, and rainy-day backups together.</p>
              </div>
              <div className="places-actions">
                <div className="search-control">
                  <Search size={16} />
                  <input
                    aria-label="Search saved places"
                    placeholder="Search places"
                    value={placeQuery}
                    onChange={(event) => setPlaceQuery(event.target.value)}
                  />
                </div>
                <button className="button primary" onClick={addPlace} type="button"><Plus size={17} /> Add place</button>
              </div>
            </section>
            <div className="place-grid">
              {visiblePlaces.map((place) => {
                const index = dataPlaces.findIndex((entry) => entry === place);
                const imageUrl = placeImageFor(place, index);
                const websiteUrl = normalizeExternalUrl(place.website);
                return (
                <article className="place-card" key={place.name + "-" + index}>
                  <div
                    className={"place-art art-" + (index % 3)}
                    style={{
                      backgroundImage: 'url("' + imageUrl + '")',
                    }}
                  >
                    <span>{place.status}</span>
                  </div>
                  <div className="place-copy">
                    {editMode ? (
                      <div className="place-form">
                        <div className="place-form-row compact">
                          <label>
                            Status
                            <input aria-label="Place status" placeholder="Planned, Maybe, Option" value={place.status} onChange={(event) => updatePlace(index, { status: event.target.value })} />
                          </label>
                          <label>
                            Category
                            <input aria-label="Place type" placeholder="Beach, food, rainy day..." value={place.type} onChange={(event) => updatePlace(index, { type: event.target.value })} />
                          </label>
                        </div>
                        <label>
                          Place name
                          <input className="item-title-input" aria-label="Place name" placeholder="Hobos Tavern" value={place.name} onChange={(event) => updatePlace(index, { name: event.target.value })} />
                        </label>
                        <label>
                          Street address or searchable map location
                          <input aria-label="Place address" placeholder="Street address, park name, or coordinates" value={place.address ?? ""} onChange={(event) => updatePlace(index, { address: event.target.value })} />
                          <small>Used for View on map when there is not a specific Maps link.</small>
                        </label>
                        <label>
                          Google Maps link, Apple Maps link, or exact map URL
                          <input aria-label="Place map URL" placeholder="Optional: paste a map share link" value={place.mapUrl ?? ""} onChange={(event) => updatePlace(index, { mapUrl: event.target.value })} />
                          <small>Optional. Use this when you want the map button to open one exact place.</small>
                        </label>
                        <label>
                          Website
                          <input aria-label="Place website" placeholder="https://example.com" value={place.website ?? ""} onChange={(event) => updatePlace(index, { website: event.target.value })} onBlur={() => {
                            const normalizedWebsite = normalizeExternalUrl(place.website);
                            if (normalizedWebsite && normalizedWebsite !== place.website) updatePlace(index, { website: normalizedWebsite });
                          }} />
                          <small>Used for the website button and to look for a preview image.</small>
                        </label>
                        <div className="place-image-tools">
                          <button className="button quiet" disabled={!place.website || previewLoadingPlace === index} onClick={() => fetchPlaceWebsiteImage(index)} type="button">
                            <ImageIcon size={16} /> {previewLoadingPlace === index ? "Looking..." : "Grab site image"}
                          </button>
                          <label className="button quiet upload-button">
                            <Upload size={16} /> Upload image
                            <input accept="image/*" aria-label="Upload place image" type="file" onChange={(event) => handlePlaceImageUpload(index, event.target.files?.[0])} />
                          </label>
                        </div>
                        <label>
                          Image URL
                          <input aria-label="Place image URL" placeholder="https://..." value={place.imageUrl ?? ""} onChange={(event) => updatePlace(index, { imageUrl: event.target.value })} />
                          <small>Paste an image URL, upload one, or use Grab site image.</small>
                        </label>
                        <label>
                          Notes
                          <textarea aria-label="Place note" placeholder="Why this place is worth saving, timing notes, food ideas, backup plans..." value={place.note} onChange={(event) => updatePlace(index, { note: event.target.value })} />
                        </label>
                        <button className="delete-button" onClick={() => removePlace(index)} type="button"><Trash2 size={15} /> Remove</button>
                      </div>
                    ) : (
                      <>
                        <span className="place-type">{place.type}</span>
                        <h3>{place.name}</h3>
                        {place.address ? <small className="place-address">{place.address}</small> : null}
                        <p>{place.note}</p>
                        <div className="place-links">
                          <a href={placeMapUrl(place)} target="_blank" rel="noreferrer">
                            <MapPin size={15} /> View on map <ArrowRight size={15} />
                          </a>
                          {websiteUrl ? (
                            <a href={websiteUrl} target="_blank" rel="noreferrer">
                              <Link2 size={15} /> Website <ExternalLink size={14} />
                            </a>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </article>
                );
              })}
              {!visiblePlaces.length && (
                <section className="empty-state inline-empty">
                  <MapPin size={24} />
                  <h2>No places match</h2>
                  <button className="button quiet" onClick={() => setPlaceQuery("")} type="button">Clear search</button>
                </section>
              )}
            </div>
          </div>
        )}

        {activeView === "notes" && (
          <div className="notes-page">
            <section className="notes-intro">
              <span className="kicker">The family memory bank</span>
              <h2>Details that should not live in a text thread.</h2>
              <p>House information, reservation numbers, requests, weather thoughts, and lessons to carry into the next trip.</p>
              <div className="note-prompts">
                <span><Users size={17} /> Family requests</span>
                <span><ClipboardCheck size={17} /> Confirmations</span>
                <span><Sparkles size={17} /> Next-time ideas</span>
              </div>
            </section>
            <section className="notebook">
              <div className="notebook-top"><span><NotebookPen size={17} /> Trip notes</span><small>Saved automatically</small></div>
              <textarea aria-label="Trip notes" onChange={(event) => {
                const nextNotes = event.target.value;
                notesDirty.current = true;
                setNotes(nextNotes);
                setTrips((currentTrips) =>
                  currentTrips.map((trip) =>
                    trip.id === activeTripId ? { ...trip, notes: nextNotes } : trip,
                  ),
                );
              }} placeholder="Start writing..." value={notes} />
            </section>
            <section className="template-panel">
              <span className="kicker">Reusable trip blueprint</span>
              <h3>What every new trip starts with</h3>
              {dataTemplate.map((item) => <div key={item}><Check size={15} /><span>{item}</span></div>)}
            </section>
          </div>
        )}

        {activeView === "admin" && (
          <div className="content-page admin-page">
            <section className="admin-header">
              <div>
                <span className="kicker">Planner control center</span>
                <h2>Admin</h2>
                <p>Manage trips, reset planning data, and maintain reusable packing templates from one place.</p>
              </div>
              <div className="admin-tabs" role="tablist" aria-label="Admin sections">
                <button className={adminTab === "trips" ? "is-active" : ""} onClick={() => setAdminTab("trips")} role="tab" aria-selected={adminTab === "trips"} type="button">
                  <Route size={16} /> Trip Admin
                </button>
                <button className={adminTab === "templates" ? "is-active" : ""} onClick={() => setAdminTab("templates")} role="tab" aria-selected={adminTab === "templates"} type="button">
                  <ListChecks size={16} /> Packing Templates
                </button>
              </div>
            </section>

            {adminTab === "trips" && (
              <div className="trip-admin-layout">
                <section className="trip-admin-panel">
                  <div>
                    <span className="kicker">Trip Admin</span>
                    <h3>Trips in this planner</h3>
                    <p>Select a trip to work on it, edit its setup, re-seed it from its dates, or delete it when you are done.</p>
                  </div>
                  <button className="button primary" onClick={() => setShowNewTrip(true)} type="button">
                    <Plus size={16} /> New trip
                  </button>
                </section>

                <section className="reseed-panel">
                  <div>
                    <span className="kicker">Re-seed option</span>
                    <h3>Optional packing template</h3>
                    <p>When you re-seed a trip, its itinerary is rebuilt from the trip dates and this template can be copied into the fresh packing list.</p>
                  </div>
                  <select
                    aria-label="Re-seed packing template"
                    value={reseedTemplateId}
                    onChange={(event) => setReseedTemplateId(event.target.value)}
                  >
                    <option value="">No packing template</option>
                    {packingTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </section>

                <div className="trip-admin-list">
                  {trips.map((trip) => (
                    <section className={trip.id === activeTripId ? "trip-admin-card is-active" : "trip-admin-card"} key={trip.id}>
                      <div className="trip-admin-main">
                        <div>
                          <span className="kicker">{trip.status}</span>
                          <h3>{trip.title}</h3>
                          <p>{trip.destination} · {trip.dateRange || "Dates TBD"}</p>
                        </div>
                        <div className="trip-admin-stats">
                          <span>{trip.data?.days?.length ?? 0}<small>days</small></span>
                          <span>{trip.data?.checklist?.length ?? 0}<small>packing</small></span>
                          <span>{trip.data?.places?.length ?? 0}<small>places</small></span>
                        </div>
                      </div>
                      <div className="trip-admin-actions">
                        <button className="button" onClick={() => selectTrip(trip, true)} type="button">
                          <ArrowRight size={15} /> Open
                        </button>
                        <button className="button" onClick={() => { selectTrip(trip); setShowTripSettings(true); }} type="button">
                          <Edit3 size={15} /> Edit setup
                        </button>
                        <button className="button" onClick={() => reseedTrip(trip)} type="button">
                          <Sparkles size={15} /> Re-seed
                        </button>
                        <button className="button danger-button" disabled={trips.length <= 1} onClick={() => deleteTrip(trip)} type="button">
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {adminTab === "templates" && (
              <>
                <section className="admin-template-tools">
                  <div>
                    <span className="kicker">Packing Templates</span>
                    <h3>Reusable packing lists</h3>
                    <p>Create shared packing templates once, then apply them during trip creation, re-seeding, or from a trip&apos;s Packing page.</p>
                  </div>
                  <div className="admin-new-template">
                    <input
                      aria-label="New template name"
                      placeholder="Template name"
                      value={newTemplateDraft.name}
                      onChange={(event) => setNewTemplateDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                    <input
                      aria-label="New template description"
                      placeholder="Description"
                      value={newTemplateDraft.description}
                      onChange={(event) => setNewTemplateDraft((current) => ({ ...current, description: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createPackingTemplate();
                      }}
                    />
                    <button className="button primary" disabled={!newTemplateDraft.name.trim()} onClick={createPackingTemplate} type="button">
                      <Plus size={16} /> New template
                    </button>
                  </div>
                </section>

                <div className="template-admin-grid">
                  {packingTemplates.map((template) => {
                    const draft = templateItemDrafts[template.id] ?? { label: "", group: "", note: "" };
                    return (
                      <section className="template-admin-card" key={template.id}>
                        <div className="template-admin-heading">
                          <div>
                            <input
                              aria-label={template.name + " template name"}
                              value={template.name}
                              onChange={(event) => updatePackingTemplate(template.id, { name: event.target.value })}
                            />
                            <textarea
                              aria-label={template.name + " template description"}
                              value={template.description}
                              onChange={(event) => updatePackingTemplate(template.id, { description: event.target.value })}
                            />
                          </div>
                          <button className="icon-button delete-icon" onClick={() => removePackingTemplate(template.id)} aria-label={"Remove " + template.name + " template"} type="button">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="template-admin-items">
                          {template.items.map((item, index) => (
                            <div className="template-admin-item" key={item.id + "-" + index}>
                              <input
                                aria-label="Template item name"
                                value={item.label}
                                onChange={(event) => updateTemplateItem(template.id, index, { label: event.target.value })}
                              />
                              <input
                                aria-label="Template item group"
                                value={item.group}
                                onChange={(event) => updateTemplateItem(template.id, index, { group: event.target.value })}
                              />
                              <input
                                aria-label="Template item note"
                                placeholder="Optional note"
                                value={item.note ?? ""}
                                onChange={(event) => updateTemplateItem(template.id, index, { note: event.target.value })}
                              />
                              <button className="icon-button delete-icon" onClick={() => removeTemplateItem(template.id, index)} aria-label={"Remove " + item.label} type="button">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <form
                          className="template-admin-add"
                          onSubmit={(event) => {
                            event.preventDefault();
                            addTemplateItem(template.id);
                          }}
                        >
                          <input
                            aria-label={"Add item to " + template.name + " template"}
                            placeholder="Item name"
                            value={draft.label}
                            onChange={(event) =>
                              setTemplateItemDrafts((current) => ({
                                ...current,
                                [template.id]: { ...draft, label: event.target.value },
                              }))
                            }
                          />
                          <input
                            aria-label={"Group for " + template.name + " template item"}
                            placeholder="Group"
                            value={draft.group}
                            onChange={(event) =>
                              setTemplateItemDrafts((current) => ({
                                ...current,
                                [template.id]: { ...draft, group: event.target.value },
                              }))
                            }
                          />
                          <input
                            aria-label={"Note for " + template.name + " template item"}
                            placeholder="Desc / note"
                            value={draft.note}
                            onChange={(event) =>
                              setTemplateItemDrafts((current) => ({
                                ...current,
                                [template.id]: { ...draft, note: event.target.value },
                              }))
                            }
                          />
                          <button className="icon-button quick-add-button" disabled={!draft.label.trim()} aria-label={"Add item to " + template.name + " template"} type="submit">
                            <Plus size={17} />
                          </button>
                        </form>
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {showTripBook && activeTrip && (
        <div
          className="trip-book-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowTripBook(false);
          }}
          role="presentation"
        >
          <section className="trip-book" aria-label="Trip book PDF preview">
            <div className="trip-book-toolbar">
              <div>
                <span className="kicker">AAA-style trip book</span>
                <h2>{activeTrip.title}</h2>
                <p>Preview the full route guide, then print or save as one PDF.</p>
              </div>
              <div>
                <button className="button primary" onClick={printTripBook} type="button">
                  <Printer size={16} /> Print / save PDF
                </button>
                <button className="button secondary" onClick={() => setShowTripBook(false)} type="button">
                  <X size={16} /> Close
                </button>
              </div>
            </div>

            <article className="trip-book-document">
              <section className="trip-book-page trip-book-cover">
                <div>
                  <span className="trip-book-label">Burns Travel route book</span>
                  <h1>{activeTrip.title}</h1>
                  <p>{activeTrip.destination}</p>
                  <strong>{activeTrip.dateRange}</strong>
                </div>
                <div className="trip-book-cover-grid">
                  <span><CalendarDays size={18} /> {dataDays.length} days</span>
                  <span><Route size={18} /> {mappedDayCount} mapped days</span>
                  <span><Luggage size={18} /> {dataChecklist.length} packing items</span>
                  <span><MapPin size={18} /> {dataPlaces.length} saved places</span>
                </div>
                {activeTrip.summary && <p className="trip-book-summary">{activeTrip.summary}</p>}
              </section>

              <section className="trip-book-page trip-book-overview">
                <div className="trip-book-section-heading">
                  <span className="trip-book-label">Overview</span>
                  <h2>Trip At A Glance</h2>
                </div>
                <div className="trip-book-overview-grid">
                  {dataDays.map((day) => (
                    <div className="trip-book-day-card" key={day.label + day.date}>
                      <span>{day.label}</span>
                      <strong>{day.date}</strong>
                      <p>{day.title}</p>
                    </div>
                  ))}
                </div>
              </section>

              {dataDays.map((day, dayIndex) => {
                const routeKey = tripBookRouteKey(day, dayIndex);
                const roadRoute = tripBookRoutes[routeKey];
                const printMap = printableRouteMap(
                  day.agenda,
                  roadRoute?.status === "ready" ? roadRoute.coordinates : undefined,
                );
                const dayRouteUrl = directionsUrlForStops(day.agenda, activeTrip.destination);
                const mappedStops = printMap?.markers.length ?? 0;
                const routeStatus =
                  roadRoute?.status === "ready"
                    ? `${formatRouteDuration(roadRoute.durationMinutes)} · ${formatRouteDistance(roadRoute.distanceMiles)}`
                    : roadRoute?.status === "loading" || (showTripBook && mappedStops > 1 && !roadRoute)
                      ? "Calculating road route"
                      : roadRoute?.status === "error"
                        ? "Road route unavailable"
                        : `${mappedStops} mapped stops`;

                return (
                  <section className="trip-book-page trip-book-day" key={day.label + "-" + day.title}>
                    <div className="trip-book-section-heading">
                      <span className="trip-book-label">{day.label} · {day.date}</span>
                      <h2>{day.title}</h2>
                      {day.mood && <p>{day.mood}</p>}
                    </div>

                    <div className="trip-book-route-sheet">
                      <div className="trip-book-map">
                        <div className="trip-book-map-header">
                          <span><Route size={15} /> Printable route map</span>
                          <small>{routeStatus}</small>
                        </div>
                        {printMap ? (
                          <div
                            aria-label={day.title + " printable route map"}
                            className="trip-book-static-map"
                            role="img"
                          >
                            {printMap.tiles.map((tile) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt=""
                                aria-hidden="true"
                                height={PRINT_MAP_TILE_SIZE}
                                key={tile.key}
                                loading="eager"
                                src={tile.url}
                                style={{
                                  height: `${(PRINT_MAP_TILE_SIZE / printMap.height) * 100}%`,
                                  left: `${(tile.left / printMap.width) * 100}%`,
                                  top: `${(tile.top / printMap.height) * 100}%`,
                                  width: `${(PRINT_MAP_TILE_SIZE / printMap.width) * 100}%`,
                                }}
                                width={PRINT_MAP_TILE_SIZE}
                              />
                            ))}
                            <svg
                              aria-hidden="true"
                              className="trip-book-map-overlay"
                              viewBox={`0 0 ${printMap.width} ${printMap.height}`}
                            >
                              {printMap.markers.length > 1 && (
                                printMap.roadLine ? (
                                  <>
                                    <polyline className="trip-book-route-halo" points={printMap.roadLine} />
                                    <polyline className="trip-book-route-line" points={printMap.roadLine} />
                                  </>
                                ) : (
                                  roadRoute?.status !== "loading" &&
                                  roadRoute?.status !== "error" && (
                                    <polyline className="trip-book-stop-connector" points={printMap.routeLine} />
                                  )
                                )
                              )}
                              {printMap.markers.map((point) => (
                                <g key={point.index} transform={`translate(${point.x} ${point.y})`}>
                                  <circle r="15" />
                                  <text textAnchor="middle" dominantBaseline="central">{point.index + 1}</text>
                                </g>
                              ))}
                            </svg>
                            <span className="trip-book-map-credit">Map data OpenStreetMap</span>
                          </div>
                        ) : (
                          <div className="trip-book-map-empty">Add stop coordinates to include a route map.</div>
                        )}
                      </div>
                      <div className="trip-book-route-notes">
                        <h3>Route Notes</h3>
                        {roadRoute?.status === "ready" && (
                          <div className="trip-book-route-meta">
                            {formatRouteDuration(roadRoute.durationMinutes)} drive · {formatRouteDistance(roadRoute.distanceMiles)}
                          </div>
                        )}
                        <p>{day.drive || "No route notes yet."}</p>
                        {roadRoute?.status === "loading" && <p>Calculating the printable road route.</p>}
                        {roadRoute?.status === "error" && <p>Road route could not be calculated for this set of stops.</p>}
                        <a href={dayRouteUrl} target="_blank" rel="noreferrer">Open live map route</a>
                      </div>
                    </div>

                    <div className="trip-book-steps">
                      <h3>Day-by-Day Steps</h3>
                      {day.agenda.length ? (
                        day.agenda.map((item, index) => (
                          <div className="trip-book-step" key={item.time + item.title + index}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{item.time} · {item.title}</strong>
                              <small>{agendaLocation(item)}</small>
                              <p>{item.detail || "Add details for this stop."}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="trip-book-empty">No steps yet. Add stops in the itinerary to fill this sheet.</p>
                      )}
                    </div>

                    <div className="trip-book-day-footer">
                      <div>
                        <h3>Bring Today</h3>
                        <p>{day.bring.length ? day.bring.join(", ") : "No day-specific items yet."}</p>
                      </div>
                      <div>
                        <h3>Weather / Conditions</h3>
                        <p>{day.weatherNeed || "No weather notes yet."}</p>
                      </div>
                      <div>
                        <h3>Decisions</h3>
                        <p>{day.decisions.length ? day.decisions.join(", ") : "No decisions listed."}</p>
                      </div>
                    </div>
                  </section>
                );
              })}

              <section className="trip-book-page trip-book-reference">
                <div className="trip-book-section-heading">
                  <span className="trip-book-label">Reference</span>
                  <h2>Packing Checklist</h2>
                </div>
                <div className="trip-book-columns">
                  {checklistByGroup.map(({ group, items }) => (
                    <div className="trip-book-list" key={group}>
                      <h3>{group}</h3>
                      {items.map((item) => (
                        <label key={item.id}>
                          <span />
                          <strong>{item.label}</strong>
                          {item.note && <small>{item.note}</small>}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className="trip-book-page trip-book-reference">
                <div className="trip-book-section-heading">
                  <span className="trip-book-label">Reference</span>
                  <h2>Places + Notes</h2>
                </div>
                <div className="trip-book-columns">
                  <div className="trip-book-list">
                    <h3>Saved Places</h3>
                    {dataPlaces.map((place) => (
                      <div className="trip-book-place" key={place.name + place.type}>
                        <strong>{place.name}</strong>
                        <small>{place.type} · {place.status}</small>
                        {place.address ? <small>{place.address}</small> : null}
                        <p>{place.note}</p>
                        {place.website ? <small>{normalizeExternalUrl(place.website)}</small> : null}
                      </div>
                    ))}
                  </div>
                  <div className="trip-book-notes">
                    <h3>Trip Notes</h3>
                    <p>{notes || "No trip notes yet."}</p>
                  </div>
                </div>
              </section>
            </article>
          </section>
        </div>
      )}

      {showNewTrip && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowNewTrip(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-trip-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div><span className="kicker">Fresh adventure</span><h2 id="new-trip-title">Create a new trip</h2></div>
              <button className="icon-button" onClick={() => setShowNewTrip(false)} aria-label="Close" type="button"><X size={20} /></button>
            </div>
            <label>
              Trip name
              <input autoFocus aria-label="Trip name" placeholder="e.g. Spring break in Charleston" value={newTrip.title} onChange={(event) => setNewTrip((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <div className="modal-grid">
              <label>Destination<input aria-label="Destination" placeholder="City, region, or park" value={newTrip.destination} onChange={(event) => setNewTrip((current) => ({ ...current, destination: event.target.value }))} /></label>
              <label>Dates<input aria-label="Date range" placeholder="Aug 8 - Aug 14" value={newTrip.dateRange} onChange={(event) => setNewTrip((current) => ({ ...current, dateRange: event.target.value }))} /></label>
            </div>
            <label>
              Start with packing template?
              <select
                aria-label="New trip packing template"
                value={newTrip.packingTemplateId}
                onChange={(event) => setNewTrip((current) => ({ ...current, packingTemplateId: event.target.value }))}
              >
                <option value="">No template yet</option>
                {packingTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </label>
            {selectedNewTripTemplate && (
              <p className="modal-helper">
                Adds {selectedNewTripTemplate.items.length} items from {selectedNewTripTemplate.name} to this trip&apos;s packing list.
              </p>
            )}
            <button className="button primary full-button" onClick={createTrip} type="button">Create trip <ArrowRight size={17} /></button>
          </section>
        </div>
      )}

      {showTripSettings && activeTrip && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowTripSettings(false)}>
          <section
            className="modal trip-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div><span className="kicker">Private trip controls</span><h2 id="trip-settings-title">Trip settings</h2></div>
              <button className="icon-button" onClick={() => setShowTripSettings(false)} aria-label="Close" type="button"><X size={20} /></button>
            </div>
            <div className="settings-grid">
              <label>
                Trip name
                <input aria-label="Trip title" value={activeTrip.title} onChange={(event) => updateTripSettings({ title: event.target.value })} />
              </label>
              <label>
                Destination
                <input aria-label="Trip destination" value={activeTrip.destination} onChange={(event) => updateTripSettings({ destination: event.target.value })} />
              </label>
              <label>
                Dates
                <input aria-label="Trip date range" value={activeTrip.dateRange} onChange={(event) => updateTripSettings({ dateRange: event.target.value })} />
              </label>
              <label>
                Status
                <input aria-label="Trip status" value={activeTrip.status} onChange={(event) => updateTripSettings({ status: event.target.value })} />
              </label>
            </div>
            <label>
              Summary
              <textarea aria-label="Trip summary" value={activeTrip.summary} onChange={(event) => updateTripSettings({ summary: event.target.value })} />
            </label>
            <label>
              Hero image URL
              <input aria-label="Trip hero image URL" placeholder="https://..." value={tripSettings.heroImage ?? ""} onChange={(event) => updateTripDataSettings({ heroImage: event.target.value })} />
            </label>
            <section className="private-share-panel">
              <div>
                <span className="kicker">Sharing later</span>
                <h3>Private-only share prep</h3>
                <p>This site is still private. Use this space to draft what you may want to share later without changing access.</p>
              </div>
              <textarea
                aria-label="Private sharing notes"
                placeholder="Who might need access later? What should be hidden before sharing?"
                value={tripSettings.shareNotes ?? ""}
                onChange={(event) => updateTripDataSettings({ shareNotes: event.target.value })}
              />
            </section>
            <div className="settings-actions">
              <button className="button secondary" onClick={cloneTripAsTemplate} type="button">
                <Copy size={16} /> Clone as template
              </button>
              <button className="button primary" onClick={() => setShowTripSettings(false)} type="button">
                <Check size={16} /> Done
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
