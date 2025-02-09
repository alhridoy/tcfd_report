import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"),
  content: jsonb("content").$type<{
    Governance: Record<string, string>;
    Strategy: Record<string, string>;
    Risk_Management: Record<string, string>;
    Metrics_and_Targets: Record<string, string>;
  }>(),
  error: text("error"),
});

export const insertReportSchema = createInsertSchema(reports).pick({
  filename: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;