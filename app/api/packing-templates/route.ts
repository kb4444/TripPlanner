import { env } from "cloudflare:workers";

const now = () => new Date().toISOString();

const defaultPackingTemplates = [
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

async function ensureSettingsTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

async function getTemplates() {
  await ensureSettingsTable();
  const row = await env.DB.prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind("packing_templates")
    .first<{ value: string }>();

  if (row?.value) return JSON.parse(row.value);

  await env.DB.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)")
    .bind("packing_templates", JSON.stringify(defaultPackingTemplates), now())
    .run();

  return defaultPackingTemplates;
}

export async function GET() {
  const templates = await getTemplates();
  return Response.json({ templates });
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as { templates?: unknown };
  if (!Array.isArray(payload.templates)) {
    return Response.json({ error: "Templates array is required." }, { status: 400 });
  }

  await ensureSettingsTable();
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
    .bind("packing_templates", JSON.stringify(payload.templates), now())
    .run();

  return Response.json({ templates: payload.templates });
}
