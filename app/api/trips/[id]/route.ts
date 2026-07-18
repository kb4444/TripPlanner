import { env } from "cloudflare:workers";
import { createItineraryDaysFromDateRange, starterTripTemplate } from "@/app/trip-scaffold";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const payload = (await request.json()) as {
    title?: string;
    destination?: string;
    dateRange?: string;
    status?: string;
    summary?: string;
    notes?: string;
    packed?: Record<string, boolean>;
    data?: unknown;
    reseed?: boolean;
    packingTemplate?: {
      id?: string;
      items?: { id?: string; label?: string; group?: string; note?: string }[];
    };
  };

  if (payload.reseed) {
    const current = await env.DB.prepare("SELECT * FROM trips WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!current) {
      return Response.json({ error: "Trip not found." }, { status: 404 });
    }

    const dateRange =
      typeof payload.dateRange === "string" ? payload.dateRange : String(current.date_range ?? "Dates TBD");
    const templateItems = payload.packingTemplate?.items ?? [];
    const checklist = templateItems
      .filter((item) => item.label?.trim())
      .map((item, index) => ({
        id: `${payload.packingTemplate?.id ?? "template"}-${item.label?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}-${index + 1}`,
        label: item.label?.trim() ?? "Packing item",
        group: item.group?.trim() || "General",
        note: item.note?.trim() || undefined,
      }));
    const packingGroups = [...new Set(checklist.map((item) => item.group))];
    const data = {
      days: createItineraryDaysFromDateRange(dateRange),
      checklist,
      packingGroups,
      places: [],
      tripTemplate: starterTripTemplate,
    };
    const title = typeof payload.title === "string" ? payload.title : String(current.title ?? "Untitled trip");
    const destination =
      typeof payload.destination === "string"
        ? payload.destination
        : String(current.destination ?? "Destination TBD");
    const status = typeof payload.status === "string" ? payload.status : "Planning";
    const summary =
      typeof payload.summary === "string"
        ? payload.summary
        : "A fresh trip shell using the Burns Travel framework.";

    await env.DB.prepare(
      `UPDATE trips
       SET title = ?, destination = ?, date_range = ?, status = ?, summary = ?, notes = ?, packed = ?, data = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        title,
        destination,
        dateRange,
        status,
        summary,
        "",
        "{}",
        JSON.stringify(data),
        new Date().toISOString(),
        id,
      )
      .run();

    return Response.json({ ok: true });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof payload.notes === "string") {
    updates.push("notes = ?");
    values.push(payload.notes);
  }

  if (typeof payload.title === "string") {
    updates.push("title = ?");
    values.push(payload.title);
  }

  if (typeof payload.destination === "string") {
    updates.push("destination = ?");
    values.push(payload.destination);
  }

  if (typeof payload.dateRange === "string") {
    updates.push("date_range = ?");
    values.push(payload.dateRange);
  }

  if (typeof payload.status === "string") {
    updates.push("status = ?");
    values.push(payload.status);
  }

  if (typeof payload.summary === "string") {
    updates.push("summary = ?");
    values.push(payload.summary);
  }

  if (payload.packed && typeof payload.packed === "object") {
    updates.push("packed = ?");
    values.push(JSON.stringify(payload.packed));
  }

  if (payload.data && typeof payload.data === "object") {
    updates.push("data = ?");
    values.push(JSON.stringify(payload.data));
  }

  if (!updates.length) {
    return Response.json({ ok: true });
  }

  updates.push("updated_at = ?");
  values.push(new Date().toISOString(), id);

  await env.DB.prepare(`UPDATE trips SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const count = await env.DB.prepare("SELECT COUNT(*) as count FROM trips").first<{ count: number }>();
  if ((count?.count ?? 0) <= 1) {
    return Response.json({ error: "Keep at least one trip in the planner." }, { status: 400 });
  }

  await env.DB.prepare("DELETE FROM trips WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
