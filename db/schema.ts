import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  dateRange: text("date_range").notNull(),
  status: text("status").notNull().default("Planning"),
  summary: text("summary").notNull().default(""),
  notes: text("notes").notNull().default(""),
  packed: text("packed", { mode: "json" })
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  data: text("data", { mode: "json" }).$type<unknown>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
