import { env } from "cloudflare:workers";

const now = () => new Date().toISOString();

const michiganTripData = {
  days: [
    {
      date: "Sunday, July 26",
      label: "Day 1",
      title: "Drive North + Holland Stop",
      mood: "Get moving, keep the drive humane, and arrive with some Lake Michigan sand already in the day.",
      drive:
        "Drop off Wiz at 9:00 AM, then head north. After Holland, take Lakeshore Drive north through Ottawa Beach, Port Sheldon, and Grand Haven before US-31 toward Muskegon.",
      weatherNeed:
        "Travel clothes, beach-access shoes, quick towels, sunscreen within reach.",
      agenda: [
        {
          time: "9:00 AM",
          title: "Drop off Wiz and head north",
          detail:
            "Load road snacks, beach bag, and the first-day tote where they can be reached without unpacking the car.",
        },
        {
          time: "11:00 AM-ish",
          title: "Rest stop 1",
          detail: "Quick bathroom break, stretch, refill waters, verify lunch timing.",
        },
        {
          time: "12:30-1:00 PM",
          title: "Lunch in Dundee, MI",
          detail:
            "Taco Bell / McDonald's to the right, Culver's to the left. Pick based on speed and morale.",
        },
        {
          time: "4:00 PM",
          title: "Holland State Park",
          detail:
            "See the beach, walk the pier, maybe play a bit, and consider Captain Sundae before heading north.",
        },
        {
          time: "Evening",
          title: "Rental arrival",
          detail:
            "About one hour from Holland. Unload essentials first: beds, swim bag, food, toiletries.",
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
          detail:
            "Chairs, towels, sunscreen, cooler, food and drinks, toys, tubes, frisbees, kites, umbrellas, beach wagon.",
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
      drive:
        "Local park day. Start early enough to make the most of the day without turning it into a forced march.",
      weatherNeed:
        "Normal Cedar Point gear: dry bag, sunscreen, hats, sandals or secure shoes, water plan.",
      agenda: [
        {
          time: "Morning",
          title: "Park launch",
          detail:
            "Use the Cedar Point routine: tickets, sunscreen, phone battery, water ride gear, backup clothes.",
        },
        {
          time: "Midday",
          title: "Rides + water break",
          detail: "Alternate high-energy rides with shade, snacks, and water.",
        },
        {
          time: "Evening",
          title: "Recovery dinner",
          detail:
            "Keep dinner close and easy. This is a good night for Hobos Tavern if everyone has energy.",
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
      drive:
        "Keep it flexible: Pere Marquette Beach, another favorite, or a Muskegon State Park explore if weather shifts.",
      weatherNeed: "Beach kit plus light explore shoes if you want to add a short hike.",
      agenda: [
        {
          time: "Morning",
          title: "Pick the beach",
          detail:
            "Pere Marquette Beach is the maybe. Decide based on wind, swim conditions, parking, and energy.",
        },
        {
          time: "Afternoon",
          title: "Long beach block",
          detail:
            "Repeat the best parts of Duck Lake, but pack a lighter version if Monday taught you anything.",
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
  ],
  checklist: [
    { id: "water-shoes", label: "Water shoes", group: "Beach Gear" },
    { id: "swim-stuff", label: "Swim stuff", group: "Beach Gear" },
    { id: "kites", label: "Kites", group: "Beach Gear" },
    { id: "tubes", label: "Tubes", group: "Beach Gear" },
    { id: "frisbees", label: "Frisbees", group: "Beach Gear" },
    { id: "umbrellas", label: "Beach umbrellas", group: "Beach Gear" },
    { id: "wagon", label: "Beach wagon", group: "Beach Gear" },
    { id: "chairs", label: "Chairs", group: "Beach Gear" },
    {
      id: "towels",
      label: "Lots of towels",
      group: "Beach Gear",
      note: "Plan a mid-trip drying or laundry reset.",
    },
    {
      id: "baby-powder",
      label: "Baby powder",
      group: "Beach Gear",
      note: "Your note said paper powder; assuming beach sand baby powder.",
    },
    { id: "sunscreen", label: "Sunscreen", group: "Health" },
    { id: "cooler", label: "Cooler", group: "Food" },
    { id: "popcorn", label: "Popcorn", group: "Food" },
    { id: "coffee", label: "Coffee", group: "Food" },
    { id: "chips", label: "Chips", group: "Food" },
    { id: "drinks", label: "Drinks", group: "Food" },
    {
      id: "park-gear",
      label: "Normal Cedar Point gear",
      group: "Park Day",
      note: "Dry bag, phone power, water shoes, backup clothes.",
    },
    { id: "chargers", label: "Chargers", group: "House" },
    { id: "laundry", label: "Laundry bag", group: "House" },
    { id: "trash-bags", label: "Trash bags", group: "House" },
  ],
  packingGroups: ["Beach Gear", "Health", "Food", "Park Day", "House"],
  places: [
    {
      name: "Holland State Park",
      type: "Beach stop",
      note: "First Lake Michigan stop on the drive north. Walk the pier, stretch, and let the trip feel like vacation.",
      status: "Planned",
    },
    {
      name: "Captain Sundae",
      type: "Treat",
      note: "Maybe stop after Holland State Park if timing and energy are good.",
      status: "Maybe",
    },
    {
      name: "Duck Lake",
      type: "Beach day",
      note: "Primary Monday beach day. Pack the full beach setup.",
      status: "Planned",
    },
    {
      name: "Michigan's Adventure",
      type: "Theme park",
      note: "Tuesday park day. Use the Cedar Point packing pattern.",
      status: "Planned",
    },
    {
      name: "Pere Marquette Beach",
      type: "Beach option",
      note: "Maybe for Wednesday Beach Day #2.",
      status: "Maybe",
    },
    {
      name: "Hobos Tavern",
      type: "Food close to house",
      note: "Purveyors of Food, Drink, and Song. Good easy dinner candidate.",
      status: "Option",
    },
    {
      name: "Muskegon State Park",
      type: "Explore",
      note: "Short hike or just drive-explore close to the rental.",
      status: "Option",
    },
  ],
  tripTemplate: [
    "Overview: destination, dates, travelers, home base, and trip mood",
    "Travel days: departure windows, must-stop towns, scenic vs. fastest route",
    "Daily plans: anchor activity, backup option, weather gear, food plan",
    "Packing: house, beach, park, health, food, car, kid-specific gear",
    "Places: confirmed, maybe, food, rain plans, quick-drive options",
    "Notes: loose ideas, questions, reminders, and post-trip lessons",
  ],
};

const blankTripData = {
  days: [],
  checklist: [],
  packingGroups: [],
  places: [],
  tripTemplate: michiganTripData.tripTemplate,
};

function hasCopiedStarterChecklist(data: { checklist?: { id?: string }[] }) {
  const checklist = data.checklist ?? [];
  return (
    checklist.length === michiganTripData.checklist.length &&
    checklist.every((item, index) => item.id === michiganTripData.checklist[index].id)
  );
}

async function initializeTrips() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      date_range TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Planning',
      summary TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      packed TEXT NOT NULL DEFAULT '{}',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS trips_updated_at_idx ON trips (updated_at)",
    ),
  ]);

  const existing = await env.DB.prepare("SELECT id FROM trips LIMIT 1").first();
  if (existing) {
    const michigan = await env.DB.prepare("SELECT data FROM trips WHERE id = ?")
      .bind("michigan-2026")
      .first<{ data: string }>();
    const parsed = michigan ? JSON.parse(michigan.data) : null;
    if (!parsed?.days || parsed.days.length < michiganTripData.days.length) {
      await env.DB.prepare("UPDATE trips SET data = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(michiganTripData), now(), "michigan-2026")
        .run();
    }

    const starterTrips = await env.DB.prepare("SELECT id, summary, data FROM trips WHERE id <> ?")
      .bind("michigan-2026")
      .all<{ id: string; summary: string; data: string }>();
    await Promise.all(
      starterTrips.results.map(async (trip) => {
        if (trip.summary !== "A new trip shell using the Burns Travel framework.") return;
        const data = JSON.parse(trip.data || "{}");
        if (!hasCopiedStarterChecklist(data)) return;
        await env.DB.prepare("UPDATE trips SET data = ?, packed = ?, updated_at = ? WHERE id = ?")
          .bind(
            JSON.stringify({ ...data, checklist: [], packingGroups: [] }),
            "{}",
            now(),
            trip.id,
          )
          .run();
      }),
    );
    return;
  }

  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO trips
      (id, title, destination, date_range, status, summary, notes, packed, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      "michigan-2026",
      "Michigan Lake Week",
      "Muskegon / Lake Michigan",
      "July 26-30",
      "Planning",
      "Drive north, settle near Muskegon, build the week around beach days and Michigan's Adventure.",
      "",
      "{}",
      JSON.stringify(michiganTripData),
      timestamp,
      timestamp,
    )
    .run();
}

function rowToTrip(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    dateRange: row.date_range,
    status: row.status,
    summary: row.summary,
    notes: row.notes,
    packed: JSON.parse(String(row.packed || "{}")),
    data: JSON.parse(String(row.data || "{}")),
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  await initializeTrips();
  const result = await env.DB.prepare(
    "SELECT * FROM trips ORDER BY updated_at DESC",
  ).all<Record<string, unknown>>();

  return Response.json({ trips: result.results.map(rowToTrip) });
}

export async function POST(request: Request) {
  await initializeTrips();
  const payload = (await request.json()) as {
    title?: string;
    destination?: string;
    dateRange?: string;
    cloneFromId?: string;
  };
  const title = payload.title?.trim();
  const destination = payload.destination?.trim() || "Destination TBD";
  const dateRange = payload.dateRange?.trim() || "Dates TBD";

  if (!title) {
    return Response.json({ error: "Trip title is required." }, { status: 400 });
  }

  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
  const timestamp = now();
  const sourceTrip = payload.cloneFromId
    ? await env.DB.prepare("SELECT * FROM trips WHERE id = ?")
        .bind(payload.cloneFromId)
        .first<Record<string, unknown>>()
    : null;
  const cloned = sourceTrip ? rowToTrip(sourceTrip) : null;
  const clonedData = cloned?.data
    ? {
        ...cloned.data,
        days: (cloned.data.days ?? []).map((day: Record<string, unknown>, index: number) => ({
          ...day,
          label: `Day ${index + 1}`,
        })),
      }
    : blankTripData;

  await env.DB.prepare(
    `INSERT INTO trips
      (id, title, destination, date_range, status, summary, notes, packed, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      title,
      destination,
      dateRange,
      "Planning",
      cloned
        ? "Cloned from " + cloned.title + " as a reusable planning template."
        : "A new trip shell using the Burns Travel framework.",
      "",
      "{}",
      JSON.stringify(clonedData),
      timestamp,
      timestamp,
    )
    .run();

  const created = await env.DB.prepare("SELECT * FROM trips WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return Response.json({ trip: rowToTrip(created!) }, { status: 201 });
}
