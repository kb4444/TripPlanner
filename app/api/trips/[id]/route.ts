import { env } from "cloudflare:workers";

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
  };

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
