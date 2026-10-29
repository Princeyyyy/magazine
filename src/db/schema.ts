import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "submitted",
  "in_progress",
  "awaiting_photos",
  "in_design",
  "ready",
  "delivered",
  "cancelled",
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),
  status: orderStatusEnum("status").default("draft").notNull(),
  draftToken: text("draft_token").notNull().unique(),
  customerName: text("customer_name"),
  relationship: text("relationship"),
  herName: text("her_name"),
  herNickname: text("her_nickname"),
  birthdayDate: text("birthday_date"),
  ageTurning: integer("age_turning"),
  colourTheme: text("colour_theme"),
  coverHeadline: text("cover_headline"),
  email: text("email"),
  phoneE164: text("phone_e164"),
  driveFolderId: text("drive_folder_id"),
  driveFolderUrl: text("drive_folder_url"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    value: jsonb("value").notNull(),
  },
  (table) => [unique("answers_order_id_question_key_unique").on(table.orderId, table.questionKey)]
);

export const photos = pgTable("photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  storageProvider: text("storage_provider").notNull(), // 'local' | 'drive'
  storageFileId: text("storage_file_id").notNull(),
  originalName: text("original_name").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  caption: text("caption").default("").notNull(),
  isCover: boolean("is_cover").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const devOutbox = pgTable("dev_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body").notNull(),
  template: text("template").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const statusHistory = pgTable("status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  adminEmail: text("admin_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const ordersRelations = relations(orders, ({ many }) => ({
  answers: many(answers),
  photos: many(photos),
  statusHistory: many(statusHistory),
  devEmails: many(devOutbox),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  order: one(orders, {
    fields: [answers.orderId],
    references: [orders.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  order: one(orders, {
    fields: [photos.orderId],
    references: [orders.id],
  }),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [statusHistory.orderId],
    references: [orders.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type DevOutboxEntry = typeof devOutbox.$inferSelect;
export type StatusHistoryEntry = typeof statusHistory.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
